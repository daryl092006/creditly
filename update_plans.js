const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function run() {
    try {
        console.log('Reading .env.local...');
        const content = fs.readFileSync('.env.local', 'utf8');
        const env = {};
        content.split('\n').forEach(line => {
            const index = line.indexOf('=');
            if (index > -1) {
                const key = line.substring(0, index).trim();
                const value = line.substring(index + 1).trim().replace(/^["']|["']$/g, '');
                env[key] = value;
            }
        });

        if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('Missing Supabase credentials in .env.local');
        }

        console.log('Connecting to Supabase...');
        const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

        const plans = [
            { name: 'Basic', price: 500, max_loans_per_month: 1, max_loan_amount: 10000, repayment_delay_days: 7 },
            { name: 'Silver', price: 1000, max_loans_per_month: 2, max_loan_amount: 25000, repayment_delay_days: 10 },
            { name: 'Gold', price: 1500, max_loans_per_month: 3, max_loan_amount: 50000, repayment_delay_days: 15 },
            { name: 'Platinum', price: 3000, max_loans_per_month: 5, max_loan_amount: 100000, repayment_delay_days: 20 }
        ];

        console.log('Updating plans...');
        for (const plan of plans) {
            const { error } = await supabase
                .from('abonnements')
                .upsert(plan, { onConflict: 'name' });
            
            if (error) {
                console.error(`Error updating plan ${plan.name}:`, error);
            } else {
                console.log(`Updated plan ${plan.name}`);
            }
        }

        console.log('Done.');
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

run();
