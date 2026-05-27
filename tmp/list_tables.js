const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dbunwqgfakqcazjkyagd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidW53cWdmYWtxY2F6amt5YWdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE3NjY1MywiZXhwIjoyMDgyNzUyNjUzfQ.YlwBx17nJtnRz1cftDwA8gybVE7kzucIs55ivrxNuEA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
    const { data, error } = await supabase.rpc('get_tables');
    if (error) {
        // If RPC doesn't exist, try a manual query if possible or just try to guess
        console.log('Error fetching tables via RPC:', error);
        
        // Try common names
        const tables = ['profiles', 'users', 'loans', 'repayments', 'settings'];
        for (const table of tables) {
            const { error: tableError } = await supabase.from(table).select('count', { count: 'exact', head: true });
            if (!tableError) {
                console.log(`Table '${table}' exists.`);
            } else {
                console.log(`Table '${table}' does not exist or error: ${tableError.message}`);
            }
        }
    } else {
        console.log('Tables:', data);
    }
}

listTables();
