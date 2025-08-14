// netlify/functions/getproducts.js
const axios = require("axios");

// NOTE: consider moving the token to an env var (MINDKITS_TOKEN) in Netlify
const CART_TOKEN = process.env.MINDKITS_TOKEN || "5ff793a4072fc4482937a02cfbd802a6";
const BASE_URL = "https://www.mindkits.co.nz/api/v1";
const PAGE_SIZE = 100;
const MAX_PAGES = 6; // guardrail so we don't crawl the whole catalog

// ---------- helpers ----------
function pickArrayFromApi(resData) {
  // MindKits/Cart installs vary: results may be in data, data.data, or products
  if (Array.isArray(resData)) return resData;
  if (resData && Array.isArray(resData.data)) return resData.data;
  if (resData && Array.isArray(resData.products)) return resData.products;
  return [];
}

function toPlain(html, max = 220) {
  const txt = String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return txt.length > max ? txt.slice(0, max - 1) + "…" : txt;
}

function absUrl(url) {
  if (!url) return null;
  return /^https?:\/\//i.test(url)
    ? url
    : `https://www.mindkits.co.nz/${String(url).replace(/^\/+/, "")}`;
}

function normalize(s) {
  return (s ?? "")
    .toString()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function scoreProduct(p, qNorm) {
  if (!qNorm) return 0;
  const name = normalize(p.item_name);
  const sku  = normalize(p.item_number);
  const desc = normalize(p.long_description_1);

  if (name.startsWith(qNorm) || sku.startsWith(qNorm)) return 100; // prefix/sku start
  const safe = qNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const wordRe = new RegExp(`\\b${safe}\\b`, "i");
  if (wordRe.test(p.item_name) || wordRe.test(p.long_description_1 ?? "")) return 70; // whole word
  if (name.includes(qNorm)) return 50; // substring in name
  if ((desc ?? "").includes(qNorm)) return 20; // substring in desc
  return 0;
}

// ---------- handler ----------
exports.handler = async function (event, context) {
  console.info("==== Incoming Request ====");
  console.info("HTTP Method:", event.httpMethod);
  console.info("Content-Type:", event.headers?.["content-type"]);
  console.info("Raw Body:", event.body);
  console.info("==========================");

  // If you ever call this from a browser, CORS helps (harmless otherwise)
  const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  };
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: CORS,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  // ---- parse body ----
  let search = "";
  let format = "tawk_text"; // default to a super Tawk-friendly response
  let limit = 4;            // default small for chat UIs (you can override)
  try {
    const body = JSON.parse(event.body || "{}");
    console.info("Parsed Body:", JSON.stringify(body, null, 2));

    search = (body.search || "").trim();
    if (!search) {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ error: "Missing search term" }),
      };
    }

    if (body.format) format = String(body.format);
    if (body.limit) {
      const n = parseInt(body.limit, 10);
      if (!Number.isNaN(n)) limit = Math.min(Math.max(n, 1), 10);
    }
  } catch (err) {
    console.error("JSON parsing error:", err.message);
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  // ---- upstream request config (kept your filters as-is) ----
  const headers = {
    "X-AC-Auth-Token": CART_TOKEN,
    Accept: "application/json",
  };

  const allProducts = [];
  let page = 1;
  const qNorm = normalize(search);

  try {
    while (page <= MAX_PAGES) {
      const res = await axios.get(`${BASE_URL}/products`, {
        headers,
        params: {
          page,
          limit: PAGE_SIZE,
          is_enabled: true,
          is_hidden: 0,            // your original choice retained
          is_discontinued: false,  // your original choice retained
        },
        timeout: 10000,
        validateStatus: (s) => s >= 200 && s < 500, // inspect 4xx/5xx ourselves
      });

      if (res.status === 429 || res.status >= 500) {
        console.warn("Upstream busy:", res.status);
        break;
      }
      if (res.status < 200 || res.status >= 300) {
        console.error("Upstream error:", res.status, String(res.data).slice(0, 200));
        break;
      }

      const products = pickArrayFromApi(res.data);
      if (!products.length) break;
      console.info(`Page ${page} -> ${products.length} items`);

      allProducts.push(...products);

      if (products.length < PAGE_SIZE) break;
      page += 1;

      // small optimization: if we already have lots to rank on, no need to fetch unlimited pages
      if (allProducts.length >= PAGE_SIZE * 3) break;
    }

    // ---- rank & shape ----
    const ranked = allProducts
      .map((p) => ({ product: p, score: scoreProduct(p, qNorm) }))
      .filter((e) => e.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const stockB = (b.product.quantity_on_hand ?? 0) > 0 ? 1 : 0;
        const stockA = (a.product.quantity_on_hand ?? 0) > 0 ? 1 : 0;
        if (stockB !== stockA) return stockB - stockA;
        const priceA = Number(a.product.price ?? 0);
        const priceB = Number(b.product.price ?? 0);
        return priceA - priceB;
      })
      .slice(0, Math.max(limit, 10)) // rank with a little headroom
      .map(({ product }) => ({
        id: product.id,
        name: product.item_name,
        price: product.price,
        item_number: product.item_number,
        quantity_on_hand: product.quantity_on_hand,
        long_description: product.long_description_1,
        url: product.url_rewrite,
      }));

    // ---- convert to Tawk-friendly forms ----
    const clean = ranked.slice(0, limit).map((p) => ({
      title: p.name,
      price: p.price,
      stock: p.quantity_on_hand,
      sku: p.item_number,
      url: absUrl(p.url),
      snippet: toPlain(p.long_description),
    }));

    let responseBody;
    if (format === "tawk_text") {
      // safest: one text blob (many chat renderers like this best)
      const lines = clean.map(
        (p) => `• ${p.title} — $${p.price} — stock: ${p.stock} — ${p.url}`
      );
      responseBody = JSON.stringify({ text: lines.join("\n") });
    } else if (format === "tawk_simple") {
      // simple JSON envelope (no HTML)
      responseBody = JSON.stringify({
        results: clean.map((p) => ({
          title: p.title,
          subtitle: `SKU ${p.sku} • $${p.price} • In stock: ${p.stock}`,
          url: p.url,
          snippet: p.snippet,
        })),
      });
    } else {
      // fallback: array for ReqBin/curl debugging
      responseBody = JSON.stringify(clean);
    }

    console.info("==== Outgoing Response ====");
    console.info(responseBody);
    console.info("===========================");

    return {
      statusCode: 200,
      headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
      body: responseBody,
    };
  } catch (err) {
    console.error("Product lookup failed:", err.message);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: "Product lookup failed" }),
    };
  }
};
