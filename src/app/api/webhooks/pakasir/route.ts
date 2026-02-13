import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const PAKASIR_PROJECT_ID = process.env.PAKASIR_PROJECT_ID;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Pakasir Webhook:", body);

    const { order_id, amount, project } = body;

    // 1. Verify Project ID
    if (project !== PAKASIR_PROJECT_ID) {
      return NextResponse.json(
        { error: "Invalid Project ID" },
        { status: 403 },
      );
    }

    if (!order_id) {
      return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
    }

    // 2. Fetch meme to verify amount
    const { data: meme, error: fetchError } = await supabase
      .from("memes")
      .select("price, payment_status")
      .eq("order_id", order_id)
      .single();

    if (fetchError || !meme) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 3. Verify Amount
    // Pakasir sends 'amount' (base) and 'total_payment' (with fees).
    // We should match 'amount' with our stored 'price'.
    if (Number(amount) !== Number(meme.price)) {
      console.warn(
        `Amount mismatch for ${order_id}: expected ${meme.price}, got ${amount}`,
      );
      // Optional: Reject or Mark as Partial?
      // For now, allow a small margin or exact match.
      // Let's enforce exact match for security.
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    // 4. Update Status
    if (meme.payment_status !== "PAID") {
      const { error: updateError } = await supabase
        .from("memes")
        .update({ payment_status: "PAID" })
        .eq("order_id", order_id);

      if (updateError) {
        throw updateError;
      }
    }

    return NextResponse.json({ message: "Payment processed successfully" });
  } catch (error: any) {
    console.error("Webhook Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
