const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dbunwqgfakqcazjkyagd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidW53cWdmYWtxY2F6amt5YWdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE3NjY1MywiZXhwIjoyMDgyNzUyNjUzfQ.YlwBx17nJtnRz1cftDwA8gybVE7kzucIs55ivrxNuEA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const results = {};

    // 1. Describe USERS
    const { data: userData, error: userError } = await supabase.from('users').select('*').limit(1);
    results.users = {
        error: userError,
        columns: userData && userData.length > 0 ? Object.keys(userData[0]) : []
    };

    // 2. Find Rosemonde in USERS
    // We'll search across common column names
    const columnsToTry = ['full_name', 'name', 'email', 'first_name', 'last_name'];
    let rosemonde = null;
    for (const col of results.users.columns) {
        if (columnsToTry.includes(col.toLowerCase()) || col.toLowerCase().includes('name')) {
            const { data, error } = await supabase.from('users').select('*').ilike(col, '%Rosemonde%');
            if (data && data.length > 0) {
                rosemonde = data[0];
                results.rosemonde_found_in_col = col;
                break;
            }
        }
    }
    results.rosemonde = rosemonde;

    if (rosemonde) {
        // 3. Find loans in PRETS
        const { data: prets, error: pretsError } = await supabase.from('prets').select('*').eq('user_id', rosemonde.id);
        results.prets = { data: prets, error: pretsError };

        // 4. Find repayments in REMBOURSEMENTS
        const { data: repayments, error: repaymentsError } = await supabase.from('remboursements').select('*').eq('user_id', rosemonde.id);
        results.repayments = { data: repayments, error: repaymentsError };
    }

    console.log(JSON.stringify(results, null, 2));
}

run();
