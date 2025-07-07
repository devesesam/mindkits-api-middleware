const axios = require("axios");

exports.handler = async function (event, context) {
  const method = event.httpMethod;

  console.info("==== Incoming Request ====");
  console.info("HTTP Method:", method);
  console.info("Query String Parameters:", event.queryStringParameters);
  console.info("Request Body:", event.body);
  console.info("==========================");

  let keyword = "";

  try {
    if (method === "POST") {
      const body = JSON.parse(event.body || "{}");
      keyword = body.search || "";
    } else {
      return {
        statusCode: 405,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Method not allowed. Use POST." })
      };
    }

    const apiUrl = `https://www.mindkits.co.nz/api/v1/products`;
    const allProducts = [];

    for (let page = 1; page <= 5; page++) {
      const response = await axios.get(apiUrl, {
        headers: {
          "X-AC-Auth-Token": "5ff793a4072fc4482937a02cfbd802a6",
          "Accept": "application/json"
        },
        params: {
          per_page: 100,
          page
        }
      });

      const products = response.data.products || [];
      allProducts.push(...products);

      if (products.length < 100) break;
    }

    const filtered = keyword
      ? allProducts.filter(p =>
          [p.item_name, p.short_description, p.long_description_1]
            .filter(Boolean)
            .some(field =>
              field.toLowerCase().includes(keyword.toLowerCase())
            )
        )
      : allProducts;

    const entries = filtered.map(product => {
      const entry = {
        title: product.item_name,
        price: product.price,
        url: `https://www.mindkits.co.nz${product.url_rewrite}`,
        description: product.long_description_1
      };

      // Only include non-empty fields
      Object.keys(entry).forEach(key => {
        if (!entry[key]) delete entry[key];
      });

      return entry;
    });

    const responseBody = {
      total_count: entries.length,
      products: entries
    };

    console.info("==== Response Body ====");
    console.info(JSON.stringify(responseBody, null, 2));
    console.info("=======================");

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(responseBody)
    };
  } catch (error) {
    console.error("API request failed:", error.message);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};
