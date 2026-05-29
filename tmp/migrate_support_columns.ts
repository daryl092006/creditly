import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function runMigration() {
    console.log('Running Support Tickets columns migration...')

    // Add category column
    const { error: err1 } = await supabase.rpc('run_sql', {
        sql: 'ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS category TEXT;'
    })
    if (err1) console.error('Error adding category:', err1)

    // Add context_json column
    const { error: err2 } = await supabase.rpc('run_sql', {
        sql: 'ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS context_json JSONB DEFAULT \'{}\'::jsonb;'
    })
    if (err2) console.error('Error adding context_json:', err2)

    console.log('Migration finished.')
}

runMigration()
