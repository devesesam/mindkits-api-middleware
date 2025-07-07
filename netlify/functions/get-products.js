const axios = require("axios");

exports.handler = async function (event, context) {
  const keyword = event.queryStringParameters.keywords || "";
  const apiUrl = `https://www.mindkits.co.nz/api/v1/products`;
  const perPage = 100;
  let allProducts = [];
  let page = 1;
  let morePages = true;

  try {
    // ⏳ Fetch all pages
    while (morePages) {
      const response = await axios.get(apiUrl, {
        headers: {
          "X-AC-Auth-Token": "5ff793a4072fc4482937a02cfbd802a6",
          "Accept": "application/json"
        },
        params: {
          per_page: perPage,
          page: page
        }
      });

      const products = response.data.products || [];
      allProducts = allProducts.concat(products);

      const nextPageUrl = response.data.next_page;
      morePages = !!nextPageUrl;
      page += 1;
    }

    // 🔍 Filter manually by multiple fields
    const lowerKeyword = keyword.toLowerCase();
    const filtered = keyword
      ? allProducts.filter(p => {
          const searchableText = (
            (p.item_name || "") +
            (p.keywords || "") +
            (p.short_description || "") +
            (p.long_description_1 || "")
          ).toLowerCase();
          return searchableText.includes(lowerKeyword);
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
