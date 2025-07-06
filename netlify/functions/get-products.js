const axios = require("axios");

exports.handler = async function (event, context) {
  const keyword = event.queryStringParameters.keywords || "";
  const apiUrl = `https://www.mindkits.co.nz/api/v1/products?filters[item_name][contains]=${encodeURIComponent(keyword)}`;

  try {
    const response = await axios.get(apiUrl, {
      headers: {
        "X-AC-Auth-Token": "5ff793a4072fc4482937a02cfbd802a6",
        "Accept": "application/json"
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
