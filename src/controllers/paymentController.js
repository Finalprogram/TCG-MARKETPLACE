// src/controllers/paymentController.js

const Order = require('../models/Order');
const User = require('../models/User');
const Listing = require('../models/Listing');
const { MercadoPagoConfig, Preference } = require('mercadopago');

// Configura as credenciais do Mercado Pago
console.log("MERCADO_PAGO_ACCESS_TOKEN:", process.env.MERCADO_PAGO_ACCESS_TOKEN ? "Loaded" : "Not Loaded");
const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN, options: { timeout: 5000 } });
const preference = new Preference(client);

/** GET /payment */
function showPayment(req, res) {
  res.render('pages/payment');
}

/** POST /payment/process */
async function processPayment(req, res) {
  try {
    const { paymentMethod } = req.body;
    const cart = req.session.cart;
    const totals = req.session.totals;
    const userId = req.session.user.id;

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).send('Carrinho vazio ou inválido.');
    }

    // Para o endereço, vamos usar um placeholder por enquanto, como definido no checkout
    // Em um fluxo real, pegaríamos o endereço selecionado pelo usuário
    const placeholderAddress = "Endereço de entrega placeholder";

    const orderItems = cart.items.map(item => ({
      card: item.cardId,
      listing: item.listingId, // Assumindo que você tenha listingId no carrinho
      seller: item.vendorId,
      quantity: item.qty,
      price: item.price,
      cardName: item.meta.cardName,
      sellerName: item.meta.sellerName,
      marketplaceFee: item.marketplaceFee,
      sellerNet: item.sellerNet,
    }));

    const newOrder = new Order({
      user: userId,
      items: orderItems,
      totals: totals,
      shippingAddress: placeholderAddress,
      status: 'Processing',
    });

    await newOrder.save();

    // Atualiza a quantidade do anúncio
    for (const item of orderItems) {
      if (item.listing) {
        try {
          const listing = await Listing.findById(item.listing);
          if (listing) {
            listing.quantity -= item.quantity;
            if (listing.quantity < 0) {
              listing.quantity = 0; // Garante que a quantidade não fique negativa
            }
            await listing.save();
            console.log(`[payment] Quantidade atualizada para o anúncio #${item.listing}. Nova quantidade: ${listing.quantity}`);
          } else {
            console.warn(`[payment] Anúncio com ID #${item.listing} não encontrado para atualização de quantidade.`);
          }
        } catch (error) {
          console.error(`[payment] Erro ao atualizar a quantidade para o anúncio #${item.listing}:`, error);
          // Decida se quer interromper o processo ou apenas registrar o erro
        }
      }
    }

    console.log(`[payment] Pedido #${newOrder._id} criado com o método: ${paymentMethod}`);

    // Limpa o carrinho da sessão após a compra
    req.session.cart = { items: [], totalQty: 0, totalPrice: 0 };

    res.redirect('/checkout-success');

  } catch (error) {
    console.error('Erro ao processar pagamento e criar pedido:', error);
    res.status(500).send('Erro ao finalizar o pedido.');
  }
}

async function createMercadoPagoPreference(req, res) {
  try {
    const { cartItems, totalAmount } = req.body;

    const items = cartItems.map(item => ({
      title: item.cardName,
      unit_price: Number(item.price),
      quantity: Number(item.qty),
    }));

    const preferenceBody = {
      items,
      external_reference: req.session.user.id, // Usar o ID do usuário como referência externa
      back_urls: {
        success: "http://localhost:3000/payment/mercadopago/success", // TODO: Mudar para URL real
        pending: "http://localhost:3000/payment/mercadopago/pending", // TODO: Mudar para URL real
        failure: "http://localhost:3000/payment/mercadopago/failure", // TODO: Mudar para URL real
      },
    };

    const response = await preference.create({ body: preferenceBody });
    res.json({ init_point: response.init_point });

  } catch (error) {
    console.error("Erro ao criar preferência do Mercado Pago:", error);
    res.status(500).json({ message: "Erro ao criar preferência de pagamento." });
  }
}

async function handleMercadoPagoSuccess(req, res) {
  const { collection_id, collection_status, payment_id, status, external_reference, preference_id } = req.query;
  console.log("Mercado Pago Success:", { collection_id, collection_status, payment_id, status, external_reference, preference_id });
  // TODO: Atualizar o status do pedido no banco de dados para 'Pago'
  // TODO: Limpar o carrinho do usuário
  res.render('pages/checkout-success', { message: "Pagamento aprovado!", paymentStatus: status });
}

async function handleMercadoPagoPending(req, res) {
  const { collection_id, collection_status, payment_id, status, external_reference, preference_id } = req.query;
  console.log("Mercado Pago Pending:", { collection_id, collection_status, payment_id, status, external_reference, preference_id });
  // TODO: Atualizar o status do pedido no banco de dados para 'Pendente'
  res.render('pages/checkout-success', { message: "Pagamento pendente.", paymentStatus: status });
}

async function handleMercadoPagoFailure(req, res) {
  const { collection_id, collection_status, payment_id, status, external_reference, preference_id } = req.query;
  console.log("Mercado Pago Failure:", { collection_id, collection_status, payment_id, status, external_reference, preference_id });
  // TODO: Atualizar o status do pedido no banco de dados para 'Falha'
  res.render('pages/checkout-success', { message: "Pagamento falhou.", paymentStatus: status });
}

module.exports = { showPayment, processPayment, createMercadoPagoPreference, handleMercadoPagoSuccess, handleMercadoPagoPending, handleMercadoPagoFailure };
