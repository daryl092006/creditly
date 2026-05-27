const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dbunwqgfakqcazjkyagd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidW53cWdmYWtxY2F6amt5YWdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE3NjY1MywiZXhwIjoyMDgyNzUyNjUzfQ.YlwBx17nJtnRz1cftDwA8gybVE7kzucIs55ivrxNuEA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentRepayments() {
    const { data: reps, error } = await supabase
        .from('remboursements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
    
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    for (const r of reps) {
        console.log('---');
        console.log('ID:', r.id);
        console.log('Amount:', r.amount_declared);
        console.log('Status:', r.status);
        console.log('Proof URL:', r.proof_url);
        console.log('Created At:', r.created_at);
        // Sometimes double validation status is in a meta field or just 'pending'
    }
}

checkRecentRepayments();
