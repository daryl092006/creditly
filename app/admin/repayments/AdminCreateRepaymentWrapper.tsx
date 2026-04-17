'use client'

import React, { useState } from 'react'
import AdminDirectRepaymentModal from './AdminDirectRepaymentModal'
import { Add } from '@carbon/icons-react'

export default function AdminCreateRepaymentWrapper({ isAdmin }: { isAdmin: boolean }) {
    const [isOpen, setIsOpen] = useState(false)

    if (!isAdmin) return null

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="premium-button py-3 px-6 flex items-center gap-2 text-[10px]"
            >
                <Add size={16} /> Enregistrer un paiement
            </button>

            <AdminDirectRepaymentModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
            />
        </>
    )
}
