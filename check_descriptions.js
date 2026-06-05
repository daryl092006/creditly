const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://dbunwqgfakqcazjkyagd.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidW53cWdmYWtxY2F6amt5YWdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE3NjY1MywiZXhwIjoyMDgyNzUyNjUzfQ.YlwBx17nJtnRz1cftDwA8gybVE7kzucIs55ivrxNuEA'
);

async function run() {
    const { data: txs } = await supabase
        .from('investor_transactions')
        .select('*')
        .in('id', ['35bf945e-97ec-4a2e-8ff2-131bc65f4671', '04a9f368-0a4d-45ec-beb9-696f9732fbb9']);
    console.log(txs);
}

run();
