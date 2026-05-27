const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://dbunwqgfakqcazjkyagd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidW53cWdmYWtxY2F6amt5YWdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE3NjY1MywiZXhwIjoyMDgyNzUyNjUzfQ.YlwBx17nJtnRz1cftDwA8gybVE7kzucIs55ivrxNuEA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDenisLoans() {
    const denisId = '02407183-6552-4b79-abea-b7066cb475e8';
    
    // 1. Get Loans
    const { data: loans } = await supabase
        .from('prets')
        .select('*')
        .eq('user_id', denisId);
    
    // 2. Get Repayments to verify
    const { data: reps } = await supabase
        .from('remboursements')
        .select('*')
        .eq('user_id', denisId)
        .order('created_at', { ascending: false });

    console.log('Loans:', loans?.length);
    console.log('Repayments:', reps?.length);
    
    fs.writeFileSync('d:/creditly/tmp/denis_audit.json', JSON.stringify({ loans, reps }, null, 2));
}

checkDenisLoans();
