const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkCols() {
  const { data, error } = await supabase.from('users').select('fraud_suspicion_level').limit(5)
  fs.writeFileSync('d:\\creditly\\tmp\\check_cols.txt', JSON.stringify(data, null, 2), 'utf8')
}
checkCols()
