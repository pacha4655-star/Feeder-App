import { NextRequest, NextResponse } from 'next/server';
import { FeedRankingService } from '@/lib/services/feed-ranking';
import { getCurrentUser } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { validatePostPayload } from '@/lib/validation/schemas';
import { checkRateLimit, createRateLimitResponse, RATE_LIMIT_CONFIG } from '@/lib/security/rate-limit';
import logger from '@/lib/monitoring/logger';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const searchParams = request.nextUrl.searchParams;
    const tab = (searchParams.get('tab') as any) || 'FOR_YOU';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const cursor = searchParams.get('cursor');
    const latParam = searchParams.get('lat');
    const lonParam = searchParams.get('lon');
    const userLat = latParam ? parseFloat(latParam) : undefined;
    const userLon = lonParam ? parseFloat(lonParam) : undefined;

    const result = FeedRankingService.getRankedFeedPaginated({
      userId: user ? user.id : 'guest',
      tab,
      limit,
      cursor,
      userLat,
      userLon,
    });

    return NextResponse.json({
      success: true,
      posts: result.items,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  } catch (error: any) {
    logger.error('Feed API error', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    // Rate limiting: Post creation
    const rateLimit = checkRateLimit('post_create', user.id, RATE_LIMIT_CONFIG.postCreation);
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit);
    }

    const rawBody = await request.json().catch(() => ({}));
    const validation = validatePostPayload(rawBody);
    if (!validation.success || !validation.data) {
      return NextResponse.json({ success: false, error: validation.error || 'Invalid post payload' }, { status: 400 });
    }

    const {
      title,
      body: content,
      contentType,
      communityId,
      mediaUrls,
      tags,
      locationName,
      approxLat,
      approxLon,
      visibility,
    } = validation.data;

    const db = getDb();
    const postId = `post_${Date.now()}`;

    // 1. Dual-sync with Supabase social_posts table
    try {
      const supabase = getSupabaseServerClient();
      await supabase.from('social_posts').insert({
        record_type: 'post',
        user_id: user.id,
        community_id: communityId || null,
        content,
        data: {
          title: title || null,
          content_type: contentType,
          location_name: locationName || null,
        },
        media: mediaUrls.map((url) => ({
          url,
          type: /\.(mp4|webm|mov)(\?.*)?$/i.test(url) ? 'video' : 'image',
        })),
        reactions: {},
        comments: {},
        hashtags: tags,
        mentions: [],
        visibility,
        is_active: true,
        is_deleted: false,
        stats: { views_count: 0, likes_count: 0 },
      });
    } catch (supaErr) {
      console.warn('[Feed POST] Supabase social_posts sync notice:', supaErr);
    }

    // 2. Insert into local DB for immediate UI responsiveness
    db.prepare(`
      INSERT INTO posts (
        id, author_id, community_id, content_type, title, body,
        media_urls_json, tags_json, location_name, approx_lat, approx_lon,
        visibility, reaction_count, comment_count, share_count, safety_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 1.0)
    `).run(
      postId,
      user.id,
      communityId || null,
      contentType,
      title || null,
      content,
      JSON.stringify(mediaUrls),
      JSON.stringify(tags),
      locationName || null,
      approxLat || null,
      approxLon || null,
      visibility.toUpperCase()
    );

    logger.info('Post created', { userId: user.id, postId });

    return NextResponse.json({ success: true, postId });
  } catch (error: any) {
    logger.error('Create Post error', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
