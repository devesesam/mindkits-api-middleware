const axios = require("axios");

exports.handler = async function (event, context) {
  console.info("==== Incoming Request ====");
  console.info("HTTP Method:", event.httpMethod);
  console.info("Raw Body:", event.body);
  console.info("==========================");

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  let search = "";
  try {
    const body = JSON.parse(event.body || "{}");
    console.info("Parsed Body:", JSON.stringify(body, null, 2));
    search = (body.search || "").trim();

    if (!search) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing search term" }),
      };
    }
  } catch (err) {
    console.error("JSON parsing error:", err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  const headers = {
    "X-AC-Auth-Token": "5ff793a4072fc4482937a02cfbd802a6",
    Accept: "application/json",
  };

  const allProducts = [];
  let page = 1;
  const pageSize = 100;

  try {
    while (true) {
      const res = await axios.get("https://www.mindkits.co.nz/api/v1/products", {
        headers,
        params: {
          page,
          limit: pageSize,
          is_enabled: true,
          is_hidden: 0,           // integer
          is_discontinued: false  // boolean
        },
      });

      const products = res.data.products || [];
      if (products.length === 0) break;

      allProducts.push(...products);
      if (products.length < pageSize) break;

      page += 1;
    }

    const ranked = allProducts
      .map((product) => {
        const name = product.item_name || "";
        const keywords = product.keywords || "";
        const desc = product.long_description_1 || "";
        const combined = `${name} ${keywords} ${desc}`.toLowerCase();
        const searchTerm = search.toLowerCase();

        let score = 0;
        if (combined.includes(searchTerm)) score += 1;
        if (name.toLowerCase().includes(searchTerm)) score += 2;

        return { product, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(({ product }) => ({
        id: product.id,
        name: product.item_name,
        price: product.price,
        item_number: product.item_number,
        quantity_on_hand: product.quantity_on_hand,
        long_description: product.long_description_1,
        url: product.url_rewrite,
      }));

    console.info("==== Outgoing Response ====");
    console.info(JSON.stringify(ranked, null, 2));
    console.info("===========================");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ranked),
    };
  } catch (err) {
    console.error("Product lookup failed:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Product lookup failed" }),
    };
  }
};
