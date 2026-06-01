const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^"(.*)"$/, '$1');
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDenis() {
    const { data: users } = await supabase.from('users').select('id, email, nom, prenom').ilike('nom', '%GANGNITO%');
    console.log('--- USERS ---');
    console.log(users);

    if (!users || users.length === 0) return;

    for (const user of users) {
        console.log(`\nChecking for: ${user.prenom} ${user.nom} (${user.email})`);
        
        // 1. Transactions - Using ilike on name to catch "Denis GANGNITO" or similar
        const { data: transactions } = await supabase.from('investor_transactions')
            .select('*')
            .or(`shareholder_name.ilike.%${user.nom}%,shareholder_name.ilike.%${user.prenom}%`);
        
        console.log('--- TRANSACTIONS (Approved) ---');
        const approved = transactions?.filter(t => t.status === 'approved') || [];
        console.log(approved.map(t => ({ type: t.type, amount: t.amount, desc: t.description, date: t.date })));
        
        const totalAdjustments = approved.reduce((acc, t) => acc + t.amount, 0) || 0;
        console.log('Total Adjustments (Approved):', totalAdjustments);

        // 2. Commissions
        const { data: comms } = await supabase.from('admin_commissions')
            .select('*, loan:loan_id(status)')
            .eq('admin_id', user.id);
        
        const realizedComms = comms?.filter(c => c.loan?.status === 'paid' || c.type === 'repayment_reward').reduce((acc, c) => acc + Number(c.amount), 0) || 0;
        console.log('Realized Commissions:', realizedComms);

        // 3. Shareholder Config
        const { data: shareholders } = await supabase.from('shareholders_config').select('*').ilike('name', `%${user.nom}%`);
        console.log('Shareholder Config:', shareholders);
    }
}

checkDenis();
