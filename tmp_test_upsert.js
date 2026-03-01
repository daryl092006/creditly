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
        // Querying pg_indexes or similar via RPC or just checking columns
        // Since I can only do REST, I'll try to insert a duplicate and see the error.
        const response = await fetch(`${url}/rest/v1/global_quotas`, {
            method: 'POST',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({
                plan_id: 'ca39a19d-d304-4e04-984e-8dda066e383d', // One of existing
                monthly_limit: 10
            })
        });
        const text = await response.text();
        console.log('Upsert test response:', text);
    } catch (err) {
        console.error('Fetch error:', err.message);
    }
}

check();
