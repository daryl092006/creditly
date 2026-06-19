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

const DENIS_ID = '02407183-6552-4b79-abea-b7066cb475e8';

async function run() {
    const { data: prets, error } = await supabase
        .from('prets')
        .select('id, user_id, amount, status, admin_id, created_at')
        .eq('admin_id', DENIS_ID);

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Denis loans count: ${prets.length}`);
    if (prets.length > 0) {
        console.log("Sample loans:");
        console.log(prets.slice(0, 10));
    }
}

run();
