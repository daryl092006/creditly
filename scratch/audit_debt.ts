import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function auditDebt() {
    console.log("--- AUDIT DE LA DETTE ACTIVE ---")
    
    const { data: loans } = await supabase
        .from('prets')
        .select('id, amount, amount_paid, status')
        .in('status', ['active', 'overdue'])
    
    if (!loans) return

    const totalPrincipal = loans.reduce((acc, l) => acc + Number(l.amount), 0)
    const totalPaid = loans.reduce((acc, l) => acc + Number(l.amount_paid), 0)
    const activeDebt = totalPrincipal - totalPaid

    console.log(`Nombre de prêts actifs: ${loans.length}`)
    console.log(`Capital initial prêté: ${totalPrincipal.toLocaleString()} F`)
    console.log(`Déjà récupéré par acomptes: ${totalPaid.toLocaleString()} F`)
    console.log(`CAPITAL RESTANT DEHORS (TOTAL PRÊT ACTIF): ${activeDebt.toLocaleString()} F`)
}

auditDebt()
