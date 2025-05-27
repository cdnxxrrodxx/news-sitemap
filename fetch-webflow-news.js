const fs = require("fs");
const fetch = require("node-fetch");

const WEBFLOW_API_TOKEN = process.env.WEBFLOW_API_TOKEN;
const COLLECTION_ID = "6654c88f22981ae93116a79f";
const SITE_BASE_URL = "https://www.heavyweightboxing.com";

(async () => {
  const response = await fetch(`https://api.webflow.com/collections/${COLLECTION_ID}/items?limit=100`, {
    headers: {
      Authorization: `Bearer ${WEBFLOW_API_TOKEN}`,
      "accept-version": "1.0.0",
    }
  });

  //const { items } = await response.json();
  const resJson = await response.json();
console.log(JSON.stringify(resJson, null, 2));

const { items } = resJson;
//

  const now = Date.now();
  const cutoff = now - 1000 * 60 * 60 * 48; // 48 hours ago

  const recentItems = items.filter(item => {
    const date = new Date(item["publishDate"] || item["created-on"]).getTime();
    return date > cutoff;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${recentItems.map(item => `
  <url>
    <loc>${SITE_BASE_URL}/news/${item.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>Heavyweight Boxing</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${item["publishDate"] || item["created-on"]}</news:publication_date>
      <news:title><![CDATA[${item.name}]]></news:title>
    </news:news>
  </url>`).join("\n")}
</urlset>`;

  fs.writeFileSync("news-sitemap.xml", xml);
})();
