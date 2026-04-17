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

            // Calculer la différence en jours
            const diffTime = dueDate.getTime() - today.getTime()
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

            // Si l'échéance est exactement dans 3 jours
            if (diffDays === 3) {
                // Utiliser la fonction métier pour avoir la dette exacte (incluant frais de service, déduisant amount_paid)
                const { totalDebt } = calculateLoanDebt(loan as any)

                if (totalDebt > 0) {
                    await sendUserEmail('REPAYMENT_REMINDER', {
                        email: loan.user.email,
                        name: `${loan.user.prenom} ${loan.user.nom}`,
                        amount: totalDebt
                    })
                    emailsSent++
                }
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
