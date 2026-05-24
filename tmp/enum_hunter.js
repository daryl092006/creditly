const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function testEnums() {
    const userId = "7bb90ca9-f613-418e-bf7c-e8b9aa48d82a"
    const cases = ['STANDARD', 'Standard', 'ELITE', 'Elite', 'FIABLE', 'A SURVEILLER', 'A Surveiller', 'A surveiller', 'RISQUE', 'Risqué', 'Risque']
    let log = ''
    
    for (const c of cases) {
        const { error: updErr } = await supabaseAdmin.from('users').update({
            risk_class: c,
        }).eq('id', userId)

        if (updErr) {
             log += `❌ Failed: ${c} - ${updErr.message}\n`
        } else {
             log += `✅ Success: ${c}\n`
        }
    }
    fs.writeFileSync('d:\\creditly\\tmp\\enum_results_utf8.txt', log, 'utf8')
}
testEnums()
