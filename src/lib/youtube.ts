/**
 * Vercel Serverless Function — /api/search?q=query
 * يسكرب YouTube مباشرة بدون API key وبدون Invidious
 */

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "s-maxage=300");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "q required" });

  try {
    // YouTube search page scraping
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&hl=en`;
    
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) throw new Error(`YouTube responded ${response.status}`);

    const html = await response.text();

    // Extract ytInitialData JSON from the page
    const match = html.match(/var ytInitialData = ({.+?});<\/script>/s) ||
                  html.match(/ytInitialData\s*=\s*({.+?});\s*(?:\/\/|<\/script>)/s);

    if (!match) throw new Error("Could not parse YouTube response");

    const data = JSON.parse(match[1]);

    // Navigate to video results
    const contents =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
        ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];

    const results = [];

    for (const item of contents) {
      const v = item?.videoRenderer;
      if (!v?.videoId) continue;

      const title = v.title?.runs?.[0]?.text || v.title?.simpleText || "";
      const author = v.ownerText?.runs?.[0]?.text || v.shortBylineText?.runs?.[0]?.text || "";
      const duration = v.lengthText?.simpleText || "0:00";
      const viewText = v.viewCountText?.simpleText || v.shortViewCountText?.simpleText || "0";
      const thumbnail = `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`;

      results.push({
        videoId: v.videoId,
        title,
        author,
        lengthSeconds: parseDuration(duration),
        viewCount: parseViews(viewText),
        thumbnail,
      });

      if (results.length >= 20) break;
    }

    return res.status(200).json(results);

  } catch (err) {
    console.error("Search error:", err.message);
    return res.status(500).json({ error: "فشل البحث: " + err.message });
  }
}

function parseDuration(str) {
  if (!str) return 0;
  const parts = str.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function parseViews(str) {
  if (!str) return 0;
  const n = str.replace(/[^0-9KMB.]/gi, "");
  if (n.includes("B")) return parseFloat(n) * 1_000_000_000;
  if (n.includes("M")) return parseFloat(n) * 1_000_000;
  if (n.includes("K")) return parseFloat(n) * 1_000;
  return parseInt(n) || 0;
}
