const axios = require("axios");

exports.handler = async function (event, context) {
  const headers = {
    "X-AC-Auth-Token": "5ff793a4072fc4482937a02cfbd802a6",
    Accept: "application/json",
  };

  try {
    const response = await axios.get("https://www.mindkits.co.nz/api/v1/products", {
      headers,
      params: {
        is_enabled: true,
        per_page: 250, // max per page
        page: 1        // you can loop through more pages if needed
      },
    });

    const products = response.data.products || [];

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(products),
    };
  } catch (err) {
    console.error("Error fetching products:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch products" }),
    };
  }
};
