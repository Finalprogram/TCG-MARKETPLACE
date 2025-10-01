const express = require('express');
const router = express.Router();
const listingController = require('../controllers/listingController');

// Middleware para garantir que o usuário está autenticado
const isAuth = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.status(401).json({ message: 'Não autorizado. Por favor, faça o login.' });
  }
};

// Rota para receber o "pacote" de novos anúncios
router.post('/listings/bulk-create', isAuth, listingController.bulkCreateListings);

module.exports = router;