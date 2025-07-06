const axios = require('axios');

const API_BASE_URL = 'https://www.mindkits.co.nz/api/v1';
const API_KEY = '5ff793a4072fc4482937a02cfbd802a6';

exports.handler = async function(event, context) {
  try {
    const { keywords = '', per_page = 100, page = 1 } = event.queryStringParameters || {};

    // Construct query string using Cart.com filtering syntax
    const query = new URLSearchParams({
      'per_page': per_page,
      'page': page
    });

    if (keywords) {
      query.append('filters[item_name][contains]', keywords);
    }

    const url = `${API_BASE_URL}/products?${query.toString()}`;
    console.log('Final API Request URL:', url); // ✅ Debug output

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
