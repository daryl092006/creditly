const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function testScore() {
    const userId = "7bb90ca9-f613-418e-bf7c-e8b9aa48d82a"
    console.log("Testing user:", userId)

    const [{ data: user }, { data: loans }, { data: kyc }, { data: sub }] = await Promise.all([
        supabaseAdmin.from('users').select('*').eq('id', userId).single(),
        supabaseAdmin.from('prets').select('*').eq('user_id', userId),
        supabaseAdmin.from('kyc_submissions').select('status').eq('user_id', userId).single(),
        supabaseAdmin.from('user_subscriptions').select('plan:abonnements(max_loan_amount)').eq('user_id', userId).eq('status', 'active').single()
    ])

    if (!user) { console.log('User not found'); return }

    let score = 0
    score += kyc?.status === 'verified' ? 20 : kyc?.status === 'rejected' ? 0 : 10
    
    console.log("After KYC:", score)

    const now = new Date()
    const seniorityMonths = Math.floor((now.getTime() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30))
    score += Math.min(seniorityMonths * 2, 10)

    console.log("After seniority:", score)

    if (user.whatsapp && user.nom && user.prenom) score += 5
    console.log("After coherence:", score)

    let fraudLevel = 0
    if (typeof user.fraud_suspicion_level === 'string') {
        if (user.fraud_suspicion_level.toUpperCase() !== 'NONE') fraudLevel = 2 
    } else if (user.fraud_suspicion_level > 0) {
        fraudLevel = user.fraud_suspicion_level
    }
    score -= fraudLevel * 10

    console.log("After fraud:", score)

    score = Math.max(0, Math.min(100, score))
    console.log("Final score:", score)

    // Update test
    const { error: updErr } = await supabaseAdmin.from('users').update({
        current_score: score,
        risk_class: 'RISQUE',
        active_debt_amount: 0,
        current_debt_ratio: 0,
        last_risk_review_at: new Date().toISOString()
    }).eq('id', userId)

    if (updErr) console.error("Update error in test:", updErr)
    else console.log("Update SUCCESS!")
}

testScore()
