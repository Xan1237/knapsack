import { normalizeWaitlistEmail, saveWaitlistEmail } from "@/lib/waitlist";

export const runtime = "nodejs";
const MAX_BODY_BYTES = 4096;

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const url = new URL(request.url);
    const host = (
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      url.host
    )
      .split(",")[0]
      .trim();
    const protocol = (
      request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "")
    )
      .split(",")[0]
      .trim();
    const submitted = new URL(origin);
    return submitted.host === host && submitted.protocol === `${protocol}:`;
  } catch {
    return false;
  }
}

async function readBody(request: Request): Promise<string | null> {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Invalid origin." }, { status: 403 });
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    return Response.json({ error: "Invalid request." }, { status: 415 });
  }
  let email: string | null = null;
  try {
    const body = await readBody(request);
    if (!body)
      return Response.json({ error: "Invalid request." }, { status: 400 });
    const data: unknown = JSON.parse(body);
    email = normalizeWaitlistEmail(
      data && typeof data === "object" && "email" in data ? data.email : null,
    );
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!email)
    return Response.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  try {
    saveWaitlistEmail(email);
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "The waitlist is temporarily unavailable." },
      { status: 503 },
    );
  }
}
