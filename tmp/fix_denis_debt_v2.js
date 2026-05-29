const https = require('https');
const SUPABASE_URL = 'dbunwqgfakqcazjkyagd.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidW53cWdmYWtxY2F6amt5YWdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE3NjY1MywiZXhwIjoyMDgyNzUyNjUzfQ.YlwBx17nJtnRz1cftDwA8gybVE7kzucIs55ivrxNuEA';

function request(path, method = 'GET', body = null) {
    return new Promise((resolve) => {
        const options = {
            hostname: SUPABASE_URL, port: 443, path: path, method: method,
            headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (d) => data += d);
            res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve(data); } });
        });
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function fixDenisDebt() {
    // 1. Get loan (might be active now)
    const loans = await request(`/rest/v1/prets?user_id=eq.02407183-6552-4b79-a72a-d68a29623e98&or=(status.eq.overdue,status.eq.active)&select=*`);
    if (!loans.length) {
        console.log("No loan found for Denis.");
        return;
    }
    const loan = loans[0];
    const currentPaid = Number(loan.amount_paid) || 0;

    // 2. We have 5282 and 2500 to add
    const missingPayments = 5282 + 2500;
    const newPaid = currentPaid + missingPayments;
    const principle = Number(loan.amount);
    const isFullyPaid = newPaid >= principle;
    
    console.log(`Updating loan ${loan.id}: ${currentPaid} -> ${newPaid}`);
    
    await request(`/rest/v1/prets?id=eq.${loan.id}`, 'PATCH', {
        amount_paid: newPaid,
        status: isFullyPaid ? 'paid' : 'active',
        closed_at: isFullyPaid ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
    });
    
    console.log(`Fixed. Status=${isFullyPaid ? 'paid' : 'active'}`);
}

fixDenisDebt();
