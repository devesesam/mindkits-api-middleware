const axios = require("axios");

exports.handler = async function (event, context) {
  console.log("==== Incoming Request ====");
  console.log("HTTP Method:", event.httpMethod);
  console.log("Query String Parameters:", event.queryStringParameters);
  console.log("Request Body:", event.body);
  console.log("==========================");

  const method = event.httpMethod;

  let keyword = "";
  if (method === "GET") {
    keyword = event.queryStringParameters?.keywords || "";
  } else if (method === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");
      keyword = body.search || "";
    } catch (e) {
      console.error("❌ Failed to parse JSON body:", e.message);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid JSON body" }),
      };
    }
  } else {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const apiUrl = `https://www.mindkits.co.nz/api/v1/products`;
  const allProducts = [];

  try {
    for (let page = 1; page <= 5; page++) {
      const response = await axios.get(apiUrl, {
        headers: {
          "X-AC-Auth-Token": "5ff793a4072fc4482937a02cfbd802a6",
          "Accept": "application/json",
        },
        params: {
          per_page: 100,
          page,
        },
      });

      const products = response.data.products || [];
      allProducts.push(...products);

      if (products.length < 100) break;
    }

    const filtered = keyword
      ? allProducts.filter((p) =>
          [p.item_name, p.short_description, p.long_description_1]
            .filter(Boolean)
            .some((field) =>
              field.toLowerCase().includes(keyword.toLowerCase())
            )
        )
      : allProducts;

    return {
      statusCode: 200,
      body: JSON.stringify({
        total_count: filtered.length,
        products: filtered,
        debug_keyword: keyword,
      }),
    };
  } catch (error) {
    console.error("❌ API request failed:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
