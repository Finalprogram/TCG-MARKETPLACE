const express = require('express');
const router = express.Router();
const listController = require('../controllers/listController');

router.post('/list/add', listController.addToList);

module.exports = router;