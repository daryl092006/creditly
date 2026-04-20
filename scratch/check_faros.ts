import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function checkFaros() {
    console.log("--- INVESTIGATION FAROS ---")
    
    // Search for user Faros
    const { data: users } = await supabase.from('users').select('id, prenom, nom, email').or('prenom.ilike.%Faros%,nom.ilike.%Faros%')
    
    if (!users || users.length === 0) {
        console.log("Utilisateur Faros non trouvé.")
        return
    }

    for (const user of users) {
        console.log(`Utilisateur: ${user.prenom} ${user.nom} (${user.id})`)
        
        const { data: loans } = await supabase.from('prets').select('*').eq('user_id', user.id)
        
        if (!loans || loans.length === 0) {
            console.log("  Aucun prêt trouvé.")
            continue
        }

        loans.forEach(loan => {
            console.log(`  Prêt ${loan.id}:`)
            console.log(`    Statut: ${loan.status}`)
            console.log(`    Montant: ${loan.amount}`)
            console.log(`    Payé: ${loan.amount_paid}`)
            console.log(`    Reste Principal: ${loan.amount - loan.amount_paid}`)
        })
    }
}

checkFaros()
