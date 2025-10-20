// src/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();

const paymentController = require('../controllers/paymentController');
const { isAuthPage } = require('../middleware/auth');

// Rota para exibir a página de seleção de pagamento
router.get('/', isAuthPage, paymentController.showPayment);

// Rota para processar o pagamento (simulado)
router.post('/process', isAuthPage, paymentController.processPayment);

module.exports = router;
