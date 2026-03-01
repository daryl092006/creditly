const fs = require('fs');

async function check() {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const env = {};
    envContent.split('\n').filter(l => l.includes('=')).forEach(l => {
        const [k, v] = l.split('=');
        env[k.trim()] = v.trim().replace(/^["']|["']$/g, '');
    });

    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    try {
        const response = await fetch(`${url}/rest/v1/user_subscriptions?select=*,abonnements(*)&limit=1`, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        const text = await response.text();
        console.log('User subscription relation check:', text);
    } catch (err) {
        console.error('Fetch error:', err.message);
    }
}

check();
