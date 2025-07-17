const axios = require("axios");

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

  const apiUrl = `https://www.mindkits.co.nz/api/v1/products`;
  const allProducts = [];

  try {
    const startTime = Date.now();
    const maxPages = 20;

    for (let page = 1; page <= maxPages; page++) {
      try {
        const response = await axios.get(apiUrl, {
          headers: {
            "X-AC-Auth-Token": "5ff793a4072fc4482937a02cfbd802a6",
            Accept: "application/json",
          },
          params: {
            per_page: 100,
            page,
          },
        });

        const products = response.data.products || [];
        allProducts.push(...products);

        console.info(`Fetched page ${page}, ${products.length} products`);

        if (products.length < 100) break;

        const elapsed = Date.now() - startTime;
        if (elapsed > 8000) {
          console.warn("Stopping early to avoid timeout");
          break;
        }

      } catch (err) {
        console.warn(`Failed to fetch page ${page}: ${err.message}`);
        break;
      }
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

    const simplified = scored.map((p) => {
      const product = {
        title: p.item_name,
        price: p.price,
        url: `https://www.mindkits.co.nz${p.url_rewrite}`,
      };

      return Object.fromEntries(
        Object.entries(product).filter(([_, value]) => value !== "" && value !== null)
      );
    });

    const responseBody = {
      total_count: simplified.length,
      products: simplified.slice(0, 10),
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
