import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const adminEmail = process.env.ADMIN_EMAIL || 'creditly001@gmail.com';
const darylEmail = 'darylggt23@gmail.com';

type NotificationType = 'LOAN_REQUEST' | 'REPAYMENT' | 'KYC_SUBMISSION' | 'SUBSCRIPTION';

interface NotificationData {
    userEmail: string;
    userName: string;
    amount?: number;
    planName?: string;
    payoutNetwork?: string;
    payoutPhone?: string;
}

export async function sendAdminNotification(type: NotificationType, data: NotificationData) {
    if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY non configurée. Notification email ignorée.');
        return;
    }

    let subject = '';
    let html = '';

    const formattedAmount = data.amount ? new Intl.NumberFormat('fr-FR').format(data.amount) + ' FCFA' : '';

    switch (type) {
        case 'LOAN_REQUEST':
            subject = `🚨 Nouvelle Demande de Prêt - ${data.userName}`;
            html = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #2563eb; text-transform: uppercase; font-size: 18px;">Nouvelle Demande de Financement</h2>
                    <p>Bonjour Admin,</p>
                    <p>Un utilisateur vient de soumettre une nouvelle demande de prêt sur la plateforme.</p>
                    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Candidat :</strong> ${data.userName} (${data.userEmail})</p>
                        <p><strong>Montant :</strong> <span style="font-size: 20px; color: #1e293b; font-weight: bold;">${formattedAmount}</span></p>
                        <p><strong>Réseau :</strong> ${data.payoutNetwork}</p>
                        <p><strong>Numéro MoMo :</strong> ${data.payoutPhone}</p>
                    </div>
                    <p>Veuillez vous connecter au tableau de bord pour valider ou rejeter cette demande.</p>
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/loans" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">Accéder au Dashboard</a>
                </div>
            `;
            break;

        case 'REPAYMENT':
            subject = `💰 Nouveau Remboursement Soumis - ${data.userName}`;
            html = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #059669; text-transform: uppercase; font-size: 18px;">Remboursement En Attente</h2>
                    <p>Un utilisateur a déclaré avoir effectué un remboursement.</p>
                    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Candidat :</strong> ${data.userName}</p>
                        <p><strong>Montant payé :</strong> <span style="font-size: 20px; color: #1e293b; font-weight: bold;">${formattedAmount}</span></p>
                    </div>
                    <p>Veuillez vérifier votre compte Mobile Money et confirmer la réception dans le panel admin.</p>
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/repayments" style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">Vérifier les Paiements</a>
                </div>
            `;
            break;

        case 'KYC_SUBMISSION':
            subject = `🆔 Nouveau Dossier KYC à Valider - ${data.userName}`;
            html = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #ea580c; text-transform: uppercase; font-size: 18px;">Validation d'Identité</h2>
                    <p>Un nouvel utilisateur a soumis ses documents KYC.</p>
                    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Utilisateur :</strong> ${data.userName} (${data.userEmail})</p>
                        <p><strong>Statut :</strong> Dossier complet, en attente de revue.</p>
                    </div>
                    <p>L'approbation du KYC est nécessaire pour que l'utilisateur puisse souscrire un prêt.</p>
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/kyc" style="display: inline-block; background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">Vérifier le Dossier</a>
                </div>
            `;
            break;

        case 'SUBSCRIPTION':
            subject = `✨ Nouvel Abonnement Activé - ${data.userName}`;
            html = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #6366f1; text-transform: uppercase; font-size: 18px;">Nouvelle Souscription</h2>
                    <p>Une nouvelle demande d'abonnement a été faite ou validée.</p>
                    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Client :</strong> ${data.userName}</p>
                        <p><strong>Offre :</strong> ${data.planName}</p>
                    </div>
                    <p>Veuillez confirmer le paiement si celui-ci est en attente.</p>
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/super/users" style="display: inline-block; background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">Gestion des Comptes</a>
                </div>
            `;
            break;
    }

    try {
        // 1. Envoi immédiat à Daryl
        if (darylEmail) {
            console.log(`[EmailService] Tentative d'envoi PRIORITAIRE à : ${darylEmail}`);
            resend.emails.send({
                from: 'Creditly Notifications <onboarding@resend.dev>',
                to: darylEmail,
                subject: `[PRIORITAIRE] ${subject}`,
                html: html,
            }).then(() => console.log(`[EmailService] Notification PRIORITAIRE envoyée à ${darylEmail}`))
                .catch(e => console.error(`[EmailService] Erreur notification Daryl :`, e));
        }

        // 2. Envoi différé au reste de l'équipe (délai 5 min)
        if (adminEmail) {
            // On nettoie la liste pour éviter les doublons avec Daryl
            const others = adminEmail.split(',')
                .map(e => e.trim())
                .filter(e => e !== darylEmail && e !== '');

            if (others.length > 0) {
                console.log(`[EmailService] Programmation envoi différé (5min) pour : ${others.join(', ')}`);

                setTimeout(async () => {
                    try {
                        console.log(`[EmailService] Exécution de l'envoi différé pour : ${others.join(', ')}`);
                        const { error } = await resend.emails.send({
                            from: 'Creditly Notifications <onboarding@resend.dev>',
                            to: others,
                            subject: subject,
                            html: html,
                        });
                        if (error) console.error(`[EmailService] Erreur Resend (Différé) :`, error);
                        else console.log(`[EmailService] Notifications différées envoyées avec succès.`);
                    } catch (err) {
                        console.error(`[EmailService] Crash envoi différé :`, err);
                    }
                }, 300000); // 5 minutes
            } else {
                console.log(`[EmailService] Aucun autre administrateur à notifier en différé.`);
            }
        }
    } catch (globalError) {
        console.error('[EmailService] Erreur critique sendAdminNotification :', globalError);
    }
}

type UserNotificationType = 'KYC_APPROVED' | 'KYC_REJECTED' | 'LOAN_APPROVED' | 'LOAN_REJECTED' | 'LOAN_ACTIVE' | 'REPAYMENT_VALIDATED' | 'REPAYMENT_REJECTED';

interface UserEmailData {
    email: string;
    name: string;
    details?: string;
    amount?: number;
}

export async function sendUserEmail(type: UserNotificationType, data: UserEmailData) {
    if (!process.env.RESEND_API_KEY) return;

    let subject = '';
    let html = '';
    const formattedAmount = data.amount ? new Intl.NumberFormat('fr-FR').format(data.amount) + ' FCFA' : '';

    const colors = {
        success: '#059669',
        error: '#dc2626',
        info: '#2563eb'
    };

    switch (type) {
        case 'KYC_APPROVED':
            subject = `✅ Compte Activé - Bienvenue chez Creditly`;
            html = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: ${colors.success}; text-transform: uppercase; font-size: 18px;">Vérification Terminée</h2>
                    <p>Bonjour ${data.name},</p>
                    <p>Bonne nouvelle ! Vos documents d'identité ont été validés avec succès.</p>
                    <p>Votre compte est désormais <strong>ACTIF</strong>. Vous pouvez dès à présent souscrire à une offre de financement et effectuer votre première demande de prêt.</p>
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/client/dashboard" style="display: inline-block; background-color: ${colors.success}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">Accéder à mon Espace</a>
                    <p style="font-size: 12px; color: #888; margin-top: 30px;">Merci de votre confiance.</p>
                </div>
            `;
            break;

        case 'KYC_REJECTED':
            subject = `⚠️ Action Requise : Dossier KYC Refusé`;
            html = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: ${colors.error}; text-transform: uppercase; font-size: 18px;">Documents Non Conformes</h2>
                    <p>Bonjour ${data.name},</p>
                    <p>Nous n'avons pas pu valider votre identité pour la raison suivante :</p>
                    <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid ${colors.error}20;">
                        <p style="color: ${colors.error}; font-weight: bold; font-style: italic;">"${data.details}"</p>
                    </div>
                    <p>Veuillez soumettre à nouveau des documents clairs et lisibles pour activer votre compte.</p>
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/client/kyc" style="display: inline-block; background-color: ${colors.error}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">Corriger mon Dossier</a>
                </div>
            `;
            break;

        case 'LOAN_APPROVED': // Approved but waiting for payout
        case 'LOAN_ACTIVE':   // Active (Paid out)
            subject = `🎉 Financement Accordé ! - ${formattedAmount}`;
            html = `
                 <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: ${colors.info}; text-transform: uppercase; font-size: 18px;">Félicitations</h2>
                    <p>Bonjour ${data.name},</p>
                    <p>Votre demande de prêt de <strong>${formattedAmount}</strong> a été validée par notre comité financier.</p>
                    <p>Les fonds sont en cours de transfert vers votre compte Mobile Money indiqué.</p>
                    <p>Consultez votre échéancier de remboursement directement dans votre espace client.</p>
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/client/dashboard" style="display: inline-block; background-color: ${colors.info}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">Voir mon Prêt</a>
                </div>
            `;
            break;

        case 'LOAN_REJECTED':
            subject = `❌ Mise à jour concernant votre demande de prêt`;
            html = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: ${colors.error}; text-transform: uppercase; font-size: 18px;">Demande Refusée</h2>
                    <p>Bonjour ${data.name},</p>
                    <p>Votre demande de financement n'a pas été acceptée pour le moment.</p>
                    ${data.details ? `
                    <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Motif :</strong> ${data.details}</p>
                    </div>` : ''}
                    <p>Vous pouvez contacter le support pour plus d'informations ou tenter une nouvelle demande ultérieurement.</p>
                </div>
            `;
            break;

        case 'REPAYMENT_VALIDATED':
            subject = `✅ Paiement Confirmé - Merci !`;
            html = `
                 <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: ${colors.success}; text-transform: uppercase; font-size: 18px;">Remboursement Reçu</h2>
                    <p>Bonjour ${data.name},</p>
                    <p>Nous avons bien reçu votre remboursement de <strong>${formattedAmount}</strong>.</p>
                    <p>Votre solde restant a été mis à jour.</p>
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/client/dashboard" style="display: inline-block; background-color: ${colors.success}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">Mon Tableau de Bord</a>
                </div>
            `;
            break;

        case 'REPAYMENT_REJECTED':
            subject = `⚠️ Problème avec votre remboursement`;
            html = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: ${colors.error}; text-transform: uppercase; font-size: 18px;">Paiement Non Validé</h2>
                    <p>Bonjour ${data.name},</p>
                    <p>La preuve de paiement que vous avez fournie n'a pas pu être validée.</p>
                    <p>Merci de vérifier les informations et de contacter le support si vous pensez qu'il s'agit d'une erreur.</p>
                </div>
            `;
            break;
    }

    try {
        await resend.emails.send({
            from: 'Creditly <notifications@resend.dev>',
            to: data.email,
            subject: subject,
            html: html,
        });
    } catch (error) {
        console.error('Erreur sendUserEmail:', error);
    }
}

interface WeeklyReportData {
    startDate: string;
    endDate: string;
    totalRevenue: number;
    subscriptionsRevenue: number;
    repaymentsRevenue: number;
    newSubscriptionsCount: number;
    repaymentsCount: number;
    monthToDateRevenue: number;
}

export async function sendWeeklyReport(data: WeeklyReportData) {
    if (!process.env.RESEND_API_KEY) return;

    const subject = `📊 Rapport Hebdomadaire - Semaine du ${data.startDate}`;
    const formattedTotal = new Intl.NumberFormat('fr-FR').format(data.totalRevenue) + ' FCFA';
    const formattedSubs = new Intl.NumberFormat('fr-FR').format(data.subscriptionsRevenue) + ' FCFA';
    const formattedRepayments = new Intl.NumberFormat('fr-FR').format(data.repaymentsRevenue) + ' FCFA';
    const formattedMTD = new Intl.NumberFormat('fr-FR').format(data.monthToDateRevenue) + ' FCFA';

    const html = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
            <h2 style="color: #2563eb; text-transform: uppercase; font-size: 18px; text-align: center;">Rapport Financier Hebdomadaire</h2>
            <p style="text-align: center; color: #666; font-size: 14px;">Période : ${data.startDate} au ${data.endDate}</p>
            
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 1px solid #bbf7d0;">
                <p style="margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #166534;">Revenus Totaux (Semaine)</p>
                <p style="margin: 10px 0 0 0; font-size: 32px; font-weight: bold; color: #16a34a;">${formattedTotal}</p>
            </div>

            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <div style="flex: 1; background-color: #f8fafc; padding: 15px; border-radius: 8px;">
                    <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase;">Abonnements</p>
                    <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #334155;">${formattedSubs}</p>
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #94a3b8;">${data.newSubscriptionsCount} nouveaux</p>
                </div>
                <div style="flex: 1; background-color: #f8fafc; padding: 15px; border-radius: 8px;">
                    <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase;">Remboursements</p>
                    <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #334155;">${formattedRepayments}</p>
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #94a3b8;">${data.repaymentsCount} reçus</p>
                </div>
            </div>

            <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin-top: 20px; border: 1px solid #dbeafe;">
                <p style="margin: 0; font-size: 12px; color: #1e40af; text-transform: uppercase; font-weight: bold;">Total Mois en cours</p>
                <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: bold; color: #1e3a8a;">${formattedMTD}</p>
            </div>

            <p style="font-size: 12px; color: #888; margin-top: 30px; text-align: center;">Généré automatiquement par Creditly le ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>
    `;

    try {
        // Envoi immédiat au Boss
        await resend.emails.send({
            from: 'Creditly Reports <reports@resend.dev>',
            to: darylEmail,
            subject: `[REPORTING] ${subject}`,
            html: html,
        });

        // Envoi retardé pour les autres (5 min) si configuré
        if (adminEmail && adminEmail !== darylEmail) {
            setTimeout(async () => {
                try {
                    await resend.emails.send({
                        from: 'Creditly Reports <reports@resend.dev>',
                        to: adminEmail,
                        subject: subject,
                        html: html,
                    });
                } catch (e) {
                    console.error('Erreur rapport différé:', e);
                }
            }, 300000);
        }
    } catch (error) {
        console.error('Erreur rapport hebdo:', error);
    }
}
