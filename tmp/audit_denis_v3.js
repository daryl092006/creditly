const https = require('https');

const SUPABASE_URL = 'dbunwqgfakqcazjkyagd.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidW53cWdmYWtxY2F6amt5YWdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE3NjY1MywiZXhwIjoyMDgyNzUyNjUzfQ.YlwBx17nJtnRz1cftDwA8gybVE7kzucIs55ivrxNuEA';

function request(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: SUPABASE_URL,
            port: 443,
            path: path,
            method: 'GET',
            headers: {
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(data);
                }
            });
        });

        req.on('error', (error) => { reject(error); });
        req.end();
    });
}

async function audit() {
    try {
        const users = await request('/rest/v1/users?email=ilike.*denisgangnito9*&select=id,prenom,nom');
        if (!users.length) {
            console.log("Denis non trouvé");
            return;
        }
        const denis = users[0];
        console.log(`Denis: ${denis.prenom} ${denis.nom} (${denis.id})`);

        const loans = await request(`/rest/v1/prets?user_id=eq.${denis.id}&select=*`);
        console.log("\nPrêts de Denis:");
        let totalDebtOverall = 0;

        loans.forEach(loan => {
            // Simplified calculation based on what's in the DB
            const principle = Number(loan.amount) || 0;
            const paid = Number(loan.amount_paid) || 0;
            const fee = Number(loan.service_fee) || 0;
            const extensionFee = Number(loan.extension_fee) || 0;
            
            // Penalties logic (1% per day since due_date if not paid)
            let penalties = 0;
            if (loan.status !== 'paid' && loan.due_date) {
                const now = new Date();
                const due = new Date(loan.due_date);
                if (now > due) {
                    const days = Math.floor((now - due) / (1000 * 60 * 60 * 24));
                    if (days > 0) penalties = principle * 0.01 * (days - 1);
                }
            }

            const debt = loan.status === 'paid' ? 0 : Math.max(0, principle + fee + extensionFee + penalties - paid);
            totalDebtOverall += debt;
            console.log(`- Loan ${loan.id}: Status=${loan.status}, DueDate=${loan.due_date}, Debt=${Math.round(debt)} F (Penalties=${Math.round(penalties)})`);
        });

        console.log(`\nTOTAL QUE DENIS DOIT: ${Math.round(totalDebtOverall)} FCFA`);
    } catch (err) {
        console.error(err);
    }
}

audit();
