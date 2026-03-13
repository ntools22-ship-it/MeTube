/**
 * Vercel API Route — /api/search?q=query
 * Proxy لـ Invidious بيتجاوز CORS
 * بيشتغل على سيرفر Vercel مش في المتصفح
 */

const INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://yt.artemislena.eu",
  "https://invidious.privacydev.net",
  "https://iv.datura.network",
  "https://invidious.protokolla.fi",
];

export default async function handler(req, res) {
  // CORS headers — السماح للـ frontend بالوصول
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "s-maxage=300"); // cache 5 دقايق

  if (req.method === "OPTIONS") return res.status(200).end();

  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "q parameter required" });

  const path = `/api/v1/search?q=${encodeURIComponent(q)}&type=video&fields=videoId,title,author,lengthSeconds,viewCount,videoThumbnails`;

  for (const instance of INSTANCES) {
    try {
      const response = await fetch(`${instance}${path}`, {
        headers: { "User-Agent": "Mozilla/5.0 MeTube/2.0" },
        signal: AbortSignal.timeout(7000),
      });

      if (!response.ok) continue;

      const data = await response.json();

      // Fix relative thumbnail URLs
      const fixed = data.map((item) => ({
        ...item,
        videoThumbnails: (item.videoThumbnails || []).map((t) => ({
          ...t,
          url: t.url?.startsWith("/") ? `${instance}${t.url}` : t.url,
        })),
        _instance: instance,
      }));

      return res.status(200).json(fixed);
    } catch {
      continue;
    }
  }

  return res.status(503).json({ error: "جميع خوادم Invidious غير متاحة حالياً" });
}
