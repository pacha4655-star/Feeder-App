import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthenticatedUser } from '@/lib/auth/unified-auth';
import { AiChatService } from '@/lib/services/ai-chat';
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/security/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const user = await resolveAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const rateCheck = checkRateLimit('ai_chat', user.id, RATE_LIMIT_CONFIG.ai);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "You've reached the current usage limit. Please try again later.",
          retryAfter: rateCheck.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid request payload.' }, { status: 400 });
    }

    const query = body.query || body.message;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json({ success: false, error: 'Query cannot be empty.' }, { status: 400 });
    }

    const conversationId = body.conversationId ? String(body.conversationId).trim() : null;
    const response = await AiChatService.sendMessage({
      userId: user.id,
      conversationId,
      messageText: query.trim(),
    });

    return NextResponse.json({
      success: true,
      messageId: response.messageId,
      conversationId: response.conversationId,
      content: response.content,
      role: response.role,
      createdAt: response.createdAt,
    });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Forbidden.' }, { status: 403 });
    }
    console.error('Ask Feeder error:', error);
    return NextResponse.json(
      { success: false, error: 'Ask Feeder is temporarily unavailable. Please try again.' },
      { status: 500 }
    );
  }
}

