'use client'

import { useState } from 'react'
import { ActionButton } from '@/app/components/ui/ActionButton'
import { CheckmarkFilled, Warning } from '@carbon/icons-react'

interface WaiverProps {
    userData: {
        nom: string;
        prenom: string;
        birth_date?: string;
        address?: string;
        city?: string;
        profession?: string;
    };
    loanData: {
        amount: number;
        payoutPhone: string;
        payoutNetwork: string;
        dueDate: string;
    };
    onConfirm: (personalData: PersonalData) => void;
    onBack: () => void;
    loading: boolean;
}

export interface PersonalData {
    birthDate: string;
    address: string;
    idDetails: string;
    city: string;
    profession: string;
}

export default function LoanWaiver({ userData, loanData, onConfirm, onBack, loading }: WaiverProps) {
    const [personalData, setPersonalData] = useState<PersonalData>({
        birthDate: userData.birth_date || '',
        address: userData.address || '',
        idDetails: '',
        city: userData.city || 'Cotonou',
        profession: userData.profession || ''
    })
    const [accepted, setAccepted] = useState(false)
    const [signature, setSignature] = useState('')

    const amountInWords = numberToFrench(loanData.amount)
    const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

    const canSubmit = accepted &&
        personalData.birthDate &&
        personalData.address &&
        personalData.idDetails &&
        personalData.profession &&
        signature.toLowerCase().includes(userData.nom.toLowerCase())

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-slate-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                {/* Contract Header */}
                <div className="p-8 border-b border-white/5 bg-slate-900/50">
                    <h2 className="text-xl font-black text-white uppercase italic tracking-tighter text-center">
                        RECONNAISSANCE DE DETTE <br />
                        <span className="text-blue-500">& DÉCHARGE DE RESPONSABILITÉ</span>
                    </h2>
                    <p className="text-[10px] text-slate-500 font-bold text-center mt-2 uppercase tracking-widest italic">
                        Collaboration Creditly – Prêt sans intérêt
                    </p>
                </div>

                {/* Contract Body */}
                <div className="p-8 space-y-6 text-slate-300 font-medium text-sm leading-relaxed max-h-[60vh] overflow-y-auto custom-scrollbar bg-slate-950">
                    <div className="space-y-4">
                        <p>
                            Je soussigné(e), Nom et prénom : <strong className="text-white italic">{userData.prenom} {userData.nom}</strong>
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/40 p-4 rounded-2xl border border-white/5">
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Date de naissance</label>
                                <input
                                    type="date"
                                    value={personalData.birthDate}
                                    onChange={e => setPersonalData({ ...personalData, birthDate: e.target.value })}
                                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Pièce d'identité (Type et Numéro)</label>
                                <input
                                    type="text"
                                    placeholder="Ex: CNI 102930910"
                                    value={personalData.idDetails}
                                    onChange={e => setPersonalData({ ...personalData, idDetails: e.target.value })}
                                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="sm:col-span-2 space-y-1">
                                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Adresse complète</label>
                                <input
                                    type="text"
                                    placeholder="Quartier, Rue, Maison..."
                                    value={personalData.address}
                                    onChange={e => setPersonalData({ ...personalData, address: e.target.value })}
                                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="sm:col-span-2 space-y-1">
                                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Profession actuelle</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Enseignant, Commerçant..."
                                    value={personalData.profession}
                                    onChange={e => setPersonalData({ ...personalData, profession: e.target.value })}
                                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <p>
                            reconnais avoir reçu de <strong>Creditly</strong>, dans le cadre d’une collaboration privée, un prêt sans intérêt d’un montant total de :
                        </p>

                        <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Montant du prêt</p>
                                <p className="text-lg font-black text-white italic">{loanData.amount.toLocaleString()} FCFA</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">En lettres</p>
                                <p className="text-xs font-bold text-white italic">{amountInWords} francs CFA</p>
                            </div>
                        </div>

                        <p>
                            Je reconnais que cette somme constitue une dette certaine, liquide et exigible et je m’engage à la rembourser en totalité, sans intérêt, au plus tard le :
                            <strong className="text-white ml-2 italic">{loanData.dueDate}</strong>
                        </p>

                        <div className="space-y-2">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ENGAGEMENT DE REMBOURSEMENT</h3>
                            <p>
                                Mode de paiement : <strong className="text-white italic">{loanData.payoutNetwork}</strong> <br />
                                Coordonnées : <strong className="text-white italic">{loanData.payoutPhone}</strong>
                            </p>
                            <p className="text-xs italic text-slate-400">
                                Tout défaut ou retard de paiement pourra entraîner des démarches de recouvrement légales.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">DÉCHARGE DE RESPONSABILITÉ ET ACCEPTATION DES POLITIQUES</h3>
                            <p className="text-xs">
                                Le débiteur reconnaît que Creditly a rempli toutes ses obligations et le dégage de toute responsabilité autre que l’obligation de remboursement.
                            </p>
                            <p className="text-xs">
                                En signant le présent document, le bénéficiaire reconnaît avoir pris connaissance, comprendre et accepter sans réserve la politique de confidentialité ainsi que les conditions de remboursement des micro-prêts Creditly. La signature vaut acceptation expresse, définitive et opposable de l’ensemble des conditions.
                            </p>
                        </div>

                        <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-8 text-[10px]">
                            <div>
                                <p className="font-black text-slate-500 uppercase tracking-widest mb-4 italic">Signé par le débiteur</p>
                                <p className="text-xs font-black text-white italic">{userData.prenom} {userData.nom}</p>
                                <p className="text-slate-500 mt-1 italic">Le {today}</p>
                            </div>
                            <div>
                                <p className="font-black text-slate-500 uppercase tracking-widest mb-4 italic">Signé pour Creditly</p>
                                <p className="text-xs font-black text-white italic">Direction Opérationnelle</p>
                                <p className="text-slate-500 mt-1 italic">Approbation Directe</p>
                            </div>
                        </div>

                        <div className="bg-slate-900/60 p-4 rounded-xl text-[9px] text-slate-500 italic leading-snug">
                            <p><strong>Politique de confidentialité – Micro-prêts Creditly :</strong> Les renseignements personnels recueillis sont utilisés uniquement pour la gestion du micro-prêt. Ils demeurent confidentiels et peuvent être communiqués uniquement lorsque requis par la loi ou dans le cadre de démarches légales de recouvrement. En cas de non-remboursement, Creditly se réserve le droit d’entreprendre toute action légale permise. Les frais raisonnables de recouvrement peuvent être réclamés au débiteur. Le présent document constitue un engagement contractuel exécutoire.</p>
                        </div>
                    </div>
                </div>

                {/* Signature UI */}
                <div className="p-8 border-t border-white/5 space-y-6 bg-slate-900/30">
                    <div className="flex items-start gap-4">
                        <div className="pt-1">
                            <input
                                type="checkbox"
                                id="accept"
                                checked={accepted}
                                onChange={e => setAccepted(e.target.checked)}
                                className="w-5 h-5 rounded border-white/10 bg-slate-950 text-blue-500 focus:ring-blue-500/20 transition-all cursor-pointer"
                            />
                        </div>
                        <label htmlFor="accept" className="text-xs font-bold text-slate-400 cursor-pointer select-none">
                            Je confirme avoir lu et j'accepte l'intégralité des termes de cette reconnaissance de dette et décharge de responsabilité.
                        </label>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic ml-1">Signature Numérique (Saisissez votre nom complet)</label>
                        <input
                            type="text"
                            placeholder={`${userData.prenom} ${userData.nom}`}
                            value={signature}
                            onChange={e => setSignature(e.target.value)}
                            className="w-full px-6 py-4 rounded-xl border border-white/5 bg-slate-950 text-white font-black italic outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all shadow-inner"
                        />
                        <p className="text-[9px] text-slate-600 italic">En saisissant votre nom, vous apposez une signature électronique ayant valeur contractuelle.</p>
                    </div>
                </div>
            </div>

            <div className="flex gap-4">
                <button
                    onClick={onBack}
                    className="flex-1 py-4 px-6 bg-slate-800 text-slate-400 font-black uppercase italic tracking-widest rounded-2xl border border-white/5 hover:bg-slate-700 hover:text-white transition-all active:scale-[0.98]"
                >
                    Retour
                </button>
                <ActionButton
                    onClick={() => onConfirm(personalData)}
                    disabled={!canSubmit}
                    loading={loading}
                    className={`flex-[2] py-4 px-6 rounded-2xl font-black uppercase italic tracking-widest transition-all ${canSubmit ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 animate-pulse-slow' : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-white/5'}`}
                >
                    {canSubmit ? (
                        <>
                            <CheckmarkFilled size={20} className="mr-2" />
                            Signer & Envoyer
                        </>
                    ) : (
                        <>
                            <Warning size={20} className="mr-2" />
                            Remplir & Accepter
                        </>
                    )}
                </ActionButton>
            </div>
        </div>
    )
}

function numberToFrench(n: number): string {
    const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
    const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];

    if (n === 0) return 'zéro';

    function convert(num: number): string {
        if (num < 10) return units[num];
        if (num < 20) return teens[num - 10];
        if (num < 100) {
            const ten = Math.floor(num / 10);
            const unit = num % 10;
            if (ten === 7) return 'soixante-' + (unit === 1 ? 'et-onze' : teens[unit]);
            if (ten === 9) return 'quatre-vingt-' + teens[unit];
            if (unit === 0) return tens[ten];
            if (unit === 1 && ten < 7) return tens[ten] + '-et-un';
            return tens[ten] + '-' + units[unit];
        }
        if (num < 1000) {
            const hundred = Math.floor(num / 100);
            const remainder = num % 100;
            const hundredText = hundred === 1 ? 'cent' : units[hundred] + ' cent';
            return remainder === 0 ? hundredText : hundredText + ' ' + convert(remainder);
        }
        if (num < 1000000) {
            const thousand = Math.floor(num / 1000);
            const remainder = num % 1000;
            const thousandText = thousand === 1 ? 'mille' : convert(thousand) + ' mille';
            return remainder === 0 ? thousandText : thousandText + ' ' + convert(remainder);
        }
        return n.toString(); // Fallback for huge numbers
    }

    return convert(n).trim();
}
