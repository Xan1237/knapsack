import { NextRequest, NextResponse } from "next/server";
import { parsePackingInput } from "@/lib/packing-input";
import { suggestPacking } from "@/lib/astra";
export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Use this app to request packing suggestions." }, { status: 403 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "Astra isn’t connected yet. Packing and item swaps still work." }, { status: 503 });
  let input;
  try { input = parsePackingInput(await request.json()); }
  catch { return NextResponse.json({ error: "The packing inventory could not be read. Try importing it again." }, { status: 400 }); }
  try { return NextResponse.json(await suggestPacking(input.items, input.bag, input.preference || "Help me choose what to pack."), { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Astra could not finish that suggestion. Your list is safe; please try again." }, { status: 502 }); }
}
