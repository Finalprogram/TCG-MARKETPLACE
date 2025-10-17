// src/services/melhorEnvioClient.js
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const BASE_URL = process.env.MELHOR_ENVIO_BASE_URL || 'https://sandbox.melhorenvio.com.br';
const CALCULATE_PATH = '/api/v2/me/shipment/calculate';
const TOKEN = process.env.MELHOR_ENVIO_TOKEN;
const USER_AGENT = process.env.MELHOR_ENVIO_USER_AGENT || 'Aplicação (email para contato técnico)';

if (!TOKEN) {
  console.warn('[melhor-envio] MELHOR_ENVIO_TOKEN não definido. Configure seu .env');
}

/**
 * Calcula o frete para um pacote usando a API do Melhor Envio.
 */
async function cotarFreteMelhorEnvio({
  fromPostalCode,
  toPostalCode,
  // Em vez de produtos, agora aceitamos um único pacote
  pkg, // { width, height, length, weight, insurance_value }
  services = '1,2,18', // Exemplo: PAC, SEDEX, Jadlog.Package
  receipt = false,
  ownHand = false,
}) {
  const url = new URL(CALCULATE_PATH, BASE_URL).toString();

  const payload = {
    from: { postal_code: fromPostalCode },
    to: { postal_code: toPostalCode },
    // A API do Melhor Envio aceita tanto 'products' quanto 'package'
    package: {
      width: pkg.width,
      height: pkg.height,
      length: pkg.length,
      weight: pkg.weight,
      insurance_value: pkg.insurance_value,
    },
    options: {
      receipt,
      own_hand: ownHand,
    },
    services,
  };

  console.log('[melhor-envio] Payload enviado:', JSON.stringify(payload, null, 2));
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
        'User-Agent': USER_AGENT,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`[melhor-envio] ${res.status} ${res.statusText} ${text}`);
    }

    return JSON.parse(text);

  } catch (error) {
    console.error(`[melhor-envio] Falha ao calcular o frete: ${error.message}`);
    throw error; // Re-lança o erro para ser tratado pelo chamador
  }
}

module.exports = {
  cotarFreteMelhorEnvio,
};