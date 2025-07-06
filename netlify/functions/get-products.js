const axios = require("axios");

exports.handler = async function (event, context) {
  const keyword = event.queryStringParameters.keywords || "";
  const apiUrl = `https://www.mindkits.co.nz/api/v1/products`;
  
  try {
    const response = await axios.get(apiUrl, {
      headers: {
        "X-AC-Auth-Token": "5ff793a4072fc4482937a02cfbd802a6",
        "Accept": "application/json"
      }
    });

    const products = response.data.products || [];

    // 🔍 Filter manually
    const filtered = keyword
      ? products.filter(p =>
          (p.item_name || "").toLowerCase().includes(keyword.toLowerCase())
        )
      : products;

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
