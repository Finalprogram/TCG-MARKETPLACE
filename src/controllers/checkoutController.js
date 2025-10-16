// src/controllers/checkoutController.js

const User = require('../models/User');
const { cotarFrete } = require('../services/correiosClient');
const { estimatePackageDims } = require('../services/packaging');

// Util: garante que o carrinho exista
// src/controllers/checkoutController.js
function getCart(req) {
  if (!req.session.cart) req.session.cart = { items: [], totalQty: 0, totalPrice: 0 };
  return req.session.cart;
}

function toMoney(n) { return Number(n || 0); }

/** GET /checkout */
async function showCheckout(req, res) {
  const cart = getCart(req);
  const items = (cart.items || []).map(it => ({
    key: it.key,
    cardId: it.cardId,
    vendorId: it.vendorId,
    qty: Number(it.qty || 0),
    price: toMoney(it.price),
    meta: it.meta || {}
  }));

  // subtotal
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);

  // agrupa por vendedor
  const map = new Map();
  for (const it of items) {
    const sid = it.vendorId || 'sem-vendedor';
    const group = map.get(sid) || {
      sellerId: sid,
      sellerName: (it.meta && it.meta.sellerName) || 'Vendedor',
      items: []
    };
    group.items.push({
      name: (it.meta && it.meta.cardName) || it.cardId,
      imageUrl: (it.meta && it.meta.imageUrl) || '',
      condition: (it.meta && it.meta.condition) || '',
      qty: it.qty,
      unit: it.price,
      line: Number((it.qty * it.price).toFixed(2)),
    });
    map.set(sid, group);
  }
  const groups = Array.from(map.values());

  return res.render('pages/checkout', {
    groups, // <- usado para listar cartas por vendedor
    totals: {
      subtotal: Number(subtotal.toFixed(2)),
      shipping: 0,
      grand: Number(subtotal.toFixed(2))
    }
  });
}

/** POST /checkout/quote-detailed */
async function quoteDetailed(req, res) {
  try {
    const { zip } = req.body || {};
    if (!zip) return res.json({ ok: false, error: 'zip required' });

    const cart = getCart(req);
    const items = cart.items || [];

    // 1. Agrupar itens por vendedor
    const itemsBySeller = items.reduce((acc, item) => {
      const sellerId = item.vendorId || 'sem-vendedor';
      if (!acc[sellerId]) acc[sellerId] = [];
      acc[sellerId].push(item);
      return acc;
    }, {});

    const packages = [];
    const globalCepOrigem = process.env.CWS_CEP_ORIGEM;

    // 2. Para cada vendedor, estimar pacote e cotar frete
    for (const sellerId in itemsBySeller) {
      const sellerItems = itemsBySeller[sellerId];
      const sellerName = sellerItems[0]?.meta?.sellerName || 'Vendedor';

      // Buscar CEP do vendedor no banco de dados
      let cepOrigem = globalCepOrigem;
      if (sellerId !== 'sem-vendedor') {
        const seller = await User.findById(sellerId);

        // DEBUG: Inspecionar o objeto do vendedor que veio do banco
        if (seller) {
            console.log(`[checkout] Verificando vendedor para frete:`, seller.toObject());
        } else {
            console.log(`[checkout] Vendedor com ID ${sellerId} não encontrado.`);
        }

        if (seller && seller.address && seller.address.cep) {
          cepOrigem = seller.address.cep;
        } else {
          console.warn(`[checkout] Vendedor ${sellerId} sem CEP definido. Usando CEP global.`);
        }
      }

      // Estimar dimensões e peso
      const { comprimentoCm, larguraCm, alturaCm, pesoKg } = estimatePackageDims(sellerItems);

      // Cotar frete para os serviços desejados
      const servicos = ['04510', '04014']; // PAC, SEDEX
      const options = await cotarFrete({
        cepOrigem,
        cepDestino: zip,
        servicos,
        pesoKg,
        comprimentoCm,
        larguraCm,
        alturaCm,
      });

      // Filtra apenas as opções válidas (sem erro) e ordena por preço
      const validOptions = options.filter(opt => !opt.erro);
      validOptions.sort((a, b) => (a.preco || 0) - (b.preco || 0));
      
      // O frete escolhido por padrão é o mais barato dos válidos
      const chosen = validOptions.length > 0 ? validOptions[0] : null;

      packages.push({ sellerId, sellerName, options, chosen });
    }

    // 3. Calcular totais
    const subtotal = Number((cart.totalPrice || 0).toFixed(2));
    const shipping = packages.reduce((s, p) => s + (p.chosen?.preco || 0), 0);
    const totals = {
      subtotal,
      shipping: Number(shipping.toFixed(2)),
      grand: Number((subtotal + shipping).toFixed(2)),
    };

    res.json({ ok: true, packages, totals });

  } catch (e) {
    console.error('[checkout] quoteDetailed error:', e);
    res.json({ ok: false, error: e.message || 'quote failed' });
  }
}

/** POST /checkout/confirm  (ajuste ao seu fluxo de pedido) */
async function confirm(req, res) {
  try {
    const selections = JSON.parse(req.body.shippingSelections || '[]');
    // persista o pedido, etc.
    res.redirect('/pedido/confirmado');
  } catch (e) {
    console.error(e);
    res.status(400).send('Erro ao finalizar');
  }
}

module.exports = { showCheckout, quoteDetailed, confirm };
