const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function checkEnum() {
    const { data, error } = await supabaseAdmin.rpc('get_enum_values', { enum_name: 'risk_class_type' })
    if (error) {
        fs.writeFileSync('d:\\creditly\\tmp\\enum.txt', 'RPC Error, trying table enum... ', 'utf8')
    } else {
        fs.writeFileSync('d:\\creditly\\tmp\\enum.txt', JSON.stringify(data), 'utf8')
    }
}
checkEnum()
