const fetch = require('node-fetch');

const SUPABASE_URL = 'https://dbunwqgfakqcazjkyagd.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidW53cWdmYWtxY2F6amt5YWdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE3NjY1MywiZXhwIjoyMDgyNzUyNjUzfQ.YlwBx17nJtnRz1cftDwA8gybVE7kzucIs55ivrxNuEA';

async function auditDenis() {
    // 1. Get Denis ID
    const userRes = await fetch(`${SUPABASE_URL}/rest/v1/users?email=ilike.*denisgangnito9*&select=id,prenom,nom`, {
        headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
    });
    const users = await userRes.json();
    if (!users.length) {
        console.log("Denis not found");
        return;
    }
    const denis = users[0];
    console.log(`Denis found: ${denis.prenom} ${denis.nom} (${denis.id})`);

    // 2. Get his loans
    const loanRes = await fetch(`${SUPABASE_URL}/rest/v1/prets?user_id=eq.${denis.id}&select=*`, {
        headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
    });
    const loans = await loanRes.json();
    
    console.log("\nLOANS:");
    loans.forEach(l => {
        // Simple debt calculation
        const principle = l.amount || 0;
        const paid = l.amount_paid || 0;
        const fee = l.service_fee || 0;
        const debt = Math.max(0, principle + fee - paid);
        console.log(`- ID ${l.id}: Status=${l.status}, Debt=${debt} F (Paid=${paid} F)`);
    });
}

auditDenis();
