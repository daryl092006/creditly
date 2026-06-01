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

async function checkDenisLoans() {
    const denisId = '8998f4c7-1d53-4981-9dce-9c381bf2b384';
    const { data: loans } = await supabase.from('prets').select('*').eq('user_id', denisId);
    console.log('--- LOANS ---');
    console.log(loans);
}

checkDenisLoans();
