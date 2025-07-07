const axios = require("axios");

function cleanProduct(product) {
  return Object.fromEntries(
    Object.entries(product).filter(([_, value]) => {
      if (value === null || value === undefined) return false;
      if (typeof value === "string" && value.trim() === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      if (typeof value === "object" && Object.keys(value).length === 0) return false;
      return true;
    })
  );
}

exports.handler = async function (event, context) {
  console.info("==== Incoming Request ====");
  console.info("HTTP Method:", event.httpMethod);
  console.info("Query String Parameters:", event.queryStringParameters);
  console.info("Request Body:", event.body);
  console.info("==========================");

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

    const cleaned = filtered.slice(0, 5).map((p) => {
      const simplified = {
        title: p.item_name,
        price: p.price,
        url: `https://www.mindkits.co.nz${p.url_rewrite}`,
        description: p.short_description || p.long_description_1 || "",
      };
      return cleanProduct(simplified);
    });

    const responseBody = {
      total_count: cleaned.length,
      entries: cleaned,
    };

    console.info("==== Response Body ====");
    console.info(JSON.stringify(responseBody, null, 2));
    console.info("=======================");

    return {
      statusCode: 200,
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
