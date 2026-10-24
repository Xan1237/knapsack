import { NextRequest, NextResponse } from "next/server";
import { analyzePhoto } from "@/lib/vision";
import { requestOriginMatches } from "@/lib/request-origin";
export const runtime = "nodejs";
export const maxDuration = 90;
let active = 0;
export async function POST(request: NextRequest) {
  if (!requestOriginMatches(request))
    return NextResponse.json(
      { error: "This analysis endpoint accepts same-origin requests only." },
      { status: 403 },
    );
  if (!process.env.OPENAI_API_KEY)
    return NextResponse.json(
      {
        error:
          "Photo analysis is not configured. Set OPENAI_API_KEY on the server. You can still add items manually or load the demo.",
      },
      { status: 503 },
    );
  const length = Number(request.headers.get("content-length"));
  if (!Number.isFinite(length) || length <= 0)
    return NextResponse.json(
      { error: "A bounded multipart upload is required." },
      { status: 411 },
    );
  if (length > 6 * 1024 * 1024 + 65536)
    return NextResponse.json(
      { error: "Choose a photo smaller than 6 MB." },
      { status: 413 },
    );
  if (active >= 2)
    return NextResponse.json(
      { error: "Photo analysis is busy. Please retry shortly." },
      { status: 429 },
    );
  active++;
  try {
    const form = await request.formData(),
      file = form.get("photo");
    if (
      !(file instanceof File) ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 6 * 1024 * 1024 ||
      file.size === 0
    )
      return NextResponse.json(
        { error: "Choose a JPEG, PNG or WebP photo up to 6 MB." },
        { status: 400 },
      );
    const buffer = Buffer.from(await file.arrayBuffer());
    const valid =
      file.type === "image/jpeg"
        ? buffer[0] === 0xff && buffer[1] === 0xd8
        : file.type === "image/png"
          ? buffer
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : buffer.toString("ascii", 0, 4) === "RIFF" &&
            buffer.toString("ascii", 8, 12) === "WEBP";
    if (!valid)
      return NextResponse.json(
        { error: "The photo contents do not match its image type." },
        { status: 400 },
      );
    const proposals = await analyzePhoto(
      `data:${file.type};base64,${buffer.toString("base64")}`,
    );
    return NextResponse.json(proposals, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    // Do not log provider payloads, source photos or credentials.
    const timedOut =
      error instanceof Error && /timeout|timed out/i.test(error.message);
    return NextResponse.json(
      {
        error: timedOut
          ? "Photo analysis timed out. Retry, or add items manually."
          : "Photo analysis could not finish. Retry, or add items manually. The existing inventory is safe.",
      },
      { status: 502 },
    );
  } finally {
    active--;
  }
}
