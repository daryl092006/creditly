const fs = require('fs');

async function testSupabase() {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const env = {};
    envContent.split('\n').filter(l => l.includes('=')).forEach(l => {
        const [k, v] = l.split('=');
        env[k.trim()] = v.trim().replace(/^["']|["']$/g, '');
    });

    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    try {
        const response = await fetch(`${url}/rest/v1/abonnements?select=id,name,price,max_loan_amount`, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        const data = await response.json();
        console.log('Plans:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Fetch error:', err.message);
    }
}

testSupabase();
