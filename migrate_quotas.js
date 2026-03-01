const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function migrate() {
    try {
        const content = fs.readFileSync('.env.local', 'utf8');
        const env = {};
        content.split('\n').forEach(line => {
            const [key, ...val] = line.split('=');
            if (key) env[key.trim()] = val.join('=').trim().replace(/^["']|["']$/g, '');
        });

        const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

        console.log('Migrating global_quotas table to be plan-based...');

        // 1. Re-create or Update Table structure
        console.log('Checking table structure...');
        
        // Use a simpler approach: check if we can select from the table
        const { error: tableCheckError } = await supabase.from('global_quotas').select('plan_id').limit(1);
        
        if (tableCheckError && tableCheckError.message.includes('column "plan_id" does not exist')) {
            console.log('Adding plan_id column...');
            // This requires the 'exec_sql' RPC to be setup in Supabase
            const { error: rpcError } = await supabase.rpc('exec_sql', { sql_query: `
                ALTER TABLE public.global_quotas ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.abonnements(id);
            `});
            if (rpcError) console.error('Failed to add column via RPC:', rpcError.message);
        }

        // 2. Map existing amounts to plans
        const { data: plans } = await supabase.from('abonnements').select('id, max_loan_amount');
        const { data: currentQuotas } = await supabase.from('global_quotas').select('*');

        for (const q of (currentQuotas || [])) {
            const matchingPlan = plans.find(p => p.max_loan_amount === q.amount);
            if (matchingPlan) {
                await supabase.from('global_quotas').update({ plan_id: matchingPlan.id }).eq('amount', q.amount);
            }
        }

        // 3. Finalize structure
        // Since I can't run complex ALTER through standard API without RPC, 
        // I will recreate the table if needed or just use the plan_id column in my code.
        // But the best is to ensure all plans have a quota entry.
        for (const plan of (plans || [])) {
            const { data: existing } = await supabase.from('global_quotas').select('*').eq('plan_id', plan.id).single();
            if (!existing) {
                const oldQuota = currentQuotas?.find(q => q.amount === plan.max_loan_amount);
                await supabase.from('global_quotas').insert({
                    plan_id: plan.id,
                    amount: plan.max_loan_amount,
                    monthly_limit: oldQuota ? oldQuota.monthly_limit : 0
                });
            }
        }

        console.log('Migration completed successfully.');
    } catch (e) {
        console.error('Migration failed:', e.message);
    }
}

migrate();
