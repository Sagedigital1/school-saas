import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pasfrqmtqmszesuzlctd.supabase.co'
const supabaseAnonKey = 'sb_publishable_Oq50_Uc0QNfvxPHaRKl08g_V5ZXktmS'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
