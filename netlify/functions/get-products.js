const axios = require('axios');

const API_BASE_URL = 'https://www.mindkits.co.nz/api/v1';
const API_KEY = '5ff793a4072fc4482937a02cfbd802a6';

exports.handler = async function(event) {
  try {
    const { keywords = '', per_page = 100, page = 1 } = event.queryStringParameters || {};

    // Construct Cart.com-compliant query
    const queryParams = new URLSearchParams();
    queryParams.append('filters[item_name][contains]', keywords);
    queryParams.append('per_page', per_page);
    queryParams.append('page', page);

    const url = `${API_BASE_URL}/products?${queryParams.toString()}`;

    // 🔍 Debug logs for Netlify
    console.log('🔎 Query Parameters:', { keywords, per_page, page });
    console.log('🌐 Final Request URL:', url);

    const response = await axios.get(url, {
      headers: {
        'X-AC-Auth-Token': API_KEY,
        'Accept': 'application/json'
      }
    });

    // 🔍 Log total count received
    console.log('✅ Response total_count:', response.data.total_count);

    return {
      statusCode: 200,
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    console.error('❌ API Request Failed:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
