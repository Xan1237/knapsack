/** Next normalizes loopback URLs to localhost; browsers can still send 127.0.0.1. */
export function requestOriginMatches(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const actual = new URL(origin),
      url = new URL(request.url);
    const expected = new URL(
      `${url.protocol}//${request.headers.get("host") || url.host}`,
    );
    const loopback = (host: string) =>
      ["localhost", "127.0.0.1", "[::1]"].includes(host);
    return (
      actual.protocol === expected.protocol &&
      actual.port === expected.port &&
      (actual.hostname === expected.hostname ||
        (loopback(actual.hostname) && loopback(expected.hostname)))
    );
  } catch {
    return false;
  }
}
