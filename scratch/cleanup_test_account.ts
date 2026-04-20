import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function fullCleanup() {
    console.log("Nettoyage du compte test hllawani0@gmail.com...")
    
    const { data: user } = await supabase.from('users').select('id').eq('email', 'hllawani0@gmail.com').single()
    
    if (!user) {
        console.log("Utilisateur non trouvé.")
        return
    }

    const userId = user.id
    console.log(`ID Utilisateur: ${userId}`)

    // 1. D'abord les remboursements (contrainte FK)
    const { error: err1 } = await supabase.from('remboursements').delete().eq('user_id', userId)
    if (err1) console.log("Erreur remboursements:", err1)
    else console.log("Remboursements supprimés.")

    // 2. Les commissions admin
    const { error: err2 } = await supabase.from('admin_commissions').delete().eq('admin_id', userId)
    if (err2) console.log("Erreur commissions:", err2)
    else console.log("Commissions supprimées.")

    // 3. Enfin les prêts
    const { error: err3 } = await supabase.from('prets').delete().eq('user_id', userId)
    if (err3) console.log("Erreur prêts:", err3)
    else console.log("Prêts supprimés.")

    console.log("Nettoyage terminé.")
}

fullCleanup()
