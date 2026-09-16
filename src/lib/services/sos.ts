import { getDb } from '../db';

export interface CreateSosInput {
  reporterId: string;
  emergencyType: 'INJURED_ANIMAL' | 'ACCIDENT' | 'ABANDONED' | 'ANIMAL_IN_DANGER' | 'TRAPPED' | 'CRUELTY' | 'OTHER';
  animalType: string;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  approxLocationName: string;
  approxLat: number;
  approxLon: number;
  mediaUrls?: string[];
  contactPreference?: 'IN_APP' | 'PHONE_ON_REQUEST' | 'COMMUNITY';
}

export interface SosCaseView {
  id: string;
  reporter_id: string;
  reporter_name: string;
  reporter_avatar: string;
  reporter_role: string;
  emergency_type: string;
  animal_type: string;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  approx_location_name: string;
  approx_lat: number;
  approx_lon: number;
  distance_km?: number;
  media_urls: string[];
  contact_preference: string;
  status: 'OPEN' | 'HELP_REQUESTED' | 'RESPONDING' | 'RESOLVED' | 'CLOSED';
  responder_count: number;
  is_user_responding?: boolean;
  created_at: string;
  updates: Array<{
    id: string;
    user_name: string;
    update_text: string;
    status_change?: string;
    created_at: string;
  }>;
}

export class SosService {
  static getActiveCases(userLat?: number | null, userLon?: number | null, userId?: string): SosCaseView[] {
    const db = getDb();
    const rows = db
      .prepare(`
        SELECT s.*,
               u.full_name as reporter_name,
               u.avatar_url as reporter_avatar,
               u.role as reporter_role,
               haversine_km(?, ?, s.approx_lat, s.approx_lon) as distance_km
        FROM sos_cases s
        JOIN users u ON s.reporter_id = u.id
        ORDER BY
          CASE s.urgency
            WHEN 'CRITICAL' THEN 1
            WHEN 'HIGH' THEN 2
            WHEN 'MEDIUM' THEN 3
            ELSE 4
          END,
          s.created_at DESC
      `)
      .all(userLat, userLon) as any[];

    return rows.map((r) => {
      let media: string[] = [];
      try {
        media = JSON.parse(r.media_urls_json || '[]');
      } catch {
        media = [];
      }

      // Fetch case updates
      const updates = db
        .prepare(`
          SELECT u.id, usr.full_name as user_name, u.update_text, u.status_change, u.created_at
          FROM sos_updates u
          JOIN users usr ON u.user_id = usr.id
          WHERE u.sos_id = ?
          ORDER BY u.created_at ASC
        `)
        .all(r.id) as any[];

      // Check if user is responding
      let isUserResponding = false;
      if (userId) {
        const resp = db
          .prepare('SELECT 1 FROM sos_responders WHERE sos_id = ? AND user_id = ?')
          .get(r.id, userId);
        isUserResponding = !!resp;
      }

      return {
        id: r.id,
        reporter_id: r.reporter_id,
        reporter_name: r.reporter_name,
        reporter_avatar: r.reporter_avatar,
        reporter_role: r.reporter_role,
        emergency_type: r.emergency_type,
        animal_type: r.animal_type,
        urgency: r.urgency,
        title: r.title,
        description: r.description,
        approx_location_name: r.approx_location_name,
        approx_lat: r.approx_lat,
        approx_lon: r.approx_lon,
        distance_km: r.distance_km,
        media_urls: media,
        contact_preference: r.contact_preference,
        status: r.status,
        responder_count: r.responder_count || 0,
        is_user_responding: isUserResponding,
        created_at: r.created_at,
        updates,
      };
    });
  }

  static createCase(input: CreateSosInput): string {
    const db = getDb();
    const caseId = `sos_${Date.now()}`;

    // Rate-limit check: maximum 3 active SOS reports per user in 1 hour
    const recentReports = db
      .prepare(`
        SELECT COUNT(*) as count
        FROM sos_cases
        WHERE reporter_id = ? AND created_at > datetime('now', '-1 hour')
      `)
      .get(input.reporterId) as { count: number };

    if (recentReports.count >= 5) {
      throw new Error('Rate limit exceeded: You have submitted multiple SOS alerts recently.');
    }

    const run = db.transaction(() => {
      db.prepare(`
        INSERT INTO sos_cases (
          id, reporter_id, emergency_type, animal_type, urgency, title, description,
          approx_location_name, approx_lat, approx_lon, media_urls_json, contact_preference,
          status, responder_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', 0)
      `).run(
        caseId,
        input.reporterId,
        input.emergencyType,
        input.animalType,
        input.urgency,
        input.title,
        input.description,
        input.approxLocationName,
        input.approxLat,
        input.approxLon,
        JSON.stringify(input.mediaUrls || []),
        input.contactPreference || 'IN_APP'
      );

      // Create an audit log
      db.prepare(`
        INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details_json)
        VALUES (?, ?, 'SOS_CREATED', 'SOS_CASE', ?, ?)
      `).run(
        `audit_${Date.now()}`,
        input.reporterId,
        caseId,
        JSON.stringify({ urgency: input.urgency, animal: input.animalType })
      );

      // Create a feed post so the community sees the emergency
      db.prepare(`
        INSERT INTO posts (
          id, author_id, content_type, title, body, media_urls_json, location_name,
          approx_lat, approx_lon, visibility, reaction_count, comment_count
        ) VALUES (?, ?, 'HELP_REQUEST', ?, ?, ?, ?, ?, ?, 'PUBLIC', 0, 0)
      `).run(
        `post_${caseId}`,
        input.reporterId,
        `[URGENT SOS] ${input.title}`,
        input.description,
        JSON.stringify(input.mediaUrls || []),
        input.approxLocationName,
        input.approxLat,
        input.approxLon
      );
    });

    run();
    return caseId;
  }

  static respondToSos(sosId: string, userId: string, notes?: string) {
    const db = getDb();
    const run = db.transaction(() => {
      db.prepare(`
        INSERT OR IGNORE INTO sos_responders (id, sos_id, user_id, status, notes)
        VALUES (?, ?, ?, 'COMMITTED', ?)
      `).run(`resp_${Date.now()}`, sosId, userId, notes || '');

      // Increment responder count & advance status to HELP_REQUESTED or RESPONDING
      db.prepare(`
        UPDATE sos_cases
        SET responder_count = responder_count + 1,
            status = CASE WHEN status = 'OPEN' THEN 'HELP_REQUESTED' ELSE status END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(sosId);

      // Record update
      db.prepare(`
        INSERT INTO sos_updates (id, sos_id, user_id, update_text, status_change)
        VALUES (?, ?, ?, 'Volunteer joined as emergency responder.', 'RESPONDING')
      `).run(`upd_${Date.now()}`, sosId, userId);
    });

    run();
  }

  static updateStatus(
    sosId: string,
    userId: string,
    newStatus: 'HELP_REQUESTED' | 'RESPONDING' | 'RESOLVED' | 'CLOSED',
    note: string,
    userRole?: string
  ) {
    const db = getDb();
    const sos = db.prepare('SELECT reporter_id FROM sos_cases WHERE id = ?').get(sosId) as { reporter_id: string } | undefined;
    if (!sos) {
      throw new Error('NOT_FOUND');
    }

    const isReporter = sos.reporter_id === userId;
    const isStaff = userRole === 'PLATFORM_ADMIN' || userRole === 'PLATFORM_MODERATOR';
    const isResponder = !!db.prepare('SELECT 1 FROM sos_responders WHERE sos_id = ? AND user_id = ?').get(sosId, userId);

    if (!isReporter && !isStaff && !isResponder) {
      throw new Error('FORBIDDEN');
    }

    const run = db.transaction(() => {
      db.prepare(`
        UPDATE sos_cases
        SET status = ?,
            resolved_at = CASE WHEN ? IN ('RESOLVED', 'CLOSED') THEN CURRENT_TIMESTAMP ELSE resolved_at END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newStatus, newStatus, sosId);

      db.prepare(`
        INSERT INTO sos_updates (id, sos_id, user_id, update_text, status_change)
        VALUES (?, ?, ?, ?, ?)
      `).run(`upd_${Date.now()}`, sosId, userId, note, newStatus);
    });

    run();
  }
}
