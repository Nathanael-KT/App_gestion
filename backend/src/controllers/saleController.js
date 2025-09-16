// Exemple de contrôleur pour les ventes multitenant
const prisma = require('../utils/prismaClient');

exports.getSalesByTenant = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID manquant' });
    const sales = await prisma.sale.findMany({ where: { tenantId: Number(tenantId) } });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
