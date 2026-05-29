const https = require('https');
const SUPABASE_URL = 'dbunwqgfakqcazjkyagd.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidW53cWdmYWtxY2F6amt5YWdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE3NjY1MywiZXhwIjoyMDgyNzUyNjUzfQ.YlwBx17nJtnRz1cftDwA8gybVE7kzucIs55ivrxNuEA';

function request(path) {
    return new Promise((resolve) => {
        const options = { hostname: SUPABASE_URL, port: 443, path, method: 'GET', headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` } };
        https.request(options, (res) => {
            let data = '';
            res.on('data', (d) => data += d);
            res.on('end', () => resolve(JSON.parse(data)));
        }).end();
    });
}

async function run() {
    const users = await request('/rest/v1/users?email=ilike.*denisgangnito9*&select=id');
    const denisId = users[0].id;
    const reps = await request(`/rest/v1/remboursements?user_id=eq.${denisId}&status=eq.verified&select=amount_declared,created_at`);
    console.log(JSON.stringify(reps, null, 2));
}
run();
