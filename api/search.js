export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Query required" });

  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "Accept-Language": "ar,en-US;q=0.9,en;q=0.8"
      }
    });

    const html = await response.text();
    const jsonText = html.split('var ytInitialData = ')[1].split(';</script>')[0];
    const data = JSON.parse(jsonText);
    const contents = data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents;

    const results = contents.map(item => {
      if (item.videoRenderer) {
        const v = item.videoRenderer;
        return {
          type: 'video',
          videoId: v.videoId,
          title: v.title.runs[0].text,
          author: v.ownerText?.runs[0]?.text || "Unknown",
          thumbnail: v.thumbnail.thumbnails[0].url
        };
      }
      return null;
    }).filter(Boolean);

    return res.status(200).json(results);
  } catch (error) {
    return res.status(500).json({ error: "Search failed" });
  }
}
