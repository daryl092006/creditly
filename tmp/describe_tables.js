const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dbunwqgfakqcazjkyagd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidW53cWdmYWtxY2F6amt5YWdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE3NjY1MywiZXhwIjoyMDgyNzUyNjUzfQ.YlwBx17nJtnRz1cftDwA8gybVE7kzucIs55ivrxNuEA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function describeTable(table) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
        console.error(`Error describing table ${table}:`, error);
    } else {
        console.log(`--- Table ${table} (1st row or columns) ---`);
        if (data && data.length > 0) {
            console.log(Object.keys(data[0]));
        } else {
            console.log('No data found, but table exists.');
        }
    }
}

async function run() {
    await describeTable('users');
    await describeTable('profiles');
    await describeTable('prets');
    await describeTable('loans');
}

run();
