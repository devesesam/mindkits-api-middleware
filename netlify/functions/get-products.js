const axios = require("axios");

exports.handler = async function (event, context) {
  console.info("==== Incoming Request ====");
  console.info("HTTP Method:", event.httpMethod);
  console.info("Request Body:", event.body);
  console.info("==========================");

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  const headers = {
    "X-AC-Auth-Token": "5ff793a4072fc4482937a02cfbd802a6",
    Accept: "application/json",
  };

  try {
    const response = await axios.get("https://www.mindkits.co.nz/api/v1/products", {
      headers,
    });

    const products = (response.data.products || []).filter((product) => {
      return product.is_enabled === true;
    });

    const result = products.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      inventory: product.inventory_level,
    }));

    console.info("==== Filtered Products ====");
    console.info(JSON.stringify(result, null, 2));
    console.info("===========================");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error("Product lookup failed:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Product lookup failed" }),
    };
  }
};
