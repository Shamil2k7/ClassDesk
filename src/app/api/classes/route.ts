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

// GET /api/classes?institute_id=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const instituteId = searchParams.get('institute_id');

    const adminClient = getAdminClient();
    let query = adminClient.from('classes').select('*');

    if (instituteId) {
      query = query.eq('institute_id', instituteId);
    }

    const { data, error } = await query.order('name');
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, classes: data || [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch classes' },
      { status: 500 }
    );
  }
}

// POST /api/classes
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { institute_id, name, section = 'A', academic_year = '2026-2027' } = body;

    if (!institute_id || !name?.trim()) {
      return NextResponse.json(
        { error: 'institute_id and class name are required' },
        { status: 400 }
      );
    }

    const adminClient = getAdminClient();
    const { data, error } = await adminClient
      .from('classes')
      .insert([
        {
          institute_id,
          name: name.trim(),
          section: section.trim(),
          academic_year,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, class: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create class' },
      { status: 500 }
    );
  }
}

// PATCH /api/classes
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, name, section, academic_year } = body;

    if (!id) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
    }

    const adminClient = getAdminClient();
    const { data, error } = await adminClient
      .from('classes')
      .update({
        ...(name && { name: name.trim() }),
        ...(section && { section: section.trim() }),
        ...(academic_year && { academic_year }),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, class: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update class' },
      { status: 500 }
    );
  }
}

// DELETE /api/classes?id=...
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
    }

    const adminClient = getAdminClient();
    const { error } = await adminClient.from('classes').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Class deleted successfully' });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete class' },
      { status: 500 }
    );
  }
}
