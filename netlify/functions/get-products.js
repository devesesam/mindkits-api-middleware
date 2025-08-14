const axios = require("axios");

exports.handler = async function (event, context) {
  console.info("==== Incoming Request ====");
  console.info("HTTP Method:", event.httpMethod);
  console.info("Request Body:", event.body);
  console.info("==========================");

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  let query = "";
  try {
    const body = JSON.parse(event.body || "{}");
    query = body.search?.trim() || "";
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  const headers = {
    "X-AC-Auth-Token": "5ff793a4072fc4482937a02cfbd802a6",
    Accept: "application/json",
  };

  const baseUrl = "https://www.mindkits.co.nz/api/v1/products";
  let allProducts = [];
  let page = 1;
  const limit = 100;

  try {
    // Keep fetching until no more products are returned
    while (true) {
      const res = await axios.get(baseUrl, {
        headers,
        params: {
          is_enabled: true,
          limit,
          page,
        },
      });

      const products = res.data.products || [];
      if (products.length === 0) break;

      allProducts = allProducts.concat(products);
      page++;
    }

    // Apply filters to remove hidden or discontinued products
    const filtered = allProducts.filter(p =>
      p.is_enabled === true &&
      p.is_hidden !== 1 &&
      p.is_discontinued !== true
    );

    // If a search query was provided, rank by relevance
    let results = filtered;
    if (query) {
      const q = query.toLowerCase();
      results = filtered
        .map((product) => {
          const name = product.item_name?.toLowerCase() || "";
          const description = product.long_description_1?.toLowerCase() || "";
          const keywords = product.keywords?.toLowerCase() || "";
          const itemNumber = product.item_number?.toLowerCase() || "";

          let score = 0;
          if (name.includes(q)) score += 3;
          if (description.includes(q)) score += 2;
          if (keywords.includes(q)) score += 1;
          if (itemNumber === q) score += 5;

          return { ...product, relevanceScore: score };
        })
        .filter(p => p.relevanceScore > 0)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 10); // Top 10 results
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(results),
    };
  } catch (err) {
    console.error("Product lookup failed:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Product lookup failed" }),
    };
  }
};
