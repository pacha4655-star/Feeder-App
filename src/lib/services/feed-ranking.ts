import { getDb } from '../db';

export interface FeedQueryOptions {
  userId: string;
  tab?: 'FOR_YOU' | 'FOLLOWING' | 'NEARBY' | 'FEEDING' | 'SOS' | 'REELS';
  limit?: number;
  cursor?: string | null;
  userLat?: number;
  userLon?: number;
}

export interface FeedResponse {
  items: PostWithAuthor[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface PostWithAuthor {
  id: string;
  author_id: string;
  author_name: string;
  author_username: string;
  author_avatar: string;
  author_role: string;
  author_feeder_level?: string;
  community_id?: string;
  community_name?: string;
  community_slug?: string;
  content_type: string;
  title?: string;
  body: string;
  media_urls: string[];
  tags: string[];
  location_name?: string;
  approx_lat?: number;
  approx_lon?: number;
  distance_km?: number;
  visibility: string;
  reaction_count: number;
  comment_count: number;
  share_count: number;
  user_reaction?: string | null;
  is_saved?: boolean;
  created_at: string;
  ranking_score?: number;
}

export class FeedRankingService {
  /**
   * Deterministic multi-factor scoring engine with cursor-based pagination for Feeder.life.
   */
  static getRankedFeedPaginated(options: FeedQueryOptions): FeedResponse {
    const limit = Math.min(Math.max(1, options.limit || 15), 50);
    const ranked = this.getRankedFeed(options);

    let filtered = ranked;
    if (options.cursor) {
      try {
        const decoded = Buffer.from(options.cursor, 'base64').toString('utf8');
        const [cursorScoreStr, cursorId] = decoded.split(':::');
        const cursorScore = parseFloat(cursorScoreStr);

        const cursorIdx = ranked.findIndex(
          (p) =>
            p.id === cursorId ||
            (p.ranking_score !== undefined && p.ranking_score < cursorScore)
        );

        if (cursorIdx !== -1) {
          filtered = ranked.slice(cursorIdx + 1);
        }
      } catch {
        filtered = ranked;
      }
    }

    const items = filtered.slice(0, limit);
    const hasMore = filtered.length > limit;

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1];
      const score = lastItem.ranking_score ?? 0;
      nextCursor = Buffer.from(`${score}:::${lastItem.id}`).toString('base64');
    }

    return { items, nextCursor, hasMore };
  }

  /**
   * Deterministic multi-factor scoring engine for Feeder.life V1.
   * Calculates post score = (Recency Decay) * [ (Engagement * 1.5) + (Community Affinity * 30) + (Proximity * 20) ] * Safety Score
   */
  static getRankedFeed(options: FeedQueryOptions): PostWithAuthor[] {
    const {
      userId,
      tab = 'FOR_YOU',
      limit = 50,
      userLat,
      userLon,
    } = options;

    const db = getDb();

    // Fetch user relationships
    let followedUserIds: string[] = [];
    let excludeUsers = new Set<string>();

    try {
      const relationships = db
        .prepare(
          `SELECT target_id, relationship_type FROM user_relationships WHERE user_id = ?`
        )
        .all(userId) as { target_id: string; relationship_type: string }[];

      for (const rel of relationships) {
        if (rel.relationship_type === 'FOLLOW' || rel.relationship_type === 'FRIEND') {
          followedUserIds.push(rel.target_id);
        } else if (rel.relationship_type === 'BLOCK' || rel.relationship_type === 'MUTE') {
          excludeUsers.add(rel.target_id);
        }
      }
    } catch {
      // Table might be initializing or empty
    }

    // Communities user is a member of
    const joinedCommunities = db
      .prepare(`SELECT community_id FROM community_members WHERE user_id = ?`)
      .all(userId) as { community_id: string }[];
    const joinedSet = new Set(joinedCommunities.map((c) => c.community_id));

    // User saved posts
    const savedPosts = db
      .prepare(`SELECT item_id FROM saved_items WHERE user_id = ? AND item_type = 'POST'`)
      .all(userId) as { item_id: string }[];
    const savedSet = new Set(savedPosts.map((s) => s.item_id));

    // Base query for candidate posts
    let query = `
      SELECT p.*,
             u.full_name as author_name,
             u.username as author_username,
             u.avatar_url as author_avatar,
             u.role as author_role,
             prof.feeder_level as author_feeder_level,
             c.name as community_name,
             c.slug as community_slug,
             c.is_private as community_is_private,
             r.reaction_type as user_reaction,
             haversine_km(?, ?, p.approx_lat, p.approx_lon) as distance_km
      FROM posts p
      JOIN users u ON p.author_id = u.id
      LEFT JOIN user_profiles prof ON u.id = prof.user_id
      LEFT JOIN communities c ON p.community_id = c.id
      LEFT JOIN post_reactions r ON p.id = r.post_id AND r.user_id = ?
      WHERE p.status = 'PUBLISHED'
    `;

    const params: any[] = [userLat, userLon, userId];

    if (tab === 'NEARBY') {
      query += ` AND p.approx_lat IS NOT NULL`;
    } else if (tab === 'FEEDING') {
      query += ` AND p.content_type = 'FEEDING_UPDATE'`;
    } else if (tab === 'SOS') {
      query += ` AND (p.content_type = 'SOS_PREVIEW' OR p.content_type = 'HELP_REQUEST')`;
    } else if (tab === 'REELS') {
      query += ` AND (p.content_type = 'VIDEO' OR p.media_urls_json LIKE '%.mp4%' OR p.media_urls_json LIKE '%.webm%')`;
    }

    const candidatePosts = db.prepare(query).all(...params) as any[];

    const now = Date.now();

    // Score and filter candidate posts
    const scoredPosts: PostWithAuthor[] = [];

    for (const row of candidatePosts) {
      // Exclude blocked or muted authors
      if (excludeUsers.has(row.author_id)) continue;

      // Exclude private community posts if user is not a member
      if (row.community_is_private && !joinedSet.has(row.community_id)) continue;

      // Parse JSON fields safely
      let mediaUrls: string[] = [];
      try {
        mediaUrls = JSON.parse(row.media_urls_json || '[]');
      } catch {
        mediaUrls = [];
      }

      let tags: string[] = [];
      try {
        tags = JSON.parse(row.tags_json || '[]');
      } catch {
        tags = [];
      }

      // Calculate time decay: half-life of 24 hours (86,400,000 ms)
      const postAgeMs = Math.max(0, now - new Date(row.created_at).getTime());
      const hoursAgo = postAgeMs / (1000 * 60 * 60);
      const recencyFactor = 1 / Math.pow(1 + hoursAgo / 12, 1.3);

      // Engagement score
      const engagement =
        (row.reaction_count || 0) * 3 +
        (row.comment_count || 0) * 5 +
        (row.share_count || 0) * 8;

      // Affinity score (community membership bonus)
      const isMemberCommunity = row.community_id && joinedSet.has(row.community_id);
      const communityBonus = isMemberCommunity ? 35 : 0;

      // Proximity score (boost if within 5 km)
      let proximityBonus = 0;
      if (row.distance_km != null && row.distance_km < 10) {
        proximityBonus = Math.max(0, 30 - row.distance_km * 3);
      }

      // Content type weight (feeding and emergency updates receive deliberate priority)
      let typeWeight = 1.0;
      if (row.content_type === 'FEEDING_UPDATE') typeWeight = 1.25;
      if (row.content_type === 'HELP_REQUEST' || row.content_type === 'SOS_PREVIEW') typeWeight = 1.4;

      // Safety multiplier
      const safetyScore = row.safety_score || 1.0;

      // Final deterministic composite score
      const finalScore =
        (10 + engagement + communityBonus + proximityBonus) *
        recencyFactor *
        typeWeight *
        safetyScore;

      scoredPosts.push({
        id: row.id,
        author_id: row.author_id,
        author_name: row.author_name,
        author_username: row.author_username,
        author_avatar: row.author_avatar,
        author_role: row.author_role,
        author_feeder_level: row.author_feeder_level,
        community_id: row.community_id,
        community_name: row.community_name,
        community_slug: row.community_slug,
        content_type: row.content_type,
        title: row.title,
        body: row.body,
        media_urls: mediaUrls,
        tags: tags,
        location_name: row.location_name,
        approx_lat: row.approx_lat,
        approx_lon: row.approx_lon,
        distance_km: row.distance_km,
        visibility: row.visibility,
        reaction_count: row.reaction_count || 0,
        comment_count: row.comment_count || 0,
        share_count: row.share_count || 0,
        user_reaction: row.user_reaction,
        is_saved: savedSet.has(row.id),
        created_at: row.created_at,
        ranking_score: Math.round(finalScore * 100) / 100,
      });
    }

    // Sort by computed score descending
    scoredPosts.sort((a, b) => (b.ranking_score || 0) - (a.ranking_score || 0));

    // Content diversity filter: prevent more than 2 consecutive posts from the same author
    const diversified: PostWithAuthor[] = [];
    let lastAuthorId = '';
    let authorRepeatCount = 0;

    for (const post of scoredPosts) {
      if (post.author_id === lastAuthorId) {
        authorRepeatCount++;
        if (authorRepeatCount >= 2) {
          // Push to end for diversity
          continue;
        }
      } else {
        lastAuthorId = post.author_id;
        authorRepeatCount = 1;
      }
      diversified.push(post);
    }

    return diversified.slice(0, limit);
  }
}
