import { NextResponse } from 'next/server';
import { startImpersonation } from '@/app/admin/support/actions';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const sessionId = formData.get('sessionId') as string;
    const otp = formData.get('otp') as string;

    if (!sessionId || !otp) {
      return NextResponse.redirect(new URL('/admin/support?error=MissingData', request.url));
    }

    await startImpersonation(sessionId, otp);

    // Retour sur la page du ticket avec succès
    // On extrait l'ID du ticket depuis la DB pour faire la bonne redirection si on l'avait (on le fait simple ici)
    return NextResponse.redirect(new URL('/admin/support', request.url)); 
    
  } catch (error: any) {
    console.error('OTP Verification Error:', error);
    return NextResponse.redirect(new URL(`/admin/support?error=${encodeURIComponent(error.message)}`, request.url));
  }
}
