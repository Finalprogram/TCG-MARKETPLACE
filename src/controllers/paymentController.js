// src/controllers/paymentController.js

const Order = require('../models/Order');
const User = require('../models/User');
const Listing = require('../models/Listing');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const logger = require('../config/logger');

// Configura as credenciais do Mercado Pago
logger.info("MERCADO_PAGO_ACCESS_TOKEN:", process.env.MERCADO_PAGO_ACCESS_TOKEN ? "Loaded" : "Not Loaded");
const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN, options: { timeout: 5000 } });
const preference = new Preference(client);

/** GET /payment */
function showPayment(req, res) {
  logger.info('Payment: showPayment - req.session.shippingAddress:', req.session.shippingAddress);
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

    // Obter o endereço de entrega estruturado da sessão
    const shippingAddress = req.session.shippingAddress;
    if (!shippingAddress) {
      logger.error('Endereço de entrega não encontrado na sessão ao processar pagamento.');
      return res.status(400).send('Endereço de entrega não fornecido.');
    }

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

    // Salvar o endereço de entrega como padrão para o usuário, se logado
    if (req.session.user && req.session.user.id) {
      const user = await User.findById(req.session.user.id);
      if (user) {
        user.defaultShippingAddress = shippingAddress;
        await user.save();
        logger.info(`Endereço de entrega padrão atualizado para o usuário ${user.username}.`);
      }
    }

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
            logger.info(`[payment] Quantidade atualizada para o anúncio #${item.listing}. Nova quantidade: ${listing.quantity}`);
          } else {
            logger.warn(`[payment] Anúncio com ID #${item.listing} não encontrado para atualização de quantidade.`);
          }
        } catch (error) {
          logger.error(`[payment] Erro ao atualizar a quantidade para o anúncio #${item.listing}:`, error);
          // Decida se quer interromper o processo ou apenas registrar o erro
        }
      }
    }

    logger.info(`[payment] Pedido #${newOrder._id} criado com o método: ${paymentMethod}`);

    // Limpa o carrinho da sessão após a compra
    req.session.cart = { items: [], totalQty: 0, totalPrice: 0 };

    res.redirect('/checkout-success');

  } catch (error) {
    logger.error('Erro ao processar pagamento e criar pedido:', error);
    res.status(500).send('Erro ao finalizar o pedido.');
  }
}

async function createMercadoPagoPreference(req, res) {
  try {
    const cart = req.session.cart;
    const totals = req.session.totals;

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ message: 'Carrinho vazio ou inválido.' });
    }

    const userId = req.session.user.id;
    const shippingAddress = req.session.shippingAddress;
    if (!shippingAddress) {
      logger.error('Endereço de entrega não encontrado na sessão ao criar preferência de MP.');
      return res.status(400).json({ message: 'Endereço de entrega não fornecido.' });
    }

    const orderItems = cart.items.map(item => ({
      card: item.cardId,
      listing: item.listingId,
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
      shippingAddress: shippingAddress, // Use the address from the session
      status: 'PendingPayment', // Status indicating that payment is pending
    });

    await newOrder.save();
    logger.info(`[payment] Pedido #${newOrder._id} criado para Mercado Pago.`);

    if (req.session.user && req.session.user.id) {
      const user = await User.findById(req.session.user.id);
      if (user) {
        user.defaultShippingAddress = shippingAddress;
        await user.save();
        logger.info(`Endereço de entrega padrão atualizado para o usuário ${user.username}.`);
      }
    }

    const items = cart.items.map(item => ({
      title: item.meta.cardName,
      unit_price: Number(item.price),
      quantity: Number(item.qty),
    }));

    const preferenceBody = {
      items,
      external_reference: newOrder._id.toString(), // Use the new order ID as the external reference
      back_urls: {
        success: "http://localhost:3000/payment/mercadopago/success",
        pending: "http://localhost:3000/payment/mercadopago/pending",
        failure: "http://localhost:3000/payment/mercadopago/failure",
      },
      notification_url: `http://localhost:3000/payment/mercadopago/webhook?source_news=webhooks`,
      total_amount: totals.grand,
    };

    const response = await preference.create({ body: preferenceBody });
    res.json({ init_point: response.init_point });

  } catch (error) {
    logger.error("Erro ao criar preferência do Mercado Pago:", error);
    res.status(500).json({ message: "Erro ao criar preferência de pagamento." });
  }
}

async function handleMercadoPagoSuccess(req, res) {
  const { collection_id, collection_status, payment_id, status, external_reference, preference_id } = req.query;
  logger.info("Mercado Pago Success:", { collection_id, collection_status, payment_id, status, external_reference, preference_id });
  // TODO: Atualizar o status do pedido no banco de dados para 'Pago'
  // TODO: Limpar o carrinho do usuário
  res.render('pages/checkout-success', { message: "Pagamento aprovado!", paymentStatus: status });
}

async function handleMercadoPagoPending(req, res) {
  const { collection_id, collection_status, payment_id, status, external_reference, preference_id } = req.query;
  logger.info("Mercado Pago Pending:", { collection_id, collection_status, payment_id, status, external_reference, preference_id });
  // TODO: Atualizar o status do pedido no banco de dados para 'Pendente'
  res.render('pages/checkout-success', { message: "Pagamento pendente.", paymentStatus: status });
}

async function handleMercadoPagoFailure(req, res) {
  const { collection_id, collection_status, payment_id, status, external_reference, preference_id } = req.query;
  logger.info("Mercado Pago Failure:", { collection_id, collection_status, payment_id, status, external_reference, preference_id });
  // TODO: Atualizar o status do pedido no banco de dados para 'Falha'
  res.render('pages/checkout-success', { message: "Pagamento falhou.", paymentStatus: status });
}

module.exports = { showPayment, processPayment, createMercadoPagoPreference, handleMercadoPagoSuccess, handleMercadoPagoPending, handleMercadoPagoFailure };
