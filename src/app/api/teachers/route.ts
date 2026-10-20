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

// GET /api/teachers?institute_id=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const instituteId = searchParams.get('institute_id');

    const adminClient = getAdminClient();
    let query = adminClient.from('users').select('*').eq('role', 'teacher');
    if (instituteId) {
      query = query.eq('institute_id', instituteId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, teachers: data || [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/teachers - Create new teacher
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { full_name, phone, email, institute_id } = body;

    if (!full_name) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }

    const adminClient = getAdminClient();
    const instId = institute_id || '00000000-0000-0000-0000-000000000001';

    const cleanDigits = phone ? phone.replace(/\D/g, '').slice(-10) : '';
    const formattedPhone = cleanDigits.length === 10 ? `+91${cleanDigits}` : (phone || null);
    const teacherEmail = email || (cleanDigits ? `teacher_${cleanDigits}@classdesk.local` : `teacher_${Date.now()}@classdesk.local`);

    // 1. Attempt to create in auth.users
    let teacherId: string | null = null;
    try {
      const authRes = await adminClient.auth.admin.createUser({
        email: teacherEmail,
        phone: formattedPhone || undefined,
        password: 'teacher_' + Math.random().toString(36).slice(-8),
        email_confirm: true,
        user_metadata: { full_name, role: 'teacher', institute_id: instId }
      });
      teacherId = authRes.data?.user?.id || null;
    } catch (authErr) {
      console.warn('[API teachers] auth.admin.createUser warning:', authErr);
    }

    // Fallback ID if auth user wasn't created
    if (!teacherId) {
      teacherId = crypto.randomUUID();
    }

    // 2. Upsert into public.users
    const { data: profile, error: profileErr } = await adminClient
      .from('users')
      .upsert({
        id: teacherId,
        institute_id: instId,
        role: 'teacher',
        full_name,
        phone: formattedPhone,
        email: email || null,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileErr) {
      console.warn('[API teachers] public.users upsert warning:', profileErr.message);
    }

    return NextResponse.json({
      success: true,
      teacher: profile || {
        id: teacherId,
        institute_id: instId,
        role: 'teacher',
        full_name,
        phone: formattedPhone,
        email,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PATCH /api/teachers - Update teacher profile
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, full_name, phone, email } = body;

    if (!id) {
      return NextResponse.json({ error: 'Teacher ID is required' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString()
    };
    if (full_name !== undefined) updates.full_name = full_name;
    if (phone !== undefined) {
      const cleanDigits = phone ? phone.replace(/\D/g, '').slice(-10) : '';
      updates.phone = cleanDigits.length === 10 ? `+91${cleanDigits}` : (phone || null);
    }
    if (email !== undefined) updates.email = email || null;

    const { data, error } = await adminClient
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, teacher: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/teachers?id=... - Delete teacher
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Teacher ID is required' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    // 1. Delete from public.users
    const { error: delError } = await adminClient
      .from('users')
      .delete()
      .eq('id', id);

    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }

    // 2. Try deleting from auth.users (ignore error if not present in auth)
    try {
      await adminClient.auth.admin.deleteUser(id);
    } catch (authDelErr) {
      console.warn('[API teachers] auth.deleteUser notice:', authDelErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
