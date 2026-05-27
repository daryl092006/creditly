const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dbunwqgfakqcazjkyagd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidW53cWdmYWtxY2F6amt5YWdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE3NjY1MywiZXhwIjoyMDgyNzUyNjUzfQ.YlwBx17nJtnRz1cftDwA8gybVE7kzucIs55ivrxNuEA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRosemonde() {
    // 1. Find the user in 'users' table
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .ilike('full_name', '%Rosemonde%');

    if (userError) {
        console.error('Error fetching user:', userError);
    } else {
        console.log('--- Users ---');
        console.log(users);
    }

    if (users && users.length > 0) {
        const user = users[0];
        // 2. Find her loans in 'prets' or 'loans'
        const { data: prets, error: pretsError } = await supabase
            .from('prets')
            .select('*')
            .eq('user_id', user.id);
        
        if (pretsError) {
            console.error('Error fetching prets:', pretsError);
        } else {
            console.log('\n--- Prets ---');
            console.log(prets);
        }

        const { data: loans, error: loansError } = await supabase
            .from('loans')
            .select('*')
            .eq('user_id', user.id);
        
        if (loansError) {
            console.error('Error fetching loans:', loansError);
        } else {
            console.log('\n--- Loans ---');
            console.log(loans);
        }
    }
}

checkRosemonde();
