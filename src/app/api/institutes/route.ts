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

// GET: List all institutes
export async function GET() {
  try {
    const adminClient = getAdminClient();
    const { data, error } = await adminClient
      .from('institutes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, institutes: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch institutes' },
      { status: 500 }
    );
  }
}

// POST: Onboard new School / Tuition Center
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      logo_url,
      institute_type = 'school',
      phone,
      email,
      address = 'Main Campus Road',
      city = 'Kochi',
      state = 'Kerala',
      pincode = '682001',
      subscription_plan = 'standard',
      receipt_prefix,
      admin_name,
      admin_email,
      admin_phone,
      admin_password,
    } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Institute name is required' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    // 1. Generate unique URL slug
    let baseSlug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!baseSlug) {
      baseSlug = `institute-${Date.now()}`;
    }

    let slug = baseSlug;
    let counter = 1;
    // Check if slug exists
    while (true) {
      const { data: existing } = await adminClient
        .from('institutes')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (!existing) break;
      counter += 1;
      slug = `${baseSlug}-${counter}`;
    }

    const cleanPhone = (phone || '+919876543210').replace(/\s+/g, '');
    const cleanPrefix = (
      receipt_prefix || name.trim().replace(/[^a-zA-Z]/g, '').slice(0, 4) || 'REC'
    ).toUpperCase();

    const insertPayload = {
      name: name.trim(),
      slug,
      logo_url: logo_url || null,
      phone: cleanPhone,
      email: email ? email.trim() : `contact@${slug}.edu.in`,
      address: address ? address.trim() : 'Main Campus Road',
      city: city ? city.trim() : 'Kochi',
      state: state || 'Kerala',
      pincode: pincode || '682001',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      subscription_plan: subscription_plan || 'standard',
      subscription_status: 'active',
      settings: {
        receipt_prefix: cleanPrefix,
        late_fee_enabled: false,
        late_fee_per_day: 10,
        grade_system: 'cbse',
        institute_type,
      },
    };

    // 2. Insert into institutes table
    const { data: createdInstitute, error: insertError } = await adminClient
      .from('institutes')
      .insert([insertPayload])
      .select()
      .single();

    if (insertError) {
      console.error('[API /api/institutes] Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    // 3. Create initial Institute Administrator profile if requested or by default
    const adminFullName = admin_name ? admin_name.trim() : `${name.trim()} Administrator`;
    const adminContactEmail = admin_email
      ? admin_email.trim().toLowerCase()
      : `admin@${slug}.classdesk.app`;
    const adminContactPhone = admin_phone ? admin_phone.replace(/\s+/g, '') : cleanPhone;

    let adminUserId = crypto.randomUUID();
    const finalAdminPassword = admin_password && admin_password.trim() ? admin_password.trim() : 'admin123';

    try {
      const authUserRes = await adminClient.auth.admin.createUser({
        email: adminContactEmail,
        phone: adminContactPhone || undefined,
        password: finalAdminPassword,
        email_confirm: true,
        user_metadata: {
          full_name: adminFullName,
          role: 'institute_admin',
          institute_id: createdInstitute.id,
        },
      });

      if (authUserRes.data?.user?.id) {
        adminUserId = authUserRes.data.user.id;
      }
    } catch (authErr) {
      console.warn('[API /api/institutes] Auth user creation warning:', authErr);
    }

    // Insert or upsert in public.users
    try {
      await adminClient.from('users').upsert({
        id: adminUserId,
        institute_id: createdInstitute.id,
        role: 'institute_admin',
        full_name: adminFullName,
        phone: adminContactPhone,
        email: adminContactEmail,
        is_active: true,
      });
    } catch (userErr) {
      console.warn('[API /api/institutes] Profile upsert warning:', userErr);
    }

    return NextResponse.json({
      success: true,
      institute: createdInstitute,
      admin: {
        id: adminUserId,
        full_name: adminFullName,
        email: adminContactEmail,
        phone: adminContactPhone,
        password: finalAdminPassword,
      },
    });
  } catch (err) {
    console.error('[API /api/institutes] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown server error' },
      { status: 500 }
    );
  }
}

// PATCH: Update institute (subscription plan, status, settings, details)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      subscription_plan,
      subscription_status,
      settings,
      name,
      logo_url,
      city,
      state,
      phone,
      email,
      address,
      pincode,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Institute ID is required' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (subscription_plan !== undefined) updates.subscription_plan = subscription_plan;
    if (subscription_status !== undefined) updates.subscription_status = subscription_status;
    if (name !== undefined) updates.name = name;
    if (logo_url !== undefined) updates.logo_url = logo_url;
    if (city !== undefined) updates.city = city;
    if (state !== undefined) updates.state = state;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (address !== undefined) updates.address = address;
    if (pincode !== undefined) updates.pincode = pincode;
    if (settings !== undefined) updates.settings = settings;

    const { data, error } = await adminClient
      .from('institutes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, institute: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update institute' },
      { status: 500 }
    );
  }
}

// DELETE: Delete an institute
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch {
        // query param was used
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'Institute ID is required' }, { status: 400 });
    }

    const adminClient = getAdminClient();
    const { error } = await adminClient.from('institutes').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Institute deleted successfully' });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete institute' },
      { status: 500 }
    );
  }
}
