// src/routes/checkoutRoutes.js
const express = require('express');
const router = express.Router();
const checkout = require('../controllers/checkoutController');

router.get('/checkout', checkout.show);
router.post('/checkout/quote', express.json(), checkout.quote);
router.post('/checkout/confirm', express.urlencoded({ extended: true }), checkout.confirm);

module.exports = router;
