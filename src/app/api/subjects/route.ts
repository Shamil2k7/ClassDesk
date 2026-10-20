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

// GET /api/subjects?institute_id=...&class_id=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const instituteId = searchParams.get('institute_id');
    const classId = searchParams.get('class_id');

    const adminClient = getAdminClient();
    let query = adminClient.from('subjects').select('*');

    if (instituteId) {
      query = query.eq('institute_id', instituteId);
    }
    if (classId) {
      query = query.eq('class_id', classId);
    }

    const { data, error } = await query.order('name');
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    let subjects = data || [];

    // If a classId was specified and it has 0 subjects, auto-seed starter subjects
    if (classId && instituteId && subjects.length === 0) {
      // Find class details to give nice starter names
      const { data: clsData } = await adminClient
        .from('classes')
        .select('name')
        .eq('id', classId)
        .single();

      const className = clsData?.name || 'Class';
      const starters = [
        { name: `${className} - Theory`, code: 'TH-101' },
        { name: `${className} - Practical / Lab`, code: 'LAB-102' },
        { name: 'Core Foundations', code: 'CORE-103' },
        { name: 'Project & Assessment', code: 'PRJ-104' },
      ];

      const toInsert = starters.map((s) => ({
        institute_id: instituteId,
        class_id: classId,
        name: s.name,
        code: s.code,
      }));

      const { data: seeded, error: seedError } = await adminClient
        .from('subjects')
        .insert(toInsert)
        .select();

      if (!seedError && seeded) {
        subjects = seeded;
      }
    }

    return NextResponse.json({ success: true, subjects });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch subjects' },
      { status: 500 }
    );
  }
}

// POST /api/subjects
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { institute_id, class_id, name, code, teacher_id } = body;

    if (!institute_id || !class_id || !name?.trim()) {
      return NextResponse.json(
        { error: 'institute_id, class_id, and name are required' },
        { status: 400 }
      );
    }

    const adminClient = getAdminClient();

    // Check if subject already exists for this class
    const { data: existing } = await adminClient
      .from('subjects')
      .select('*')
      .eq('class_id', class_id)
      .ilike('name', name.trim())
      .single();

    if (existing) {
      return NextResponse.json({ success: true, subject: existing });
    }

    const { data, error } = await adminClient
      .from('subjects')
      .insert([
        {
          institute_id,
          class_id,
          name: name.trim(),
          code: code?.trim() || `${name.trim().substring(0, 4).toUpperCase()}-101`,
          teacher_id: teacher_id || null,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, subject: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create subject' },
      { status: 500 }
    );
  }
}

// DELETE /api/subjects?id=...
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Subject ID is required' }, { status: 400 });
    }

    const adminClient = getAdminClient();
    const { error } = await adminClient.from('subjects').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Subject deleted successfully' });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete subject' },
      { status: 500 }
    );
  }
}
