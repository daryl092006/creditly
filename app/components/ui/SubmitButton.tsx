'use client'

import { useFormStatus } from 'react-dom'
import { ActionButton } from './ActionButton'
import { ReactNode } from 'react'

interface SubmitButtonProps {
    children: ReactNode
    loadingText?: string
    className?: string
    variant?: 'premium' | 'primary' | 'glass'
}

export function SubmitButton({ children, loadingText = 'Traitement...', className, variant }: SubmitButtonProps) {
    const { pending } = useFormStatus()

    return (
        <ActionButton
            type="submit"
            loading={pending}
            loadingText={loadingText}
            className={className}
            variant={variant}
        >
            {children}
        </ActionButton>
    )
}
