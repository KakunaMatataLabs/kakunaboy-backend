// netlify/functions/download-rom.js
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
        headers: { ...headers, 'Content-Type': 'application/json' },
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
        headers: { ...headers, 'Content-Type': 'application/json' },
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
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'Firma di download non valida'
        })
      };
    }
    
    // Se richiesta è per download file ROM reale
    if (event.queryStringParameters.file === 'rom') {
      try {
        // Path al file ROM nella cartella public/roms
        const romPath = path.join(process.cwd(), 'public', 'roms', 'Pokemon Red.gb');
        
        // Controlla se il file esiste
        if (!fs.existsSync(romPath)) {
          console.log(`❌ File ROM non trovato: ${romPath}`);
          return {
            statusCode: 404,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              success: false,
              error: 'File ROM non trovato'
            })
          };
        }
        
        // Leggi il file ROM
        const romBuffer = fs.readFileSync(romPath);
        
        console.log(`✅ Download ROM autorizzato: ${romPath} (${romBuffer.length} bytes)`);
        
        // Restituisci il file ROM
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': 'attachment; filename="pokemon_red.gb"',
            'Content-Length': romBuffer.length.toString()
          },
          body: romBuffer.toString('base64'),
          isBase64Encoded: true
        };
        
      } catch (error) {
        console.error(`❌ Errore lettura ROM:`, error);
        return {
          statusCode: 500,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            error: 'Errore nella lettura del file ROM'
          })
        };
      }
    }
    
    // Altrimenti restituisci info per download
    const siteUrl = `https://${event.headers.host}`;
    const downloadUrl = `${siteUrl}/.netlify/functions/download-rom?token=${token}&device_id=${device_id}&expires=${expires}&signature=${signature}&file=rom`;
    
    const romData = {
      name: 'Pokemon Rosso',
      filename: 'Pokemon Red.gb',
      size: '1MB',
      format: 'gb',
      download_url: downloadUrl,
      checksum: 'authentic_pokemon_red_rom',
      status: 'ready'
    };
    
    console.log(`✅ Download autorizzato per token: ${token}`);
    
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
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
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Errore interno del server'
      })
    };
  }
};
