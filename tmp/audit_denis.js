import { createClient } from './utils/supabase/server'
import { calculateLoanDebt } from './utils/loan-utils'

async function checkDenis() {
    const supabase = await createClient()
    
    // 1. Find Denis
    const { data: denis } = await supabase.from('users').select('id').ilike('email', '%denisgangnito9%').maybeSingle()
    if (!denis) {
        console.log("Denis non trouvé")
        return
    }
    
    console.log(`Denis ID: ${denis.id}`)
    
    // 2. Check his loans
    const { data: loans } = await supabase.from('prets').select('*').eq('user_id', denis.id)
    console.log(`\nPRÊTS DE DENIS:`)
    loans?.forEach(l => {
        const stats = calculateLoanDebt(l as any)
        console.log(`ID: ${l.id} | Status: ${l.status} | Total Due: ${stats.totalDebt} | Paid: ${l.amount_paid}`)
    })
    
    // 3. Check repayments he validated
    const { data: validated } = await supabase.from('remboursements').select('*, user:user_id(prenom, nom)').eq('admin_id', denis.id).order('created_at', { ascending: false }).limit(5)
    console.log(`\nREMBOURSEMENTS VALIDÉS PAR DENIS:`)
    validated?.forEach(r => {
        console.log(`Remb: ${r.id} | User: ${(r.user as any)?.prenom} | Amount: ${r.amount_declared} | Status: ${r.status}`)
    })
}

checkDenis()
