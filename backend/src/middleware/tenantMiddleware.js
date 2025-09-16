// Enhanced middleware for multi-tenant company-based filtering
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async (req, res, next) => {
  try {
    // Extract tenant/company information from multiple sources
    req.tenantId = req.headers['x-tenant-id'] || null;
    req.companyId = req.headers['x-company-id'] || null;
    
    // Get user from authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        // Verify the JWT token and get user
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
          return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }
        
        // Get user details from public.users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, company_id, magasin_id, roles')
          .eq('auth_user_id', user.id)
          .single();
        
        if (userError || !userData) {
          return res.status(401).json({ error: 'Unauthorized: User not found' });
        }
        
        // Set user context
        req.user = {
          ...user,
          ...userData
        };
        
        // Set company context
        if (!req.companyId && userData.company_id) {
          req.companyId = userData.company_id;
        }
        
        // Set magasin context
        if (!req.tenantId && userData.magasin_id) {
          req.tenantId = userData.magasin_id;
        }
        
        // Verify user has access to requested company
        if (req.companyId && userData.company_id !== req.companyId) {
          // Check if user is admin and can access other companies
          const isAdmin = userData.roles && userData.roles.includes('admin');
          if (!isAdmin) {
            return res.status(403).json({ 
              error: 'Forbidden: Access to this company not allowed' 
            });
          }
        }
        
        // Add helper function to filter queries by company
        req.addCompanyFilter = (query) => {
          if (req.companyId) {
            return query.eq('company_id', req.companyId);
          }
          return query;
        };
        
        // Add helper function to filter queries by magasin (for store-level data)
        req.addMagasinFilter = (query) => {
          if (req.tenantId) {
            return query.eq('magasin_id', req.tenantId);
          }
          return query;
        };
        
        console.log(`User ${userData.id} accessing company ${req.companyId}, magasin ${req.tenantId}`);
        
      } catch (tokenError) {
        console.error('Token verification error:', tokenError);
        return res.status(401).json({ error: 'Unauthorized: Token verification failed' });
      }
    } else {
      // No authorization header - allow for public endpoints but no tenant context
      req.user = null;
      req.companyId = null;
      req.tenantId = null;
    }
    
    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    res.status(500).json({ error: 'Internal server error in tenant middleware' });
  }
};
