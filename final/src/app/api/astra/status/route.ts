import { NextResponse } from "next/server";
import { astraModel } from "@/lib/model-config";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json(
    {
      configured: !!process.env.OPENAI_API_KEY,
      model: astraModel(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
