// src/routes/checkoutRoutes.js
const express = require('express');
const router = express.Router();

const checkout = require('../controllers/checkoutController');
const { isAuthApi } = require('../middleware/auth');

// NUNCA chame as funções aqui (sem parênteses)
router.get('/', checkout.showCheckout);
router.post('/quote-detailed', checkout.quoteDetailed);
router.post('/confirm', checkout.confirm);
router.post('/add-to-cart', isAuthApi, checkout.addToCart);

module.exports = router;
