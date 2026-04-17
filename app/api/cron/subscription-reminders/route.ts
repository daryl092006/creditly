import { createAdminClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { sendUserEmail } from '@/utils/email-service'

export const dynamic = 'force-dynamic'

/**
 * CRON JOB — Rappels de renouvellement d'abonnement
 * Exécuté chaque jour à 9h00 UTC.
 * Détecte les abonnements qui expirent dans 3 jours et dans 1 jour.
 * Envoie un email de relance à chaque client concerné.
 */
export async function GET(request: Request) {
    // 1. Vérification de l'autorisation Vercel Cron
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        const supabase = await createAdminClient()
        const today = new Date()
        let emailsSent = 0

        // 2. Récupérer tous les abonnements actifs avec profil utilisateur
        const { data: activeSubs, error } = await supabase
            .from('user_subscriptions')
            .select(`
                id,
                end_date,
                status,
                user_id,
                plan:abonnements(name, price),
                user:user_id(email, nom, prenom)
            `)
            .eq('status', 'active')
            .not('end_date', 'is', null)
            .gt('end_date', today.toISOString()) // Pas encore expiré

        if (error) throw error

        for (const sub of activeSubs || []) {
            const user = sub.user as any
            const plan = sub.plan as any

            if (!sub.end_date || !user?.email) continue

            const endDate = new Date(sub.end_date)
            const diffTime = endDate.getTime() - today.getTime()
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

            // Rappel à J-3 (3 jours avant expiration)
            if (diffDays === 3) {
                await sendUserEmail('SUBSCRIPTION_EXPIRING', {
                    email: user.email,
                    name: `${user.prenom} ${user.nom}`,
                    planName: plan?.name || 'votre abonnement',
                    expiresIn: 3,
                    endDate: endDate.toLocaleDateString('fr-FR'),
                    renewUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/client/subscriptions`
                })
                emailsSent++
            }

            // Rappel urgent à J-1 (dernier jour)
            if (diffDays === 1) {
                await sendUserEmail('SUBSCRIPTION_EXPIRING_URGENT', {
                    email: user.email,
                    name: `${user.prenom} ${user.nom}`,
                    planName: plan?.name || 'votre abonnement',
                    expiresIn: 1,
                    endDate: endDate.toLocaleDateString('fr-FR'),
                    renewUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/client/subscriptions`
                })
                emailsSent++
            }
        }

        return NextResponse.json({
            success: true,
            message: `Cron abonnements exécuté. ${emailsSent} rappel(s) envoyé(s).`,
            checked: activeSubs?.length || 0
        })
    } catch (error: any) {
        console.error('[CRON SUBSCRIPTION REMINDERS] Erreur:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
