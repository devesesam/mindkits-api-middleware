const axios = require("axios");

const API_URL = "https://www.mindkits.co.nz/api/v1/products";
const API_KEY = "5ff793a4072fc4482937a02cfbd802a6";
const MAX_PAGES = 5; // Limit to 5 pages to avoid timeout

exports.handler = async function (event, context) {
  const keyword = (event.queryStringParameters.keywords || "").toLowerCase();

  let allProducts = [];

  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const response = await axios.get(API_URL, {
        headers: {
          "X-AC-Auth-Token": API_KEY,
          "Accept": "application/json"
        },
        params: {
          page,
          per_page: 100
        }
      });

      const pageProducts = response.data.products || [];
      allProducts = allProducts.concat(pageProducts);

      // Stop if we reach the last page
      if (pageProducts.length < 100) break;
    }

    // Filter products by keyword match in item_name, short_description, or long_description_1
    const filtered = keyword
      ? allProducts.filter(p => {
          return (
            (p.item_name || "").toLowerCase().includes(keyword) ||
            (p.short_description || "").toLowerCase().includes(keyword) ||
            (p.long_description_1 || "").toLowerCase().includes(keyword)
          );
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
