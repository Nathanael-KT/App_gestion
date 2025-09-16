export interface Company {
  id: string
  name: string
  email: string
  siret?: string
  address?: string
  phone?: string
  website?: string
  logo_url?: string
  subscription_plan: 'basic' | 'premium' | 'enterprise'
  is_active: boolean
  created_at: string
  updated_at: string
}