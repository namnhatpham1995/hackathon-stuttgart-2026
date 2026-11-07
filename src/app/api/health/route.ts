/** Public liveness check for Railway. It has no session cookie and must not touch the database. */
export function GET() {
  return Response.json({ ok: true });
}
