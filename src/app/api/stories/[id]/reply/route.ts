import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { MessagingService } from '@/lib/services/messaging';
import { checkRateLimit, createRateLimitResponse } from '@/lib/security/rate-limit';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = checkRateLimit('story_reply', user.id, { limit: 30, windowMs: 60 * 1000 });
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit);
    }

    const { id: storyId } = await context.params;
    const body = await request.json();
    const { text } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ success: false, error: 'Reply text cannot be empty' }, { status: 400 });
    }

    const db = getDb();
    const story = db.prepare('SELECT author_id, media_url FROM stories WHERE id = ?').get(storyId) as
      | { author_id: string; media_url: string }
      | undefined;

    if (!story) {
      return NextResponse.json({ success: false, error: 'Story not found' }, { status: 404 });
    }

    if (story.author_id === user.id) {
      return NextResponse.json({ success: false, error: 'Cannot reply to your own story' }, { status: 400 });
    }

    // Get or create direct conversation with story author
    const convId = MessagingService.getOrCreateDirectConversation(user.id, story.author_id);

    // Send the message with context
    const replyBody = `[Replied to Story]: ${text.trim()}`;
    const message = MessagingService.sendMessage(convId, user.id, replyBody, story.media_url);

    return NextResponse.json({ success: true, conversationId: convId, message });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
