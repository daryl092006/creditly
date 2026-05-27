const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dbunwqgfakqcazjkyagd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidW53cWdmYWtxY2F6amt5YWdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE3NjY1MywiZXhwIjoyMDgyNzUyNjUzfQ.YlwBx17nJtnRz1cftDwA8gybVE7kzucIs55ivrxNuEA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentRepayments() {
    const { data: reps, error } = await supabase
        .from('remboursements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
    
    if (error) {
        console.error('Error fetching repayments:', error);
        return;
    }
    
    console.log('Recent Repayments:');
    reps.forEach(r => {
        console.log(`ID: ${r.id}, Amount: ${r.amount_declared}, Status: ${r.status}, Proof: ${r.proof_url}, Context: ${r.transaction_context || r.proof_url}`);
    });
}

checkRecentRepayments();
