const axios = require("axios");

exports.handler = async function (event, context) {
  console.info("==== Incoming Request ====");
  console.info("HTTP Method:", event.httpMethod);
  console.info("Request Body:", event.body);
  console.info("==========================");

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  let orderNumber = "";
  try {
    const body = JSON.parse(event.body || "{}");
    orderNumber = body.order_number?.trim();
    if (!orderNumber) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing order_number" }),
      };
    }
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  const headers = {
    "X-AC-Auth-Token": "5ff793a4072fc4482937a02cfbd802a6",
    Accept: "application/json",
  };

  try {
    // Step 1: Get order_statuses to map ID to name
    const statusRes = await axios.get("https://www.mindkits.co.nz/api/v1/order_statuses", { headers });
    const statusMap = {};
    for (const s of statusRes.data.order_statuses || []) {
      statusMap[s.id] = s;
    }

    // Step 2: Lookup order by order_number
    const orderRes = await axios.get("https://www.mindkits.co.nz/api/v1/orders", {
      headers,
      params: { order_number: orderNumber },
    });

    const orders = orderRes.data.orders || [];
    if (orders.length === 0) {
      console.warn(`Order not found: ${orderNumber}`);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Order not found" }),
      };
    }

    const order = orders[0];
    const status = statusMap[order.order_status_id] || {};

    const result = {
      order_number: order.order_number,
      status_name: status.name || "Unknown",
      is_shipped: !!status.is_shipped,
      is_cancelled: !!status.is_cancelled,
      ordered_at: order.ordered_at || null,
      tracking_url: order.tracking_url || null // update if needed
    };

    console.info("==== Response Body ====");
    console.info(JSON.stringify(result, null, 2));
    console.info("=======================");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error("Order lookup failed:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Order lookup failed" }),
    };
  }
};
