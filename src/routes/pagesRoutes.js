// src/routes/pagesRoutes.js
const express = require('express');
const router = express.Router();
const listController = require('../controllers/listController');
// Importa o controller que acabamos de criar
const pagesController = require('../controllers/pagesController');

// A URL '/' vai chamar a função showHomePage do nosso controller
router.get('/', pagesController.showHomePage);
router.get('/lista', listController.showListPage);
router.get('/meus-anuncios', pagesController.showMyListingsPage);

module.exports = router;