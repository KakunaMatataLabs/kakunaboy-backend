const crypto = require('crypto');

// Database simulato (in produzione usa Supabase/Firebase)
const tokens = require('../../database/tokens.json');

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

    console.log('Token verification request:', { nfc_token, device_id, game });

    // Verifica token nel database
    const tokenData = tokens.valid_tokens[nfc_token];
    
    if (!tokenData) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: 'Token non valido',
          message: 'Questo token non è riconosciuto nel sistema'
        })
      };
    }

    // Verifica se token è attivo
    if (!tokenData.active) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: 'Token disattivato',
          message: 'Questo token è stato disattivato'
        })
      };
    }

    // Verifica scadenza
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    if (now > expiresAt) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: 'Token scaduto',
          message: 'Questo token è scaduto'
        })
      };
    }

    // Verifica gioco
    if (tokenData.game !== game) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: 'Gioco non corrispondente',
          message: `Questo token è per ${tokenData.game}, non per ${game}`
        })
      };
    }

    // Verifica limite utilizzi
    if (tokenData.current_uses >= tokenData.max_uses) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: 'Limite utilizzi raggiunto',
          message: 'Questo token ha raggiunto il limite di utilizzi'
        })
      };
    }

    // Log dell'accesso
    const accessLog = {
      timestamp: new Date().toISOString(),
      token: nfc_token,
      device_id: device_id,
      ip_address: event.headers['x-forwarded-for'] || 'unknown',
      user_agent: event.headers['user-agent'] || 'unknown',
      success: true
    };

    // In produzione, salva nel database
    console.log('Access log:', accessLog);

    // Token valido - genera URL download
    const downloadUrl = generateSecureDownloadUrl(nfc_token, device_id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        valid: true,
        token: nfc_token,
        game: tokenData.game,
        download_url: downloadUrl,
        expires_in: 3600, // URL valido per 1 ora
        game_info: {
          name: 'Pokemon Rosso',
          platform: 'Game Boy',
          description: 'Il classico Pokemon Rosso per Game Boy'
        }
      })
    };

  } catch (error) {
    console.error('Error verifying token:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Errore interno del server',
        message: 'Errore durante la verifica del token'
      })
    };
  }
};

function generateSecureDownloadUrl(token, deviceId) {
  // Genera URL firmato per download sicuro
  const timestamp = Math.floor(Date.now() / 1000);
  const expires = timestamp + 3600; // Scade in 1 ora
  
  const data = `${token}:${deviceId}:${expires}`;
  const signature = crypto.createHmac('sha256', 'your-secret-key')
    .update(data)
    .digest('hex');
  
  return `https://your-site.netlify.app/.netlify/functions/download-rom?token=${token}&device=${deviceId}&expires=${expires}&signature=${signature}`;
}
