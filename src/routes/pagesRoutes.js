// src/routes/pagesRoutes.js
const express = require('express');
const router = express.Router();

// Importa o controller que acabamos de criar
const pagesController = require('../controllers/pagesController');

// A URL '/' vai chamar a função showHomePage do nosso controller
router.get('/', pagesController.showHomePage);

module.exports = router;