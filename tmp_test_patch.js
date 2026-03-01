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
        const response = await fetch(`${url}/rest/v1/abonnements?id=eq.ca39a19d-d304-4e04-984e-8dda066e383d`, {
            method: 'PATCH',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: 'Platinium+ TEST'
            })
        });
        const text = await response.text();
        console.log('Update abonnements response:', text);
    } catch (err) {
        console.error('Fetch error:', err.message);
    }
}

check();
