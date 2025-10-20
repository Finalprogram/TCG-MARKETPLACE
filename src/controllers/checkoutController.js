// src/controllers/checkoutController.js

const User = require('../models/User');
// const { cotarFrete } = require('../services/correiosClient'); // Comentado para trocar para Melhor Envio
const { cotarFreteMelhorEnvio, addItemToCart } = require('../services/melhorEnvioClient');
const { estimatePackageDims } = require('../services/packaging');

// Util: garante que o carrinho exista
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
    const globalCepOrigem = process.env.MELHOR_ENVIO_CEP_ORIGEM; // Usar CEP de origem do Melhor Envio

    // 2. Para cada vendedor, estimar pacote e cotar frete
    for (const sellerId in itemsBySeller) {
      const sellerItems = itemsBySeller[sellerId];
      const sellerName = sellerItems[0]?.meta?.sellerName || 'Vendedor';

      // Buscar CEP do vendedor no banco de dados
      let cepOrigem = globalCepOrigem;
      if (sellerId !== 'sem-vendedor') {
        const seller = await User.findById(sellerId);
        if (seller && seller.address && seller.address.cep) {
          cepOrigem = seller.address.cep;
        } else {
          console.warn(`[checkout] Vendedor ${sellerId} sem CEP definido. Usando CEP global.`);
        }
      }

      // Estimar dimensões e peso
      const { comprimentoCm, larguraCm, alturaCm, pesoKg } = estimatePackageDims(sellerItems);
      const insuranceValue = sellerItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

      // Cotar frete usando o Melhor Envio
      const services = '1,2,18'; // Exemplo: PAC, SEDEX, Jadlog.Package
      const options = await cotarFreteMelhorEnvio({
        fromPostalCode: cepOrigem,
        toPostalCode: zip,
        pkg: {
          width: larguraCm,
          height: alturaCm,
          length: comprimentoCm,
          weight: pesoKg,
          insurance_value: insuranceValue,
        },
        services,
      });

      // Filtra apenas as opções válidas (sem erro) e ordena por preço
      const validOptions = options
        .filter(opt => !opt.error)
        .map(opt => ({ // Adapta o formato da resposta
          servico: opt.id,
          nome: opt.name,
          preco: parseFloat(opt.custom_price || opt.price),
          prazoEmDias: opt.delivery_time,
        }));

      validOptions.sort((a, b) => (a.preco || 0) - (b.preco || 0));
      
      const chosen = validOptions.length > 0 ? validOptions[0] : null;

      packages.push({ sellerId, sellerName, options: validOptions, chosen });
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
    const cart = getCart(req);
    const fixedShipping = 15;
    const subtotal = cart.totalPrice || 0;
    const grandTotal = subtotal + fixedShipping;

    req.session.totals = {
      subtotal: subtotal,
      shipping: fixedShipping,
      grand: grandTotal,
    };

    res.redirect('/payment');
  } catch (e) {
    console.error(e);
    res.status(400).send('Erro ao processar o checkout');
  }
}

module.exports = { showCheckout, quoteDetailed, confirm };

/** POST /checkout/add-to-cart */
async function addToCart(req, res) {
  try {
    const { sellerId, shipping } = req.body;
    const userId = req.session.user.id;

    if (!sellerId || !shipping || !shipping.servico) {
      return res.status(400).json({ ok: false, error: 'sellerId and shipping service are required' });
    }

    const cart = getCart(req);
    const sellerItems = (cart.items || []).filter(item => item.vendorId === sellerId);

    if (sellerItems.length === 0) {
      return res.status(400).json({ ok: false, error: 'No items in cart for this seller' });
    }

    const seller = await User.findById(sellerId);
    const buyer = await User.findById(userId);

    if (!seller || !buyer) {
      return res.status(404).json({ ok: false, error: 'Seller or buyer not found' });
    }
    
    // Ensure seller and buyer have address information
    if (!seller.address || !seller.address.cep || !buyer.address || !buyer.address.cep) {
        return res.status(400).json({ ok: false, error: 'Seller or buyer is missing address information' });
    }


    const { comprimentoCm, larguraCm, alturaCm, pesoKg } = estimatePackageDims(sellerItems);
    const insuranceValue = sellerItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

    const shipmentDetails = {
      service: shipping.servico,
      from: {
        name: seller.name,
        phone: seller.phone,
        email: seller.email,
        document: seller.document, // Assuming CPF/CNPJ is stored here
        address: seller.address.street,
        complement: seller.address.complement,
        number: seller.address.number,
        district: seller.address.district,
        city: seller.address.city,
        state_abbr: seller.address.state,
        country_id: 'BR',
        postal_code: seller.address.cep,
      },
      to: {
        name: buyer.name,
        phone: buyer.phone,
        email: buyer.email,
        document: buyer.document,
        address: buyer.address.street,
        complement: buyer.address.complement,
        number: buyer.address.number,
        district: buyer.address.district,
        city: buyer.address.city,
        state_abbr: buyer.address.state,
        country_id: 'BR',
        postal_code: buyer.address.cep,
      },
      products: sellerItems.map(item => ({
        name: item.meta.cardName,
        quantity: item.qty,
        unitary_value: item.price,
      })),
      volumes: [{
        height: alturaCm,
        width: larguraCm,
        length: comprimentoCm,
        weight: pesoKg,
      }],
      options: {
        insurance_value: insuranceValue,
        receipt: false,
        own_hand: false,
        non_commercial: true, // Assuming non-commercial shipment
      },
    };

    const result = await addItemToCart(shipmentDetails);

    res.json({ ok: true, data: result });

  } catch (e) {
    console.error('[checkout] addToCart error:', e);
    res.status(500).json({ ok: false, error: e.message || 'Failed to add to cart' });
  }
}

module.exports = { showCheckout, quoteDetailed, confirm, addToCart };