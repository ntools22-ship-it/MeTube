export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "ID required" });

  // السيرفر الذي نجح في اختبار Colab
  const primaryInstance = "https://invidious.projectsegfau.lt";
  
  // بناء رابط الصوت المباشر (itag 140 هو كود الصوت فقط في يوتيوب)
  const streamUrl = `${primaryInstance}/latest_version?id=${id}&itag=140&local=true`;

  // توجيه المتصفح مباشرة لتشغيل الملف
  return res.redirect(302, streamUrl);
}
