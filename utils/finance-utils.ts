import { calculateLoanDebt } from './loan-utils'

export const DISTRIBUTION_START_DATE = '2026-03-19T00:00:00Z'

export const SHAREHOLDERS_CONFIG = [
    { email: 'wilfriedgwld@gmail.com', share: 0.03, color: '#f59e0b', name: 'Wilfried' },
    { email: 'emilebodjrenou31@gmail.com', share: 0.005, color: '#ef4444', name: 'Borel' },
    { email: 'denisgangnito9@gmail.com', share: 0.08, color: '#10b981', name: 'Denis' },
    { email: 'hllawani0@gmail.com', share: 0.885, color: '#3b82f6', name: 'Habib' }
]

export async function calculateProfitToShare(supabase: any) {
    // 1. REVENUS RÉELS (DÉJÀ ENCAISSÉS)
    const { data: sPost } = await supabase.from('user_subscriptions').select('plan:abonnements(price)').gte('created_at', DISTRIBUTION_START_DATE)
    const subsTotal = sPost?.reduce((acc: number, s: any) => acc + (Number(s.plan?.price) || 0), 0) || 0

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

    // 2. REVENUS PRÉVISIONNELS (SI TOUT LE MONDE REMBOURSE)
    const { data: lActive } = await supabase.from('prets').select('*').in('status', ['active', 'overdue']).gte('created_at', DISTRIBUTION_START_DATE)
    
    let feesPotential = 0; let extPotential = 0; let penPotential = 0
    lActive?.forEach((l: any) => {
        feesPotential += (Number(l.service_fee) || 500)
        extPotential += (Number(l.extension_fee) || 0)
        penPotential += calculateLoanDebt(l).latePenalties
    })

    const forecastedProfit = realizedProfit + feesPotential + extPotential + penPotential

    return { 
        realizedProfit, 
        forecastedProfit,
        breakdown: {
            subs: subsTotal,
            fees: feesRealized + extRealized,
            penalties: penRealized,
            commissions: commsTotal
        }
    }
}

export function getShareholderByEmail(email: string, roles: string[] = []) {
    const match = SHAREHOLDERS_CONFIG.find(s => s.email.toLowerCase() === email.toLowerCase())
    if (match) return match
    
    // Fallback for Habib (Owner)
    if (roles.includes('owner')) {
        return SHAREHOLDERS_CONFIG.find(s => s.name === 'Habib')
    }
    
    return null
}
