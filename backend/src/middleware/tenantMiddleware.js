// Middleware pour récupérer le tenant à partir du header, du token ou autre
module.exports = (req, res, next) => {
  // Exemple: récupérer le tenant depuis un header
  req.tenantId = req.headers['x-tenant-id'] || null;
  // TODO: Ajouter vérification/authentification
  next();
};
