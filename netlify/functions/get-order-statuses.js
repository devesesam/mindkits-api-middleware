const axios = require("axios");

exports.handler = async function (event, context) {
  console.info("==== Order Status Request ====");

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  const apiUrl = "https://www.mindkits.co.nz/api/v1/order_statuses";

  try {
    const response = await axios.get(apiUrl, {
      headers: {
        "X-AC-Auth-Token": "5ff793a4072fc4482937a02cfbd802a6",
        Accept: "application/json",
      },
    });

    const rawStatuses = response.data.order_statuses || [];

    const simplifiedStatuses = rawStatuses.map((s) => ({
      id: s.id,
      name: s.name,
      is_open: s.is_open,
      is_declined: s.is_declined,
      is_cancelled: s.is_cancelled,
      is_shipped: s.is_shipped,
      is_fully_refunded: s.is_fully_refunded,
      is_partially_refunded: s.is_partially_refunded,
      is_partially_shipped: s.is_partially_shipped,
      color: s.color,
      created_at: s.created_at,
      updated_at: s.updated_at,
    }));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        total_count: simplifiedStatuses.length,
        statuses: simplifiedStatuses,
      }),
    };
  } catch (err) {
    console.error("Failed to fetch order statuses:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch order statuses" }),
    };
  }
};
