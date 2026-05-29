const https = require('https');
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidW53cWdmYWtxY2F6amt5YWdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE3NjY1MywiZXhwIjoyMDgyNzUyNjUzfQ.YlwBx17nJtnRz1cftDwA8gybVE7kzucIs55ivrxNuEA';
const SUPABASE_URL = 'dbunwqgfakqcazjkyagd.supabase.co';

function request(path) {
    return new Promise((resolve) => {
        const options = { hostname: SUPABASE_URL, port: 443, path, method: 'GET', headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` } };
        https.request(options, (res) => {
            let data = ''; res.on('data', (d) => data += d);
            res.on('end', () => resolve(JSON.parse(data)));
        }).end();
    });
}

async function run() {
    const loan = await request('/rest/v1/prets?id=eq.05c2fbc5-b0a2-45fc-925e-d18176629c0f&select=amount,amount_paid');
    console.log(JSON.stringify(loan));
}
run();
