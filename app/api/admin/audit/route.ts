import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'

/**
 * Route de diagnostic email — ADMIN UNIQUEMENT
 * Accessible via : /api/admin/audit?action=test-email
 * Envoie un email de test à ADMIN_EMAIL pour valider la configuration Resend.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    const diagnostics: Record<string, any> = {
        timestamp: new Date().toISOString(),
        env: {
            GMAIL_USER: process.env.GMAIL_USER
                ? `✅ ${process.env.GMAIL_USER}`
                : `⚠️ Non défini → utilise creditly001@gmail.com par défaut`,
            GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD
                ? `✅ Défini (${process.env.GMAIL_APP_PASSWORD.slice(0, 4)}...)`
                : `❌ MANQUANT → Les emails ne partent pas ! Guide : https://myaccount.google.com/apppasswords`,
            NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ? `✅ ${process.env.NEXT_PUBLIC_SITE_URL}` : '⚠️ Non défini',
            CRON_SECRET: process.env.CRON_SECRET ? '✅ Défini' : '⚠️ Non défini',
            ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'creditly001@gmail.com (valeur par défaut)',
        }
    }

    if (action === 'test-email') {
        try {
            const { Resend } = await import('resend')
            const { wrapEmailTemplate } = await import('@/utils/email-service')
            const resend = new Resend(process.env.RESEND_API_KEY)

            const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
            const toEmail = process.env.ADMIN_EMAIL || 'creditly001@gmail.com'

            const title = '✅ Test Email Creditly — Configuration OK'
            const content = `
                <p>Hello Admin,</p>
                <p>Si vous recevez cet email, votre configuration <strong>Resend</strong> fonctionne parfaitement avec le nouveau design Premium.</p>
                <div style="background:#f8fafc; padding:15px; border-radius:8px; margin:20px 0; font-family: monospace; font-size: 13px;">
                    <p style="margin: 0;"><strong>From:</strong> ${fromEmail}</p>
                    <p style="margin: 5px 0 0 0;"><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
                </div>
            `
            const button = { label: 'Accéder au Dashboard', url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/super` }

            const { data, error } = await resend.emails.send({
                from: `Creditly Test <${fromEmail}>`,
                to: toEmail,
                subject: title,
                html: wrapEmailTemplate({ title, content, button })
            })

            if (error) {
                diagnostics.emailTest = {
                    success: false,
                    error: error.message,
                    hint: fromEmail === 'onboarding@resend.dev'
                        ? '⚠️ Vous utilisez le domaine sandbox Resend. Cela ne fonctionne QUE si vous envoyez à l\'adresse email enregistrée sur votre compte Resend. Définissez RESEND_FROM_EMAIL avec votre domaine vérifié.'
                        : 'Vérifiez votre clé API Resend et votre domaine vérifié.'
                }
            } else {
                diagnostics.emailTest = {
                    success: true,
                    messageId: data?.id,
                    sentTo: toEmail,
                    sentFrom: fromEmail,
                    message: `Email envoyé avec succès à ${toEmail}. Vérifiez votre boîte mail (et spam).`
                }
            }
        } catch (err: any) {
            diagnostics.emailTest = {
                success: false,
                error: err.message
            }
        }
    }

    // Quick Supabase connectivity test
    try {
        const supabase = await createAdminClient()
        const { count } = await supabase.from('users').select('*', { count: 'exact', head: true })
        diagnostics.supabase = `✅ Connecté — ${count} utilisateurs`
    } catch (err: any) {
        diagnostics.supabase = `❌ Erreur Supabase: ${err.message}`
    }

    return NextResponse.json(diagnostics, {
        headers: { 'Content-Type': 'application/json' }
    })
}
