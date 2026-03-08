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
        const response = await fetch(`${url}/rest/v1/user_subscriptions?select=id,user_id,status,is_active,end_date`, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        const data = await response.json();
        
        console.log('--- Statistics ---');
        console.log('Total subscriptions:', data.length);
        
        const inconsistency1 = data.filter(s => s.status === 'active' && !s.is_active);
        console.log('Active status but is_active is false:', inconsistency1.length);
        if (inconsistency1.length > 0) console.log('Sample:', inconsistency1[0]);

        const inconsistency2 = data.filter(s => s.status !== 'active' && s.is_active);
        console.log('Not active status but is_active is true:', inconsistency2.length);
        if (inconsistency2.length > 0) console.log('Sample:', inconsistency2[0]);

        // Check for users with multiple is_active = true
        const activeUsers = {};
        const multipleActives = [];
        data.forEach(s => {
            if (s.is_active) {
                if (activeUsers[s.user_id]) {
                    multipleActives.push(s.user_id);
                }
                activeUsers[s.user_id] = true;
            }
        });
        console.log('Users with multiple is_active=true:', multipleActives.length);

    } catch (err) {
        console.error('Fetch error:', err.message);
    }
}

check();
