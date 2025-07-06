const axios = require('axios');

const API_BASE_URL = 'https://www.mindkits.co.nz/api/v1';
const API_KEY = '5ff793a4072fc4482937a02cfbd802a6';

exports.handler = async function(event, context) {
  try {
    const { keywords = '', per_page = 100, page = 1 } = event.queryStringParameters || {};

    const query = new URLSearchParams({
      [`filters[item_name][contains]`]: keywords,
      per_page,
      page
    }).toString();

    const url = `${API_BASE_URL}/products?${query}`;

    const response = await axios.get(url, {
      headers: {
        'X-AC-Auth-Token': API_KEY,
        'Accept': 'application/json'
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
