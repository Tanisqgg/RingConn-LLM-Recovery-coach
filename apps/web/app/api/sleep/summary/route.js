export const runtime = "edge"; // fast on Vercel
const BASE = process.env.BACKEND_URL!; // e.g. https://your-api.onrender.com

export async function GET() {
  const r = await fetch(`${BASE}/sleep/summary`, { cache: "no-store" });
  return new Response(await r.text(), { status: r.status, headers: { "content-type": "application/json" }});
}