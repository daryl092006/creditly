import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // Create a Supabase client to refresh the session
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => {
                        request.cookies.set(name, value)
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) => {
                        const { maxAge, expires, ...rest } = options
                        response.cookies.set(name, value, rest)
                    })
                },
            },
        }
    )

    // Using getUser() is the secure way to get the user's details.
    // We check for the presence of a session cookie first to avoid unnecessary slow fetches.
    const hasSession = request.cookies.getAll().some(c => c.name.startsWith('sb-'));
    let user = null;

    if (hasSession) {
        try {
            const { data, error } = await supabase.auth.getUser()
            if (!error && data) {
                user = data.user
            }
        } catch (e) {
            // Silently fail if fetch fails to avoid blocking the user experience
        }
    }

    const path = request.nextUrl.pathname

    // Auth routes
    const authRoutes = ['/auth/login', '/auth/signup']
    const isAuthRoute = authRoutes.some(route => path.startsWith(route))

    /* 
    if (isAuthRoute && user) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    */

    // Protection logic
    if (!user) {
        const protectedRoutes = ['/dashboard', '/admin', '/client']
        if (protectedRoutes.some(route => path.startsWith(route))) {
            return NextResponse.redirect(new URL('/auth/login', request.url))
        }
        return response
    }

    // If User IS logged in, check activation status
    const { data: userData } = await supabase
        .from('users')
        .select('role, is_account_active')
        .eq('id', user.id)
        .single()

    const isClient = userData?.role === 'client'
    const isInactive = userData?.is_account_active === false
    const isPendingPage = path === '/client/pending-activation' || path === '/client/kyc'

    // For inactive clients, check if they have KYC documents
    if (isClient && isInactive && !isPendingPage && path.startsWith('/client')) {
        // Check if user has submitted KYC documents
        const { data: kycDocs } = await supabase
            .from('kyc_submissions')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)

        // If no KYC documents, redirect to KYC submission page
        // If KYC documents exist, redirect to pending-activation to show analysis status
        const redirectPath = kycDocs && kycDocs.length > 0
            ? '/client/pending-activation'
            : '/client/kyc'

        return NextResponse.redirect(new URL(redirectPath, request.url))
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
