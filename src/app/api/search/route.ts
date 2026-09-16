import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const db = getDb();
    const searchParams = request.nextUrl.searchParams;
    const query = (searchParams.get('q') || '').trim();

    if (!query) {
      return NextResponse.json({ success: true, results: { people: [], communities: [], posts: [], sos: [] } });
    }

    const pattern = `%${query}%`;

    // 1. Search Users
    const people = db
      .prepare(`
        SELECT u.id, u.username, u.full_name, u.avatar_url, u.role, p.area_name, p.feeder_level
        FROM users u
        LEFT JOIN user_profiles p ON u.id = p.user_id
        WHERE u.full_name LIKE ? OR u.username LIKE ?
        LIMIT 6
      `)
      .all(pattern, pattern);

    // 2. Search Communities
    const communities = db
      .prepare(`
        SELECT id, name, slug, description, category, location_area, avatar_image, member_count
        FROM communities
        WHERE (name LIKE ? OR description LIKE ?) AND is_private = 0
        LIMIT 6
      `)
      .all(pattern, pattern);

    // 3. Search Posts
    const posts = db
      .prepare(`
        SELECT p.id, p.title, p.body, p.content_type, p.location_name, p.reaction_count, p.comment_count,
               u.full_name as author_name, u.avatar_url as author_avatar
        FROM posts p
        JOIN users u ON p.author_id = u.id
        WHERE (p.title LIKE ? OR p.body LIKE ? OR p.location_name LIKE ?) AND p.visibility = 'PUBLIC' AND p.status = 'PUBLISHED'
        ORDER BY p.created_at DESC
        LIMIT 6
      `)
      .all(pattern, pattern, pattern);

    // 4. Search SOS cases
    const sos = db
      .prepare(`
        SELECT id, title, emergency_type, urgency, animal_type, approx_location_name, status, created_at
        FROM sos_cases
        WHERE title LIKE ? OR description LIKE ? OR animal_type LIKE ? OR approx_location_name LIKE ?
        ORDER BY created_at DESC
        LIMIT 6
      `)
      .all(pattern, pattern, pattern, pattern);

    return NextResponse.json({
      success: true,
      query,
      results: { people, communities, posts, sos },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
