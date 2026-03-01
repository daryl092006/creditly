const fs = require('fs');

async function testSupabase() {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const env = {};
    envContent.split('\n').filter(l => l.includes('=')).forEach(l => {
        const [k, v] = l.split('=');
        env[k.trim()] = v.trim().replace(/^["']|["']$/g, '');
    });

    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY;

    console.log(`Testing URL: ${url}`);
    console.log(`Service Role Key: ${key?.substring(0, 10)}... (Length: ${key?.length})`);

    try {
        const response = await fetch(`${url}/rest/v1/global_quotas?select=*`, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        const text = await response.text();
        console.log('Response status:', response.status);
        try {
            const data = JSON.parse(text);
            if (response.ok) {
                console.log('Success! Found', data.length, 'quotas');
            } else {
                console.error('Error response:', data);
            }
        } catch (jerr) {
            console.error('Non-JSON response:', text.substring(0, 100));
        }
    } catch (err) {
        console.error('Fetch error:', err.message);
    }
}

testSupabase();
