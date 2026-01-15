import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const supabase = await createClient()

        const email = formData.get('email') as string
        const password = formData.get('password') as string
        const nom = formData.get('nom') as string
        const prenom = formData.get('prenom') as string
        const whatsapp = formData.get('whatsapp') as string

        // Check blacklist
        const { data: isBlacklisted } = await supabase
            .from('email_blacklist')
            .select('id')
            .eq('email', email)
            .single()

        if (isBlacklisted) {
            return NextResponse.json(
                { error: "Cet email est sur liste noire et ne peut plus être utilisé sur cette plateforme." },
                { status: 403 }
            )
        }

        // Auth signup
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            phone: whatsapp,
            options: {
                data: {
                    nom,
                    prenom,
                    whatsapp,
                    role: 'client'
                }
            }
        })

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 })
        }

        if (!authData.user) {
            return NextResponse.json(
                { error: "Erreur lors de la création de l'utilisateur" },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: "Un e-mail de confirmation vous a été envoyé. Veuillez vérifier votre boîte de réception pour activer votre compte."
        })
    } catch (error) {
        return NextResponse.json(
            { error: (error as Error).message || "Erreur lors de l'inscription" },
            { status: 500 }
        )
    }
}
