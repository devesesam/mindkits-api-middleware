// netlify/functions/get-order.js
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

  let orderId = "";
  let email = "";
  try {
    const body = JSON.parse(event.body || "{}");
    orderId = (body.order_number || "").trim();
    email = (body.email || "").trim().toLowerCase();
    if (!orderId || !email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing order_number or email" }),
      };
    }
  } catch (err) {
    console.error("JSON parse error:", err.message);
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
    // 1) Fetch by ID only
    const orderRes = await axios.get("https://www.mindkits.co.nz/api/v1/orders", {
      headers,
      params: { id: orderId },
    });

    const orders = (orderRes.data && orderRes.data.orders) || [];
    if (orders.length === 0) {
      console.warn(`Order not found: ${orderId}`);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Order not found" }),
      };
    }

    const order = orders[0];

    // 2) Determine the order's email from common fields (defensive)
    const orderEmail = [
      order.entered_by,
      order.email,
      order.customer_email,
      order.customer && order.customer.email,
      order.billing_address && order.billing_address.email,
      order.shipping_address && order.shipping_address.email,
    ]
      .map((v) => (typeof v === "string" ? v.trim().toLowerCase() : ""))
      .find((v) => v);

    // 3) Verify match
    if (!orderEmail || orderEmail !== email) {
      console.warn(
        `Email mismatch for order ${orderId}. provided=${email} on_order=${orderEmail || "(none)"}`
      );
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Email does not match this order" }),
      };
    }

    // 4) Fetch statuses to translate status id -> name
    const statusRes = await axios.get("https://www.mindkits.co.nz/api/v1/order_statuses", {
      headers,
    });
    const statusMap = {};
    for (const s of (statusRes.data && statusRes.data.order_statuses) || []) {
      statusMap[s.id] = s;
    }
    const status = statusMap[order.order_status_id] || {};

    // 5) Build response matching your schema (and a few helpful extras)
    const result = {
      order_number: String(order.id),
      status_name: status.name || "Unknown",
      is_shipped: !!status.is_shipped,
      is_cancelled: !!status.is_cancelled,
      ordered_at: order.ordered_at || null,
      tracking_url: order.tracking_url || null,
      // (Optional extras not required by schema)
      // total: order.grand_total,
      // shipping_method: order.selected_shipping_method,
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
