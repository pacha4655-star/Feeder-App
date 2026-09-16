import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('feeder_session')?.value;
    if (sessionToken) {
      const db = getDb();
      db.prepare('DELETE FROM user_sessions WHERE token_hash = ?').run(sessionToken);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('feeder_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
