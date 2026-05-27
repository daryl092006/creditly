const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://dbunwqgfakqcazjkyagd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidW53cWdmYWtxY2F6amt5YWdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE3NjY1MywiZXhwIjoyMDgyNzUyNjUzfQ.YlwBx17nJtnRz1cftDwA8gybVE7kzucIs55ivrxNuEA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInvestorTransactions() {
    const { data: txs } = await supabase
        .from('investor_transactions')
        .select('*')
        .order('date', { ascending: false })
        .limit(10);
    
    fs.writeFileSync('d:/creditly/tmp/investor_txs.json', JSON.stringify(txs, null, 2));
    console.log('Investor Txs:', txs?.length);
}

checkInvestorTransactions();
