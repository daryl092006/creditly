const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkQuotas() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: quotas, error } = await supabase.from('global_quotas').select('*');
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log('Current Quotas:', JSON.stringify(quotas, null, 2));

    const { data: plans } = await supabase.from('abonnements').select('id, name, max_loan_amount');
    console.log('Available Plans:', JSON.stringify(plans, null, 2));
}

checkQuotas();
