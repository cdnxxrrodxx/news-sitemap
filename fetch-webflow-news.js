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

  if (!items || !Array.isArray(items)) {
    console.error("❌ No items array returned from Webflow API. Exiting.");
    process.exit(1);
  }

  const now = Date.now();
  const cutoff = now - 1000 * 60 * 60 * 48; // 48 hours

  const recentItems = items.filter(item => {
    const published = new Date(item.lastPublished || item.createdOn);
    return published.getTime() > cutoff;
  });

  const xmlItems = recentItems.map(item => {
    const slug = item.fieldData?.slug || "undefined";
    const title = item.fieldData?.["google-title"] || item.fieldData?.name || "Untitled Article";
    const pubDate = item.lastPublished || item.createdOn;

    return `
  <url>
    <loc>${SITE_BASE_URL}/news/${slug}</loc>
    <news:news>
      <news:publication>
        <news:name>Heavyweight Boxing</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title><![CDATA[${title}]]></news:title>
    </news:news>
  </url>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${xmlItems}
</urlset>`;

  fs.writeFileSync("news-sitemap.xml", xml);
})();
