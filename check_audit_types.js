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

async function run() {
    console.log("Fetching distinct action_types in audit_logs...");
    const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('action_type, target_table');

    if (error) {
        console.error(error);
        return;
    }

    const types = {};
    logs.forEach(l => {
        const key = `${l.action_type} on ${l.target_table}`;
        types[key] = (types[key] || 0) + 1;
    });

    console.log("Audit log categories:", types);
}

run();
