// src/controllers/cartController.js

/** Cria/retorna o carrinho na sessão */
function getCart(req) {
  if (!req.session.cart) {
    req.session.cart = { items: [], totalQty: 0, totalPrice: 0 };
  }
  return req.session.cart;
}

/** Recalcula totais do carrinho */
function recompute(cart) {
  let totalQty = 0;
  let totalPrice = 0;
  for (const it of cart.items) {
    totalQty += it.qty;
    totalPrice += it.qty * it.price;
  }
  cart.totalQty = totalQty;
  cart.totalPrice = Number(totalPrice.toFixed(2));
}

/** POST /cart/add  (JSON: { cardId, vendorId, price, qty, meta? }) */
async function add(req, res) {
  try {
    const { cardId, vendorId, price, qty, meta } = req.body || {};
    const q = Number(qty);
    const p = Number(price);

    if (!cardId || !vendorId || !Number.isFinite(p) || !Number.isFinite(q) || q < 1) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    const cart = getCart(req);
    const key = `${cardId}:${vendorId}`;

    let found = cart.items.find(i => i.key === key);
    if (!found) {
      found = { key, cardId, vendorId, price: p, qty: 0, meta: meta || null };
      cart.items.push(found);
    } else {
      // atualiza preço/meta opcionalmente
      if (Number.isFinite(p)) found.price = p;
      if (meta) found.meta = { ...(found.meta || {}), ...meta };
    }

    found.qty = Math.min(999, found.qty + q);
    recompute(cart);

    return res.json({ ok: true, count: cart.totalQty, total: cart.totalPrice });
  } catch (err) {
    console.error('cartController.add error:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
}

/** POST /cart/update  (JSON: { key, qty }) */
async function update(req, res) {
  try {
    const { key, qty } = req.body || {};
    const q = Number(qty);
    if (!key || !Number.isFinite(q) || q < 1) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }
    const cart = getCart(req);
    const it = cart.items.find(i => i.key === key);
    if (!it) return res.status(404).json({ error: 'Item não encontrado' });

    it.qty = Math.min(999, q);
    recompute(cart);
    return res.json({ ok: true, count: cart.totalQty, total: cart.totalPrice });
  } catch (err) {
    console.error('cartController.update error:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
}

/** POST /cart/remove  (JSON: { key }) */
async function remove(req, res) {
  try {
    const { key } = req.body || {};
    const cart = getCart(req);
    const before = cart.items.length;
    cart.items = cart.items.filter(i => i.key !== key);
    if (cart.items.length !== before) recompute(cart);
    return res.json({ ok: true, count: cart.totalQty, total: cart.totalPrice });
  } catch (err) {
    console.error('cartController.remove error:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
}

/** POST /cart/clear */
async function clear(req, res) {
  try {
    req.session.cart = { items: [], totalQty: 0, totalPrice: 0 };
    return res.json({ ok: true, count: 0, total: 0 });
  } catch (err) {
    console.error('cartController.clear error:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
}

/** GET /cart  → renderiza página ou retorna JSON se a view não existir */
async function show(req, res) {
  try {
    const cart = getCart(req);
    // Se você já tem EJS:
    return res.render('pages/cart', { cart });
  } catch (err) {
    // fallback em JSON caso a view não exista
    return res.json(getCart(req));
  }
}

async function json(req, res) {
  try {
    // retorna a sessão do carrinho para o modal renderizar no front
    const cart = req.session.cart || { items: [], totalQty: 0, totalPrice: 0 };
    return res.json(cart);
  } catch (err) {
    console.error('cartController.json error:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
}
module.exports = {
  add,
  update,
  remove,
  clear,
  show,
  json,
};
