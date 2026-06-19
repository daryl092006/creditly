const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const dotenvContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
dotenvContent.split(/\r?\n/).forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/(^"|"$)/g, '');
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const HABIB_SUPERADMIN_ID = '1d43cfbc-3084-4b93-9f10-0f9bcb174e5e';

async function run() {
    const { data, error } = await supabase.auth.admin.updateUserById(
        HABIB_SUPERADMIN_ID,
        { password: 'HabibAdmin2026!' }
    );
    
    if (error) {
        console.error("Error setting password:", error);
        return;
    }
    
    console.log("Successfully set password for Habib!");
}

run();
