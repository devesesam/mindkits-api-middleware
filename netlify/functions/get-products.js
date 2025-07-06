const axios = require('axios');

const API_BASE_URL = 'https://www.mindkits.co.nz/api/v1';
const API_KEY = '5ff793a4072fc4482937a02cfbd802a6';

exports.handler = async function(event) {
  try {
    const { keywords = '', per_page = 100, page = 1 } = event.queryStringParameters || {};

    // Use correct Cart.com filter structure
    const queryParams = new URLSearchParams();
    queryParams.append('filters[item_name][contains]', keywords);
    queryParams.append('per_page', per_page);
    queryParams.append('page', page);

    const url = `${API_BASE_URL}/products?${queryParams.toString()}`;
    console.log('➡️ Final URL:', url);

    const response = await axios.get(url, {
      headers: {
        'X-AC-Auth-Token': API_KEY,
        'Accept': 'application/json',
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
