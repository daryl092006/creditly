const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function getEnums() {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_enum_values`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ enum_name: 'risk_class_type' })
    })
    
    // We can also query using PostgREST system views
    const res2 = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
        }
    })
    
    // Actually the easiest way: insert a random bad value and let Supabase return the allowed values in the hint!
    // Often PostgreSQL says: invalid input value for enum... hint: "Valid values are: '...'"
}
getEnums()
