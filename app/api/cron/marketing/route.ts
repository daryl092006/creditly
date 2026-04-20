import { createAdminClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { sendUserEmail } from '@/utils/email-service'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    // 1. Verify authorization (Vercel Cron Auth)
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        const supabase = await createAdminClient()
        let emailsSent = 0

        // SEUIL : On ne relance pas les gens inscrits il y a moins de 2 jours
        const twoDaysAgo = new Date()
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
        const dateLimit = twoDaysAgo.toISOString()

        // --- SEGMENT A : Comptes sans aucun KYC (Relance KYC) ---
        // On récupère les utilisateurs qui n'ont pas de ligne dans kyc_submissions
        const { data: noKycUsers } = await supabase
            .from('users')
            .select('id, email, nom, prenom')
            .lt('created_at', dateLimit)
            .not('roles', 'cs', '{"owner", "superadmin"}') // Eviter de relancer le staff

        for (const user of noKycUsers || []) {
            const { count } = await supabase
                .from('kyc_submissions')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
            
            if (count === 0) {
                await sendUserEmail('REMARKETING_NO_KYC', { 
                    email: user.email, 
                    name: `${user.prenom} ${user.nom}` 
                })
                emailsSent++
            }
        }

        // --- SEGMENT B : KYC Validé mais aucun prêt demandé ---
        const { data: verifiedButInactive } = await supabase
            .from('kyc_submissions')
            .select('user:user_id(id, email, nom, prenom)')
            .eq('status', 'approved')
            .lt('reviewed_at', dateLimit)

        for (const submission of verifiedButInactive || []) {
            const user: any = submission.user
            if (!user) continue

            const { count } = await supabase
                .from('prets')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)

            if (count === 0) {
                await sendUserEmail('REMARKETING_NO_LOAN', { 
                    email: user.email, 
                    name: `${user.prenom} ${user.nom}` 
                })
                emailsSent++
            }
        }

        return NextResponse.json({
            success: true,
            message: `Marketing automation terminée. ${emailsSent} emails de relance envoyés.`
        })
    } catch (error: any) {
        console.error('[CRON MARKETING] Erreur:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
