import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { isValidAnimalStatus } from '@/lib/validation/schemas';
import { sanitizeText, sanitizeUrl } from '@/lib/security/sanitize';
import { checkRateLimit, createRateLimitResponse } from '@/lib/security/rate-limit';
import logger from '@/lib/monitoring/logger';
import type { AnimalStatus } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const species = searchParams.get('species');
    const status = searchParams.get('status');
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '20', 10)), 50);

    const supabase = getSupabaseServerClient();
    let query = supabase
      .from('animals')
      .select('*, users!animals_created_by_fkey(id, username, display_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (species && species !== 'ALL') {
      query = query.eq('species', species.toLowerCase());
    }
    if (status && isValidAnimalStatus(status)) {
      query = query.eq('status', status as AnimalStatus);
    }

    const { data: animals, error } = await query;

    if (error) {
      logger.error('Error fetching animals from Supabase', error);
      return NextResponse.json({ success: true, animals: [] });
    }

    return NextResponse.json({ success: true, animals: animals || [] });
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

    const rateLimit = checkRateLimit('animal_create', user.id, { limit: 20, windowMs: 60 * 60 * 1000 });
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit);
    }

    const body = await request.json().catch(() => ({}));
    const {
      name,
      species,
      breed,
      sex,
      description,
      avatarUrl,
      city,
      region,
      countryCode,
      status = 'active',
      profileData = {},
      medicalData = {},
      feedingData = {},
      sosData = {},
      rescueData = {},
      adoptionData = {},
      veterinaryData = {},
      media = [],
    } = body;

    if (!species || typeof species !== 'string') {
      return NextResponse.json({ success: false, error: 'Animal species is required' }, { status: 400 });
    }

    const validStatus: AnimalStatus = isValidAnimalStatus(status) ? (status as AnimalStatus) : 'active';

    const supabase = getSupabaseServerClient();
    const { data: newAnimal, error } = await supabase
      .from('animals')
      .insert({
        name: name ? sanitizeText(name).slice(0, 80) : null,
        species: sanitizeText(species).toLowerCase().slice(0, 50),
        breed: breed ? sanitizeText(breed).slice(0, 80) : null,
        sex: sex ? sanitizeText(sex).slice(0, 20) : null,
        description: description ? sanitizeText(description).slice(0, 2000) : null,
        avatar_url: avatarUrl ? sanitizeUrl(avatarUrl) : null,
        city: city ? sanitizeText(city).slice(0, 100) : null,
        region: region ? sanitizeText(region).slice(0, 100) : null,
        country_code: countryCode ? sanitizeText(countryCode).toUpperCase().slice(0, 2) : null,
        created_by: user.id,
        status: validStatus,
        profile_data: typeof profileData === 'object' ? profileData : {},
        medical_data: typeof medicalData === 'object' ? medicalData : {},
        feeding_data: typeof feedingData === 'object' ? feedingData : {},
        sos_data: typeof sosData === 'object' ? sosData : {},
        rescue_data: typeof rescueData === 'object' ? rescueData : {},
        adoption_data: typeof adoptionData === 'object' ? adoptionData : {},
        veterinary_data: typeof veterinaryData === 'object' ? veterinaryData : {},
        media: Array.isArray(media) ? media : [],
        followers: [user.id],
      })
      .select()
      .single();

    if (error) {
      logger.error('Error inserting animal in Supabase', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, animal: newAnimal });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
