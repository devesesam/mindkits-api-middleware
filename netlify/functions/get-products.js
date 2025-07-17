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

        // Optional: Stop early if approaching timeout (safety buffer)
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

    // Enhanced multi-word keyword filtering
    const filtered = keyword
      ? allProducts.filter((p) => {
          const fields = [p.item_name, p.short_description, p.long_description_1]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const keywords = keyword.toLowerCase().split(/\s+/);
          return keywords.every((word) => fields.includes(word));
        })
      : allProducts;

    const simplified = filtered.map((p) => {
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
