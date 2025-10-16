const express = require('express');
const router = express.Router();
const listingController = require('../controllers/listingController');
const { isAuthApi } = require('../middleware/auth'); // Importa o middleware centralizado

// Rota para receber o "pacote" de novos anúncios, agora usando isAuthApi
router.post('/listings/bulk-create', isAuthApi, listingController.bulkCreateListings);

module.exports = router;