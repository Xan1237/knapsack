import { NextRequest, NextResponse } from "next/server";
import { parsePackingInput } from "@/lib/packing-input";
import { findPackingChoices } from "@/lib/choices";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const input = parsePackingInput(raw);
    if (typeof raw.wantedId !== "string") throw new Error("Missing item.");
    return NextResponse.json(findPackingChoices(input.items, input.bag, raw.wantedId), { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "A swap could not be calculated. Try a larger bag or leave an optional item out." }, { status: 400 }); }
}
