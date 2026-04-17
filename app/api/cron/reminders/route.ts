import { createAdminClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { sendUserEmail } from '@/utils/email-service'
import { calculateLoanDebt } from '@/utils/loan-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    // 1. Verify authorization (Vercel Cron Auth)
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        const supabase = await createAdminClient()

        // 2. Récupérer tous les prêts actifs
        // On inclus l'utilisateur pour avoir son email et ses infos
        const { data: activeLoans, error } = await supabase
            .from('prets')
            .select('*, user:user_id(email, nom, prenom)')
            .eq('status', 'active')
            .not('due_date', 'is', null)

        if (error) throw error

        const today = new Date()
        let emailsSent = 0

        for (const loan of activeLoans || []) {
            if (!loan.due_date || !loan.user?.email) continue;

            const dueDate = new Date(loan.due_date)
            dueDate.setHours(0, 0, 0, 0)
            const todayMidnight = new Date(today)
            todayMidnight.setHours(0, 0, 0, 0)

            // Calculer la différence en jours
            const diffTime = dueDate.getTime() - todayMidnight.getTime()
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

            // Utiliser la fonction métier pour avoir la dette exacte
            const { totalDebt } = calculateLoanDebt(loan as any)
            if (totalDebt <= 0) continue;

            const name = `${loan.user.prenom} ${loan.user.nom}`
            const email = loan.user.email

            // Dispatch par intervalle
            if (diffDays === 3) {
                await sendUserEmail('REPAYMENT_REMINDER', { email, name, amount: totalDebt })
                emailsSent++
            } else if (diffDays === 1) {
                await sendUserEmail('REPAYMENT_REMINDER_URGENT', { email, name, amount: totalDebt })
                emailsSent++
            } else if (diffDays === 0) {
                await sendUserEmail('REPAYMENT_DUE_TODAY', { email, name, amount: totalDebt })
                emailsSent++
            } else if (diffDays === -1) {
                // Hier était la date limite -> status overdue (normalement géré par le RPC mais on prévient)
                await sendUserEmail('REPAYMENT_OVERDUE', { email, name, amount: totalDebt })
                emailsSent++
            }
        }

        return NextResponse.json({
            success: true,
            message: `Cron exécuté avec succès. ${emailsSent} rappels (J-3) envoyés.`
        })
    } catch (error: any) {
        console.error('[CRON REMINDERS] Erreur:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
