const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('Env variables missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkTables() {
  const tables = [
    'users',
    'prets', 
    'remboursements', 
    'kyc_submissions', 
    'audit_logs', 
    'risk_scores', 
    'risk_decisions', 
    'platform_liquidity_snapshots', 
    'loan_extensions', 
    'provisions', 
    'agent_performance'
  ]

  const fs = require('fs')
  let log = '--- VÉRIFICATION DES TABLES SUPABASE ---\n'
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1)
    
    if (error) {
      if (error.code === '42P01') {
        log += `❌ Table MANQUANTE: ${table}\n`
      } else {
        log += `⚠️ Erreur sur ${table}: ${error.message}\n`
      }
    } else {
      log += `✅ Table OK: ${table}\n`
    }
  }
  fs.writeFileSync('d:\\creditly\\tmp\\tables_utf8.txt', log, 'utf8')
}

checkTables()
