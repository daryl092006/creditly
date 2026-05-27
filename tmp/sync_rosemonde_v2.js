const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dbunwqgfakqcazjkyagd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidW53cWdmYWtxY2F6amt5YWdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE3NjY1MywiZXhwIjoyMDgyNzUyNjUzfQ.YlwBx17nJtnRz1cftDwA8gybVE7kzucIs55ivrxNuEA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncRosemonde() {
    const userId = 'da585b10-e86a-4963-90f2-5e65a711dd46';
    
    // We'll use a temporary evaluation to update the DB field manually to match the new logic
    const { data: loans } = await supabase.from('prets').select('*').eq('user_id', userId).in('status', ['active', 'overdue']);
    
    const today = new Date('2026-05-27T17:00:00Z');
    let totalDebt = 0;
    
    for (const loan of loans) {
        const principle = Number(loan.amount) || 0;
        const paid = Number(loan.amount_paid) || 0;
        const fee = Number(loan.service_fee) || 500;
        const extensionFee = Number(loan.extension_fee) || 0;
        const baseDebt = principle + fee + extensionFee - paid;
        
        let latePenalties = 0;
        if (loan.status === 'overdue' && loan.due_date) {
            const dueDate = new Date(loan.due_date);
            if (today > dueDate) {
                const diffTime = today.getTime() - dueDate.getTime();
                let daysLate = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
                if (daysLate > 0) daysLate -= 1; // NEW LOGIC
                
                if (daysLate > 0) {
                    latePenalties = Math.round(baseDebt * 0.01 * daysLate);
                }
            }
        }
        totalDebt += (baseDebt + latePenalties);
    }
    
    console.log(`New Calculated Total Debt for Rosemonde (13 days late): ${totalDebt}`);
    
    const { error } = await supabase.from('users').update({
        active_debt_amount: totalDebt,
        last_risk_review_at: new Date().toISOString()
    }).eq('id', userId);
    
    if (error) {
        console.error('Error updating profile:', error);
    } else {
        console.log('Profile updated successfully.');
    }
}

syncRosemonde();
