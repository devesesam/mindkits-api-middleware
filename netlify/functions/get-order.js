// netlify/functions/get-order.js
const axios = require("axios");

exports.handler = async function (event, context) {
  console.info("==== Incoming Request ====");
  console.info("HTTP Method:", event.httpMethod);
  console.info("Query Params:", event.queryStringParameters);
  console.info("Request Body:", event.body);
  console.info("==========================");

  // Accept both POST (JSON body) and GET (query params)
  let orderId = "";
  let emailRaw = "";

  try {
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      orderId = (body.order_number || "").trim();
      // Accept either "email" (preferred) or "entered_by" (legacy)
      emailRaw = (body.email || body.entered_by || "").trim();
    } else if (event.httpMethod === "GET") {
      const qp = event.queryStringParameters || {};
      orderId = (qp.order_number || "").trim();
      emailRaw = (qp.email || qp.entered_by || "").trim();
    } else if (event.httpMethod === "OPTIONS") {
      // (Optional) CORS preflight support if needed
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
        body: "",
      };
    } else {
      return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }
  } catch (err) {
    console.error("JSON parse error:", err.message);
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  if (!orderId || !emailRaw) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing order_number or email" }),
    };
  }

  const email = emailRaw.toLowerCase();

  const headers = {
    "X-AC-Auth-Token": "5ff793a4072fc4482937a02cfbd802a6",
    Accept: "application/json",
  };

  try {
    // 1) Fetch by ID only (Cart.com ignores email when id is present)
    const orderRes = await axios.get("https://www.mindkits.co.nz/api/v1/orders", {
      headers,
      params: { id: orderId },
      timeout: 10000,
    });

    const orders = (orderRes.data && orderRes.data.orders) || [];
    if (orders.length === 0) {
      console.warn(`Order not found: ${orderId}`);
      return { statusCode: 404, body: JSON.stringify({ error: "Order not found" }) };
    }

    const order = orders[0];

    // 2) Determine the order's email from likely fields (normalize)
    const orderEmail =
      [
        order.entered_by,
        order.email,
        order.customer_email,
        order.customer && order.customer.email,
        order.billing_address && order.billing_address.email,
        order.shipping_address && order.shipping_address.email,
      ]
        .map((v) => (typeof v === "string" ? v.trim().toLowerCase() : ""))
        .find(Boolean) || "";

    if (!orderEmail || orderEmail !== email) {
      console.warn(`Email mismatch for order ${orderId}: provided=${email}, on_order=${orderEmail || "(none)"}`);
      return { statusCode: 403, body: JSON.stringify({ error: "Email does not match this order" }) };
    }

    // 3) Translate status id -> name
    const statusRes = await axios.get("https://www.mindkits.co.nz/api/v1/order_statuses", { headers, timeout: 10000 });
    const statusMap = {};
    for (const s of (statusRes.data && statusRes.data.order_statuses) || []) statusMap[s.id] = s;
    const status = statusMap[order.order_status_id] || {};

    // 4) Build response (matches your schema)
    const result = {
      order_number: String(order.id),
      status_name: status.name || "Unknown",
      is_shipped: !!status.is_shipped,
      is_cancelled: !!status.is_cancelled,
      ordered_at: order.ordered_at || null,
      tracking_url: order.tracking_url || null,
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
    return { statusCode: 500, body: JSON.stringify({ error: "Order lookup failed" }) };
  }
};
