const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rota para exibir a página de registro
router.get('/register', authController.showRegisterPage);

// Rota para receber os dados do formulário de registro
router.post('/register', authController.registerUser);

// --- NOVAS ROTAS DE LOGIN ---
// Rota para exibir a página de login
router.get('/login', authController.showLoginPage);

// Rota para receber os dados do formulário de login
router.post('/login', authController.loginUser);
router.get('/logout', authController.logoutUser);
module.exports = router;