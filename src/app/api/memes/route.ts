import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { createClient } from "@supabase/supabase-js";
import { PRICE_PER_PIXEL, OVERRIDE_PRICE_PER_PIXEL } from "@/lib/constants";
import { randomUUID } from "crypto";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Pakasir Config
const PAKASIR_API_URL = "https://app.pakasir.com/api/transactioncreate/qris";
const PAKASIR_API_KEY = process.env.PAKASIR_API_KEY;
const PAKASIR_PROJECT_ID = process.env.PAKASIR_PROJECT_ID;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const x = Number(formData.get("x"));
    const y = Number(formData.get("y"));
    const width = Number(formData.get("width"));
    const height = Number(formData.get("height"));
    const title = (formData.get("title") as string) || "Untitled";
    const user_name = (formData.get("user_name") as string) || "Anonymous";
    const message = ((formData.get("message") as string) || "").slice(0, 32);

    if (!file || isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Clamp dimensions
    const BOARD_SIZE = 1000;
    const clampedWidth = Math.min(width, BOARD_SIZE - x);
    const clampedHeight = Math.min(height, BOARD_SIZE - y);

    // 1. Calculate Price
    // Fetch potential overlaps (only fetch paid memes)
    const { data: overlappingMemes } = await supabase
      .from("memes")
      .select("x, y, width, height")
      .eq("payment_status", "PAID") // Only consider paid memes for collision cost
      .or(
        `x.lt.${x + clampedWidth},x.gt.${x - BOARD_SIZE}`, // Broad phase filtering manually or let JS handle exact overlap
      );

    // Better overlap query logic:
    // (A.x < B.x + B.w) AND (A.x + A.w > B.x) AND ...
    // Since Supabase filtering is limited, let's fetch roughly in range and filter in JS if many memes.
    // Or just fetch all PAID memes? If < 1000 it's fast.
    // Let's use the provided bounding box logic from frontend.

    // Simpler: Fetch ALL paid memes and filter.
    // With 1000 items, JS filter is instant (< 1ms).
    const { data: allPaidMemes } = await supabase
      .from("memes")
      .select("x, y, width, height")
      .eq("payment_status", "PAID");

    let totalOverlapArea = 0;
    if (allPaidMemes) {
      for (const m of allPaidMemes) {
        const x_overlap = Math.max(
          0,
          Math.min(x + clampedWidth, m.x + m.width) - Math.max(x, m.x),
        );
        const y_overlap = Math.max(
          0,
          Math.min(y + clampedHeight, m.y + m.height) - Math.max(y, m.y),
        );
        totalOverlapArea += x_overlap * y_overlap;
      }
    }

    const baseArea = clampedWidth * clampedHeight;
    const baseCost = baseArea * PRICE_PER_PIXEL;
    const overrideCost = totalOverlapArea * OVERRIDE_PRICE_PER_PIXEL;
    const totalCost = Math.ceil(baseCost + overrideCost); // Ensure integer? No, Pakasir handles amount, usually integer IDR.
    // Pakasir amount should be integer? Usually yes request IDR.
    const finalAmount = Math.max(500, Math.ceil(totalCost)); // Minimum amount 500 (Pakasir requirement)

    // 2. Upload to Cloudinary
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const isGif = file.type === "image/gif";

    const uploadResult = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "papanmeme",
            resource_type: "image",
            transformation: isGif
              ? [{ width: clampedWidth, height: clampedHeight, crop: "limit" }]
              : [
                  { width: clampedWidth, height: clampedHeight, crop: "limit" },
                  { quality: "auto", fetch_format: "auto" },
                ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        )
        .end(buffer);
    });

    // 3. Create Transaction in Pakasir
    const orderId = `MEME-${randomUUID().split("-")[0]}-${Date.now()}`; // Shortish ID

    if (!PAKASIR_API_KEY || !PAKASIR_PROJECT_ID) {
      throw new Error("Missing Pakasir Config");
    }

    const pakasirPayload = {
      project: PAKASIR_PROJECT_ID,
      order_id: orderId,
      amount: finalAmount,
      api_key: PAKASIR_API_KEY,
    };

    console.log("Calling Pakasir:", pakasirPayload);

    const pakasirResponse = await fetch(PAKASIR_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pakasirPayload),
    });

    const pakasirResult = await pakasirResponse.json();
    console.log("Pakasir Result:", pakasirResult);

    if (!pakasirResponse.ok) {
      // If fail, we still uploaded image. We can delete it or just not save DB.
      // For now, return error.
      // Note: Pakasir success structure varies. Assume result.data exists if success.
      if (!pakasirResult.payment) {
        throw new Error(
          "Failed to create transaction: " + JSON.stringify(pakasirResult),
        );
      }
    }

    // 4. Insert into Supabase (Pending)
    const { data, error: insertError } = await supabase
      .from("memes")
      .insert({
        image_url: uploadResult.secure_url,
        x,
        y,
        width: clampedWidth,
        height: clampedHeight,
        title,
        user_name,
        message: message || null,
        order_id: orderId,
        price: finalAmount,
        payment_status: "PENDING", // Wait for webhook
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save to database" },
        { status: 500 },
      );
    }

    // Return Payment Data (QRIS)
    return NextResponse.json({
      meme: data,
      payment: pakasirResult.payment,
    });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
