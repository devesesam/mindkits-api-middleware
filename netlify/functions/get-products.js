// netlify/functions/get-products.js
const axios = require("axios");

// tiny helper: strip HTML + collapse whitespace + optional trim
function stripHtml(html = "", max = 500) {
  const text = String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

exports.handler = async function (event, context) {
  console.info("==== Incoming Request ====");
  console.info("HTTP Method:", event.httpMethod);
  console.info("Query String Parameters:", event.queryStringParameters);
  console.info("Request Body:", event.body);
  console.info("==========================");

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  let keyword = "";
  try {
    const body = JSON.parse(event.body || "{}");
    keyword = body.search || "";
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  if (!keyword) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing search keyword" }),
    };
  }

  const searchTerms = keyword
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => `like:${w}`)
    .join("+AND+");

  const apiUrl = `https://www.mindkits.co.nz/api/v1/products`;
  const allProducts = [];
  const perPage = 100;
  let page = 1;

  console.info(`Querying Cart.com with: item_name=${searchTerms}`);

  try {
    while (true) {
      const response = await axios.get(apiUrl, {
        headers: {
          "X-AC-Auth-Token": "5ff793a4072fc4482937a02cfbd802a6",
          Accept: "application/json",
        },
        params: {
          item_name: searchTerms,
          per_page: perPage,
          page,
        },
      });

      const products =
        (response.data && response.data.products) ||
        (response.data && response.data.data) ||
        [];
      allProducts.push(...products);

      console.info(`Fetched page ${page}, ${products.length} products`);

      if (products.length < perPage) break;
      page++;
    }

    const keywords = keyword.toLowerCase().split(/\s+/);
    const scored = allProducts
      .map((p) => {
        const title = (p.item_name || "").toLowerCase();
        const short = (p.short_description || "").toLowerCase();
        const long = (p.long_description_1 || "").toLowerCase();

        let score = 0;
        for (const word of keywords) {
          if (title.includes(word)) score += 3;
          if (title.startsWith(word)) score += 2;
          if (short.includes(word)) score += 1;
          if (long.includes(word)) score += 0.5;
        }

        return { product: p, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ product }) => product);

    const simplified = scored.slice(0, 5).map((p) => ({
      title: p.item_name,
      // Use retail if present and > 0, otherwise fall back to standard price
      price:
        typeof p.retail === "number" && p.retail > 0
          ? p.retail
          : p.price,
      url: `https://www.mindkits.co.nz${p.url_rewrite}`,
      long_description_1: stripHtml(p.long_description_1),
      quantity_on_hand: Number.isFinite(p.quantity_on_hand) ? p.quantity_on_hand : null,
    }));

    const responseBody = {
      total_count: scored.length,
      products: simplified,
    };

    console.info("==== Response Body ====");
    console.info(JSON.stringify(responseBody, null, 2));
    console.info("=======================");

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(responseBody),
    };
  } catch (error) {
    console.error("API request failed:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
