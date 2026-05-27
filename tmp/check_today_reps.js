const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dbunwqgfakqcazjkyagd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidW53cWdmYWtxY2F6amt5YWdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE3NjY1MywiZXhwIjoyMDgyNzUyNjUzfQ.YlwBx17nJtnRz1cftDwA8gybVE7kzucIs55ivrxNuEA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTodayRepayments() {
    const today = new Date().toISOString().split('T')[0];
    const { data: reps, error } = await supabase
        .from('remboursements')
        .select('*, user:user_id(prenom, nom, roles)')
        .gte('created_at', today)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    console.log(`Found ${reps.length} repayments for today.`);
    for (const r of reps) {
        console.log(`[${r.created_at}] User: ${r.user?.prenom} ${r.user?.nom} (${r.user?.roles}) | Amount: ${r.amount_declared} | Status: ${r.status} | Proof: ${r.proof_url}`);
    }
}

checkTodayRepayments();
