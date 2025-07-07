// netlify/functions/download-rom.js
const crypto = require('crypto');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { token, device_id, expires, signature } = event.queryStringParameters;
    
    console.log(`📥 Richiesta download ROM per token: ${token}`);
    
    // Verifica parametri richiesti
    if (!token || !device_id || !expires || !signature) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Parametri mancanti per il download'
        })
      };
    }
    
    // Verifica scadenza
    if (Date.now() > parseInt(expires)) {
      console.log(`❌ Link scaduto per token: ${token}`);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Link di download scaduto'
        })
      };
    }
    
    // Verifica firma
    const secretKey = process.env.SECRET_KEY || 'default-secret-key';
    const downloadData = {
      token: token,
      device_id: device_id,
      expires: parseInt(expires),
      game: 'pokemon_red'
    };
    
    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(JSON.stringify(downloadData))
      .digest('hex');
    
    if (signature !== expectedSignature) {
      console.log(`❌ Firma non valida per token: ${token}`);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Firma di download non valida'
        })
      };
    }
    
    // Simulazione download ROM (in produzione caricheresti file reale)
    const romData = {
      name: 'Pokemon Rosso',
      size: '1MB',
      format: 'gb',
      download_url: 'https://archive.org/download/nintendo-game-boy-rom-collection/Pokemon%20Red%20Version%20(USA%2C%20Europe).gb',
      checksum: 'a1b2c3d4e5f6',
      status: 'ready'
    };
    
    console.log(`✅ Download autorizzato per token: ${token}`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Download ROM autorizzato',
        rom_data: romData
      })
    };
    
  } catch (error) {
    console.error('❌ Errore download ROM:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Errore interno del server'
      })
    };
  }
};
