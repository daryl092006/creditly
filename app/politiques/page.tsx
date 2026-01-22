import Link from 'next/link';
import { ArrowLeft, Security } from '@carbon/icons-react';

export default function PolitiquesPage() {
    const articles = [
        { id: 1, title: 'Objet des politiques', content: 'Le présent document établit de manière détaillée les politiques de confidentialité et de remboursement applicables à tous les micro-prêts sans intérêt accordés par Creditly.' },
        { id: 2, title: 'Définitions', content: 'Aux fins des présentes politiques, le terme « bénéficiaire » désigne toute personne physique ou morale ayant reçu ou sollicitant un micro-prêt auprès de Creditly.' },
        { id: 3, title: 'Champ d’application', content: 'Les présentes politiques s’appliquent à toute relation contractuelle entre Creditly et le bénéficiaire, indépendamment du montant, de la durée ou des modalités du micro-prêt.' },
        { id: 4, title: 'Principes fondamentaux', content: 'Les micro-prêts Creditly reposent sur des principes de confiance mutuelle, de transparence, de responsabilité financière et de respect des engagements contractuels.' },
        { id: 5, title: 'Collecte des données personnelles', content: 'Creditly collecte les informations personnelles strictement nécessaires à l’évaluation de l’éligibilité du bénéficiaire, à l’octroi du micro-prêt et au suivi du remboursement.' },
        { id: 6, title: 'Exactitude des informations', content: 'Le bénéficiaire garantit que toutes les informations fournies sont exactes, complètes et sincères, toute fausse déclaration pouvant entraîner des conséquences contractuelles.' },
        { id: 7, title: 'Utilisation des données', content: 'Les données collectées sont utilisées exclusivement à des fins de gestion administrative, financière et contractuelle du micro-prêt.' },
        { id: 8, title: 'Durée de conservation des données', content: 'Les informations personnelles sont conservées pendant toute la durée nécessaire à l’exécution du micro-prêt et aux obligations légales.' },
        { id: 9, title: 'Sécurité des données', content: 'Creditly met en oeuvre des mesures techniques et organisationnelles raisonnables afin d’assurer la sécurité et la confidentialité des données personnelles.' },
        { id: 10, title: 'Accès aux données', content: 'L’accès aux données personnelles est strictement limité aux représentants autorisés de Creditly agissant dans le cadre de leurs fonctions.' },
        { id: 11, title: 'Communication aux autorités', content: 'Les données personnelles peuvent être communiquées aux autorités compétentes lorsque la loi ou une décision judiciaire l’exige.' },
        { id: 12, title: 'Partage à des fins de recouvrement', content: 'Les données peuvent être transmises à des tiers uniquement dans le cadre des procédures de recouvrement des sommes dues.' },
        { id: 13, title: 'Droits du bénéficiaire', content: 'Le bénéficiaire dispose d’un droit d’accès, de rectification et de mise à jour de ses données personnelles sur demande écrite.' },
        { id: 14, title: 'Obligation de confidentialité', content: 'Le bénéficiaire s’engage à préserver la confidentialité des informations et échanges liés à Creditly.' },
        { id: 15, title: 'Nature du micro-prêt', content: 'Les micro-prêts accordés par Creditly sont strictement et expressément sans intérêt, sans frais financiers ni rémunération du capital.' },
        { id: 16, title: 'Capital exigible', content: 'Lorsque le remboursement intervient à la date convenue, seul le capital initialement accordé est exigible.' },
        { id: 17, title: 'Obligation de remboursement', content: 'Le remboursement du micro-prêt constitue une obligation personnelle, ferme, prioritaire et indépendante.' },
        { id: 18, title: 'Manquement contractuel', content: 'Tout retard ou défaut de remboursement constitue un manquement contractuel engageant la responsabilité du bénéficiaire.' },
        { id: 19, title: 'Pénalité de retard', content: 'En cas de retard, une pénalité contractuelle est appliquée à titre de sanction et ne constitue pas un intérêt.' },
        { id: 20, title: 'Modalités de la pénalité', content: 'La pénalité correspond à une majoration de 25 % du montant restant dû toutes les deux (2) semaines.' },
        { id: 21, title: 'Application automatique', content: 'La pénalité de retard s’applique automatiquement sans mise en demeure préalable.' },
        { id: 22, title: 'Absence de pénalité en cas de paiement à terme', content: 'Aucune pénalité n’est appliquée lorsque le remboursement est effectué intégralement à la date prévue.' },
        { id: 23, title: 'Recouvrement amiable', content: 'Creditly peut engager des démarches amiables de recouvrement incluant rappels et relances.' },
        { id: 24, title: 'Recouvrement administratif et judiciaire', content: 'En cas d’échec des démarches amiables, Creditly peut engager toute procédure administrative ou judiciaire autorisée.' },
        { id: 25, title: 'Frais de recouvrement', content: 'Les frais raisonnables engagés dans le cadre du recouvrement peuvent être mis à la charge du bénéficiaire.' },
        { id: 26, title: 'Responsabilité financière', content: 'Le bénéficiaire demeure seul responsable de ses engagements financiers quelles que soient ses difficultés.' },
        { id: 27, title: 'Absence de justification du défaut', content: 'Aucune difficulté personnelle ou professionnelle ne peut justifier un défaut de remboursement sans accord écrit.' },
        { id: 28, title: 'Acceptation des politiques', content: 'Toute signature ou acceptation écrite ou électronique vaut acceptation pleine et irrévocable des présentes politiques.' },
        { id: 29, title: 'Indépendance des clauses', content: 'Si une clause est jugée invalide, les autres dispositions demeurent applicables.' },
        { id: 30, title: 'Droit applicable et juridiction', content: 'Les présentes politiques sont régies par les lois de la République du Bénin et relèvent de la compétence des juridictions béninoises.' },
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
