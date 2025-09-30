const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rota para exibir a página de registro
router.get('/register', authController.showRegisterPage);

// Rota para receber os dados do formulário de registro
router.post('/register', authController.registerUser);

module.exports = router;