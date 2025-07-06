const crypto = require('crypto');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

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
    // Verifica autenticazione admin (semplificata)
    const authHeader = event.headers.authorization;
    if (authHeader !== 'Bearer admin-secret-key') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Non autorizzato' })
      };
    }

    const { game, batch_size = 1, expiry_date } = JSON.parse(event.body);

    const tokens = [];
    
    for (let i = 0; i < batch_size; i++) {
      const tokenId = generateTokenId(game);
      const token = {
        id: tokenId,
        game: game,
        created_at: new Date().toISOString(),
        expires_at: expiry_date || '2025-12-31T23:59:59Z',
        max_uses: 1,
        current_uses: 0,
        active: true,
        metadata: {
          cassette_serial: `${game.toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
          production_batch: `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`
        }
      };
      
      tokens.push(token);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tokens: tokens,
        message: `${batch_size} token(s) generati per ${game}`
      })
    };

  } catch (error) {
    console.error('Token generation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Errore nella generazione dei token' })
    };
  }
};

function generateTokenId(game) {
  const prefix = game.toUpperCase().replace('_', '_');
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${prefix}_${timestamp}_${randomPart}`;
}
