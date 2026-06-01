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

async function checkDenisFull() {
    const { data: users } = await supabase.from('users').select('id, email, nom, prenom').ilike('nom', '%GANGNITO%');
    console.log('--- USERS ---');
    console.log(users);

    const { data: allLoans } = await supabase.from('prets').select('id, user_id, amount, amount_paid, status, service_fee').in('status', ['active', 'overdue']);
    
    for (const user of users) {
        const userLoans = allLoans.filter(l => l.user_id === user.id);
        console.log(`\nUser: ${user.prenom} ${user.nom} (${user.email}) ID: ${user.id}`);
        console.log('Active/Overdue Loans:', userLoans);
        
        const { data: trans } = await supabase.from('investor_transactions').select('*').ilike('shareholder_name', `%${user.nom}%`);
        console.log('Approved Transactions:', trans?.filter(t => t.status === 'approved').map(t => ({ type: t.type, amount: t.amount, desc: t.description })));
    }
}

checkDenisFull();
