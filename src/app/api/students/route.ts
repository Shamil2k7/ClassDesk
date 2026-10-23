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

// GET /api/students?institute_id=...&class_id=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const instituteId = searchParams.get('institute_id');
    const classId = searchParams.get('class_id');

    const adminClient = getAdminClient();
    let query = adminClient.from('students').select('*');

    if (instituteId) {
      query = query.eq('institute_id', instituteId);
    }
    if (classId && classId !== 'all') {
      query = query.eq('class_id', classId);
    }

    const { data, error } = await query.order('roll_number', { ascending: true });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, students: data || [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch students' },
      { status: 500 }
    );
  }
}

// POST /api/students - Create new student
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      institute_id,
      class_id,
      admission_number,
      roll_number,
      full_name,
      gender,
      dob,
      parent_name,
      parent_phone,
      parent_email,
      address,
      photo_url,
      is_active = true,
    } = body;

    if (!full_name?.trim()) {
      return NextResponse.json({ error: 'Student full name is required' }, { status: 400 });
    }
    if (!institute_id) {
      return NextResponse.json({ error: 'institute_id is required' }, { status: 400 });
    }

    const adminClient = getAdminClient();
    const studentId = id || crypto.randomUUID();

    const cleanPhone = parent_phone ? parent_phone.replace(/\D/g, '').slice(-10) : '';
    const formattedPhone = cleanPhone.length === 10 ? `+91${cleanPhone}` : (parent_phone || null);

    const studentRecord = {
      id: studentId,
      institute_id,
      class_id: class_id || null,
      admission_number: admission_number ? String(admission_number).trim() : null,
      roll_number: roll_number ? String(roll_number).trim() : null,
      full_name: full_name.trim(),
      gender: gender || null,
      dob: dob || null,
      parent_name: parent_name ? parent_name.trim() : 'Parent',
      parent_phone: formattedPhone,
      parent_email: parent_email || null,
      address: address || null,
      photo_url: photo_url || null,
      is_active: is_active ?? true,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await adminClient
      .from('students')
      .upsert(studentRecord)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, student: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create student' },
      { status: 500 }
    );
  }
}

// PATCH /api/students - Update student
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      full_name,
      class_id,
      admission_number,
      roll_number,
      parent_name,
      parent_phone,
      parent_email,
      address,
      gender,
      dob,
      photo_url,
      is_active,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (full_name !== undefined) updates.full_name = full_name.trim();
    if (class_id !== undefined) updates.class_id = class_id;
    if (admission_number !== undefined) updates.admission_number = admission_number ? String(admission_number).trim() : null;
    if (roll_number !== undefined) updates.roll_number = roll_number ? String(roll_number).trim() : null;
    if (parent_name !== undefined) updates.parent_name = parent_name.trim();
    if (parent_phone !== undefined) {
      const cleanDigits = parent_phone ? String(parent_phone).replace(/\D/g, '').slice(-10) : '';
      updates.parent_phone = cleanDigits.length === 10 ? `+91${cleanDigits}` : (parent_phone || null);
    }
    if (parent_email !== undefined) updates.parent_email = parent_email || null;
    if (address !== undefined) updates.address = address || null;
    if (gender !== undefined) updates.gender = gender || null;
    if (dob !== undefined) updates.dob = dob || null;
    if (photo_url !== undefined) updates.photo_url = photo_url || null;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await adminClient
      .from('students')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, student: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update student' },
      { status: 500 }
    );
  }
}

// DELETE /api/students?id=... - Delete student
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    // 1. Delete associated records if cascading is not set on table
    try {
      await adminClient.from('attendance').delete().eq('student_id', id);
      await adminClient.from('student_fee_dues').delete().eq('student_id', id);
      await adminClient.from('marks').delete().eq('student_id', id);
    } catch {
      // ignore cascade error
    }

    // 2. Delete student
    const { error } = await adminClient
      .from('students')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete student' },
      { status: 500 }
    );
  }
}
