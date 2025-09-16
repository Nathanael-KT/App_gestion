const supabase = require('../utils/supabaseClient');

// Create a new company
exports.createCompany = async (req, res) => {
  try {
    const { name, email, siret, address, phone, website, logo_url, subscription_plan = 'basic' } = req.body;
    
    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const { data, error } = await supabase
      .from('companies')
      .insert([{
        name,
        email,
        siret,
        address,
        phone,
        website,
        logo_url,
        subscription_plan
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('Error creating company:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get all companies (admin only)
exports.getAllCompanies = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (err) {
    console.error('Error fetching companies:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get company by ID
exports.getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(data);
  } catch (err) {
    console.error('Error fetching company:', err);
    res.status(500).json({ error: err.message });
  }
};

// Update company
exports.updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Remove id from update data if present
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.updated_at;

    const { data, error } = await supabase
      .from('companies')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(data);
  } catch (err) {
    console.error('Error updating company:', err);
    res.status(500).json({ error: err.message });
  }
};

// Delete company
exports.deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting company:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get companies for a user (based on user's access)
exports.getUserCompanies = async (req, res) => {
  try {
    const userId = req.user?.id; // Assuming user is set by auth middleware
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's company
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', userId)
      .single();

    if (userError) {
      throw userError;
    }

    if (!userData.company_id) {
      return res.json([]);
    }

    // Get the company details
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', userData.company_id)
      .single();

    if (companyError) {
      throw companyError;
    }

    res.json([companyData]);
  } catch (err) {
    console.error('Error fetching user companies:', err);
    res.status(500).json({ error: err.message });
  }
};

// Set active company for user
exports.setActiveCompany = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { companyId } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    // Verify company exists and user has access
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('id', companyId)
      .eq('is_active', true)
      .single();

    if (companyError || !companyData) {
      return res.status(404).json({ error: 'Company not found or inactive' });
    }

    // Update user's company
    const { data, error } = await supabase
      .from('users')
      .update({ company_id: companyId })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({ message: 'Active company updated successfully', user: data });
  } catch (err) {
    console.error('Error setting active company:', err);
    res.status(500).json({ error: err.message });
  }
};