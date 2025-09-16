const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');

// Route pour récupérer les ventes du tenant courant
router.get('/sales', saleController.getSalesByTenant);

module.exports = router;
