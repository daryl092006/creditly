const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://dbunwqgfakqcazjkyagd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidW53cWdmYWtxY2F6amt5YWdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE3NjY1MywiZXhwIjoyMDgyNzUyNjUzfQ.YlwBx17nJtnRz1cftDwA8gybVE7kzucIs55ivrxNuEA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDoubleValidation() {
    const { data: reps } = await supabase
        .from('remboursements')
        .select('*')
        .eq('requires_double_validation', true)
        .order('created_at', { ascending: false });
    
    fs.writeFileSync('d:/creditly/tmp/double_val.json', JSON.stringify(reps, null, 2));
    console.log(`Found ${reps.length} double validation items.`);
}

checkDoubleValidation();
