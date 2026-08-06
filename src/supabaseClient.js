import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dbamnuezlbmmxhxpxtiu.supabase.co'
const supabaseKey = 'sb_publishable_NArb5o1nWAQcPcen4pwzJQ_KG7Vb6hd'

export const supabase = createClient(supabaseUrl, supabaseKey)
