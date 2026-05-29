const https = require('https');

const SUPABASE_URL = 'dbunwqgfakqcazjkyagd.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidW53cWdmYWtxY2F6amt5YWdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE3NjY1MywiZXhwIjoyMDgyNzUyNjUzfQ.YlwBx17nJtnRz1cftDwA8gybVE7kzucIs55ivrxNuEA';

function request(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: SUPABASE_URL, port: 443, path: path, method: 'GET',
            headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => { resolve(JSON.parse(data)); });
        });
        req.on('error', (e) => { reject(e); }); req.end();
    });
}

async function denisRepayments() {
    const users = await request('/rest/v1/users?email=ilike.*denisgangnito9*&select=id');
    const denisId = users[0].id;
    console.log(`Denis ID: ${denisId}`);

    const repayments = await request(`/rest/v1/remboursements?user_id=eq.${denisId}&select=*,loan:loan_id(*)`);
    console.log("\nREPAYMENTS:");
    repayments.forEach(r => {
        console.log(`- ID: ${r.id} | Amount: ${r.amount_declared} | Status: ${r.status} | Date: ${r.created_at}`);
    });

    const loans = await request(`/rest/v1/prets?user_id=eq.${denisId}&select=*`);
    console.log("\nLOANS:");
    loans.forEach(l => {
        console.log(`- ID: ${l.id} | Status: ${l.status} | Amount: ${l.amount} | Paid: ${l.amount_paid} | ServiceFee: ${l.service_fee}`);
    });
}

denisRepayments();
