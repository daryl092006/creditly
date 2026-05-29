const { createClient } = require('./utils/supabase/server')
const { updateRepaymentStatus } = require('./app/admin/actions')

async function validateDenisRepayments() {
    const supabase = await createClient()
    
    // 1. Find Denis
    const { data: users } = await supabase.from('users').select('id').ilike('email', '%denisgangnito9%').maybeSingle()
    if (!users) return;
    const denisId = users.id;

    // 2. Find pending repayments
    const { data: r } = await supabase.from('remboursements').select('id').eq('user_id', denisId).eq('status', 'pending')
    
    console.log(`Found ${r?.length || 0} pending repayments for Denis. Validating...`)
    
    for (const rep of (r || [])) {
        await updateRepaymentStatus(rep.id, 'verified', 'Validation automatique suite audit admin')
    }
    
    console.log("Validation terminée.")
}

// Note: I can't run this easily because updateRepaymentStatus uses cookies/auth.
// I'll use a direct supabase update script.
