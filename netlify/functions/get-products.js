const axios = require('axios');

exports.handler = async function(event, context) {
  const API_URL = 'https://www.mindkits.co.nz/api/v1/products';
  const API_KEY = '5ff793a4072fc4482937a02cfbd802a6';

  try {
    const response = await axios.get(API_URL, {
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
    console.error('Error fetching products:', error.response?.data || error.message);
    return {
      statusCode: error.response?.status || 500,
      body: JSON.stringify({ error: 'Failed to fetch products' })
    };
  }
};
