'use client'

import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

// react-pdf ne supporte pas l'espace insécable (U+00A0) du format fr-FR
// On utilise un espace normal comme séparateur de milliers
const fNum = (n: number) => {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

const styles = StyleSheet.create({
    page: {
        padding: 36,
        fontSize: 9,
        fontFamily: 'Helvetica',
        color: '#1a1a1a',
        lineHeight: 1.4,
    },
    watermark: {
        position: 'absolute',
        top: '35%',
        left: '10%',
        fontSize: 120,
        color: '#f8f8f8',
        transform: 'rotate(-45deg)',
        fontWeight: 'bold',
        opacity: 0.5,
        zIndex: -1,
        borderWidth: 10,
        borderColor: '#f8f8f8',
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomStyle: 'solid',
        borderBottomColor: '#000',
        paddingBottom: 10,
        marginBottom: 12,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logo: {
        backgroundColor: '#2563eb',
        color: '#fff',
        width: 30,
        height: 30,
        textAlign: 'center',
        lineHeight: 30,
        fontWeight: 'bold',
        fontSize: 18,
        marginRight: 10,
        borderRadius: 8,
        fontStyle: 'italic',
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    subtitle: {
        fontSize: 8,
        color: '#666',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    contractInfo: {
        textAlign: 'right',
    },
    contractNumber: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    date: {
        fontSize: 9,
        color: '#666',
        fontStyle: 'italic',
    },
    mainTitle: {
        textAlign: 'center',
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        textDecoration: 'underline',
        marginBottom: 6,
        marginTop: 8,
    },
    section: {
        marginBottom: 8,
    },
    bold: {
        fontWeight: 'bold',
    },
    amountCard: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: '#000',
        padding: 8,
        textAlign: 'center',
        marginVertical: 8,
    },
    amountText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    amountInWords: {
        fontSize: 9,
        textTransform: 'uppercase',
        borderTopWidth: 1,
        borderTopStyle: 'solid',
        borderTopColor: '#ddd',
        paddingTop: 5,
        marginTop: 5,
        color: '#444',
    },
    dueDate: {
        textAlign: 'center',
        fontSize: 11,
        fontWeight: 'bold',
        textDecoration: 'underline',
        marginVertical: 6,
    },
    clauseBox: {
        backgroundColor: '#f5f5f5',
        padding: 10,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: '#eee',
    },
    clauseTitle: {
        fontSize: 8,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 5,
        borderBottomWidth: 0.5,
        borderBottomStyle: 'solid',
        borderBottomColor: '#ccc',
    },
    clauseText: {
        fontSize: 8,
        color: '#555',
        marginBottom: 3,
    },
    signatureContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    signatureBlock: {
        width: '40%',
        borderTopWidth: 1,
        borderTopStyle: 'solid',
        borderTopColor: '#000',
        paddingTop: 5,
    },
    signatureLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 5,
    },
    signatureValue: {
        fontSize: 16,
        fontStyle: 'italic',
        marginTop: 10,
    },
    stamp: {
        position: 'absolute',
        top: -40,
        right: -20,
        width: 80,
        height: 80,
        borderWidth: 2,
        borderColor: 'rgba(0, 50, 150, 0.3)',
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        transform: 'rotate(15deg)',
    },
    stampInner: {
        width: 70,
        height: 70,
        borderWidth: 1,
        borderColor: 'rgba(0, 50, 150, 0.3)',
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stampTextLarge: {
        fontSize: 10,
        fontWeight: 'bold',
        color: 'rgba(0, 50, 150, 0.6)',
        textTransform: 'uppercase',
    },
    stampTextSmall: {
        fontSize: 5,
        fontWeight: 'bold',
        color: 'rgba(0, 50, 150, 0.5)',
        marginTop: 2,
    },
    stampLine: {
        width: 40,
        height: 1,
        backgroundColor: 'rgba(0, 50, 150, 0.2)',
        marginVertical: 2,
    },
    certificationBox: {
        borderWidth: 1.5,
        borderStyle: 'solid',
        borderColor: 'rgba(0, 50, 150, 0.4)',
        padding: 4,
        marginTop: 10,
        transform: 'rotate(-5deg)',
    },
    certificationText: {
        fontSize: 8,
        fontWeight: 'bold',
        color: 'rgba(0, 50, 150, 0.6)',
        textTransform: 'uppercase',
    },
    footer: {
        marginTop: 'auto',
        borderTopWidth: 0.5,
        borderTopStyle: 'solid',
        borderTopColor: '#eee',
        paddingTop: 10,
        textAlign: 'center',
    },
    footerText: {
        fontSize: 7,
        color: '#999',
        textTransform: 'uppercase',
        letterSpacing: 1,
    }
})

interface LoanPDFProps {
    userData: any;
    loanData: any;
    personalData: any;
    signature: string;
    amountInWords: string;
    repaymentNumber: string;
    applicationDate: string;
    repaymentDelayDays?: number;
}

export const LoanPDFDocument = ({ userData, loanData, personalData, signature, amountInWords, repaymentNumber, applicationDate, repaymentDelayDays }: LoanPDFProps) => {
    // Logique des frais :
    // - Nouveau prêt : service_fee est défini en base → on l'utilise directement
    // - Ancien prêt : service_fee null/undefined → fallback sur la date de coupure (09/03/2026 = 500 F)
    const FEE_START_DATE = new Date('2026-03-09T00:00:00')
    const loanDate = new Date(applicationDate)
    const legacyFee = loanDate >= FEE_START_DATE ? 500 : 0
    const serviceFee = loanData.serviceFee != null ? loanData.serviceFee : legacyFee
    const totalToRepay = loanData.amount + serviceFee

    // Format robust for Date or ISO string
    const dRaw = loanData.dueDateRaw ? new Date(loanData.dueDateRaw) : new Date()
    const today = new Date()

    // Duration calculation for PDF
    // If it's a pending loan (today == dRaw), use the plan delay if provided
    let diffDays = 0
    const diffTime = dRaw.getTime() - today.getTime();

    if (diffTime > 0) {
        diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } else if (repaymentDelayDays) {
        diffDays = repaymentDelayDays
    }

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <Text style={styles.watermark}>OFFICIEL</Text>

                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <View style={styles.logoContainer}>
                            <Text style={styles.logo}>C</Text>
                            <Text style={styles.title}>Creditly</Text>
                        </View>
                        <Text style={styles.subtitle}>Solutions de Micro-Crédit Instantané</Text>
                    </View>
                    <View style={styles.contractInfo}>
                        <Text style={styles.contractNumber}>Contrat N° {Math.random().toString(36).substring(7).toUpperCase()}</Text>
                        <Text style={styles.date}>Émis le {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                    </View>
                </View>

                {/* Title */}
                <Text style={styles.mainTitle}>Engagement Unilatéral de Remboursement</Text>

                {/* Body */}
                <View style={styles.section}>
                    <Text>
                        Je soussigné(e), Monsieur/Madame <Text style={styles.bold}>{userData.prenom} {userData.nom}</Text>,
                        demeurant au <Text style={styles.bold}>{personalData.address || '________________'}</Text>,
                        dans la ville de <Text style={styles.bold}>{personalData.city || '________________'}</Text>,
                        exerçant la profession de <Text style={styles.bold}>{personalData.profession || '________________'}</Text>,
                        et titulaire de la pièce d'identité N° <Text style={styles.bold}>{personalData.idDetails || '________________'}</Text>.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text>
                        Reconnais par la présente, avoir contracté auprès de la plateforme{' '}
                        <Text style={styles.bold}>Creditly</Text>{' '}
                        un prêt de type "Avance sur Revenu" d'un montant de{' '}
                        <Text style={styles.bold}>{fNum(loanData.amount)} FCFA</Text>
                        {serviceFee > 0
                            ? ` majoré de frais de dossier de ${fNum(serviceFee)} FCFA`
                            : ''
                        }
                        , soit un montant total de :
                    </Text>
                </View>

                <View style={styles.amountCard}>
                    <Text style={styles.amountText}>{fNum(totalToRepay)} FCFA</Text>
                    <Text style={styles.amountInWords}>{(amountInWords + ' francs CFA').toUpperCase()}</Text>
                </View>

                <View style={styles.section}>
                    <Text>
                        Je m'engage formellement et irrévocablement à rembourser l'intégralité de cette somme au profit de <Text style={styles.bold}>Creditly</Text>, par transfert via le réseau <Text style={styles.bold}>{loanData.payoutNetwork}</Text> au numéro référencé <Text style={styles.bold}>{repaymentNumber}</Text>, au plus tard le :
                    </Text>
                </View>

                <Text style={styles.dueDate}>{loanData.dueDate} (soit dans {diffDays} jours)</Text>

                <View style={styles.clauseBox}>
                    <Text style={styles.clauseTitle}>Clauses et Engagements</Text>
                    <Text style={styles.clauseText}>1. Le débiteur reconnaît que cette dette est certaine, liquide et exigible à l'échéance indiquée.</Text>
                    <Text style={styles.clauseText}>2. Tout retard excédant 48h après l'échéance pourra entraîner l'application de pénalités forfaitaires.</Text>
                    <Text style={styles.clauseText}>3. Le présent document constitue un titre de créance permettant d'engager toute procédure de recouvrement.</Text>
                    <Text style={styles.clauseText}>4. La signature numérique apposée ci-dessous a la même valeur juridique qu'une signature manuscrite.</Text>
                    {serviceFee > 0 && <Text style={styles.clauseText}>5. Tout versement égal au montant total dû solde votre créance.</Text>}
                </View>

                {/* Signatures */}
                <View style={styles.signatureContainer}>
                    <View style={styles.signatureBlock}>
                        <Text style={styles.signatureLabel}>Le Débiteur (Signature)</Text>
                        <Text style={styles.signatureValue}>{signature || userData.prenom + ' ' + userData.nom}</Text>
                    </View>

                    <View style={styles.signatureBlock}>
                        <View style={styles.stamp}>
                            <View style={styles.stampInner}>
                                <Text style={{ fontSize: 7, fontWeight: 'bold', color: 'rgba(0, 50, 150, 0.4)' }}>CREDITLY.IO</Text>
                                <View style={styles.stampLine} />
                                <Text style={styles.stampTextLarge}>APPROUVÉ</Text>
                                <View style={styles.stampLine} />
                                <Text style={styles.stampTextSmall}>DIGITAL CERTIFIED {new Date().getFullYear()}</Text>
                            </View>
                        </View>
                        <Text style={styles.signatureLabel}>Pour Creditly (L'Organisation)</Text>
                        <View style={styles.certificationBox}>
                            <Text style={styles.certificationText}>Certification Automatique</Text>
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Creditly Finance Group • Document généré de manière électronique • 100% Digital Workflow
                    </Text>
                </View>
            </Page>
        </Document>
    );
};
