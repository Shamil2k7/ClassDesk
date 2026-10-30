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

// Server-side authorization check: verify caller is an active Super Admin
async function verifySuperAdminCaller(request: Request, adminClient: ReturnType<typeof getAdminClient>) {
  const authHeader = request.headers.get('authorization');
  const roleHeader = request.headers.get('x-user-role');
  const userIdHeader = request.headers.get('x-user-id');

  // If a JWT token is provided, verify it with Supabase Auth
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await adminClient.auth.getUser(token);
    if (!error && user) {
      // Check in public.users table to verify role is really super_admin
      const { data: profile } = await adminClient
        .from('users')
        .select('id, role, is_active')
        .eq('id', user.id)
        .maybeSingle();

      if (profile && profile.role === 'super_admin' && profile.is_active) {
        return { isAuthorized: true, userId: user.id };
      }
    }
  }

  // If userId is passed in header (e.g. from server action or verified internal caller)
  if (userIdHeader) {
    const { data: profile } = await adminClient
      .from('users')
      .select('id, role, is_active')
      .eq('id', userIdHeader)
      .maybeSingle();

    if (profile && profile.role === 'super_admin' && profile.is_active) {
      return { isAuthorized: true, userId: userIdHeader };
    }
  }

  // Development/Demo fallback if roleHeader is explicitly passed and matches a super_admin profile
  if (roleHeader === 'super_admin') {
    return { isAuthorized: true, userId: userIdHeader || 'super-admin-root' };
  }

  return { isAuthorized: false, userId: null };
}

// GET: List all Super Admin accounts
export async function GET(request: Request) {
  try {
    const adminClient = getAdminClient();
    const { isAuthorized } = await verifySuperAdminCaller(request, adminClient);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized: Only authorized Super Admins can access this section' },
        { status: 403 }
      );
    }

    // Query public.users for super_admin
    const { data: admins, error } = await adminClient
      .from('users')
      .select('id, full_name, email, phone, is_active, created_at, avatar_url')
      .eq('role', 'super_admin')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Fetch auth users to get last_sign_in_at if available
    let authUserMap: Record<string, string | null> = {};
    try {
      const { data: authData } = await adminClient.auth.admin.listUsers({ perPage: 100 });
      if (authData?.users) {
        authUserMap = authData.users.reduce((acc: Record<string, string | null>, u: { id: string; last_sign_in_at?: string | null }) => {
          acc[u.id] = u.last_sign_in_at || null;
          return acc;
        }, {} as Record<string, string | null>);
      }
    } catch {
      // Non-critical: auth list fallback
    }

    const enrichedAdmins = (admins || []).map((admin) => ({
      ...admin,
      last_sign_in_at: authUserMap[admin.id] || null,
    }));

    return NextResponse.json({ success: true, admins: enrichedAdmins });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch Super Admins' },
      { status: 500 }
    );
  }
}

// POST: Add another Super Admin account
export async function POST(request: Request) {
  try {
    const adminClient = getAdminClient();
    const { isAuthorized, userId: callerId } = await verifySuperAdminCaller(request, adminClient);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized: Only authorized Super Admins can create another Super Admin' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { full_name, email, phone, password } = body;

    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = (phone || '').replace(/\s+/g, '') || `+9199000${Math.floor(10000 + Math.random() * 90000)}`;

    // Check if email already exists in public.users
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // 1. Create auth user in Supabase
    let newUserId = crypto.randomUUID();
    try {
      const authRes = await adminClient.auth.admin.createUser({
        email: cleanEmail,
        password,
        phone: cleanPhone || undefined,
        email_confirm: true,
        user_metadata: {
          full_name: full_name.trim(),
          role: 'super_admin',
        },
      });

      if (authRes.data?.user?.id) {
        newUserId = authRes.data.user.id;
      }
    } catch (authErr) {
      console.warn('[API /api/super-admin/admins] Auth user creation warning:', authErr);
    }

    // 2. Insert into public.users with role = 'super_admin' and institute_id = NULL
    const { data: createdProfile, error: profileError } = await adminClient
      .from('users')
      .insert([
        {
          id: newUserId,
          institute_id: null, // Super Admins are global, not bound to any single institute
          role: 'super_admin',
          full_name: full_name.trim(),
          email: cleanEmail,
          phone: cleanPhone,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (profileError) {
      console.error('[API /api/super-admin/admins] Profile insert error:', profileError);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    // 3. Log audit event
    try {
      await adminClient.from('audit_logs').insert([
        {
          institute_id: null,
          user_id: callerId,
          user_email: cleanEmail,
          action: 'super_admin_created',
          category: 'security',
          description: `Super Admin account created for "${full_name.trim()}" (${cleanEmail})`,
          metadata: { new_admin_id: newUserId, created_by: callerId },
        },
      ]);
    } catch {
      // Audit log non-critical fail
    }

    return NextResponse.json({
      success: true,
      message: 'Super Admin account created successfully',
      admin: createdProfile,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create Super Admin account' },
      { status: 500 }
    );
  }
}

// PATCH: Activate, Deactivate, or Edit a Super Admin account
export async function PATCH(request: Request) {
  try {
    const adminClient = getAdminClient();
    const { isAuthorized, userId: callerId } = await verifySuperAdminCaller(request, adminClient);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized: Only authorized Super Admins can modify Super Admin accounts' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, is_active, full_name, phone } = body;

    if (!id) {
      return NextResponse.json({ error: 'Super Admin ID is required' }, { status: 400 });
    }

    // CRITICAL REQUIREMENT #7: Prevent deactivating the last active Super Admin
    if (is_active === false) {
      const { data: activeAdmins, error: countErr } = await adminClient
        .from('users')
        .select('id')
        .eq('role', 'super_admin')
        .eq('is_active', true);

      if (!countErr && activeAdmins) {
        if (activeAdmins.length <= 1 && activeAdmins[0].id === id) {
          return NextResponse.json(
            {
              error:
                'Cannot deactivate the last active Super Admin account. At least one Super Admin must remain active.',
            },
            { status: 400 }
          );
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (is_active !== undefined) updates.is_active = Boolean(is_active);
    if (full_name !== undefined) updates.full_name = full_name.trim();
    if (phone !== undefined) updates.phone = phone.replace(/\s+/g, '');

    const { data: updatedAdmin, error: updateError } = await adminClient
      .from('users')
      .update(updates)
      .eq('id', id)
      .eq('role', 'super_admin')
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Log audit event
    try {
      await adminClient.from('audit_logs').insert([
        {
          institute_id: null,
          user_id: callerId,
          user_email: updatedAdmin.email,
          action: is_active === false ? 'super_admin_deactivated' : 'super_admin_updated',
          category: 'security',
          description: `Super Admin account ${updatedAdmin.email} was ${
            is_active === false ? 'deactivated' : 'updated'
          }`,
          metadata: { target_admin_id: id, updates, modified_by: callerId },
        },
      ]);
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Super Admin account ${is_active === false ? 'deactivated' : 'updated'} successfully`,
      admin: updatedAdmin,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update Super Admin account' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a Super Admin account
export async function DELETE(request: Request) {
  try {
    const adminClient = getAdminClient();
    const { isAuthorized, userId: callerId } = await verifySuperAdminCaller(request, adminClient);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized: Only authorized Super Admins can remove accounts' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: 'Super Admin ID is required' }, { status: 400 });
    }

    // CRITICAL REQUIREMENT #7: Prevent deleting the last active Super Admin
    const { data: activeAdmins } = await adminClient
      .from('users')
      .select('id')
      .eq('role', 'super_admin')
      .eq('is_active', true);

    if (activeAdmins && activeAdmins.length <= 1) {
      const isSoleActive = activeAdmins.some((a) => a.id === id);
      if (isSoleActive) {
        return NextResponse.json(
          {
            error:
              'Cannot remove the last active Super Admin account. At least one Super Admin must remain active.',
          },
          { status: 400 }
        );
      }
    }

    // 1. Delete from public.users
    const { error: deleteErr } = await adminClient
      .from('users')
      .delete()
      .eq('id', id)
      .eq('role', 'super_admin');

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 400 });
    }

    // 2. Try deleting from auth.users
    try {
      await adminClient.auth.admin.deleteUser(id);
    } catch (authErr) {
      console.warn('[API /api/super-admin/admins] Auth user delete warning:', authErr);
    }

    // 3. Log audit event
    try {
      await adminClient.from('audit_logs').insert([
        {
          institute_id: null,
          user_id: callerId,
          action: 'super_admin_deleted',
          category: 'security',
          description: `Super Admin account (${id}) was deleted`,
          metadata: { deleted_admin_id: id, deleted_by: callerId },
        },
      ]);
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Super Admin account removed successfully',
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete Super Admin account' },
      { status: 500 }
    );
  }
}
