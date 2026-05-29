const { createClient } = require('@supabase/supabase-js');

// Hardcoded for the one-off fix as requested by user
const supabaseUrl = 'https://dbunwqgfakqcazjkyagd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidW53cWdmYWtxY2F6amt5YWdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE3NjY1MywiZXhwIjoyMDgyNzUyNjUzfQ.YlwBx17nJtnRz1cftDwA8gybVE7kzucIs55ivrxNuEA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixCarlos() {
    console.log('--- RECHERCHE DE SOUNKOTO CARLOS ---');
    
    const { data: users, error: findError } = await supabase
        .from('users')
        .select('id, prenom, nom, email, is_under_review, fraud_suspicion_level')
        .or('prenom.ilike.%Sounkoto%,nom.ilike.%Sounkoto%')
        .or('prenom.ilike.%Carlos%,nom.ilike.%Carlos%');

    if (findError) {
        console.error('Erreur lors de la recherche:', findError);
        return;
    }

    if (!users || users.length === 0) {
        console.log('Utilisateur non trouvé avec ces critères.');
        return;
    }

    for (const user of users) {
        console.log(`\nCible: ${user.prenom} ${user.nom} (${user.email})`);
        
        // 2. Chercher les logs d'audit
        const { data: logs } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('actor_user_id', user.id)
            .ilike('action_type', '%FRAUD%')
            .order('created_at', { ascending: false });

        if (logs && logs.length > 0) {
            console.log(`Logs de fraude trouvés (${logs.length}):`);
            logs.forEach(log => {
                console.log(`- [${log.created_at}] ${log.action_type}: ${JSON.stringify(log.new_value_json)}`);
            });
        }

        // 3. Un-suspend
        console.log('Exécution du déblocage...');
        const { error: updateError } = await supabase
            .from('users')
            .update({
                is_under_review: false,
                fraud_suspicion_level: 'NONE',
                is_account_active: true
            })
            .eq('id', user.id);

        if (updateError) {
            console.error(`Erreur lors de la mise à jour pour ${user.email}:`, updateError);
        } else {
            console.log(`✓ Utilisateur ${user.prenom} ${user.nom} débloqué avec succès.`);
        }
    }
}

fixCarlos();
