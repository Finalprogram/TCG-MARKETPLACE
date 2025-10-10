// src/routes/cartRoutes.js
const express = require('express');
const router = express.Router();
// (Vamos criar o cartController a seguir)
const cartController = require('../controllers/cartController');

// Rota para adicionar um item ao carrinho
router.post('/add-to-cart', cartController.addToCart);

module.exports = router;