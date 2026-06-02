import Link from 'next/link'
import { ArrowLeft, Help, Document, Currency, Time, Certificate, Warning } from '@carbon/icons-react'

const FAQ_SECTIONS = [
    {
        title: 'Démarrer avec Creditly',
        icon: Certificate,
        color: 'blue',
        questions: [
            {
                q: 'Comment fonctionne Creditly ?',
                a: "Creditly est une plateforme de microcrédit. Pour accéder aux prêts, vous devez : (1) créer un compte, (2) compléter votre vérification d'identité (KYC), (3) souscrire à un plan d'abonnement, puis (4) faire une demande de prêt. Un agent examine votre dossier et vous êtes notifié par email."
            },
            {
                q: 'Qu\'est-ce que le KYC ?',
                a: "Le KYC (Know Your Customer) est la vérification de votre identité. Vous devez soumettre une pièce d'identité valide, une photo de vous-même (selfie) et un justificatif de domicile. Une fois validé par notre équipe, votre compte est activé."
            },
            {
                q: 'Pourquoi mon KYC a-t-il été refusé ?',
                a: "Les motifs les plus fréquents : document illisible ou expiré, selfie de mauvaise qualité, informations incohérentes entre vos documents. Vérifiez les notes de refus dans votre espace et soumettez de nouveau avec des documents clairs et à jour."
            }
        ]
    },
    {
        title: 'Abonnements et Plans',
        icon: Certificate,
        color: 'purple',
        questions: [
            {
                q: 'Comment souscrire à un abonnement ?',
                a: "Depuis votre tableau de bord, allez dans la section Abonnements et choisissez un plan. Effectuez le paiement par Mobile Money (MTN, Moov ou Celtiis) et soumettez votre reçu. Un administrateur validera votre paiement sous 24 heures."
            },
            {
                q: 'Mon abonnement est expiré, que faire ?',
                a: "Rendez-vous dans la section Abonnements et renouvelez votre plan. Votre accès aux prêts sera suspendu tant que vous n'avez pas un abonnement actif. Les prêts en cours restent actifs même si votre abonnement expire."
            },
            {
                q: 'Puis-je changer de plan d\'abonnement ?',
                a: "Oui. Vous pouvez souscrire à un plan supérieur pour bénéficier de plafonds de prêt plus élevés. L'ancien plan sera remplacé par le nouveau à la date d'activation."
            }
        ]
    },
    {
        title: 'Demandes de Prêt',
        icon: Currency,
        color: 'emerald',
        questions: [
            {
                q: 'Quel est le montant maximum que je peux emprunter ?',
                a: "Le plafond dépend de votre plan d'abonnement et de votre score de confiance. Plus vous remboursez à temps, plus votre score augmente et plus votre plafond peut augmenter. Consultez votre tableau de bord pour voir votre limite actuelle."
            },
            {
                q: 'Combien de temps faut-il pour qu\'un prêt soit approuvé ?',
                a: "Les demandes sont traitées généralement dans un délai de 2 à 24 heures ouvrées. Vous recevrez une notification par email dès que votre dossier est examiné."
            },
            {
                q: 'Puis-je avoir plusieurs prêts en même temps ?',
                a: "Non. Vous ne pouvez avoir qu'un seul prêt actif à la fois. Une nouvelle demande ne sera acceptée qu'après le remboursement complet du prêt en cours."
            },
            {
                q: 'Qu\'est-ce que la personne de référence (garant) ?',
                a: "La personne de référence est un contact de confiance que nous pouvons contacter en cas de problème. Ses coordonnées doivent être renseignées dans votre profil avant toute demande de prêt. Ce n'est pas un garant financier."
            }
        ]
    },
    {
        title: 'Remboursements',
        icon: Document,
        color: 'amber',
        questions: [
            {
                q: 'Comment rembourser mon prêt ?',
                a: "Envoyez le montant dû par Mobile Money au numéro Creditly indiqué sur la page de remboursement. Ensuite, soumettez la capture d'écran de votre reçu dans l'application. Un agent validera le paiement."
            },
            {
                q: 'Mon reçu a été soumis, quand sera-t-il validé ?',
                a: "Les reçus sont vérifiés généralement dans les 2 à 12 heures. Quand un agent valide votre paiement, la page se met à jour automatiquement. Vous recevrez aussi un email de confirmation."
            },
            {
                q: 'Que se passe-t-il si je ne rembourse pas à temps ?',
                a: "Des pénalités de retard s'appliquent quotidiennement. Après 3 défauts de paiement consécutifs, votre compte peut être bloqué définitivement. Contactez-nous dès que possible si vous avez des difficultés."
            },
            {
                q: 'Qu\'est-ce qu\'une prolongation (extension) ?',
                a: "Si vous ne pouvez pas rembourser à la date d'échéance, vous pouvez demander une prolongation de 5 jours depuis la page de vos prêts. Des frais de prolongation s'appliquent. Chaque prêt ne peut être prolongé qu'une seule fois."
            }
        ]
    },
    {
        title: 'Score et Éligibilité',
        icon: Help,
        color: 'slate',
        questions: [
            {
                q: 'Qu\'est-ce que le score de confiance ?',
                a: "Le score de confiance (sur 100) évalue votre fiabilité financière. Il prend en compte : votre KYC, votre historique de remboursements, l'ancienneté de votre compte, le nombre de prêts remboursés à temps, et la présence d'un abonnement actif."
            },
            {
                q: 'Comment améliorer mon score ?',
                a: "Remboursez vos prêts à temps et sans extension. Plus vous avez de prêts remboursés sans retard, plus votre score augmente. Avoir un abonnement actif et un profil complet contribue aussi positivement."
            },
            {
                q: 'Pourquoi ma demande de prêt a-t-elle été refusée ?',
                a: "Les motifs courants : prêt en retard existant, score insuffisant, abonnement inactif, plafond atteint, ou profil incomplet (garant manquant). Consultez les notes dans votre tableau de bord pour le motif exact."
            }
        ]
    }
]

const colorMap: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    blue: { bg: 'bg-blue-500/5', border: 'border-blue-500/20', text: 'text-blue-400', icon: 'bg-blue-500/20 text-blue-400' },
    purple: { bg: 'bg-purple-500/5', border: 'border-purple-500/20', text: 'text-purple-400', icon: 'bg-purple-500/20 text-purple-400' },
    emerald: { bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: 'bg-emerald-500/20 text-emerald-400' },
    amber: { bg: 'bg-amber-500/5', border: 'border-amber-500/20', text: 'text-amber-400', icon: 'bg-amber-500/20 text-amber-400' },
    slate: { bg: 'bg-slate-800/50', border: 'border-slate-700', text: 'text-slate-400', icon: 'bg-slate-700 text-slate-400' },
}

export default function FAQPage() {
    return (
        <div className="min-h-screen py-12 md:py-24 animate-fade-in bg-slate-950 text-slate-200">
            <div className="max-w-4xl mx-auto px-6 space-y-16">

                {/* Header */}
                <div className="space-y-6">
                    <Link href="/client/dashboard" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-blue-400 transition-all group">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Retour au Tableau de Bord
                    </Link>
                    <div>
                        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-[0.85]">
                            Base de <span className="premium-gradient-text">Savoir.</span>
                        </h1>
                        <p className="text-slate-500 font-bold mt-4 italic text-lg border-l-2 border-blue-500/30 pl-5">
                            Réponses aux questions fréquentes sur Creditly.
                        </p>
                    </div>

                    {/* Search hint */}
                    <div className="glass-panel p-4 bg-blue-500/5 border-blue-500/10 flex items-center gap-3">
                        <Help size={20} className="text-blue-400 shrink-0" />
                        <p className="text-xs font-bold text-slate-400 italic">
                            Vous ne trouvez pas votre réponse ?{' '}
                            <Link href="/client/support" className="text-blue-400 border-b border-blue-500/30 hover:text-blue-300 transition-colors">
                                Ouvrez un ticket d&apos;assistance →
                            </Link>
                        </p>
                    </div>
                </div>

                {/* FAQ Sections */}
                <div className="space-y-12">
                    {FAQ_SECTIONS.map((section) => {
                        const colors = colorMap[section.color]
                        const Icon = section.icon
                        return (
                            <div key={section.title} className="space-y-4">
                                <div className={`flex items-center gap-3 p-4 rounded-2xl border ${colors.bg} ${colors.border}`}>
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors.icon}`}>
                                        <Icon size={18} />
                                    </div>
                                    <h2 className={`text-xs font-black uppercase tracking-[0.2em] italic ${colors.text}`}>
                                        {section.title}
                                    </h2>
                                </div>

                                <div className="space-y-3">
                                    {section.questions.map((item, idx) => (
                                        <details
                                            key={idx}
                                            className="group glass-panel bg-slate-900/40 border-slate-800 overflow-hidden"
                                        >
                                            <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none hover:bg-white/[0.01] transition-colors">
                                                <span className="text-sm font-black text-white italic group-open:text-blue-400 transition-colors">
                                                    {item.q}
                                                </span>
                                                <span className="w-6 h-6 shrink-0 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 group-open:bg-blue-500/20 group-open:text-blue-400 transition-all group-open:rotate-45">
                                                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                                                        <path d="M8 2v12M2 8h12" />
                                                    </svg>
                                                </span>
                                            </summary>
                                            <div className="px-6 pb-6 pt-2">
                                                <div className="h-px bg-white/5 mb-4" />
                                                <p className="text-sm font-bold text-slate-400 italic leading-relaxed">
                                                    {item.a}
                                                </p>
                                            </div>
                                        </details>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* CTA Footer */}
                <div className="glass-panel p-8 bg-gradient-to-br from-blue-600/10 to-transparent border-blue-500/10 text-center space-y-4">
                    <Warning size={32} className="text-amber-400 mx-auto" />
                    <h3 className="text-lg font-black text-white italic uppercase tracking-tighter">
                        Besoin d&apos;aide supplémentaire ?
                    </h3>
                    <p className="text-sm text-slate-500 italic">
                        Notre équipe répond généralement dans les 24 heures ouvrées.
                    </p>
                    <Link
                        href="/client/support"
                        className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                    >
                        Contacter le Support
                    </Link>
                </div>

            </div>
        </div>
    )
}
