// netlify/functions/download-rom.js
const crypto = require('crypto');

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
    const { token, device, expires, signature } = event.queryStringParameters || {};

    if (!token || !device || !expires || !signature) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Parametri mancanti',
          message: 'Link di download non valido'
        })
      };
    }

    // Verifica firma
    const data = `${token}:${device}:${expires}`;
    const expectedSignature = crypto.createHmac('sha256', process.env.SECRET_KEY || 'fallback-secret')
      .update(data)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.log('❌ Invalid signature for download:', { token, device });
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'Firma non valida',
          message: 'Link di download contraffatto o manomesso'
        })
      };
    }

    // Verifica scadenza
    const now = Math.floor(Date.now() / 1000);
    if (now > parseInt(expires)) {
      console.log('❌ Expired download link:', { token, expires: new Date(parseInt(expires) * 1000) });
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'Link scaduto',
          message: 'Il link di download è scaduto. Richiedi un nuovo download.'
        })
      };
    }

    // Log download autorizzato
    console.log('✅ Authorized download:', { 
      token: token, 
      device: device, 
      timestamp: new Date().toISOString(),
      ip: event.headers['x-forwarded-for'] || 'unknown'
    });

    // Per ora redirect a ROM di esempio
    // In produzione, servi il file ROM reale dal tuo storage
    const romUrls = {
      'POKEMON_ROSSO_001': 'https://example.com/roms/pokemon-red-v1.gb',
      'POKEMON_ROSSO_002': 'https://example.com/roms/pokemon-red-v1.gb', 
      'POKEMON_ROSSO_003': 'https://example.com/roms/pokemon-red-v1.gb'
    };

    const romUrl = romUrls[token] || 'https://example.com/roms/pokemon-red-default.gb';

    return {
      statusCode: 302,
      headers: {
        ...headers,
        'Location': romUrl,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      body: ''
    };

  } catch (error) {
    console.error('❌ Download error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Errore del server',
        message: 'Errore interno durante il download'
      })
    };
  }
};
