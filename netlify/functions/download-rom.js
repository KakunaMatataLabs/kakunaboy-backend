const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { token, device, expires, signature } = event.queryStringParameters;

    // Verifica firma
    const data = `${token}:${device}:${expires}`;
    const expectedSignature = crypto.createHmac('sha256', 'your-secret-key')
      .update(data)
      .digest('hex');

    if (signature !== expectedSignature) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Firma non valida' })
      };
    }

    // Verifica scadenza
    const now = Math.floor(Date.now() / 1000);
    if (now > parseInt(expires)) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Link scaduto' })
      };
    }

    // Path della ROM (in produzione usa storage cloud)
    const romPath = path.join(__dirname, '../../public/roms/pokemon-red.gb');
    
    // Per ora redirect a ROM di esempio
    return {
      statusCode: 302,
      headers: {
        ...headers,
        'Location': 'https://example.com/pokemon-red-demo.gb'
      },
      body: ''
    };

  } catch (error) {
    console.error('Download error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Errore durante il download' })
    };
  }
};
