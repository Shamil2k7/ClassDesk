import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin credentials not configured');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Normalizes time string to HH:MM:00 for strict Postgres comparisons
function normalizeTime(t: string): string {
  if (!t) return '09:00:00';
  const parts = t.split(':');
  if (parts.length === 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
  }
  if (parts.length === 3) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
  }
  return t;
}

// Helper to check valid UUID
function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

// GET /api/timetable?institute_id=...&class_id=...&day=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const instituteId = searchParams.get('institute_id');
    const classId = searchParams.get('class_id');
    const day = searchParams.get('day');

    const adminClient = getAdminClient();
    let query = adminClient.from('timetable').select('*');

    if (instituteId) {
      query = query.eq('institute_id', instituteId);
    }
    if (classId) {
      query = query.eq('class_id', classId);
    }
    if (day) {
      query = query.eq('day_of_week', parseInt(day, 10));
    }

    const { data, error } = await query.order('start_time', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, timetable: data || [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch timetable' },
      { status: 500 }
    );
  }
}

// POST /api/timetable
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      institute_id,
      class_id,
      subject_id,
      subject_name,
      teacher_id,
      day_of_week = 1,
      start_time,
      end_time,
      room_number = 'Room 101',
    } = body;

    if (!institute_id || !class_id) {
      return NextResponse.json(
        { error: 'institute_id and class_id are required' },
        { status: 400 }
      );
    }

    const normStart = normalizeTime(start_time || '09:00');
    const normEnd = normalizeTime(end_time || '09:45');

    // Constraint: end_time > start_time
    if (normEnd <= normStart) {
      return NextResponse.json(
        { error: 'End time must be later than start time' },
        { status: 400 }
      );
    }

    const adminClient = getAdminClient();

    // 1. Resolve or Fallback Teacher ID
    let finalTeacherId = teacher_id;
    if (finalTeacherId && isValidUUID(finalTeacherId)) {
      // Check existence
      const { data: userRow } = await adminClient
        .from('users')
        .select('id')
        .eq('id', finalTeacherId)
        .single();
      if (!userRow) finalTeacherId = null;
    } else {
      finalTeacherId = null;
    }

    if (!finalTeacherId) {
      // Find first teacher in this institute
      const { data: teachRow } = await adminClient
        .from('users')
        .select('id')
        .eq('institute_id', institute_id)
        .eq('role', 'teacher')
        .limit(1)
        .single();

      if (teachRow) {
        finalTeacherId = teachRow.id;
      } else {
        // Fallback to institute admin
        const { data: adminRow } = await adminClient
          .from('users')
          .select('id')
          .eq('institute_id', institute_id)
          .limit(1)
          .single();

        if (adminRow) {
          finalTeacherId = adminRow.id;
        } else {
          return NextResponse.json(
            { error: 'No teacher or staff member found for this institute to assign' },
            { status: 400 }
          );
        }
      }
    }

    // 2. Resolve or Create Subject ID
    let finalSubjectId = subject_id;
    let needNewSubject = false;

    if (!finalSubjectId || !isValidUUID(finalSubjectId) || finalSubjectId === 'sub-default') {
      needNewSubject = true;
    } else {
      // Check if subject exists
      const { data: subRow } = await adminClient
        .from('subjects')
        .select('id')
        .eq('id', finalSubjectId)
        .single();
      if (!subRow) needNewSubject = true;
    }

    if (needNewSubject) {
      const targetName = subject_name?.trim() || 'General Academic Class';
      // Check if already exists for this class
      const { data: existingSub } = await adminClient
        .from('subjects')
        .select('id')
        .eq('class_id', class_id)
        .ilike('name', targetName)
        .single();

      if (existingSub) {
        finalSubjectId = existingSub.id;
      } else {
        const { data: newSub, error: createSubErr } = await adminClient
          .from('subjects')
          .insert([
            {
              institute_id,
              class_id,
              name: targetName,
              code: `${targetName.substring(0, 4).toUpperCase()}-101`,
              teacher_id: finalTeacherId,
            },
          ])
          .select('id')
          .single();

        if (createSubErr || !newSub) {
          return NextResponse.json(
            { error: createSubErr?.message || 'Failed to auto-provision subject for timetable' },
            { status: 500 }
          );
        }
        finalSubjectId = newSub.id;
      }
    }

    // 3. Insert Timetable Entry
    const { data: slot, error: insertError } = await adminClient
      .from('timetable')
      .insert([
        {
          institute_id,
          class_id,
          subject_id: finalSubjectId,
          teacher_id: finalTeacherId,
          day_of_week: Number(day_of_week),
          start_time: normStart,
          end_time: normEnd,
          room_number: room_number?.trim() || 'Room 101',
        },
      ])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, slot });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create timetable period' },
      { status: 500 }
    );
  }
}

// PATCH /api/timetable
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      subject_id,
      teacher_id,
      day_of_week,
      start_time,
      end_time,
      room_number,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Period ID is required' }, { status: 400 });
    }

    const updates: Record<string, any> = {};

    if (subject_id && isValidUUID(subject_id)) {
      updates.subject_id = subject_id;
    }
    if (teacher_id && isValidUUID(teacher_id)) {
      updates.teacher_id = teacher_id;
    }
    if (day_of_week !== undefined) {
      updates.day_of_week = Number(day_of_week);
    }
    if (room_number !== undefined) {
      updates.room_number = room_number.trim();
    }

    if (start_time && end_time) {
      const normStart = normalizeTime(start_time);
      const normEnd = normalizeTime(end_time);
      if (normEnd <= normStart) {
        return NextResponse.json(
          { error: 'End time must be later than start time' },
          { status: 400 }
        );
      }
      updates.start_time = normStart;
      updates.end_time = normEnd;
    } else if (start_time) {
      updates.start_time = normalizeTime(start_time);
    } else if (end_time) {
      updates.end_time = normalizeTime(end_time);
    }

    const adminClient = getAdminClient();
    const { data, error } = await adminClient
      .from('timetable')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, slot: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update timetable period' },
      { status: 500 }
    );
  }
}

// DELETE /api/timetable?id=...
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body?.id;
    }

    if (!id) {
      return NextResponse.json({ error: 'Period ID is required' }, { status: 400 });
    }

    const adminClient = getAdminClient();
    const { error } = await adminClient.from('timetable').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Timetable period deleted successfully' });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete timetable period' },
      { status: 500 }
    );
  }
}
