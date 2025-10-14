// src/controllers/checkoutController.js
function getCartFromSession(req) {
  const cart = req.session?.cart || { items: [], totalQty: 0, totalPrice: 0 };
  // força números
  cart.totalQty = Number(cart.totalQty || 0);
  cart.totalPrice = Number(cart.totalPrice || 0);
  return cart;
}

const SHIPPING_METHODS = [
  { code: 'standard', name: 'Econômico (5–9 dias)',  price: 14.90 },
  { code: 'express',  name: 'Expresso (2–3 dias)',   price: 29.90 },
  { code: 'pickup',   name: 'Retirar na loja',        price: 0.00  }
];

function computeTotals(cart, shippingCode = 'standard') {
  const ship = SHIPPING_METHODS.find(m => m.code === shippingCode) || SHIPPING_METHODS[0];
  const subtotal = Number(cart.totalPrice || 0);
  const shipping = Number(ship.price || 0);
  const grand = subtotal + shipping;
  return { ship, subtotal, shipping, grand };
}

exports.show = (req, res) => {
  const cart = getCartFromSession(req);
  const { ship, subtotal, shipping, grand } = computeTotals(cart);
  res.render('pages/checkout', {
    cart,
    shippingMethods: SHIPPING_METHODS,
    selectedShipping: ship.code,
    totals: { subtotal, shipping, grand }
  });
};

exports.quote = (req, res) => {
  const cart = getCartFromSession(req);
  const { method } = req.body || {};
  const { ship, subtotal, shipping, grand } = computeTotals(cart, method);
  res.json({
    ok: true,
    method: ship.code,
    totals: { subtotal, shipping, grand }
  });
};

exports.confirm = async (req, res) => {
  const cart = getCartFromSession(req);
  if (!cart.items.length) {
    return res.status(400).render('pages/checkout', {
      cart,
      shippingMethods: SHIPPING_METHODS,
      selectedShipping: 'standard',
      totals: { subtotal: 0, shipping: 0, grand: 0 },
      error: 'Seu carrinho está vazio.'
    });
  }

  const { fullName, email, zip, street, number, city, state, shippingMethod } = req.body || {};
  if (!fullName || !email || !zip || !street || !number || !city || !state) {
    const { ship, subtotal, shipping, grand } = computeTotals(cart, shippingMethod);
    return res.status(400).render('pages/checkout', {
      cart,
      shippingMethods: SHIPPING_METHODS,
      selectedShipping: ship.code,
      totals: { subtotal, shipping, grand },
      error: 'Preencha todos os campos obrigatórios.'
    });
  }

  // TODO: criar pedido no banco / gateway de pagamento
  const fakeOrderId = Math.random().toString(36).slice(2, 10).toUpperCase();

  // limpa carrinho
  req.session.cart = { items: [], totalQty: 0, totalPrice: 0 };

  return res.render('pages/checkout-success', {
    orderId: fakeOrderId,
    email
  });
};
