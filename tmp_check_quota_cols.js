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
        const response = await fetch(`${url}/rest/v1/global_quotas?limit=1`, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        const data = await response.json();
        if (data && data[0]) {
            console.log('Columns in global_quotas:', Object.keys(data[0]));
        } else {
            console.log('No data in global_quotas to check columns.');
        }
    } catch (err) {
        console.error('Fetch error:', err.message);
    }
}

check();
