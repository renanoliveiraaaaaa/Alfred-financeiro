// Este arquivo será gerado automaticamente pelo Supabase CLI
// Execute: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
// Ou preencha manualmente conforme o schema do banco de dados

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          gender: 'M' | 'F' | 'O' | null
          app_theme: 'normal' | 'gala' | 'classic' | 'club' | 'liquid'
          hide_balance: boolean
          weekly_report: boolean
          role: 'user' | 'admin'
          plan_status?: 'trial' | 'active' | 'expired'
          trial_ends_at?: string | null
          subscription_status: 'trial' | 'active' | 'past_due' | 'canceled'
          subscription_plan: 'free' | 'premium' | 'business'
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          gender?: 'M' | 'F' | 'O' | null
          app_theme?: 'normal' | 'gala' | 'classic' | 'club' | 'liquid'
          hide_balance?: boolean
          weekly_report?: boolean
          role?: 'user' | 'admin'
          plan_status?: 'trial' | 'active' | 'expired'
          trial_ends_at?: string | null
          subscription_status?: 'trial' | 'active' | 'past_due' | 'canceled'
          subscription_plan?: 'free' | 'premium' | 'business'
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          gender?: 'M' | 'F' | 'O' | null
          app_theme?: 'normal' | 'gala' | 'classic' | 'club' | 'liquid'
          hide_balance?: boolean
          weekly_report?: boolean
          role?: 'user' | 'admin'
          plan_status?: 'trial' | 'active' | 'expired'
          trial_ends_at?: string | null
          subscription_status?: 'trial' | 'active' | 'past_due' | 'canceled'
          subscription_plan?: 'free' | 'premium' | 'business'
          created_at?: string
        }
      }
      organizations: {
        Row: {
          id: string
          owner_id: string
          name: string
          slug: string
          type: 'personal' | 'business'
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          slug: string
          type: 'personal' | 'business'
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          slug?: string
          type?: 'personal' | 'business'
          created_at?: string
        }
      }
      organization_members: {
        Row: {
          organization_id: string
          profile_id: string
          role: 'owner' | 'admin' | 'member'
          created_at: string
        }
        Insert: {
          organization_id: string
          profile_id: string
          role: 'owner' | 'admin' | 'member'
          created_at?: string
        }
        Update: {
          organization_id?: string
          profile_id?: string
          role?: 'owner' | 'admin' | 'member'
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
        }
      }
      revenues: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          amount: number
          description: string
          date: string
          expected_date: string | null
          received: boolean
          source: string
          import_session_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: string
          amount: number
          description: string
          date: string
          expected_date?: string | null
          received?: boolean
          source?: string
          import_session_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string
          amount?: number
          description?: string
          date?: string
          expected_date?: string | null
          received?: boolean
          source?: string
          import_session_id?: string | null
          created_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          amount: number
          description: string
          category: string
          payment_method: 'credito' | 'debito' | 'especie' | 'credito_parcelado' | 'pix'
          installments: number | null
          installment_number: number | null
          due_date: string | null
          paid: boolean
          invoice_url: string | null
          credit_card_id: string | null
          source: string
          import_session_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: string
          amount: number
          description: string
          category: string
          payment_method: 'credito' | 'debito' | 'especie' | 'credito_parcelado' | 'pix'
          installments?: number | null
          installment_number?: number | null
          due_date?: string | null
          paid?: boolean
          invoice_url?: string | null
          credit_card_id?: string | null
          source?: string
          import_session_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string
          amount?: number
          description?: string
          category?: string
          payment_method?: 'credito' | 'debito' | 'especie' | 'credito_parcelado' | 'pix'
          installments?: number | null
          installment_number?: number | null
          due_date?: string | null
          paid?: boolean
          invoice_url?: string | null
          credit_card_id?: string | null
          source?: string
          import_session_id?: string | null
          created_at?: string
        }
      }
      import_sessions: {
        Row: {
          id: string
          user_id: string
          file_name: string
          file_url: string | null
          bank: string
          period_start: string
          period_end: string
          total_transactions: number
          imported_transactions: number
          skipped_transactions: number
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_name: string
          file_url?: string | null
          bank: string
          period_start: string
          period_end: string
          total_transactions?: number
          imported_transactions?: number
          skipped_transactions?: number
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          file_name?: string
          file_url?: string | null
          bank?: string
          period_start?: string
          period_end?: string
          total_transactions?: number
          imported_transactions?: number
          skipped_transactions?: number
          status?: string
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          monthly_budget?: number | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          monthly_budget?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          monthly_budget?: number | null
        }
      }
      credit_cards: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          name: string
          credit_limit: number
          closing_day: number
          due_day: number
          brand: string | null
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: string
          name: string
          credit_limit: number
          closing_day: number
          due_day: number
          brand?: string | null
          color?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string
          name?: string
          credit_limit?: number
          closing_day?: number
          due_day?: number
          brand?: string | null
          color?: string
          created_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          name: string
          amount: number
          category: string
          billing_cycle: 'mensal' | 'anual'
          next_billing_date: string
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: string
          name: string
          amount: number
          category?: string
          billing_cycle?: 'mensal' | 'anual'
          next_billing_date: string
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string
          name?: string
          amount?: number
          category?: string
          billing_cycle?: 'mensal' | 'anual'
          next_billing_date?: string
          active?: boolean
          created_at?: string
        }
      }
      income_sources: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          name: string
          amount: number
          frequency: 'mensal' | 'quinzenal' | 'semanal'
          next_receipt_date: string
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: string
          name: string
          amount: number
          frequency: 'mensal' | 'quinzenal' | 'semanal'
          next_receipt_date: string
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string
          name?: string
          amount?: number
          frequency?: 'mensal' | 'quinzenal' | 'semanal'
          next_receipt_date?: string
          active?: boolean
          created_at?: string
        }
      }
      goals: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          name: string
          target_amount: number
          current_amount: number
          deadline: string | null
          color: string
          icon: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: string
          name: string
          target_amount: number
          current_amount?: number
          deadline?: string | null
          color?: string
          icon?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string
          name?: string
          target_amount?: number
          current_amount?: number
          deadline?: string | null
          color?: string
          icon?: string | null
          created_at?: string
        }
      }
      projections: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          month: string
          projected_expenses: number
          projected_revenues: number
          actual_expenses: number
          actual_revenues: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: string
          month: string
          projected_expenses: number
          projected_revenues: number
          actual_expenses?: number
          actual_revenues?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string
          month?: string
          projected_expenses?: number
          projected_revenues?: number
          actual_expenses?: number
          actual_revenues?: number
          created_at?: string
        }
      }
    }
  }
}
