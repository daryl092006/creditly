const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

let supabaseUrl = '';
let supabaseKey = '';

try {
    const dotenvContent = fs.readFileSync('.env.local', 'utf8');
    const env = {};
    dotenvContent.split(/\r?\n/).forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/(^"|"$)/g, '');
        }
    });
    supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
} catch (e) {
    console.error("Error reading .env.local", e);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const HABIB_SUPERADMIN_ID = '1d43cfbc-3084-4b93-9f10-0f9bcb174e5e';

async function run() {
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', HABIB_SUPERADMIN_ID)
        .single();

    if (error) {
        console.error(error);
        return;
    }

    console.log("Habib Superadmin user details:");
    console.log(`- Email: ${user.email}`);
    console.log(`- active_debt_amount: ${user.active_debt_amount}`);
    console.log(`- current_debt_ratio: ${user.current_debt_ratio}`);
    console.log(`- current_score: ${user.current_score}`);
    console.log(`- roles:`, user.roles);
}

run();
