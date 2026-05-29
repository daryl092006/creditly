const https = require('https');
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidW53cWdmYWtxY2F6amt5YWdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE3NjY1MywiZXhwIjoyMDgyNzUyNjUzfQ.YlwBx17nJtnRz1cftDwA8gybVE7kzucIs55ivrxNuEA';
const SUPABASE_URL = 'dbunwqgfakqcazjkyagd.supabase.co';

const body = JSON.stringify({
    amount_paid: 20782,
    status: 'active'
});

const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: '/rest/v1/prets?id=eq.05c2fbc5-b0a2-45fc-925e-d18176629c0f',
    method: 'PATCH',
    headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
    }
};

const req = https.request(options, (res) => {
    console.log('STATUS:', res.statusCode);
});

req.on('error', (e) => console.error(e));
req.write(body);
req.end();
