import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          user_id: string
          title: string
          created_at: string
          status: 'pending' | 'processing' | 'completed' | 'failed'
          pdf_url: string | null
          translated_pdf_url: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          created_at?: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          pdf_url?: string | null
          translated_pdf_url?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          created_at?: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          pdf_url?: string | null
          translated_pdf_url?: string | null
        }
      }
    }
  }
}