const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://dbunwqgfakqcazjkyagd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidW53cWdmYWtxY2F6amt5YWdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE3NjY1MywiZXhwIjoyMDgyNzUyNjUzfQ.YlwBx17nJtnRz1cftDwA8gybVE7kzucIs55ivrxNuEA';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkFraud() {
    const { data: logs } = await supabase
        .from('audit_logs')
        .select('*, actor:actor_user_id(prenom, nom)')
        .ilike('action_type', '%FRAUD%')
        .order('created_at', { ascending: false })
        .limit(1);

    if (logs && logs.length > 0) {
        console.log('DERNIER LOG DE FRAUDE :');
        console.log(JSON.stringify(logs[0], null, 2));
    } else {
        console.log('Aucun log de fraude trouvé.');
    }
}
checkFraud();
