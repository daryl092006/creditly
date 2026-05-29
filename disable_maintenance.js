const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://dbunwqgfakqcazjkyagd.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidW53cWdmYWtxY2F6amt5YWdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE3NjY1MywiZXhwIjoyMDgyNzUyNjUzfQ.YlwBx17nJtnRz1cftDwA8gybVE7kzucIs55ivrxNuEA'
);

async function disableMaintenance() {
    console.log('Checking maintenance mode...');
    const { data: current } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'maintenance_mode')
        .single();
    
    console.log('Current status:', current);

    const { data, error } = await supabase
        .from('system_settings')
        .update({ value: 'false' })
        .eq('key', 'maintenance_mode')
        .select();

    if (error) {
        console.error('Error updating maintenance mode:', error);
    } else {
        console.log('Maintenance mode updated:', data);
    }
}

disableMaintenance();
