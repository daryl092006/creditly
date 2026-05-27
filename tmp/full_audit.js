const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://dbunwqgfakqcazjkyagd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidW53cWdmYWtxY2F6amt5YWdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE3NjY1MywiZXhwIjoyMDgyNzUyNjUzfQ.YlwBx17nJtnRz1cftDwA8gybVE7kzucIs55ivrxNuEA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fullAudit() {
    // Check all repayments for Denis
    const { data: reps } = await supabase
        .from('remboursements')
        .select('*')
        .eq('user_id', '02407183-6552-4b79-abea-b7066cb475e8');
    
    // Check pret history
    const { data: loans } = await supabase
        .from('prets')
        .select('*')
        .eq('user_id', '02407183-6552-4b79-abea-b7066cb475e8');
    
    // Check investor transactions for Denis
    const { data: txs } = await supabase
        .from('investor_transactions')
        .select('*')
        .ilike('shareholder_name', '%Denis%');
    
    console.log('=== LOANS ===')
    loans?.forEach(l => console.log(`ID:${l.id.slice(0,8)} Amount:${l.amount} Paid:${l.amount_paid} Status:${l.status}`));
    console.log('\n=== REPAYMENTS ===')
    reps?.forEach(r => console.log(`Loan:${r.loan_id?.slice(0,8)} Amount:${r.amount_declared} Status:${r.status} Via:${r.proof_url} Date:${r.created_at?.slice(0,10)}`));
    console.log('\n=== INVESTOR TXS ===')
    txs?.forEach(t => console.log(`Type:${t.type} Amount:${t.amount} Status:${t.status} Desc:${t.description?.slice(0,60)} Date:${t.date?.slice(0,10)}`));
}

fullAudit();
