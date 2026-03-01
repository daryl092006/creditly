const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function testSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log(`URL: ${url}`);
    console.log(`Key starts with: ${key?.substring(0, 10)}...`);

    try {
        const response = await fetch(`${url}/rest/v1/abonnements?select=*`, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        const data = await response.json();
        console.log('Response status:', response.status);
        if (response.ok) {
            console.log('Success! Found', data.length, 'plans');
        } else {
            console.error('Error response:', data);
        }
    } catch (err) {
        console.error('Fetch error:', err.message);
    }
}

testSupabase();
