const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dbunwqgfakqcazjkyagd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidW53cWdmYWtxY2F6amt5YWdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE3NjY1MywiZXhwIjoyMDgyNzUyNjUzfQ.YlwBx17nJtnRz1cftDwA8gybVE7kzucIs55ivrxNuEA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRosemonde() {
    // 1. Find the user
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', '%Rosemonde%');

    if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
    }

    if (!profiles || profiles.length === 0) {
        console.log('No profile found for Rosemonde');
        return;
    }

    const Rosemonde = profiles[0];
    console.log('--- Profile ---');
    console.log(`ID: ${Rosemonde.id}`);
    console.log(`Full Name: ${Rosemonde.full_name}`);
    console.log(`Created At: ${Rosemonde.created_at}`);

    // 2. Find her loans
    const { data: loans, error: loansError } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', Rosemonde.id);

    if (loansError) {
        console.error('Error fetching loans:', loansError);
        return;
    }

    console.log('\n--- Loans ---');
    loans.forEach(loan => {
        console.log(`ID: ${loan.id}`);
        console.log(`Amount: ${loan.amount}`);
        console.log(`Amount Paid: ${loan.amount_paid}`);
        console.log(`Status: ${loan.status}`);
        console.log(`Due Date: ${loan.due_date}`);
        console.log(`Created At: ${loan.created_at}`);
        console.log(`Service Fee: ${loan.service_fee}`);
        console.log(`Extension Fee: ${loan.extension_fee}`);
        console.log(`Payout Name: ${loan.payout_name}`);
        console.log('---');
    });
}

checkRosemonde();
