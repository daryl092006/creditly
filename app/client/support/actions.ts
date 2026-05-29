'use server'

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

type Priority = 'urgent' | 'high' | 'medium' | 'low'

interface CreateTicketFromErrorParams {
    subject: string
    userMessage: string
    category: string
    priority: Priority
    context?: {
        page?: string
        action?: string
        errorMessage?: string
        errorDetail?: string
        errorCode?: string
        timestamp?: string
        userAgent?: string
        currentUrl?: string
        userId?: string
        planId?: string
        planName?: string
        loanId?: string
        repaymentId?: string
        userLimit?: number
        planLimit?: number
        kycStatus?: string
        riskClass?: string
    }
}

export async function createSupportTicketFromError(params: CreateTicketFromErrorParams) {
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) throw new Error('Non authentifié')

    // Enrichissement automatique du contexte avec les données utilisateur en base
    const adminSupabase = await createAdminClient()
    const [
        { data: userProfile },
        { data: activeKyc },
        { data: activeSub }
    ] = await Promise.all([
        adminSupabase.from('users').select('nom, prenom, risk_class, current_score, fraud_suspicion_level').eq('id', userData.user.id).single(),
        adminSupabase.from('kyc_submissions').select('status').eq('user_id', userData.user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        adminSupabase.from('user_subscriptions').select('status, plan:abonnements(name)').eq('user_id', userData.user.id).eq('status', 'active').maybeSingle()
    ])

    const enrichedContext = {
        ...params.context,
        userId: userData.user.id,
        userEmail: userData.user.email,
        kycStatus: activeKyc?.status || params.context?.kycStatus || 'unknown',
        activeSubscription: (activeSub?.plan as any)?.name || 'none',
        riskClass: userProfile?.risk_class || params.context?.riskClass || 'STANDARD',
        riskScore: userProfile?.current_score || 0,
        timestamp: params.context?.timestamp || new Date().toISOString()
    }

    // Vérifier si un ticket similaire est déjà ouvert (anti-doublon)
    const { data: existingTicket } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('user_id', userData.user.id)
        .eq('status', 'open')
        .ilike('subject', `%${params.category}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (existingTicket) {
        // Ticket similaire existant — on l'enrichit avec le nouveau message
        const { data: updated } = await supabase
            .from('support_tickets')
            .update({
                description: `${params.userMessage}\n\n[Mise à jour automatique - ${new Date().toLocaleDateString('fr-FR')}]`,
                context_json: enrichedContext,
                updated_at: new Date().toISOString()
            })
            .eq('id', existingTicket.id)
            .select()
            .single()

        revalidatePath('/client/support')
        return updated
    }

    // Créer un nouveau ticket
    const { data: ticket, error } = await supabase
        .from('support_tickets')
        .insert({
            user_id: userData.user.id,
            subject: params.subject,
            description: params.userMessage,
            priority: params.priority,
            status: 'open',
            category: params.category,
            context_json: enrichedContext
        })
        .select()
        .single()

    if (error) {
        // Si la colonne context_json ou category n'existe pas encore, on retry sans
        const { data: ticketFallback, error: err2 } = await supabase
            .from('support_tickets')
            .insert({
                user_id: userData.user.id,
                subject: params.subject,
                description: `${params.userMessage}\n\n--- Contexte automatique ---\nErreur: ${params.context?.errorMessage || ''}\nPage: ${params.context?.currentUrl || ''}\nKYC: ${enrichedContext.kycStatus}\nAbonnement: ${enrichedContext.activeSubscription}\nRisque: ${enrichedContext.riskClass}`,
                priority: params.priority,
                status: 'open',
            })
            .select()
            .single()

        if (err2) throw new Error('Impossible de créer le ticket')
        revalidatePath('/client/support')
        return ticketFallback
    }

    // Audit log
    try {
        await adminSupabase.from('audit_logs').insert({
            action_type: 'SUPPORT_TICKET_CREATED',
            actor_user_id: userData.user.id,
            target_table: 'support_tickets',
            target_id: ticket.id,
            new_value_json: { category: params.category, priority: params.priority, context: enrichedContext }
        })
    } catch (_) { /* non-bloquant */ }

    revalidatePath('/client/support')
    return ticket
}

export async function createSupportTicket(data: { subject: string; description: string; priority: string; category?: string }) {
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) throw new Error('Non authentifié')

    const { data: ticket, error } = await supabase
        .from('support_tickets')
        .insert({
            user_id: userData.user.id,
            subject: data.subject,
            description: data.description,
            priority: data.priority,
            status: 'open',
            category: data.category || 'Autre'
        })
        .select()
        .single()

    if (error) throw new Error('Impossible de créer le ticket')

    revalidatePath('/client/support')
    return ticket
}
