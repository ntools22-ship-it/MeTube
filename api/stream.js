/**
 * Vercel API Route — /api/stream?id=VIDEO_ID&itag=140
 * يجيب رابط الصوت من سيرفر Invidious
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
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { id, itag = "140" } = req.query;
  if (!id) return res.status(400).json({ error: "id required" });

  for (const instance of INSTANCES) {
    try {
      // أولاً: جرّب /latest_version (أسرع)
      const streamUrl = `${instance}/latest_version?id=${id}&itag=${itag}&local=true`;
      const check = await fetch(streamUrl, {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
        redirect: "follow",
      });

      if (check.ok || check.status === 200) {
        return res.status(200).json({ url: streamUrl, instance });
      }

      // ثانياً: جرّب API videos endpoint
      const apiRes = await fetch(
        `${instance}/api/v1/videos/${id}?fields=adaptiveFormats`,
        { signal: AbortSignal.timeout(7000) }
      );

      if (!apiRes.ok) continue;

      const data = await apiRes.json();
      const formats = data.adaptiveFormats || [];
      const itagNum = parseInt(itag);

      const chosen =
        formats.find((f) => f.itag === itagNum) ||
        formats.find((f) => f.itag === 140) ||
        formats.find((f) => f.type?.startsWith("audio/mp4")) ||
        formats.find((f) => f.type?.startsWith("audio/"));

      if (chosen?.url) {
        return res.status(200).json({ url: chosen.url, instance });
      }
    } catch {
      continue;
    }
  }

  return res.status(503).json({ error: "تعذّر الحصول على رابط الصوت" });
}
