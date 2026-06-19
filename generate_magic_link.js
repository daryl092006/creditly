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
    const { data, error } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: 'lawanihabib720@gmail.com',
        options: { redirectTo: 'http://localhost:3000/admin/super' }
    });
    
    if (error) {
        console.error(error);
        return;
    }
    
    console.log("Magic Link properties:");
    console.log(data);
    console.log(`\nURL to navigate to:\n${data.properties.action_link}`);
}

run();
