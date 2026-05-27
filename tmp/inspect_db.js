const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://dbunwqgfakqcazjkyagd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidW53cWdmYWtxY2F6amt5YWdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE3NjY1MywiZXhwIjoyMDgyNzUyNjUzfQ.YlwBx17nJtnRz1cftDwA8gybVE7kzucIs55ivrxNuEA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTables() {
    const { data: tables } = await supabase.rpc('get_tables_info'); // Might not exist
    if (tables) {
        console.log(tables);
    } else {
        // Fallback: list of known tables
        const known = ['remboursements', 'admin_withdrawals', 'admin_commissions', 'prets', 'users'];
        for (const t of known) {
            const { data } = await supabase.from(t).select('*').order('created_at', { ascending: false }).limit(1);
            console.log(`Table ${t} last item:`, data?.[0]?.created_at);
        }
    }
}

inspectTables();
