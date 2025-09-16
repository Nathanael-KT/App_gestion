const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const companyController = require('../controllers/companyController');

// Company routes
router.post('/companies', companyController.createCompany);
router.get('/companies', companyController.getAllCompanies);
router.get('/companies/user', companyController.getUserCompanies);
router.get('/companies/:id', companyController.getCompanyById);
router.put('/companies/:id', companyController.updateCompany);
router.delete('/companies/:id', companyController.deleteCompany);
router.post('/companies/set-active', companyController.setActiveCompany);

// Route pour récupérer les ventes du tenant courant
router.get('/sales', saleController.getSalesByTenant);

module.exports = router;
