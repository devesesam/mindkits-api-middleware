const axios = require("axios");

exports.handler = async function (event, context) {
  const method = event.httpMethod;

  let keyword = "";
  if (method === "GET") {
    keyword = event.queryStringParameters.keywords || "";
  } else if (method === "POST") {
    const body = JSON.parse(event.body || "{}");
    keyword = body.search || "";
  }

  const apiUrl = `https://www.mindkits.co.nz/api/v1/products`;
  const allProducts = [];

  try {
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

    return {
      statusCode: 200,
      body: JSON.stringify({
        total_count: filtered.length,
        products: filtered
      })
    };
  } catch (error) {
    console.error("API request failed:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
