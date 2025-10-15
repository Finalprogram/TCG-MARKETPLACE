// src/services/correiosClient.js
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const BASE_URL = process.env.CWS_BASE_URL || 'https://cws.correios.com.br';
const PRECO_PATH = process.env.CWS_PRECO_PATH || '/preco/v1/calc';  // CONFIRA NO CWS
const PRAZO_PATH = process.env.CWS_PRAZO_PATH || '/prazo/v1/calc';  // CONFIRA NO CWS
const TOKEN = process.env.CWS_TOKEN;

if (!TOKEN) {
  console.warn('[correios] CWS_TOKEN não definido. Configure seu .env');
}

/**
 * Monta o body conforme o "api-docs" da API de Preço no CWS.
 * Os nomes abaixo são exemplos comuns — ajuste pelos schemas do seu catálogo.
 */
function buildPrecoPayload({
  cepOrigem,
  cepDestino,
  servico,               // ex.: '04014' (SEDEX), '04510' (PAC) — valide seu catálogo
  pesoKg,                // número em kg (ex.: 0.3)
  comprimentoCm, larguraCm, alturaCm, diametroCm = 0,
  contrato = process.env.CWS_CONTRATO,
  cartaoPostagem = process.env.CWS_CARTAO_POSTAGEM,
}) {
  return {
    // campos típicos (exemplos): confirme no "api-docs" da sua conta
    cepOrigem,
    cepDestino,
    codigoServico: servico,
    peso: pesoKg,
    comprimento: comprimentoCm,
    largura: larguraCm,
    altura: alturaCm,
    diametro: diametroCm,
    // quando requerido:
    contrato,
    cartaoPostagem,
    // flags/serviços adicionais (ex.: maoPropria, avisoRecebimento, valorDeclarado) se existirem
  };
}

/** Faz POST na API de Preço */
async function cotarPreco(payload) {
  const url = new URL(PRECO_PATH, BASE_URL).toString();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`[correios] PRECO ${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}

/** (Opcional) Faz POST na API de Prazo */
async function cotarPrazo(payloadPrazo) {
  const url = new URL(PRAZO_PATH, BASE_URL).toString();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payloadPrazo),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`[correios] PRAZO ${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}

/**
 * Helper que calcula **preço** (e opcionalmente **prazo**) para um item.
 * Retorna um array de opções [{servico, nome, preco, prazoEmDias}]
 */
async function cotarFrete({
  cepDestino,
  servicos, // array de códigos de serviço, ex.: ['04014', '04510']
  pesoKg,
  comprimentoCm, larguraCm, alturaCm, diametroCm = 0,
  cepOrigem = process.env.CWS_CEP_ORIGEM,
}) {
  const results = [];

  for (const servico of servicos) {
    const bodyPreco = buildPrecoPayload({
      cepOrigem, cepDestino, servico, pesoKg,
      comprimentoCm, larguraCm, alturaCm, diametroCm
    });

    // Chamada PREÇO
    const precoResp = await cotarPreco(bodyPreco);

    // EXTRAIA dos campos corretos conforme resposta do seu catálogo:
    // abaixo ilustro com nomes genéricos.
    const preco = Number(precoResp?.preco || precoResp?.valor || 0);
    const nomeServico = precoResp?.nomeServico || servico;

    // Se quiser também o prazo, repita com o schema da API de Prazo
    let prazoEmDias = undefined;
    try {
      const prazoResp = await cotarPrazo({
        cepOrigem, cepDestino, codigoServico: servico
      });
      prazoEmDias = Number(prazoResp?.prazoDias || prazoResp?.prazo || 0);
    } catch (e) {
      // se a API de prazo não estiver habilitada, ignore
      console.warn('[correios] prazo indisponível para', servico, e.message);
    }

    results.push({
      servico,
      nome: nomeServico,
      preco,
      prazoEmDias
    });
  }

  return results;
}

module.exports = {
  cotarFrete
};
