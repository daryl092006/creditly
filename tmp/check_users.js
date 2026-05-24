const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkUsers() {
  const { data, error } = await supabase.from('users').select('id, risk_class, fraud_suspicion_level')
  if (error) {
    fs.writeFileSync('d:\\creditly\\tmp\\users_check.txt', 'Error: ' + JSON.stringify(error), 'utf8')
  } else {
    fs.writeFileSync('d:\\creditly\\tmp\\users_check.txt', 'Count: ' + data.length + '\n' + JSON.stringify(data, null, 2), 'utf8')
  }
}
checkUsers()
