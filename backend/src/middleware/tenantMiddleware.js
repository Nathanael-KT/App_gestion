const supabase = require('../utils/supabaseClient');

// Middleware pour récupérer le tenant à partir du header, du token ou autre
module.exports = async (req, res, next) => {
  try {
    // Try to get tenant from header first
    req.tenantId = req.headers['x-tenant-id'] || null;
    
    // If no tenant in header, try to get from user's auth token
    if (!req.tenantId) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        // Verify token and get user
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (!error && user) {
          // Get user's company
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('company_id')
            .eq('auth_user_id', user.id)
            .single();
          
          if (!userError && userData) {
            req.tenantId = userData.company_id;
            req.user = { id: userData.id, auth_user_id: user.id };
          }
        }
      }
    }
    
    // For certain routes, tenant is required
    const requiresTenant = req.path.startsWith('/api/') && 
                          !req.path.includes('/companies') && 
                          !req.path.includes('/auth');
    
    if (requiresTenant && !req.tenantId) {
      return res.status(400).json({ 
        error: 'Tenant ID required. Please set x-tenant-id header or ensure user is authenticated with a company.' 
      });
    }
    
    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    next(); // Continue even if tenant detection fails
  }
};
