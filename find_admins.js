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

async function run() {
    const { data: users, error } = await supabase
        .from('users')
        .select('id, email, nom, prenom, roles');
    
    if (error) {
        console.error(error);
        return;
    }
    
    console.log("Admin Users:");
    users.forEach(u => {
        const isAdmin = u.roles && u.roles.some(role => ['superadmin', 'owner', 'admin_comptable', 'admin_loan', 'admin_repayment', 'admin_kyc'].includes(role));
        if (isAdmin) {
            console.log(`- Name: ${u.prenom} ${u.nom}, Email: ${u.email}, ID: ${u.id}, Roles: ${u.roles.join(', ')}`);
        }
    });
}

run();
