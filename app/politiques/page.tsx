import Link from 'next/link';
import { ArrowLeft, Security } from '@carbon/icons-react';

export default function PolitiquesPage() {
    const articles = [
        { id: 1, title: 'Objet', content: 'Les présentes politiques définissent les conditions applicables aux micro-prêts accordés par Creditly ainsi que les règles de confidentialité, de remboursement et de responsabilité. Toute souscription vaut acceptation pleine et entière des présentes dispositions.' },
        { id: 2, title: 'Définitions', content: '• Bénéficiaire : toute personne ayant souscrit un abonnement. • Capital : montant du micro-prêt accordé. • Échéance : date limite de remboursement. • Pénalité : somme journalière appliquée en cas de retard.' },
        { id: 3, title: 'Formules d’abonnement', content: 'Creditly propose les montants suivants : 5 000 FCFA, 10 000 FCFA, 25 000 FCFA, 50 000 FCFA, 100 000 FCFA. Chaque abonnement ouvre droit à un prêt équivalent au montant choisi.' },
        { id: 4, title: 'Nature du micro-prêt', content: 'Le prêt est accordé sans intérêt contractuel. Seules des pénalités peuvent s’appliquer en cas de retard.' },
        { id: 5, title: 'Obligation de remboursement', content: 'Le bénéficiaire s’engage à rembourser intégralement le capital avant la date d’échéance fixée.' },
        { id: 6, title: 'Pénalités de retard', content: 'En cas de non-remboursement à l’échéance : Pour 5 000 – 10 000 – 25 000 → 1 000 FCFA par jour. Pour 50 000 → 2 000 FCFA par jour. Pour 100 000 → 3 000 FCFA par jour.' },
        { id: 7, title: 'Mode de calcul des pénalités', content: 'Les pénalités s’ajoutent quotidiennement au capital restant dû jusqu’au remboursement complet.' },
        { id: 8, title: 'Plafond des pénalités', content: 'Le total des pénalités ne pourra excéder 50 % du capital emprunté. Au-delà, aucune pénalité supplémentaire ne sera appliquée.' },
        { id: 9, title: 'Application automatique', content: 'Les pénalités sont automatiques et ne nécessitent aucune mise en demeure préalable.' },
        { id: 10, title: 'Erreur sur le numéro de réception', content: 'Le bénéficiaire est seul responsable de l’exactitude du numéro fourni. En cas d’erreur : aucun remboursement ne sera effectué, le prêt sera considéré comme valablement transféré, et Creditly décline toute responsabilité sauf faute lourde prouvée.' },
        { id: 11, title: 'Frais de service', content: 'Des frais supplémentaires peuvent être exigés en cas de dossier complexe, d’erreur fournie par le bénéficiaire, de tentative de récupération de fonds ou de recouvrement amiable. Ces frais seront communiqués avant application.' },
        { id: 12, title: 'Interdiction de recours à un tiers', content: 'Il est strictement interdit de faire une demande pour le compte d’autrui, d’utiliser l’identité d’un tiers, ou de partager ses accès personnels. Toute violation peut être qualifiée d’usurpation d’identité au sens des lois en vigueur.' },
        { id: 13, title: 'Sanctions', content: 'En cas de fraude : le compte peut être fermé sans préavis, le capital restant dû devient immédiatement exigible, et les pénalités continuent de courir.' },
        { id: 14, title: 'Exigibilité immédiate', content: 'Toute fraude ou manquement grave entraîne la perte du bénéfice de délai.' },
        { id: 15, title: 'Recouvrement', content: 'Creditly peut engager : recouvrement amiable, recouvrement administratif ou action judiciaire. Les frais engagés peuvent être imputés au bénéficiaire.' },
        { id: 16, title: 'Responsabilité financière', content: 'Le bénéficiaire demeure responsable du remboursement jusqu’au paiement intégral.' },
        { id: 17, title: 'Protection des données', content: 'Les données personnelles sont collectées uniquement pour : traitement du prêt, gestion du remboursement, prévention de fraude. Elles sont conservées de manière sécurisée.' },
        { id: 18, title: 'Confidentialité', content: 'Creditly s’engage à ne pas divulguer les données sauf obligation légale ou procédure judiciaire.' },
        { id: 19, title: 'Force majeure', content: 'Creditly ne pourra être tenue responsable en cas d’événement indépendant de sa volonté empêchant l’exécution normale du service.' },
        { id: 20, title: 'Modification des politiques', content: 'Creditly peut modifier les présentes politiques à tout moment. Les nouvelles conditions s’appliquent aux nouveaux abonnements.' },
        { id: 21, title: 'Indépendance des clauses', content: 'Si une clause est déclarée invalide, les autres dispositions restent applicables.' },
        { id: 22, title: 'Droit applicable', content: 'Les présentes politiques sont régies par le droit de la République du Bénin.' },
        { id: 23, title: 'Juridiction compétente', content: 'Tout litige relève des juridictions compétentes du Bénin.' },
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 selection:bg-blue-600/30 selection:text-white">
            {/* Header / Nav */}
            <header className="fixed top-0 w-full z-50 backdrop-blur-3xl bg-slate-950/70 border-b border-white/5">
                <div className="main-container">
                    <div className="flex justify-between items-center h-20">
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg italic">
                                C
                            </div>
                            <span className="font-black text-2xl tracking-tighter text-white uppercase italic">Creditly</span>
                        </Link>
                        <Link href="/" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors flex items-center gap-2 group">
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            Retour
                        </Link>
                    </div>
                </div>
            </header>

            <main className="pt-32 pb-24">
                <div className="main-container max-w-4xl">
                    <div className="mb-16 space-y-6">
                        <div className="inline-flex items-center px-4 py-2 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]">
                            Cadre Juridique & Protection
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase italic leading-tight">
                            Politiques de <br />
                            <span className="premium-gradient-text uppercase">Confidentialité & Remboursement.</span>
                        </h1>
                        <div className="flex flex-col md:flex-row gap-6 text-[10px] font-black uppercase tracking-widest text-slate-500 italic">
                            <p>MICRO-PRÊTS SANS INTÉRÊT – CREDITLY</p>
                            <p className="hidden md:block">•</p>
                            <p>République du Bénin</p>
                        </div>
                    </div>

                    <div className="grid gap-8">
                        {articles.map((article) => (
                            <div key={article.id} className="glass-panel p-8 md:p-10 bg-slate-900/40 border-slate-800 hover:border-slate-700 transition-all group">
                                <div className="flex flex-col md:flex-row gap-6 md:gap-10">
                                    <div className="shrink-0">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-blue-500 font-black text-sm italic group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xl">
                                            {article.id < 10 ? `0${article.id}` : article.id}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h2 className="text-xl font-black text-white uppercase italic tracking-tight">Article {article.id} – {article.title}</h2>
                                        <p className="text-slate-400 font-bold leading-relaxed italic text-sm md:text-base">
                                            {article.content}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-20 p-10 rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 relative overflow-hidden group text-center">
                        <div className="absolute inset-0 bg-blue-600/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative z-10 space-y-6">
                            <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mx-auto mb-8 shadow-inner">
                                <Security size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-white italic uppercase">Engagement de Confiance</h3>
                            <p className="text-slate-500 font-bold italic text-sm max-w-xl mx-auto leading-relaxed">
                                En utilisant Creditly, vous rejoignez une communauté basée sur l&apos;intégrité. Nous protégeons vos données avec la même rigueur que nous appliquons à nos micro-prêts.
                            </p>
                            <Link href="/auth/signup" className="premium-button inline-flex px-12 py-5 mt-4">
                                Commencer l&apos;aventure
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            {/* Simple Luxury Footer */}
            <footer className="border-t border-white/5 py-12 bg-slate-950">
                <div className="main-container flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest italic">© 2024 CREDITLY FINANCE. RÉPUBLIQUE DU BÉNIN.</p>
                    <div className="flex gap-8">
                        <Link href="/" className="text-[10px] font-black text-slate-700 uppercase tracking-widest hover:text-blue-500 transition-colors italic">Accueil</Link>
                        <Link href="/auth/login" className="text-[10px] font-black text-slate-700 uppercase tracking-widest hover:text-blue-500 transition-colors italic">Connexion</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
