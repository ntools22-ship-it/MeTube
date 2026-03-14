/**
 * Vercel API — /api/search?q=query
 * نفس الطريقة اللي نجحت في Colab Cell 3
 * Browser Headers + CONSENT Cookie
 */

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=300");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "q required" });

  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&hl=en&gl=US`;
    
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        // ✅ نفس الـ cookies اللي خلّت Cell 3 يشتغل
        "Cookie": "CONSENT=YES+cb; SOCS=CAI; GPS=1; YSC=test; VISITOR_INFO1_LIVE=test;",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!r.ok) return res.status(r.status).json({ error: `YouTube: ${r.status}` });

    const html = await r.text();

    // استخراج ytInitialData
    const match =
      html.match(/var ytInitialData\s*=\s*({.+?});\s*<\/script>/s) ||
      html.match(/ytInitialData\s*=\s*({.+?});\s*(?:var |<\/script>)/s);

    if (!match?.[1]) {
      // Debug: شوف أول 500 حرف من الـ response
      console.log("HTML preview:", html.substring(0, 500));
      return res.status(500).json({ error: "تعذّر تحليل YouTube", preview: html.substring(0, 200) });
    }

    const data = JSON.parse(match[1]);
    const contents =
      data?.contents?.twoColumnSearchResultsRenderer
        ?.primaryContents?.sectionListRenderer
        ?.contents?.[0]?.itemSectionRenderer?.contents || [];

    const results = [];
    for (const item of contents) {
      const v = item?.videoRenderer;
      if (!v?.videoId) continue;
      results.push({
        videoId: v.videoId,
        title: v.title?.runs?.[0]?.text || v.title?.simpleText || "",
        author: v.ownerText?.runs?.[0]?.text || v.shortBylineText?.runs?.[0]?.text || "",
        lengthSeconds: parseDuration(v.lengthText?.simpleText || ""),
        viewCount: 0,
        thumbnail: `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
      });
      if (results.length >= 20) break;
    }

    return res.status(200).json(results);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function parseDuration(str) {
  if (!str) return 0;
  const p = str.split(":").map(Number);
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  if (p.length === 2) return p[0] * 60 + p[1];
  return 0;
}
