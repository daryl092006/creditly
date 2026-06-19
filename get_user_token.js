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
    const email = 'lawanihabib720@gmail.com';
    const password = 'HabibAdmin2026!';

    console.log(`Attempting to sign in user: ${email}...`);
    
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        console.error("Sign-in error:", error.message);
        return;
    }

    const session = data.session;
    console.log('\n--------------------------------------------------');
    console.log('Successfully authenticated with Supabase!');
    console.log('User ID:', session.user.id);
    console.log('Email:', session.user.email);
    console.log('Expires in:', session.expires_in, 'seconds');
    console.log('--------------------------------------------------');
    console.log('Access Token (JWT):');
    console.log(session.access_token);
    console.log('--------------------------------------------------\n');
}

run();
