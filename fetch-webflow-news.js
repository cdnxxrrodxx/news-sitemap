const fs = require("fs");
const fetch = require("node-fetch");

const COLLECTION_ID = "6654c88f22981ae93116a79f";
const WEBFLOW_API_TOKEN = process.env.WEBFLOW_API_TOKEN;
const SITE_BASE_URL = "https://www.heavyweightboxing.com";

(async () => {
  const items = [];
  const limit = 100;
  let offset = 0;

  while (true) {
    const response = await fetch(
      `https://api.webflow.com/v2/collections/${COLLECTION_ID}/items/live?limit=${limit}&offset=${offset}`,
      {
        headers: {
          "Authorization": `Bearer ${WEBFLOW_API_TOKEN}`,
          "Accept": "application/json"
        }
      }
    );

    const resJson = await response.json();

    if (!response.ok) {
      throw new Error(`Webflow API request failed with status ${response.status}: ${JSON.stringify(resJson)}`);
    }

    if (!Array.isArray(resJson.items)) {
      throw new Error("No items array returned from Webflow API.");
    }

    items.push(...resJson.items);

    const total = resJson.pagination?.total;
    console.log(`Fetched ${items.length}${Number.isFinite(total) ? ` of ${total}` : ""} live Webflow items.`);

    if (
      resJson.items.length === 0 ||
      (Number.isFinite(total) && items.length >= total) ||
      (!Number.isFinite(total) && resJson.items.length < limit)
    ) {
      break;
    }

    offset += resJson.items.length;
  }

  const now = Date.now();
  const cutoff = now - 1000 * 60 * 60 * 48; // 48 hours

  const recentItems = items.filter(item => (
    !item.isDraft &&
    !item.isArchived &&
    item.fieldData?.["shareable-draft"] !== true
  )).map(item => {
    const pubDate = item.fieldData?.["custom-published-date"];
    const publishedAt = Date.parse(pubDate);

    if (!pubDate || Number.isNaN(publishedAt)) {
      throw new Error(`Missing or invalid custom published date for Webflow item ${item.id}`);
    }

    return { item, pubDate, publishedAt };
  }).filter(({ publishedAt }) => publishedAt > cutoff);

  const xmlItems = recentItems.map(({ item, pubDate }) => {
    const slug = item.fieldData?.slug || "undefined";
    const title = item.fieldData?.["google-title"] || item.fieldData?.name || "Untitled Article";

    return `
  <url>
    <loc>${SITE_BASE_URL}/post/${slug}</loc>
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
