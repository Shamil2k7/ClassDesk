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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone } = body;

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length < 10) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    const formattedPhone = `+91${cleanPhone}`;
    const adminClient = getAdminClient();

    // 1. Search in public.users for registered staff / teachers / admins / users
    const { data: dbUsers, error: userError } = await adminClient
      .from('users')
      .select('*')
      .or(`phone.eq.${formattedPhone},phone.eq.${cleanPhone},phone.ilike.%${cleanPhone}`);

    if (userError) {
      console.warn('[API phone-login] user query notice:', userError.message);
    }

    if (dbUsers && dbUsers.length > 0) {
      // Prioritize teacher, institute_admin, super_admin, or first match
      const matchedUser =
        dbUsers.find((u) => u.role === 'teacher') ||
        dbUsers.find((u) => u.role === 'institute_admin') ||
        dbUsers.find((u) => u.role === 'super_admin') ||
        dbUsers[0];

      let institute = null;
      if (matchedUser.institute_id) {
        const { data: inst } = await adminClient
          .from('institutes')
          .select('*')
          .eq('id', matchedUser.institute_id)
          .maybeSingle();
        institute = inst;
      }

      let linkedChildren: any[] = [];
      if (matchedUser.role === 'parent') {
        const { data: students } = await adminClient
          .from('students')
          .select('*')
          .or(`parent_phone.eq.${formattedPhone},parent_phone.ilike.%${cleanPhone}`);
        linkedChildren = students || [];
      }

      return NextResponse.json({
        success: true,
        user: matchedUser,
        institute,
        linkedChildren,
      });
    }

    // 2. Check if phone belongs to a parent in students table
    const { data: students } = await adminClient
      .from('students')
      .select('*')
      .or(`parent_phone.eq.${formattedPhone},parent_phone.ilike.%${cleanPhone}`);

    if (students && students.length > 0) {
      const parentUser = {
        id: `usr-parent-${cleanPhone}`,
        institute_id: students[0].institute_id,
        role: 'parent',
        full_name: students[0].full_name || students[0].parent_name || 'Student Parent',
        phone: formattedPhone,
        email: students[0].parent_email || null,
        avatar_url: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let institute = null;
      if (students[0].institute_id) {
        const { data: inst } = await adminClient
          .from('institutes')
          .select('*')
          .eq('id', students[0].institute_id)
          .maybeSingle();
        institute = inst;
      }

      return NextResponse.json({
        success: true,
        user: parentUser,
        institute,
        linkedChildren: students,
      });
    }

    // 3. User not found in database (caller can fallback to local storage or demo presets)
    return NextResponse.json({
      success: false,
      not_found: true,
      message: 'No registered user found with this phone number',
    });
  } catch (err) {
    console.error('[API phone-login] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown server error' },
      { status: 500 }
    );
  }
}
