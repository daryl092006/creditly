const fs = require('fs');

async function check() {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const env = {};
    envContent.split('\n').filter(l => l.includes('=')).forEach(l => {
        const [k, v] = l.split('=');
        env[k.trim()] = v.trim().replace(/^["']|["']$/g, '');
    });

    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY;

    try {
        const response = await fetch(`${url}/rest/v1/user_subscriptions?select=*,plan:abonnements(*)&limit=1`, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        const data = await response.json();
        console.log('User subscription with plan alias:', JSON.stringify(data?.[0], null, 2));
        
        if (data?.[0] && !data[0].plan && data[0].abonnements) {
            console.log('!!! ALIAS FAILED, data is in "abonnements" key !!!');
        } else if (data?.[0] && data[0].plan) {
            console.log('Alias worked.');
        }
    } catch (err) {
        console.error('Fetch error:', err.message);
    }
}

check();
