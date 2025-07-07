const axios = require("axios");

exports.handler = async function (event, context) {
  let keyword = "";

  if (event.httpMethod === "POST" && event.body) {
    const body = JSON.parse(event.body);
    keyword = body.search || "";
  } else {
    keyword = event.queryStringParameters.keywords || "";
  }

  const apiUrl = `https://www.mindkits.co.nz/api/v1/products`;
  const allProducts = [];
  const maxPages = 5;

  try {
    for (let page = 1; page <= maxPages; page++) {
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

      if (response.data && response.data.products) {
        allProducts.push(...response.data.products);
        if (!response.data.products.length) break;
      } else {
        break;
      }
    }

    const filtered = keyword
      ? allProducts.filter(p => {
          const name = (p.item_name || "").toLowerCase();
          const short = (p.short_description || "").toLowerCase();
          const long = (p.long_description_1 || "").toLowerCase();
          const key = keyword.toLowerCase();
          return name.includes(key) || short.includes(key) || long.includes(key);
        })
      : allProducts;

    return {
      statusCode: 200,
      body: JSON.stringify({
        total_count: filtered.length,
        products: filtered
      })
    };

  } catch (error) {
    console.error("API request failed:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
