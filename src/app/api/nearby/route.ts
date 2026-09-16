import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userLat = parseFloat(searchParams.get('lat') || '12.9784');
    const userLon = parseFloat(searchParams.get('lon') || '77.6408');
    const radius = parseFloat(searchParams.get('radius') || '10');

    const db = getDb();

    // 1. Fetch real active feeding logs in range
    const feedings = db
      .prepare(`
        SELECT f.id, 'FEEDER' as type, u.full_name as title,
               ('Fed ' || f.animal_count || ' ' || f.animal_type || ' (' || f.food_type || ')') as subtitle,
               f.approx_location_name as approxLocation,
               haversine_km(?, ?, f.approx_lat, f.approx_lon) as distanceKm,
               'Active Feed' as badge,
               '🐾' as icon,
               '#10b981' as color
        FROM feeding_logs f
        JOIN users u ON f.user_id = u.id
        WHERE f.visibility = 'PUBLIC' AND f.approx_lat IS NOT NULL
        ORDER BY f.fed_at DESC
        LIMIT 10
      `)
      .all(userLat, userLon) as any[];

    // 2. Fetch real active SOS cases in range
    const sos = db
      .prepare(`
        SELECT s.id, 'SOS' as type, s.title,
               ('Target: ' || s.animal_type || ' - ' || s.urgency || ' URGENCY') as subtitle,
               s.approx_location_name as approxLocation,
               haversine_km(?, ?, s.approx_lat, s.approx_lon) as distanceKm,
               s.urgency as badge,
               '🚨' as icon,
               '#ef4444' as color
        FROM sos_cases s
        WHERE s.status IN ('OPEN', 'HELP_REQUESTED', 'RESPONDING')
        ORDER BY s.created_at DESC
        LIMIT 10
      `)
      .all(userLat, userLon) as any[];

    const items = [...sos, ...feedings].filter((item) => item.distanceKm <= radius);

    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    console.error('Nearby error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
