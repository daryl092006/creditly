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
            const resend = new Resend(process.env.RESEND_API_KEY)

            const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
            const toEmail = process.env.ADMIN_EMAIL || 'creditly001@gmail.com'

            const { data, error } = await resend.emails.send({
                from: `Creditly Test <${fromEmail}>`,
                to: toEmail,
                subject: '✅ Test Email Creditly — Configuration OK',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #2563eb; border-radius: 10px;">
                        <h2 style="color: #2563eb;">✅ Email de test Creditly</h2>
                        <p>Si vous recevez cet email, votre configuration Resend fonctionne correctement.</p>
                        <table style="width:100%; border-collapse:collapse; margin-top:20px;">
                            <tr style="background:#f8fafc;">
                                <td style="padding:8px; font-weight:bold;">From</td>
                                <td style="padding:8px;">${fromEmail}</td>
                            </tr>
                            <tr>
                                <td style="padding:8px; font-weight:bold;">To</td>
                                <td style="padding:8px;">${toEmail}</td>
                            </tr>
                            <tr style="background:#f8fafc;">
                                <td style="padding:8px; font-weight:bold;">Date</td>
                                <td style="padding:8px;">${new Date().toLocaleString('fr-FR')}</td>
                            </tr>
                        </table>
                        <p style="margin-top:20px; color:#666; font-size:12px;">
                            Cet email a été envoyé depuis /api/admin/audit?action=test-email
                        </p>
                    </div>
                `
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
