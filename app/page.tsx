import Link from 'next/link';
import { ArrowRight, Security, Rocket, ChartBar, Time, UserAvatarFilledAlt, CloudLogging, Locked, CheckmarkFilled, Checkmark, Star, Flash } from '@carbon/icons-react';
import { createClient } from '@/utils/supabase/server';

export default async function Home() {
    const supabase = await createClient();
    const { data: tiers } = await supabase.from('abonnements').select('*').order('price');

    const getTierIcon = (name: string) => {
        if (name.toLowerCase().includes('platinum') || name.toLowerCase().includes('gold')) return <Rocket size={20} />;
        if (name.toLowerCase().includes('silver') || name.toLowerCase().includes('haut')) return <Flash size={20} />;
        return <Star size={20} />;
    };

    return (
        <div className="min-h-screen flex flex-col selection:bg-blue-600/30">
            {/* Navigation Elite */}
            <header className="fixed top-0 w-full z-50 backdrop-blur-3xl bg-slate-950/70 border-b border-white/5">
                <div className="main-container">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center gap-3 group cursor-pointer">
                            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg italic">
                                C
                            </div>
                            <span className="font-black text-2xl tracking-tighter text-white uppercase italic">Creditly</span>
                        </div>

                        <nav className="hidden lg:flex items-center space-x-12">
                            {[
                                { name: 'Solutions', href: '#features' },
                                { name: 'Méthodologie', href: '#how-it-works' },
                                { name: 'Offres', href: '#pricing' },
                                { name: 'Sécurité', href: '#security' }
                            ].map((item) => (
                                <Link key={item.name} href={item.href} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-blue-400 transition-all">
                                    {item.name}
                                </Link>
                            ))}
                        </nav>

                        <div className="flex items-center gap-6">
                            <Link href="/auth/login" className="hidden sm:block text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
                                Connexion
                            </Link>
                            {/* Desktop: Commencer (Signup) */}
                            <Link
                                href="/auth/signup"
                                className="premium-button scale-90 sm:scale-100 hidden sm:flex"
                            >
                                Commencer
                            </Link>
                            {/* Mobile: Se connecter (Login) */}
                            <Link
                                href="/auth/login"
                                className="premium-button scale-90 sm:hidden"
                            >
                                Se connecter
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-grow pt-20">
                {/* Hero Section - Classic Premium */}
                <section className="relative py-24 lg:py-48 overflow-hidden">
                    <div className="main-container relative z-10 text-center">
                        <div className="inline-flex items-center px-4 py-2 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-12">
                            <span className="flex h-2 w-2 rounded-full bg-blue-600 mr-2 animate-pulse"></span>
                            Financez vos ambitions sans limites
                        </div>

                        <h1 className="text-5xl md:text-8xl lg:text-[120px] font-black tracking-tighter text-white leading-[0.9] md:leading-[0.85] mb-8 md:mb-12 uppercase italic">
                            L&apos;avenir du <br />
                            <span className="premium-gradient-text">Micro-Crédit.</span>
                        </h1>

                        <p className="max-w-2xl mx-auto text-base md:text-xl text-slate-500 font-bold leading-relaxed mb-12 italic px-4">
                            Une plateforme ultra-rapide, sécurisée et conçue pour propulser vos projets vers le succès. Simplifiez votre accès au capital dès aujourd'hui.
                        </p>

                        <div className="flex flex-col md:flex-row gap-6 justify-center items-center w-full px-6">
                            <Link
                                href="/auth/signup"
                                className="premium-button px-16 py-6 text-sm"
                            >
                                Ouvrir un compte
                                <ArrowRight size={20} />
                            </Link>
                            <Link
                                href="#features"
                                className="glass-panel px-16 py-6 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-blue-500/50 transition-all"
                            >
                                Voir les détails
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Features Grid */}
                <section className="py-32 bg-slate-900/20" id="features">
                    <div className="main-container">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {[
                                { title: 'Vitesse Absolue', desc: "Demande approuvée et fonds débloqués en moins de 10 minutes.", icon: <Time size={32} /> },
                                { title: 'Zéro Paperasse', desc: "Tout se passe en ligne, de l'identification au remboursement.", icon: <Security size={32} /> },
                                { title: 'Transparence Totale', desc: "Pas de frais cachés. Vous savez exactement ce que vous payez.", icon: <ChartBar size={32} /> }
                            ].map((feature, i) => (
                                <div key={i} className="glass-panel p-12 group hover:scale-[1.02] bg-slate-900/50">
                                    <div className="text-blue-500 mb-8 transition-transform group-hover:scale-110 duration-500">
                                        {feature.icon}
                                    </div>
                                    <h3 className="text-xl font-black text-white uppercase italic tracking-tight mb-4">{feature.title}</h3>
                                    <p className="text-slate-500 font-bold text-sm leading-relaxed italic">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* How It Works - Detailed */}
                <section className="py-32" id="how-it-works">
                    <div className="main-container">
                        <div className="text-center mb-24">
                            <h2 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter mb-4">Méthodologie <span className="premium-gradient-text">Instantanée.</span></h2>
                            <p className="text-slate-500 font-bold italic uppercase text-[10px] tracking-[0.3em]">Trois étapes vers votre liberté financière</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 relative">
                            <div className="absolute top-[40px] left-0 w-full h-px bg-blue-500/20 hidden lg:block"></div>
                            {[
                                { step: '01', title: 'Identification', desc: "Téléchargez vos documents KYC (CNI, Selfie) pour une validation sécurisée.", icon: <UserAvatarFilledAlt size={24} /> },
                                { step: '02', title: 'Souscription', desc: "Choisissez votre plan et soumettez votre demande de prêt en un clic.", icon: <CloudLogging size={24} /> },
                                { step: '03', title: 'Décuplement', desc: "Recevez vos fonds et boostez votre activité commerciale immédiatement.", icon: <Rocket size={24} /> }
                            ].map((item, i) => (
                                <div key={i} className="relative group text-center lg:text-left">
                                    <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-500 mb-10 mx-auto lg:mx-0 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xl relative z-10">
                                        {item.icon}
                                    </div>
                                    <h3 className="text-xl font-black text-white uppercase italic tracking-tight mb-4 flex items-center gap-3 justify-center lg:justify-start">
                                        <span className="text-blue-600/30 text-3xl font-black select-none">{item.step}</span>
                                        {item.title}
                                    </h3>
                                    <p className="text-slate-500 font-bold text-sm leading-relaxed italic max-w-sm mx-auto lg:mx-0">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Pricing Offres - Elite Club */}
                <section className="py-32 bg-slate-900/10" id="pricing">
                    <div className="main-container">
                        <div className="text-center mb-24">
                            <h2 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter mb-4">Plans de <span className="premium-gradient-text">Puissance.</span></h2>
                            <p className="text-slate-500 font-bold italic uppercase text-[10px] tracking-[0.3em]">Des solutions adaptées à chaque échelle de croissance</p>
                        </div>

                        <div className="flex flex-wrap justify-center gap-8">
                            {tiers?.map((tier, i) => (
                                <div key={tier.id} className={`glass-panel p-12 flex flex-col relative overflow-hidden min-w-[320px] max-w-[350px] ${tier.name.toLowerCase().includes('gold') || tier.name.toLowerCase().includes('platinum') ? 'border-blue-500/30 ring-1 ring-blue-500/20 scale-105 z-10' : 'bg-slate-900/30'}`}>
                                    {(tier.name.toLowerCase().includes('gold') || tier.name.toLowerCase().includes('platinum')) && (
                                        <div className="absolute top-6 right-[-40px] bg-blue-600 text-white text-[8px] font-black uppercase py-2 px-12 rotate-45 transform">Populaire</div>
                                    )}
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic leading-none">{tier.name}</h4>
                                    <p className="text-4xl font-black text-white italic mb-8 leading-none">{tier.price.toLocaleString()} <span className="text-[10px] font-black text-slate-600 not-italic">FCFA / mois</span></p>

                                    <div className="space-y-6 mb-12 flex-grow">
                                        <div className="p-4 rounded-xl bg-slate-950 border border-white/5 shadow-inner text-center">
                                            <p className="text-[10px] font-black text-slate-600 uppercase italic mb-1">Plafond Déblocable</p>
                                            <p className="text-2xl font-black text-emerald-500 italic uppercase leading-none">{tier.max_loan_amount.toLocaleString()} FCFA</p>
                                        </div>
                                        <ul className="space-y-4">
                                            {[
                                                `${tier.max_loans_per_month} prêt${tier.max_loans_per_month > 1 ? 's' : ''} mensuel${tier.max_loans_per_month > 1 ? 's' : ''}`,
                                                `${tier.repayment_delay_days} jours de délai`,
                                                tier.name.toLowerCase().includes('gold') || tier.name.toLowerCase().includes('platinum') ? 'Support Prioritaire' : 'Support Standard'
                                            ].map((p, pi) => (
                                                <li key={pi} className="flex items-center gap-3 text-xs font-bold text-slate-400 italic">
                                                    <Checkmark className="text-blue-500 w-4 h-4 shrink-0" />
                                                    {p}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <Link href="/auth/signup" className={`w-full py-4 text-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tier.name.toLowerCase().includes('gold') || tier.name.toLowerCase().includes('platinum') ? 'bg-blue-600 text-white shadow-xl hover:bg-blue-500' : 'bg-white/5 text-white hover:bg-white/10 border border-white/5'}`}>
                                        Choisir cette offre
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Security Standards */}
                <section className="py-32" id="security">
                    <div className="main-container">
                        <div className="glass-panel p-12 lg:p-24 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 relative overflow-hidden">
                            <div className="relative z-10 flex flex-col lg:flex-row items-center gap-16">
                                <div className="lg:w-1/2">
                                    <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mb-8 shadow-inner">
                                        <Locked size={32} />
                                    </div>
                                    <h2 className="text-4xl lg:text-6xl font-black text-white uppercase italic tracking-tighter mb-8 leading-none">Sécurité de <span className="premium-gradient-text">Classe Mondiale.</span></h2>
                                    <p className="text-slate-500 font-bold text-lg leading-relaxed italic mb-8">Nous utilisons le chiffrement AES-256 standard de l&apos;industrie pour protéger chaque document et chaque transaction. Votre confiance est notre plus grand atout.</p>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <p className="text-2xl font-black text-white italic leading-none">AES-256</p>
                                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">Encryption des données</p>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-2xl font-black text-white italic leading-none">2FA</p>
                                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">Authentification robuste</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="lg:w-1/2 relative">
                                    <div className="absolute inset-0 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
                                    <div className="relative p-12 rounded-[2.5rem] mt-10 md:mt-24 bg-slate-950 border border-white/5 shadow-2xl scale-110">
                                        <div className="flex items-center gap-6 mb-8 border-b border-white/5 pb-8">
                                            <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                                                <Security size={24} className="text-emerald-500" />
                                            </div>
                                            <div>
                                                <p className="text-emerald-500 font-black italic tracking-tighter text-xl leading-none">SYSTÈME PROTÉGÉ</p>
                                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em] mt-1">Audit effectué par Creditly Tech</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="h-6 w-full bg-slate-900 rounded-lg flex items-center px-4 overflow-hidden">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 mr-4 animate-pulse"></div>
                                                    <div className="h-1 bg-slate-800 flex-1 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-600 w-3/4"></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Dashboard Meta-Stats */}
                <section className="py-24 bg-[#050811]">
                    <div className="main-container">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
                            {[
                                { label: 'Transactions Sécurisées', val: '12K+' },
                                { label: 'Clients Satisfaits', val: '2.5K' },
                                { label: 'Temps de Réponse', val: '< 2s' },
                                { label: 'Volume Prêté', val: '350M+' }
                            ].map((stat, i) => (
                                <div key={i} className="text-center group cursor-default">
                                    <p className="text-4xl lg:text-5xl font-black premium-gradient-text tracking-tighter italic mb-2 transition-transform group-hover:scale-110 duration-500">{stat.val}</p>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 italic">{stat.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer Luxe Restored */}
            <footer className="bg-slate-950 border-t border-white/5 py-24">
                <div className="main-container">
                    <div className="flex flex-col lg:flex-row justify-between items-start gap-12 mb-20">
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg italic">C</div>
                                <span className="font-black text-2xl tracking-tighter text-white uppercase italic">Creditly</span>
                            </div>
                            <p className="text-slate-500 font-bold text-sm max-w-sm italic leading-relaxed">
                                Révolutionner l&apos;accès au micro-crédit par une technologie de pointe et un design d&apos;exception.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-20">
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white mb-8 italic">Navigation</h4>
                                <ul className="space-y-4">
                                    {['Solutions', 'Tarifs', 'Sécurité'].map(l => (
                                        <li key={l}><Link href="#" className="text-xs font-black text-slate-500 hover:text-blue-500 transition-colors uppercase italic">{l}</Link></li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white mb-8 italic">Compagnie</h4>
                                <ul className="space-y-4">
                                    <li><Link href="#" className="text-xs font-black text-slate-500 hover:text-blue-500 transition-colors uppercase italic">À propos</Link></li>
                                    <li><Link href="#" className="text-xs font-black text-slate-500 hover:text-blue-500 transition-colors uppercase italic">Manifeste</Link></li>
                                    <li><Link href="https://wa.me/14383906281" target="_blank" rel="noopener noreferrer" className="text-xs font-black text-slate-500 hover:text-blue-500 transition-colors uppercase italic">Support</Link></li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest italic">© 2024 CREDITLY FINANCE. CONÇU POUR L&apos;EXCELLENCE.</p>
                        <div className="flex gap-12">
                            <Link href="/politiques" className="text-[10px] font-black text-slate-700 uppercase tracking-widest hover:text-slate-500 italic">Confidentialité</Link>
                            <Link href="/politiques" className="text-[10px] font-black text-slate-700 uppercase tracking-widest hover:text-slate-500 italic">Termes</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
