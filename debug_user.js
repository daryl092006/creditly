const fs = require('fs');

async function checkUser(email) {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const env = {};
    envContent.split('\n').filter(l => l.includes('=')).forEach(l => {
        const [k, v] = l.split('=');
        env[k.trim()] = v.trim().replace(/^["']|["']$/g, '');
    });

    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY;

    try {
        // 1. Find user by email
        const userRes = await fetch(`${url}/rest/v1/users?email=eq.${email}&select=*`, {
            headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
        });
        const users = await userRes.json();
        
        if (!users || users.length === 0) {
            console.log(`User with email ${email} not found in public.users`);
            return;
        }

        const user = users[0];
        console.log('User found:', { id: user.id, email: user.email, is_account_active: user.is_account_active });

        // 2. Find subscriptions
        const subRes = await fetch(`${url}/rest/v1/user_subscriptions?user_id=eq.${user.id}&select=*,plan:abonnements(*)&order=created_at.desc`, {
            headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
        });
        const subs = await subRes.json();
        
        console.log('Subscriptions found:', JSON.stringify(subs, null, 2));

    } catch (err) {
        console.error('Error:', err.message);
    }
}

const email = process.argv[2];
if (!email) {
    console.log('Usage: node debug_user.js <email>');
} else {
    checkUser(email);
}
