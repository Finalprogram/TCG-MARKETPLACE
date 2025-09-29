// src/routes/cardRoutes.js

const express = require('express');
const router = express.Router();

// A importação está aqui
const cardController = require('../controllers/cardController');

// E o uso da função importada está aqui
router.get('/buscar', cardController.searchCards); // <-- Se a exportação estiver certa, isso agora vai funcionar.

module.exports = router;