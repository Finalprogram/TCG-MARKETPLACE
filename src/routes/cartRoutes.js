// src/routes/cartRoutes.js
const express = require('express');
const router = express.Router();
// (Vamos criar o cartController a seguir)
const cartController = require('../controllers/cartController');

// Rota para adicionar um item ao carrinho
router.post('/cart/add', cartController.addToCart);

module.exports = router;