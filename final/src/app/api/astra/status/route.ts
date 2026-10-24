import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json(
    {
      configured: !!process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || "gpt-6-astra",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
