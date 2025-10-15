// src/controllers/checkoutController.js

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

/** POST /checkout/quote-detailed  (mantém como você já tem) */
async function quoteDetailed(req, res) {
  try {
    const { zip } = req.body || {};
    if (!zip) return res.json({ ok: false, error: 'zip required' });

    // Monte aqui suas opções de frete por vendedor (exemplo fake):
    const cart = getCart(req);
    const vendors = [...new Set((cart.items || []).map(i => i.vendorId))];

    const packages = vendors.map((sellerId) => {
      const opts = [
        { servico: '04510', nome: 'PAC',  preco: 20.0, prazoEmDias: 7 },
        { servico: '04014', nome: 'SEDEX', preco: 35.0, prazoEmDias: 2 },
      ];
      const chosen = opts.reduce((m, o) => (o.preco < m.preco ? o : m), opts[0]);
      return { sellerId, options: opts, chosen };
    });

    const subtotal = Number((cart.totalPrice || 0).toFixed(2));
    const shipping = packages.reduce((s, p) => s + p.chosen.preco, 0);
    const totals = {
      subtotal,
      shipping: Number(shipping.toFixed(2)),
      grand: Number((subtotal + shipping).toFixed(2)),
    };

    res.json({ ok: true, packages, totals });
  } catch (e) {
    console.error(e);
    res.json({ ok: false, error: 'quote failed' });
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
