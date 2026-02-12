import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { createClient } from "@supabase/supabase-js";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY, // Note: Verify if plan had different env var names
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create Supabase Client (Service Role for secure insert if needed, or just standard)
// Ideally use service role key for backend operations to bypass RLS if configured,
// but user might only have anon key in .env.local based on previous steps.
// We'll use the anon key for now, assuming RLS allows insert or we are using a service key if available.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const x = Number(formData.get("x"));
    const y = Number(formData.get("y"));
    const width = Number(formData.get("width"));
    const height = Number(formData.get("height"));
    const title = (formData.get("title") as string) || "Untitled";

    if (!file || isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Clamp dimensions to board boundaries (1000x1000)
    const BOARD_SIZE = 1000;
    const clampedWidth = Math.min(width, BOARD_SIZE - x);
    const clampedHeight = Math.min(height, BOARD_SIZE - y);

    // 1. Collision Detection [REMOVED] - Overlapping allowed
    // const { data: existingMemes, error: fetchError } = await supabase...

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

    // 3. Insert into Supabase
    const { data, error: insertError } = await supabase
      .from("memes")
      .insert({
        image_url: uploadResult.secure_url,
        x,
        y,
        width: clampedWidth,
        height: clampedHeight,
        title,
        // link: ... if we add link input
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

    return NextResponse.json(data);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
