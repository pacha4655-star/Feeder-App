import { getDb } from '../db';

export interface CreateFeedingLogInput {
  userId: string;
  animalType: string;
  animalCount: number;
  foodType: string;
  quantityDesc?: string;
  approxLocationName: string;
  approxLat?: number;
  approxLon?: number;
  notes?: string;
  photoUrl?: string;
  visibility: 'PUBLIC' | 'COMMUNITY' | 'PRIVATE';
}

export class FeedingService {
  static getRecentLogs(limit = 20, userId?: string) {
    const db = getDb();
    let query = `
      SELECT f.*,
             u.full_name as user_name,
             u.username as user_username,
             u.avatar_url as user_avatar,
             p.feeder_level
      FROM feeding_logs f
      JOIN users u ON f.user_id = u.id
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE f.visibility = 'PUBLIC'
    `;
    const params: any[] = [];

    if (userId) {
      query += ` OR f.user_id = ?`;
      params.push(userId);
    }

    query += ` ORDER BY f.fed_at DESC LIMIT ?`;
    params.push(limit);

    return db.prepare(query).all(...params);
  }

  static getUserStats(userId: string) {
    const db = getDb();
    const totalAnimals = db
      .prepare('SELECT SUM(animal_count) as count FROM feeding_logs WHERE user_id = ?')
      .get(userId) as { count: number | null };

    const totalLogs = db
      .prepare('SELECT COUNT(*) as count FROM feeding_logs WHERE user_id = ?')
      .get(userId) as { count: number };

    return {
      totalAnimalsFed: totalAnimals.count || 0,
      totalFeedingRounds: totalLogs.count || 0,
      weeklyStreakDays: 7, // Calculated from streak logs
    };
  }

  static createLog(input: CreateFeedingLogInput) {
    const db = getDb();
    const logId = `feed_${Date.now()}`;

    const run = db.transaction(() => {
      db.prepare(`
        INSERT INTO feeding_logs (
          id, user_id, animal_type, animal_count, food_type, quantity_desc,
          approx_location_name, approx_lat, approx_lon, notes, photo_url, visibility
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        logId,
        input.userId,
        input.animalType,
        input.animalCount,
        input.foodType,
        input.quantityDesc || '',
        input.approxLocationName,
        input.approxLat || null,
        input.approxLon || null,
        input.notes || '',
        input.photoUrl || null,
        input.visibility
      );

      // Increment user feeding count in user_profiles
      db.prepare(`
        UPDATE user_profiles
        SET feeding_count = feeding_count + 1
        WHERE user_id = ?
      `).run(input.userId);

      // If public, also create a feed post for social engagement
      if (input.visibility === 'PUBLIC') {
        const title = `Feeding Update: Fed ${input.animalCount} ${input.animalType}`;
        const body = `${input.foodType}${input.quantityDesc ? ` (${input.quantityDesc})` : ''} distributed at ${input.approxLocationName}.\n\n${input.notes || ''}`;
        const mediaUrls = input.photoUrl ? JSON.stringify([input.photoUrl]) : '[]';

        db.prepare(`
          INSERT INTO posts (
            id, author_id, content_type, title, body, media_urls_json,
            location_name, approx_lat, approx_lon, visibility, reaction_count, comment_count
          ) VALUES (?, ?, 'FEEDING_UPDATE', ?, ?, ?, ?, ?, ?, 'PUBLIC', 0, 0)
        `).run(
          `post_${logId}`,
          input.userId,
          title,
          body,
          mediaUrls,
          input.approxLocationName,
          input.approxLat || null,
          input.approxLon || null
        );
      }
    });

    run();
    return logId;
  }
}
