import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function closePaidLoans() {
    console.log("Fermeture des prêts dont le capital est soldé...")
    
    // On cherche les prêts active/overdue où amount_paid >= amount
    const { data: loans } = await supabase
        .from('prets')
        .select('id, amount, amount_paid, status')
        .in('status', ['active', 'overdue'])
    
    if (!loans) return

    const loansToClose = loans.filter(l => Number(l.amount_paid) >= Number(l.amount))
    
    console.log(`${loansToClose.length} prêts trouvés avec capital soldé.`)

    for (const loan of loansToClose) {
        console.log(`  Clôture du prêt ${loan.id} (${loan.amount_paid}/${loan.amount})`)
        await supabase.from('prets').update({ status: 'paid' }).eq('id', loan.id)
    }
}

closePaidLoans()
