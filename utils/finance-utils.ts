import { calculateLoanDebt } from './loan-utils'

export const DISTRIBUTION_START_DATE = '2026-03-19T00:00:00Z'

// Fallback if DB fetch fails
export const DEFAULT_SHAREHOLDERS = [
    { email: 'wilfriedgwld@gmail.com', share: 0.03, color: '#f59e0b', name: 'Wilfried' },
    { email: 'emilebodjrenou31@gmail.com', share: 0.005, color: '#ef4444', name: 'Borel' },
    { email: 'denisgangnito9@gmail.com', share: 0.08, color: '#10b981', name: 'Denis' },
    { email: 'hllawani0@gmail.com', share: 0.885, color: '#3b82f6', name: 'Habib' }
]

export async function getShareholdersConfig(supabase: any) {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'shareholders_config').maybeSingle()
    if (!data?.value) return DEFAULT_SHAREHOLDERS
    
    let config = data.value
    // If it's a string (which can happen with some updates), parse it
    if (typeof config === 'string') {
        try {
            config = JSON.parse(config)
        } catch (e) {
            console.error("Error parsing shareholders_config:", e)
            return DEFAULT_SHAREHOLDERS
        }
    }
    
    return Array.isArray(config) ? config : DEFAULT_SHAREHOLDERS
}

export async function calculateProfitToShare(supabase: any) {
    // 1. REVENUS RÉELS (DÉJÀ ENCAISSÉS)
    // On récupère les abonnements, mais on devra filtrer ceux dont le client a un prêt actif
    const { data: sPost } = await supabase.from('user_subscriptions').select('user_id, plan:abonnements(price)').gte('created_at', DISTRIBUTION_START_DATE)
    
    // Récupération des IDs des clients ayant des prêts non soldés (active, overdue)
    const { data: activeLoanUsers } = await supabase.from('prets').select('user_id').in('status', ['active', 'overdue'])
    const lockedUserIds = new Set(activeLoanUsers?.map((l: any) => l.user_id) || [])

    const subsTotal = sPost?.reduce((acc: number, s: any) => {
        // Si le client nous doit de l'argent, son abonnement n'est pas encore "retirable"
        if (lockedUserIds.has(s.user_id)) return acc
        return acc + (Number(s.plan?.price) || 0)
    }, 0) || 0

    const totalSubsPotential = sPost?.reduce((acc: number, s: any) => acc + (Number(s.plan?.price) || 0), 0) || 0

    const { data: cPost } = await supabase.from('admin_commissions').select('amount').gte('created_at', DISTRIBUTION_START_DATE)
    const commsTotal = cPost?.reduce((acc: number, c: any) => acc + Number(c.amount), 0) || 0

    const { data: lPaid } = await supabase.from('prets').select('*').eq('status', 'paid').gte('updated_at', DISTRIBUTION_START_DATE)
    
    let feesRealized = 0; let extRealized = 0; let penRealized = 0
    lPaid?.forEach((l: any) => {
        feesRealized += (Number(l.service_fee) || 500)
        extRealized += (Number(l.extension_fee) || 0)
        penRealized += calculateLoanDebt(l).latePenalties
    })

    const realizedProfit = subsTotal + feesRealized + extRealized + penRealized - commsTotal

    // 2. REVENUS PRÉVISIONNELS / THÉORIQUES (TOUT CE QUI EST ENTRÉ OU VA ENTRER)
    const { data: lActive } = await supabase.from('prets').select('*').in('status', ['active', 'overdue']).gte('created_at', DISTRIBUTION_START_DATE)
    
    let feesPotential = 0; let extPotential = 0; let penPotential = 0
    lActive?.forEach((l: any) => {
        feesPotential += (Number(l.service_fee) || 500)
        extPotential += (Number(l.extension_fee) || 0)
        penPotential += calculateLoanDebt(l).latePenalties
    })

    // Le théorique inclut TOUS les abonnements et TOUS les frais (payés + potentiels)
    const theoreticalProfit = totalSubsPotential + feesRealized + extRealized + penRealized + feesPotential + extPotential + penPotential - commsTotal

    return { 
        realizedProfit, 
        theoreticalProfit,
        breakdown: {
            subs: totalSubsPotential,
            subsRealized: subsTotal,
            fees: feesRealized + extRealized + feesPotential + extPotential,
            feesRealized: feesRealized + extRealized,
            penalties: penRealized + penPotential,
            penaltiesRealized: penRealized,
            commissions: commsTotal
        }
    }
}

export function getShareholderByEmail(email: string, roles: string[] = [], shareholders: any[] = DEFAULT_SHAREHOLDERS) {
    const match = shareholders.find(s => s.email.toLowerCase() === email.toLowerCase())
    if (match) return match
    
    // Fallback for Habib (Owner)
    if (roles.includes('owner')) {
        return shareholders.find(s => s.name === 'Habib') || shareholders.find(s => s.share >= 0.5)
    }
    
    return null
}
