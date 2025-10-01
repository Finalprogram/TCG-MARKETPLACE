// src/routes/pagesRoutes.js
const express = require('express');
const router = express.Router();
const pagesController = require('../controllers/pagesController');

// Middleware de autenticação (garanta que ele está aqui)
const isAuth = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
};

router.get('/', pagesController.showHomePage);
router.get('/perfil/:username', pagesController.showProfilePage);

// --- VERIFIQUE SE ESTA LINHA ESTÁ EXATAMENTE ASSIM ---
router.get('/vender', isAuth, pagesController.showSellPage);
// ---------------------------------------------------

module.exports = router;