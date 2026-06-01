const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^"(.*)"$/, '$1');
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAllDenis() {
    const { data: trans } = await supabase.from('investor_transactions').select('*').ilike('shareholder_name', '%Denis%');
    console.log('--- ALL DENIS TRANSACTIONS ---');
    console.log(trans.map(t => ({ name: t.shareholder_name, type: t.type, amount: t.amount, desc: t.description, status: t.status })));
}

checkAllDenis();
