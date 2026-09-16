import { NextRequest, NextResponse } from 'next/server';
import { StoryService } from '@/lib/services/story';
import { getCurrentUser } from '@/lib/auth/session';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storyId } = await context.params;
    const user = await getCurrentUser();
    if (user) {
      await StoryService.markViewed(storyId, user.id);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
