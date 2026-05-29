const https = require('https');

const SUPABASE_URL = 'dbunwqgfakqcazjkyagd.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidW53cWdmYWtxY2F6amt5YWdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE3NjY1MywiZXhwIjoyMDgyNzUyNjUzfQ.YlwBx17nJtnRz1cftDwA8gybVE7kzucIs55ivrxNuEA';

function request(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: SUPABASE_URL, port: 443, path: path, method: method,
            headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve(data); } });
        });
        req.on('error', (e) => { reject(e); });
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function fixDenis() {
    // 1. Denis ID
    const users = await request('/rest/v1/users?email=ilike.*denisgangnito9*&select=id');
    const denisId = users[0].id;

    // 2. Pending Repayments
    const repayments = await request(`/rest/v1/remboursements?user_id=eq.${denisId}&status=eq.pending&select=*`);
    console.log(`Found ${repayments.length} pending repayments.`);

    let addedPaid = 0;
    for (const r of repayments) {
        console.log(`Validating ${r.id} (${r.amount_declared} F)...`);
        await request(`/rest/v1/remboursements?id=eq.${r.id}`, 'PATCH', { status: 'verified', validated_at: new Date().toISOString() });
        addedPaid += Number(r.amount_declared);
    }

    // 3. Update Loan
    const loans = await request(`/rest/v1/prets?user_id=eq.${denisId}&status=eq.overdue&select=*`);
    if (loans.length) {
        const loan = loans[0];
        const newPaid = Number(loan.amount_paid) + addedPaid;
        const principle = Number(loan.amount);
        const isFullyPaid = newPaid >= principle;
        
        console.log(`Updating loan ${loan.id}: NewPaid=${newPaid}, Status=${isFullyPaid ? 'paid' : 'active'}`);
        await request(`/rest/v1/prets?id=eq.${loan.id}`, 'PATCH', { 
            amount_paid: newPaid, 
            status: isFullyPaid ? 'paid' : 'active',
            closed_at: isFullyPaid ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
        });
    }
    
    console.log("Denis fixed.");
}

fixDenis();
