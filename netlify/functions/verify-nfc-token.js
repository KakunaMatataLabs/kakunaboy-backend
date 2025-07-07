// netlify/functions/verify-nfc-token.js
const crypto = require('crypto');

// Database simulato (sostituisci con database reale in produzione)
const tokens = {
  "valid_tokens": {
    "POKEMON_ROSSO_001": {
      "id": "POKEMON_ROSSO_001",
      "game": "pokemon_red",
      "active": true,
      "max_uses": 1,
      "current_uses": 0,
      "created_at": "2024-01-01T00:00:00Z"
    },
    "POKEMON_ROSSO_002": {
      "id": "POKEMON_ROSSO_002",
      "game": "pokemon_red", 
      "active": true,
      "max_uses": 1,
      "current_uses": 0,
      "created_at": "2024-01-01T00:00:00Z"
    },
    "POKEMON_ROSSO_003": {
      "id": "POKEMON_ROSSO_003",
      "game": "pokemon_red",
      "active": true, 
      "max_uses": 1,
      "current_uses": 0,
      "created_at": "2024-01-01T00:00:00Z"
    }
  }
};

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { nfc_token, device_id } = JSON.parse(event.body);
    
    console.log(`🔍 Verifica token NFC: ${nfc_token} per device: ${device_id}`);
    
    // Verifica se il token esiste ed è attivo
    const tokenData = tokens.valid_tokens[nfc_token];
    
    if (!tokenData) {
      console.log(`❌ Token non trovato: ${nfc_token}`);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Token NFC non valido'
        })
      };
    }
    
    if (!tokenData.active) {
      console.log(`❌ Token disattivato: ${nfc_token}`);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Token NFC disattivato'
        })
      };
    }
    
    if (tokenData.current_uses >= tokenData.max_uses) {
      console.log(`❌ Token esaurito: ${nfc_token}`);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Token NFC già utilizzato'
        })
      };
    }
    
    // Token valido - genera URL di download firmato
    const secretKey = process.env.SECRET_KEY || 'default-secret-key';
    const expires = Date.now() + (60 * 60 * 1000); // 1 ora
    
    const downloadData = {
      token: nfc_token,
      device_id: device_id,
      expires: expires,
      game: tokenData.game
    };
    
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(JSON.stringify(downloadData))
      .digest('hex');
    
    console.log(`✅ Token valido: ${nfc_token} - Accesso autorizzato`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Token NFC valido',
        game_info: {
          name: 'Pokemon Rosso',
          platform: 'Game Boy',
          description: 'Il classico Pokemon Rosso per Game Boy'
        },
        download_token: {
          token: nfc_token,
          signature: signature,
          expires: expires,
          download_url: `/.netlify/functions/download-rom?token=${nfc_token}&device_id=${device_id}&expires=${expires}&signature=${signature}`
        }
      })
    };
    
  } catch (error) {
    console.error('❌ Errore verifica token:', error);
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
