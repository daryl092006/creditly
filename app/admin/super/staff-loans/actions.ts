'use server'

import { createAdminClient, createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAdminRole } from '@/utils/admin-security'
import { sendUserEmail } from '@/utils/email-service'

export async function createStaffLoan(
    userId: string,
    amountTotal: number,
    type: 'lump_sum' | 'monthly',
    installmentsCount: number,
    startDate: string,
    description: string = 'Prêt Staff Interne (0%)'
) {
    try {
        const { role } = await requireAdminRole(['owner'])
        if (role !== 'owner') return { error: "Action réservée au Propriétaire." }

        const adminSupabase = await createAdminClient()

        // 1. Fetch user data (to verify they are staff and get details)
        const { data: targetUser, error: userError } = await adminSupabase
            .from('users')
            .select('email, nom, prenom, roles')
            .eq('id', userId)
            .single()

        if (userError || !targetUser) return { error: "Utilisateur introuvable." }
        
        const roles = (targetUser.roles || []) as string[]
        const isStaff = roles.some(r => r.startsWith('admin_') || r === 'superadmin')
        
        if (!isStaff && !roles.includes('owner')) {
            return { error: "Cet utilisateur n'est pas un membre du staff (Admin)." }
        }

        const loansToCreate = []
        
        if (type === 'lump_sum' || installmentsCount <= 1) {
            loansToCreate.push({
                user_id: userId,
                amount: amountTotal,
                status: 'active', // Directement actif car approuvé par l'owner
                due_date: new Date(startDate).toISOString(),
                service_fee: 0,
                payout_name: description, // On utilise payout_name pour stocker la description puisque la colonne dédiée n'existe pas
                amount_paid: 0
            })
        } else {
            const amountPerMonth = Math.floor(amountTotal / installmentsCount)
            const baseDate = new Date(startDate)
            
            for (let i = 0; i < installmentsCount; i++) {
                const dueDate = new Date(baseDate)
                dueDate.setMonth(baseDate.getMonth() + i)
                
                loansToCreate.push({
                    user_id: userId,
                    amount: amountPerMonth,
                    status: 'active',
                    due_date: dueDate.toISOString(),
                    service_fee: 0,
                    payout_name: `${description} - ${i + 1}/${installmentsCount}`,
                    amount_paid: 0
                })
            }
        }

        // 2. Insert loans
        const { error: insertError } = await adminSupabase.from('prets').insert(loansToCreate)
        
        if (insertError) {
            console.error('Staff Loan Insert Error:', insertError)
            return { error: "Erreur lors de la création du prêt central." }
        }

        // 3. Notify the Admin
        try {
            await sendUserEmail('DIRECT_MESSAGE', {
                email: targetUser.email,
                name: `${targetUser.prenom} ${targetUser.nom}`,
                subject: 'Dotation Prêt Staff Creditly',
                message: `Bonjour,\n\nLe Propriétaire vous a accordé un prêt staff de ${amountTotal.toLocaleString('fr-FR')} FCFA.\nType: ${type === 'monthly' ? `Mensualisé (${installmentsCount} mois)` : 'Remboursement unique'}.\nPremière échéance le: ${new Date(startDate).toLocaleDateString('fr-FR')}.\n\nVous pouvez consulter et rembourser vos échéances dans votre panel admin sous la rubrique "Mes Prêts Staff".`
            })
        } catch (e) {
            console.error('Notification Email Failed:', e)
        }

        revalidatePath('/admin/super/users')
        revalidatePath('/admin/my-loans')
        
        return { success: true }
    } catch (e: any) {
        console.error('Staff Loan Crash:', e)
        return { error: e.message || "Erreur interne" }
    }
}
