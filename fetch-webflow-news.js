const fs = require("fs");
const fetch = require("node-fetch");

const COLLECTION_ID = "6654c88f22981ae93116a79f";
const WEBFLOW_API_TOKEN = process.env.WEBFLOW_API_TOKEN;
const SITE_BASE_URL = "https://www.heavyweightboxing.com";

(async () => {
  const response = await fetch(`https://api.webflow.com/v2/collections/${COLLECTION_ID}/items?limit=100`, {
    headers: {
      "Authorization": `Bearer ${WEBFLOW_API_TOKEN}`,
      "Accept": "application/json"
    }
  });

  const resJson = await response.json();
  console.log("Status Code:", response.status);
  console.log("Response:", JSON.stringify(resJson, null, 2));

  const items = resJson.items;

  if (!items) {
    console.error("❌ 'items' is missing in the API response. Exiting...");
    process.exit(1);
  }

  const now = Date.now();
  const cutoff = now - 1000 * 60 * 60 * 48; // 48 hours ago

  const recentItems = items.filter(item => {
    const published = new Date(item.lastPublished || item.createdOn);
    return published.getTime() > cutoff;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${recentItems.map(item => `
  <url>
    <loc>${SITE_BASE_URL}/news/${item.fields.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>Heavyweight Boxing</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${item.lastPublished || item.createdOn}</news:publication_date>
      <news:title><![CDATA[${item.fields.name}]]></news:title>
    </news:news>
  </url>`).join("\n")}
</urlset>`;

  fs.writeFileSync("news-sitemap.xml", xml);
})();
