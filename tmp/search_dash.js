const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://dbunwqgfakqcazjkyagd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidW53cWdmYWtxY2F6amt5YWdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE3NjY1MywiZXhwIjoyMDgyNzUyNjUzfQ.YlwBx17nJtnRz1cftDwA8gybVE7kzucIs55ivrxNuEA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function searchDash() {
    const { data: all } = await supabase
        .from('admin_withdrawals')
        .select('*');
    
    console.log('Admin Withdrawals:', all?.length);
    fs.writeFileSync('d:/creditly/tmp/all_withdrawals.json', JSON.stringify(all, null, 2));

    const { data: reps } = await supabase
        .from('remboursements')
        .select('*, user:user_id(prenom, nom)')
        .order('created_at', { ascending: false })
        .limit(20);
    
    fs.writeFileSync('d:/creditly/tmp/recent_reps_wide.json', JSON.stringify(reps, null, 2));
}

searchDash();
