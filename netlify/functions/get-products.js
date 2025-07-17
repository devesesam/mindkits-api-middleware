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

  if (!keyword) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing search keyword" }),
    };
  }

  const apiUrl = `https://www.mindkits.co.nz/api/v1/products`;
  const products = [];

  try {
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await axios.get(apiUrl, {
        headers: {
          "X-AC-Auth-Token": "5ff793a4072fc4482937a02cfbd802a6",
          Accept: "application/json",
        },
        params: {
          item_name: `like:${keyword}`,
          per_page: perPage,
          page,
        },
      });

      const data = response.data.products || [];
      products.push(...data);

      console.info(`Fetched page ${page}, ${data.length} products`);

      if (data.length < perPage || products.length >= 500) break;
      page++;
    }

    const simplified = products.slice(0, 10).map((p) => {
      return {
        title: p.item_name,
        price: p.price,
        url: `https://www.mindkits.co.nz${p.url_rewrite}`,
      };
    });

    const responseBody = {
      total_count: products.length,
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
