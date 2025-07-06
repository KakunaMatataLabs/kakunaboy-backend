// netlify/functions/verify-nfc-token.js
const crypto = require('crypto');

// Database simulato (sostituisci con database reale in produzione)
const tokens = {
  "valid_tokens": {
    "POKEMON_ROSSO_001": {
      "id": "POKEMON_ROSSO_001",
      "game": "pokemon_red",
      "created_at": "2024-01-01T00:00:00Z",
      "expires_at": "2025-12-31T23:59:59Z",
      "max_uses": 100,  // Più utilizzi per autenticazione
      "current_uses": 0,
      "active": true,
      "cassette_serial": "PKM-RED-001",
      "security_level": "high"
    },
    "POKEMON_ROSSO_002": {
      "id": "POKEMON_ROSSO_002", 
      "game": "pokemon_red",
      "created_at": "2024-01-01T00:00:00Z",
      "expires_at": "2025-12-31T23:59:59Z",
      "max_uses": 100,
      "current_uses": 0,
      "active": true,
      "cassette_serial": "PKM-RED-002",
      "security_level": "high"
    },
    "POKEMON_ROSSO_003": {
      "id": "POKEMON_ROSSO_003",
      "game": "pokemon_red", 
      "created_at": "2024-01-01T00:00:00Z",
      "expires_at": "2025-12-31T23:59:59Z",
      "max_uses": 100,
      "current_uses": 0,
      "active": true,
      "cassette_serial": "PKM-RED-003",
      "security_level": "high"
    }
  },
  "access_logs": []
};

exports.handler = async (event, context) => {
  // Headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { nfc_token, device_id, game } = JSON.parse(event.body);
    const clientIP = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';
    const userAgent = event.headers['user-agent'] || 'unknown';

    console.log('🔐 Authentication attempt:', { 
      token: nfc_token, 
      device: device_id, 
      game: game,
      ip: clientIP,
      timestamp: new Date().toISOString()
    });

    // Log del tentativo di accesso
    const accessLog = {
      timestamp: new Date().toISOString(),
      token: nfc_token,
      device_id: device_id,
      ip_address: clientIP,
      user_agent: userAgent,
      action: 'authentication_attempt',
      game_requested: game,
      success: false,
      error_reason: null
    };

    // Verifica che il token esista
    const tokenData = tokens.valid_tokens[nfc_token];
    
    if (!tokenData) {
      accessLog.error_reason = 'token_not_found';
      console.log('❌ Token not found:', nfc_token);
      
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: 'Token di autenticazione non valido',
          message: 'Questa cassetta non è riconosciuta nel sistema KakunaBoy',
          error_code: 'INVALID_TOKEN'
        })
      };
    }

    // Verifica se token è attivo
    if (!tokenData.active) {
      accessLog.error_reason = 'token_disabled';
      console.log('❌ Token disabled:', nfc_token);
      
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: 'Cassetta disattivata',
          message: 'Questa cassetta è stata disattivata. Contatta il supporto.',
          error_code: 'TOKEN_DISABLED'
        })
      };
    }

    // Verifica scadenza
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    if (now > expiresAt) {
      accessLog.error_reason = 'token_expired';
      console.log('❌ Token expired:', nfc_token);
      
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: 'Cassetta scaduta',
          message: 'Questa cassetta è scaduta. Contatta il supporto per il rinnovo.',
          error_code: 'TOKEN_EXPIRED'
        })
      };
    }

    // Verifica gioco corrispondente
    if (tokenData.game !== game) {
      accessLog.error_reason = 'wrong_game';
      console.log('❌ Wrong game:', { expected: tokenData.game, requested: game });
      
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: 'Gioco non corrispondente',
          message: `Questa cassetta è per ${tokenData.game}, non per ${game}`,
          error_code: 'WRONG_GAME'
        })
      };
    }

    // Verifica limite utilizzi (per autenticazione è più alto)
    if (tokenData.current_uses >= tokenData.max_uses) {
      accessLog.error_reason = 'usage_limit_exceeded';
      console.log('❌ Usage limit exceeded:', nfc_token);
      
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: 'Limite utilizzi raggiunto',
          message: 'Questa cassetta ha raggiunto il limite di utilizzi',
          error_code: 'USAGE_LIMIT'
        })
      };
    }

    // ✅ AUTENTICAZIONE RIUSCITA
    accessLog.success = true;
    console.log('✅ Authentication successful:', nfc_token);

    // Incrementa utilizzi (in produzione salva nel database)
    // tokenData.current_uses += 1;

    // Genera session token temporaneo
    const sessionToken = generateSessionToken(nfc_token, device_id);
    
    // Genera URL download firmato
    const downloadUrl = generateSecureDownloadUrl(nfc_token, device_id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        authenticated: true,
        token: nfc_token,
        session_token: sessionToken,
        game: tokenData.game,
        cassette_serial: tokenData.cassette_serial,
        download_url: downloadUrl,
        expires_in: 3600, // URL valido per 1 ora
        auth_level: tokenData.security_level,
        game_info: {
          name: 'Pokemon Rosso',
          platform: 'Game Boy',
          description: 'Il classico Pokemon Rosso per Game Boy',
          size_mb: 1.5,
          version: '1.0'
        },
        message: 'Autenticazione riuscita! Benvenuto in KakunaBoy!'
      })
    };

  } catch (error) {
    console.error('❌ Authentication error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Errore del server',
        message: 'Errore interno durante l\'autenticazione',
        error_code: 'SERVER_ERROR'
      })
    };
  }
};

// Genera token di sessione temporaneo
function generateSessionToken(nfcToken, deviceId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const expires = timestamp + 86400; // 24 ore
  
  const data = `${nfcToken}:${deviceId}:${expires}`;
  const signature = crypto.createHmac('sha256', process.env.SECRET_KEY || 'fallback-secret')
    .update(data)
    .digest('hex');
  
  return Buffer.from(`${data}:${signature}`).toString('base64');
}

// Genera URL download sicuro
function generateSecureDownloadUrl(token, deviceId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const expires = timestamp + 3600; // 1 ora
  
  const data = `${token}:${deviceId}:${expires}`;
  const signature = crypto.createHmac('sha256', process.env.SECRET_KEY || 'fallback-secret')
    .update(data)
    .digest('hex');
  
  const baseUrl = process.env.URL || 'https://kakunaboy-backend.netlify.app';
  return `${baseUrl}/.netlify/functions/download-rom?token=${token}&device=${deviceId}&expires=${expires}&signature=${signature}`;
}
