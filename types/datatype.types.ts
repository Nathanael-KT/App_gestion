export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      cash_counts: {
        Row: {
          actual_amount: number
          bills_detail: Json | null
          coins_detail: Json | null
          count_type: string
          counted_by: string | null
          created_at: string
          date: string
          difference: number
          expected_amount: number
          id: string
          magasin_id: string | null
          note: string | null
          time: string
          updated_at: string | null
        }
        Insert: {
          actual_amount?: number
          bills_detail?: Json | null
          coins_detail?: Json | null
          count_type?: string
          counted_by?: string | null
          created_at?: string
          date: string
          difference?: number
          expected_amount?: number
          id?: string
          magasin_id?: string | null
          note?: string | null
          time?: string
          updated_at?: string | null
        }
        Update: {
          actual_amount?: number
          bills_detail?: Json | null
          coins_detail?: Json | null
          count_type?: string
          counted_by?: string | null
          created_at?: string
          date?: string
          difference?: number
          expected_amount?: number
          id?: string
          magasin_id?: string | null
          note?: string | null
          time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_counts_magasin_id_fkey"
            columns: ["magasin_id"]
            isOneToOne: false
            referencedRelation: "magasins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cash_counts_counted_by"
            columns: ["counted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_emptying: {
        Row: {
          amount: number
          created_at: string | null
          date: string
          destination: string | null
          emptied_at: string | null
          emptied_by: string | null
          id: string
          magasin_id: string | null
          notes: string | null
          reason: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          date?: string
          destination?: string | null
          emptied_at?: string | null
          emptied_by?: string | null
          id?: string
          magasin_id?: string | null
          notes?: string | null
          reason: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          date?: string
          destination?: string | null
          emptied_at?: string | null
          emptied_by?: string | null
          id?: string
          magasin_id?: string | null
          notes?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_emptying_magasin_id_fkey"
            columns: ["magasin_id"]
            isOneToOne: false
            referencedRelation: "magasins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cash_emptying_emptied_by"
            columns: ["emptied_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          magasin_id: string | null
          note: string | null
          reason: string
          recipient: string | null
          source: string | null
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          magasin_id?: string | null
          note?: string | null
          reason: string
          recipient?: string | null
          source?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          magasin_id?: string | null
          note?: string | null
          reason?: string
          recipient?: string | null
          source?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_transactions_magasin_id_fkey"
            columns: ["magasin_id"]
            isOneToOne: false
            referencedRelation: "magasins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cash_transactions_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          created_at: string
          email: string
          id: string
          magasin_id: string | null
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email: string
          id?: string
          magasin_id?: string | null
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string
          id?: string
          magasin_id?: string | null
          name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_magasin_id_fkey"
            columns: ["magasin_id"]
            isOneToOne: false
            referencedRelation: "magasins"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          backup_frequency: string | null
          backup_retention: number | null
          blocked_menus: string[] | null
          company_address: string | null
          company_email: string
          company_name: string
          company_phone: string | null
          company_siret: string | null
          company_website: string | null
          created_at: string | null
          critical_stock_threshold: number | null
          currency: string | null
          date_format: string | null
          enable_auto_backup: boolean | null
          enable_email_notifications: boolean | null
          enable_invoice_reminders: boolean | null
          enable_stock_alerts: boolean | null
          enable_two_factor: boolean | null
          id: string
          invoice_number_start: number | null
          invoice_prefix: string | null
          language: string | null
          logo_url: string | null
          low_stock_threshold: number | null
          number_format: string | null
          password_min_length: number | null
          session_timeout: number | null
          tax_rate: number | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          backup_frequency?: string | null
          backup_retention?: number | null
          blocked_menus?: string[] | null
          company_address?: string | null
          company_email?: string
          company_name?: string
          company_phone?: string | null
          company_siret?: string | null
          company_website?: string | null
          created_at?: string | null
          critical_stock_threshold?: number | null
          currency?: string | null
          date_format?: string | null
          enable_auto_backup?: boolean | null
          enable_email_notifications?: boolean | null
          enable_invoice_reminders?: boolean | null
          enable_stock_alerts?: boolean | null
          enable_two_factor?: boolean | null
          id?: string
          invoice_number_start?: number | null
          invoice_prefix?: string | null
          language?: string | null
          logo_url?: string | null
          low_stock_threshold?: number | null
          number_format?: string | null
          password_min_length?: number | null
          session_timeout?: number | null
          tax_rate?: number | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          backup_frequency?: string | null
          backup_retention?: number | null
          blocked_menus?: string[] | null
          company_address?: string | null
          company_email?: string
          company_name?: string
          company_phone?: string | null
          company_siret?: string | null
          company_website?: string | null
          created_at?: string | null
          critical_stock_threshold?: number | null
          currency?: string | null
          date_format?: string | null
          enable_auto_backup?: boolean | null
          enable_email_notifications?: boolean | null
          enable_invoice_reminders?: boolean | null
          enable_stock_alerts?: boolean | null
          enable_two_factor?: boolean | null
          id?: string
          invoice_number_start?: number | null
          invoice_prefix?: string | null
          language?: string | null
          logo_url?: string | null
          low_stock_threshold?: number | null
          number_format?: string | null
          password_min_length?: number | null
          session_timeout?: number | null
          tax_rate?: number | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      company_subscription: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          is_paid: boolean | null
          last_payment_date: string | null
          next_due_date: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_paid?: boolean | null
          last_payment_date?: string | null
          next_due_date?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_paid?: boolean | null
          last_payment_date?: string | null
          next_due_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_subscription_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_subscription_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_settings_view"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_closings: {
        Row: {
          actual_count: number
          cash_details: Json | null
          closed_by: string | null
          closing_balance: number
          created_at: string
          date: string
          difference: number
          id: string
          magasin_id: string | null
          notes: string | null
          opening_balance: number
          theoretical_balance: number
          total_cash_in: number
          total_cash_out: number
          total_sales_cash: number
          updated_at: string
        }
        Insert: {
          actual_count?: number
          cash_details?: Json | null
          closed_by?: string | null
          closing_balance?: number
          created_at?: string
          date: string
          difference?: number
          id?: string
          magasin_id?: string | null
          notes?: string | null
          opening_balance?: number
          theoretical_balance?: number
          total_cash_in?: number
          total_cash_out?: number
          total_sales_cash?: number
          updated_at?: string
        }
        Update: {
          actual_count?: number
          cash_details?: Json | null
          closed_by?: string | null
          closing_balance?: number
          created_at?: string
          date?: string
          difference?: number
          id?: string
          magasin_id?: string | null
          notes?: string | null
          opening_balance?: number
          theoretical_balance?: number
          total_cash_in?: number
          total_cash_out?: number
          total_sales_cash?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_closings_magasin_id_fkey"
            columns: ["magasin_id"]
            isOneToOne: false
            referencedRelation: "magasins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_daily_closings_closed_by"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_messages: {
        Row: {
          company_id: string | null
          content: string
          created_at: string | null
          id: string
          username: string
        }
        Insert: {
          company_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          username: string
        }
        Update: {
          company_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_settings_view"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          external_description: string | null
          external_reference: string | null
          id: string
          invoice_id: string
          is_external: boolean
          magasin_id: string | null
          price: number
          product_id: string | null
          quantity: number
        }
        Insert: {
          created_at?: string
          external_description?: string | null
          external_reference?: string | null
          id?: string
          invoice_id: string
          is_external?: boolean
          magasin_id?: string | null
          price: number
          product_id?: string | null
          quantity: number
        }
        Update: {
          created_at?: string
          external_description?: string | null
          external_reference?: string | null
          id?: string
          invoice_id?: string
          is_external?: boolean
          magasin_id?: string | null
          price?: number
          product_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "payment_summary"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "invoice_items_magasin_id_fkey"
            columns: ["magasin_id"]
            isOneToOne: false
            referencedRelation: "magasins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_carreaux"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string
          created_at: string
          date: string
          delivery: boolean | null
          delivery_date: string | null
          delivery_notes: string | null
          id: string
          is_external: boolean
          magasin_id: string | null
          reference: string | null
          status: string
          total: number
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          date?: string
          delivery?: boolean | null
          delivery_date?: string | null
          delivery_notes?: string | null
          id?: string
          is_external?: boolean
          magasin_id?: string | null
          reference?: string | null
          status?: string
          total?: number
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          date?: string
          delivery?: boolean | null
          delivery_date?: string | null
          delivery_notes?: string | null
          id?: string
          is_external?: boolean
          magasin_id?: string | null
          reference?: string | null
          status?: string
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_magasin_id_fkey"
            columns: ["magasin_id"]
            isOneToOne: false
            referencedRelation: "magasins"
            referencedColumns: ["id"]
          },
        ]
      }
      magasins: {
        Row: {
          adresse: string | null
          company_id: string | null
          created_at: string | null
          email: string | null
          id: string
          nom: string
          telephone: string | null
        }
        Insert: {
          adresse?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nom: string
          telephone?: string | null
        }
        Update: {
          adresse?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nom?: string
          telephone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "magasins_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "magasins_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_settings_view"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string | null
          id: string
          invoice_id: string
          magasin_id: string | null
          note: string | null
          payment_date: string
          payment_method: string
          reference: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          company_id?: string | null
          created_at?: string | null
          id?: string
          invoice_id: string
          magasin_id?: string | null
          note?: string | null
          payment_date?: string
          payment_method?: string
          reference?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string | null
          id?: string
          invoice_id?: string
          magasin_id?: string | null
          note?: string | null
          payment_date?: string
          payment_method?: string
          reference?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_settings_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "payment_summary"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "payments_magasin_id_fkey"
            columns: ["magasin_id"]
            isOneToOne: false
            referencedRelation: "magasins"
            referencedColumns: ["id"]
          },
        ]
      }
      product_types: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_settings_view"
            referencedColumns: ["id"]
          },
        ]
      }
      products_carreaux: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_hidden: boolean | null
          largeur: number | null
          longueur: number | null
          name: string
          nbr_pieces: number | null
          price: number
          reference: string | null
          stock: number
          storage_location: string | null
          type_produit: string | null
          unite: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_hidden?: boolean | null
          largeur?: number | null
          longueur?: number | null
          name: string
          nbr_pieces?: number | null
          price: number
          reference?: string | null
          stock: number
          storage_location?: string | null
          type_produit?: string | null
          unite?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_hidden?: boolean | null
          largeur?: number | null
          longueur?: number | null
          name?: string
          nbr_pieces?: number | null
          price?: number
          reference?: string | null
          stock?: number
          storage_location?: string | null
          type_produit?: string | null
          unite?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_type"
            columns: ["type_produit"]
            isOneToOne: false
            referencedRelation: "product_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_carreaux_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_carreaux_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_settings_view"
            referencedColumns: ["id"]
          },
        ]
      }
      stocks: {
        Row: {
          company_id: string | null
          id: string
          location: string | null
          product_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          id?: string
          location?: string | null
          product_id: string
          quantity: number
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          id?: string
          location?: string | null
          product_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stocks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stocks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_settings_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stocks_product_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_carreaux"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          company_id: string | null
          created_at: string
          email: string
          id: string
          magasin_id: string | null
          name: string | null
          password_hash: string | null
          phone: string | null
          roles: string[]
        }
        Insert: {
          auth_user_id?: string | null
          company_id?: string | null
          created_at?: string
          email: string
          id?: string
          magasin_id?: string | null
          name?: string | null
          password_hash?: string | null
          phone?: string | null
          roles?: string[]
        }
        Update: {
          auth_user_id?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          id?: string
          magasin_id?: string | null
          name?: string | null
          password_hash?: string | null
          phone?: string | null
          roles?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_settings_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_magasin_id_fkey"
            columns: ["magasin_id"]
            isOneToOne: false
            referencedRelation: "magasins"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      company_settings_view: {
        Row: {
          backup_frequency: string | null
          backup_retention: number | null
          company_address: string | null
          company_email: string | null
          company_name: string | null
          company_phone: string | null
          company_website: string | null
          created_at: string | null
          critical_stock_threshold: number | null
          currency: string | null
          currency_symbol: string | null
          date_format: string | null
          enable_auto_backup: boolean | null
          enable_email_notifications: boolean | null
          enable_invoice_reminders: boolean | null
          enable_stock_alerts: boolean | null
          enable_two_factor: boolean | null
          id: string | null
          invoice_number_start: number | null
          invoice_prefix: string | null
          language: string | null
          low_stock_threshold: number | null
          number_format: string | null
          password_min_length: number | null
          session_timeout: number | null
          stock_alerts_status: string | null
          tax_rate: number | null
          tax_rate_decimal: number | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          backup_frequency?: string | null
          backup_retention?: number | null
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_website?: string | null
          created_at?: string | null
          critical_stock_threshold?: number | null
          currency?: string | null
          currency_symbol?: never
          date_format?: string | null
          enable_auto_backup?: boolean | null
          enable_email_notifications?: boolean | null
          enable_invoice_reminders?: boolean | null
          enable_stock_alerts?: boolean | null
          enable_two_factor?: boolean | null
          id?: string | null
          invoice_number_start?: number | null
          invoice_prefix?: string | null
          language?: string | null
          low_stock_threshold?: number | null
          number_format?: string | null
          password_min_length?: number | null
          session_timeout?: number | null
          stock_alerts_status?: never
          tax_rate?: number | null
          tax_rate_decimal?: never
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          backup_frequency?: string | null
          backup_retention?: number | null
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_website?: string | null
          created_at?: string | null
          critical_stock_threshold?: number | null
          currency?: string | null
          currency_symbol?: never
          date_format?: string | null
          enable_auto_backup?: boolean | null
          enable_email_notifications?: boolean | null
          enable_invoice_reminders?: boolean | null
          enable_stock_alerts?: boolean | null
          enable_two_factor?: boolean | null
          id?: string | null
          invoice_number_start?: number | null
          invoice_prefix?: string | null
          language?: string | null
          low_stock_threshold?: number | null
          number_format?: string | null
          password_min_length?: number | null
          session_timeout?: number | null
          stock_alerts_status?: never
          tax_rate?: number | null
          tax_rate_decimal?: never
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_cash_summary: {
        Row: {
          cash_in: number | null
          cash_out: number | null
          date: string | null
          sales_cash: number | null
          theoretical_balance: number | null
          transaction_count: number | null
        }
        Relationships: []
      }
      payment_summary: {
        Row: {
          invoice_id: string | null
          invoice_reference: string | null
          invoice_total: number | null
          payment_count: number | null
          payment_status: string | null
          remaining_amount: number | null
          total_paid: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_theoretical_cash: {
        Args: { target_date: string }
        Returns: {
          opening_balance: number
          sales_cash: number
          cash_in: number
          cash_out: number
          theoretical_balance: number
        }[]
      }
      get_clients_with_invoices: {
        Args: Record<PropertyKey, never>
        Returns: {
          client_id: string
          client_name: string
          client_email: string
          invoice_id: string
          invoice_date: string
          invoice_total: number
          invoice_status: string
        }[]
      }
      get_company_settings: {
        Args: Record<PropertyKey, never>
        Returns: {
          backup_frequency: string | null
          backup_retention: number | null
          blocked_menus: string[] | null
          company_address: string | null
          company_email: string
          company_name: string
          company_phone: string | null
          company_siret: string | null
          company_website: string | null
          created_at: string | null
          critical_stock_threshold: number | null
          currency: string | null
          date_format: string | null
          enable_auto_backup: boolean | null
          enable_email_notifications: boolean | null
          enable_invoice_reminders: boolean | null
          enable_stock_alerts: boolean | null
          enable_two_factor: boolean | null
          id: string
          invoice_number_start: number | null
          invoice_prefix: string | null
          language: string | null
          logo_url: string | null
          low_stock_threshold: number | null
          number_format: string | null
          password_min_length: number | null
          session_timeout: number | null
          tax_rate: number | null
          timezone: string | null
          updated_at: string | null
        }
      }
      get_opening_balance: {
        Args: { target_date: string }
        Returns: number
      }
      sync_all_auth_users: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      sync_user_profile: {
        Args: { user_id: string }
        Returns: undefined
      }
      upsert_company_settings: {
        Args: {
          p_company_name?: string
          p_company_email?: string
          p_company_phone?: string
          p_company_address?: string
          p_company_website?: string
          p_currency?: string
          p_tax_rate?: number
          p_invoice_prefix?: string
          p_invoice_number_start?: number
          p_low_stock_threshold?: number
          p_critical_stock_threshold?: number
          p_enable_stock_alerts?: boolean
          p_language?: string
          p_timezone?: string
          p_date_format?: string
          p_number_format?: string
          p_session_timeout?: number
          p_enable_two_factor?: boolean
          p_password_min_length?: number
          p_enable_email_notifications?: boolean
          p_enable_invoice_reminders?: boolean
          p_enable_auto_backup?: boolean
          p_backup_frequency?: string
          p_backup_retention?: number
        }
        Returns: {
          backup_frequency: string | null
          backup_retention: number | null
          blocked_menus: string[] | null
          company_address: string | null
          company_email: string
          company_name: string
          company_phone: string | null
          company_siret: string | null
          company_website: string | null
          created_at: string | null
          critical_stock_threshold: number | null
          currency: string | null
          date_format: string | null
          enable_auto_backup: boolean | null
          enable_email_notifications: boolean | null
          enable_invoice_reminders: boolean | null
          enable_stock_alerts: boolean | null
          enable_two_factor: boolean | null
          id: string
          invoice_number_start: number | null
          invoice_prefix: string | null
          language: string | null
          logo_url: string | null
          low_stock_threshold: number | null
          number_format: string | null
          password_min_length: number | null
          session_timeout: number | null
          tax_rate: number | null
          timezone: string | null
          updated_at: string | null
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

