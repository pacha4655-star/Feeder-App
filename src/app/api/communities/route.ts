import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/session';
import { isValidCommunityType } from '@/lib/validation/schemas';
import { sanitizeText, sanitizeUrl } from '@/lib/security/sanitize';
import { checkRateLimit, createRateLimitResponse } from '@/lib/security/rate-limit';
import logger from '@/lib/monitoring/logger';
import type { CommunityType } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const db = getDb();
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');

    let query = `
      SELECT c.*,
             (SELECT COUNT(*) FROM community_members WHERE community_id = c.id) as actual_member_count,
             EXISTS(SELECT 1 FROM community_members WHERE community_id = c.id AND user_id = ?) as is_joined
      FROM communities c
    `;
    const params: any[] = [user ? user.id : ''];

    if (category && category !== 'ALL') {
      query += ` WHERE c.category = ?`;
      params.push(category);
    }

    query += ` ORDER BY actual_member_count DESC`;

    const communities = db.prepare(query).all(...params);

    return NextResponse.json({ success: true, communities });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    // Rate limiting: Community creation
    const rateLimit = checkRateLimit('community_create', user.id, { limit: 10, windowMs: 60 * 60 * 1000 });
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit);
    }

    const body = await request.json().catch(() => ({}));
    const {
      name,
      description,
      category = 'COMMUNITY',
      communityType = 'general',
      locationArea,
      city,
      region,
      countryCode,
      coverImage,
      avatarImage,
      rulesText,
      isPrivate = 0,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Community name is required' }, { status: 400 });
    }

    const sanitizedName = sanitizeText(name).slice(0, 100);
    const sanitizedDesc = description ? sanitizeText(description).slice(0, 2000) : '';
    const validCommType: CommunityType = isValidCommunityType(communityType) ? communityType : 'general';

    const slug =
      sanitizedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') + `-${Date.now().toString().slice(-4)}`;

    const communityId = `comm_${Date.now()}`;
    const db = getDb();

    // 1. Dual-sync with Supabase communities table
    try {
      const supabase = getSupabaseServerClient();
      await supabase.from('communities').insert({
        name: sanitizedName,
        slug,
        description: sanitizedDesc,
        community_type: validCommType,
        city: city ? sanitizeText(city).slice(0, 100) : null,
        region: region ? sanitizeText(region).slice(0, 100) : null,
        country_code: countryCode ? sanitizeText(countryCode).toUpperCase().slice(0, 2) : null,
        avatar_url: avatarImage ? sanitizeUrl(avatarImage) : null,
        cover_url: coverImage ? sanitizeUrl(coverImage) : null,
        created_by: user.id,
        members: [user.id],
        roles: { [user.id]: 'founder' },
        rules: rulesText ? [rulesText.slice(0, 500)] : [],
        settings: { open_membership: !isPrivate },
        is_private: !!isPrivate,
        is_active: true,
        stats: { members_count: 1, post_count: 0 },
      });
    } catch (supaErr) {
      console.warn('[Community POST] Supabase notice:', supaErr);
    }

    // 2. Insert into local DB
    const run = db.transaction(() => {
      db.prepare(`
        INSERT INTO communities (
          id, name, slug, description, category, location_area,
          cover_image, avatar_image, is_private, rules_text, created_by, member_count, post_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)
      `).run(
        communityId,
        sanitizedName,
        slug,
        sanitizedDesc,
        category,
        locationArea || '',
        coverImage || null,
        avatarImage || null,
        isPrivate ? 1 : 0,
        rulesText || '',
        user.id
      );

      // Add creator as ADMIN
      db.prepare(`
        INSERT INTO community_members (id, community_id, user_id, role, status)
        VALUES (?, ?, ?, 'ADMIN', 'APPROVED')
      `).run(`mem_${Date.now()}`, communityId, user.id);
    });

    run();

    logger.info('Community created', { userId: user.id, communityId, slug });

    return NextResponse.json({ success: true, communityId, slug });
  } catch (error: any) {
    logger.error('Create community error', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
