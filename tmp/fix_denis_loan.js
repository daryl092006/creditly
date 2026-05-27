const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dbunwqgfakqcazjkyagd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidW53cWdmYWtxY2F6amt5YWdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE3NjY1MywiZXhwIjoyMDgyNzUyNjUzfQ.YlwBx17nJtnRz1cftDwA8gybVE7kzucIs55ivrxNuEA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
    const LOAN_ID = '05c2fbc5-b0a2-45fc-925e-d18176629c0f';
    const DENIS_ID = '02407183-6552-4b79-abea-b7066cb475e8';

    // Get all verified repayments for this loan
    const { data: reps } = await supabase
        .from('remboursements')
        .select('amount_declared, status, proof_url, created_at')
        .eq('loan_id', LOAN_ID)
        .eq('status', 'verified');

    const totalPaid = reps?.reduce((sum, r) => sum + Number(r.amount_declared), 0) || 0;
    const loanAmount = 35000; // staff loan, 0% fee
    const remaining = loanAmount - totalPaid;

    console.log('Remboursements vérifiés:');
    reps?.forEach(r => console.log(` - ${r.amount_declared} F (${r.proof_url?.slice(0,25)}) le ${r.created_at?.slice(0,10)}`));
    console.log(`Total payé: ${totalPaid} F`);
    console.log(`Restant: ${remaining} F`);

    if (totalPaid < loanAmount) {
        const newStatus = new Date() > new Date('2026-05-20') ? 'overdue' : 'active';
        console.log(`\n🔧 Correction du prêt : status → ${newStatus}, amount_paid → ${totalPaid}`);
        
        const { error } = await supabase
            .from('prets')
            .update({ status: newStatus, amount_paid: totalPaid })
            .eq('id', LOAN_ID);

        if (error) {
            console.error('Erreur:', error.message);
        } else {
            console.log('✅ Prêt corrigé avec succès.');
        }
    } else {
        console.log('\n✅ Le prêt est réellement soldé, aucune correction nécessaire.');
    }
}

fix();
