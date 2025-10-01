// src/routes/cardRoutes.js
const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');

// E o uso da função importada está aqui
router.get('/buscar', cardController.searchCards); // <-- Se a exportação estiver certa, isso agora vai funcionar.
router.get('/api/cards/search', cardController.searchCardsForSale);
router.get('/cards/magic', cardController.showMagicCardsPage);
//router.get('/cards/pokemon', cardController.showPokemonCardsPage);
//router.get('/cards/yugioh', cardController.showYuGiOhCardsPage);
//router.get('/cards/onepiece', cardController.showOnePieceCardsPage);
//router.get('/cards/lorcana', cardController.showLorcanaCardsPage);
//router.get('/cards/digimon', cardController.showDigimonCardsPage);

module.exports = router;