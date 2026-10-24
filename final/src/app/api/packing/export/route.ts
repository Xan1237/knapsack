import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { photoSchema } from "@/lib/collection";
import { parsePackingInput } from "@/lib/packing-input";
import { pack } from "@/lib/packing";
import { validatePlan } from "@/lib/validate";
import { requestOriginMatches } from "@/lib/request-origin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!requestOriginMatches(request))
    return NextResponse.json(
      { error: "Use the packing workspace to export your plan." },
      { status: 403 },
    );
  try {
    const form = await request.formData();
    const raw = JSON.parse(String(form.get("collection")));
    const { items, bag } = parsePackingInput(raw);
    const photos = z
      .array(photoSchema)
      .max(12)
      .parse(raw.photos || []);
    const plan = pack(items, bag);
    if (!validatePlan(plan, items, bag).valid) throw new Error("Invalid plan");
    return new NextResponse(
      JSON.stringify(
        {
          schemaVersion: 1,
          units: "mm",
          upAxis: "z",
          bag,
          items,
          photos,
          plan,
          estimated: true,
          algorithm: bag.clamshell
            ? "bounded-clamshell-priority-extreme-edge-v1"
            : "bounded-priority-extreme-edge-v1",
        },
        null,
        2,
      ),
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="knapsack-final-plan.json"',
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Your packing plan could not be exported. Return to the workspace and try again.",
      },
      { status: 400 },
    );
  }
}
