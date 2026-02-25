import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Service-Role Client – NUR serverseitig verwenden (API Routes, Server Components)
// Umgeht RLS – niemals an den Client weitergeben!
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function getOrganizationBySlug(slug: string) {
  const { data, error } = await supabaseAdmin
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) return null
  return data
}

export async function getOrganizationById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}
