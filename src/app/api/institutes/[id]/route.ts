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

// GET: Fetch comprehensive details, real metrics, and activity for a specific institute
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Institute ID is required' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    // 1. Fetch institute profile
    const { data: institute, error: instError } = await adminClient
      .from('institutes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (instError || !institute) {
      return NextResponse.json(
        { error: instError?.message || 'Institute not found' },
        { status: 404 }
      );
    }

    // 2. Fetch real counts and statistics in parallel
    const [
      studentsRes,
      teachersRes,
      adminsRes,
      classesRes,
      examsRes,
      attendanceRes,
      notesRes,
      onlineClassesRes,
      paymentsRes,
      duesRes,
      auditLogsRes,
    ] = await Promise.all([
      adminClient.from('students').select('id, full_name, roll_number, parent_phone, created_at', { count: 'exact' }).eq('institute_id', id).limit(10),
      adminClient.from('users').select('id, full_name, email, phone, created_at', { count: 'exact' }).eq('institute_id', id).eq('role', 'teacher'),
      adminClient.from('users').select('id, full_name, email, phone, created_at', { count: 'exact' }).eq('institute_id', id).eq('role', 'institute_admin'),
      adminClient.from('classes').select('id, name, section, academic_year, created_at').eq('institute_id', id).order('name'),
      adminClient.from('exams').select('id, name, start_date, is_published, created_at').eq('institute_id', id).order('created_at', { ascending: false }).limit(10),
      adminClient.from('attendance').select('id', { count: 'exact', head: true }).eq('institute_id', id),
      adminClient.from('notes').select('id', { count: 'exact', head: true }).eq('institute_id', id),
      adminClient.from('online_classes').select('id, title, date, start_time, status').eq('institute_id', id).order('date', { ascending: false }).limit(5),
      adminClient.from('fee_payments').select('id, amount, payment_method, payment_status, receipt_number, paid_at, created_at').eq('institute_id', id).order('created_at', { ascending: false }),
      adminClient.from('student_fee_dues').select('id, original_amount, paid_amount, status').eq('institute_id', id),
      adminClient.from('audit_logs').select('*').eq('institute_id', id).order('created_at', { ascending: false }).limit(20),
    ]);

    // Financial calculations from actual records
    const allPayments = paymentsRes.data || [];
    const successfulPayments = allPayments.filter((p) => p.payment_status === 'successful');
    const totalFeesCollected = successfulPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const onlinePayments = successfulPayments.filter((p) => p.payment_method === 'razorpay');
    const cashPayments = successfulPayments.filter((p) => p.payment_method === 'cash' || p.payment_method === 'upi_qr');

    const allDues = duesRes.data || [];
    const pendingDues = allDues.filter((d) => d.status !== 'paid');
    const totalPendingFees = pendingDues.reduce(
      (sum, d) => sum + (Number(d.original_amount || 0) - Number(d.paid_amount || 0)),
      0
    );

    // Compute unique parents count
    const studentsData = studentsRes.data || [];
    const uniqueParentPhones = new Set(
      studentsData.map((s) => s.parent_phone?.replace(/\D/g, '').slice(-10)).filter(Boolean)
    );
    const parentsCount = uniqueParentPhones.size || studentsData.length;

    // Synthesize chronological activity feed
    const activities: Array<{
      id: string;
      action: string;
      description: string;
      category: string;
      created_at: string;
    }> = [];

    // From audit logs
    if (auditLogsRes.data && auditLogsRes.data.length > 0) {
      for (const log of auditLogsRes.data) {
        activities.push({
          id: log.id,
          action: log.action,
          description: log.description,
          category: log.category,
          created_at: log.created_at,
        });
      }
    }

    // Registration event
    activities.push({
      id: `act-reg-${institute.id}`,
      action: 'institute_registered',
      description: `Institute "${institute.name}" was registered on the platform`,
      category: 'institute',
      created_at: institute.created_at,
    });

    // Recent student enrollments
    for (const st of studentsData.slice(0, 3)) {
      activities.push({
        id: `act-stu-${st.id}`,
        action: 'student_created',
        description: `Student "${st.full_name}" enrolled (Roll #${st.roll_number || 'N/A'})`,
        category: 'user',
        created_at: st.created_at,
      });
    }

    // Recent payments
    for (const pay of allPayments.slice(0, 3)) {
      activities.push({
        id: `act-pay-${pay.id}`,
        action: 'fee_paid',
        description: `Fee payment of ₹${Number(pay.amount).toLocaleString('en-IN')} received via ${pay.payment_method} (Receipt #${pay.receipt_number})`,
        category: 'payment',
        created_at: pay.paid_at || pay.created_at,
      });
    }

    // Sort combined activities descending by timestamp
    activities.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({
      success: true,
      institute: {
        ...institute,
        status: institute.status || institute.subscription_status || 'active',
        institute_type: institute.institute_type || institute.settings?.institute_type || 'school',
      },
      stats: {
        totalStudents: studentsRes.count ?? studentsData.length,
        totalTeachers: teachersRes.count ?? (teachersRes.data?.length || 0),
        totalParents: parentsCount,
        totalAdmins: adminsRes.count ?? (adminsRes.data?.length || 0),
        totalActiveUsers:
          (studentsRes.count ?? 0) + (teachersRes.count ?? 0) + (adminsRes.count ?? 0),
        totalClasses: classesRes.data?.length || 0,
        totalExams: examsRes.data?.length || 0,
        totalAttendanceRecords: attendanceRes.count ?? 0,
        totalNotes: notesRes.count ?? 0,
        totalOnlineClasses: onlineClassesRes.data?.length || 0,
        financials: {
          totalCollected: totalFeesCollected,
          totalPending: Math.max(0, totalPendingFees),
          onlineTransactionsCount: onlinePayments.length,
          onlineTransactionsAmount: onlinePayments.reduce((s, p) => s + Number(p.amount || 0), 0),
          cashTransactionsCount: cashPayments.length,
          cashTransactionsAmount: cashPayments.reduce((s, p) => s + Number(p.amount || 0), 0),
        },
      },
      classes: classesRes.data || [],
      teachers: teachersRes.data || [],
      recentStudents: studentsData,
      recentPayments: allPayments.slice(0, 10),
      onlineClasses: onlineClassesRes.data || [],
      activities: activities.slice(0, 25),
    });
  } catch (err) {
    console.error('[API /api/institutes/[id]] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch institute details' },
      { status: 500 }
    );
  }
}

// PATCH: Update institute details, status, branding, or settings
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Institute ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const adminClient = getAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    const allowedFields = [
      'name',
      'logo_url',
      'phone',
      'email',
      'address',
      'city',
      'state',
      'pincode',
      'status',
      'institute_type',
      'subscription_plan',
      'subscription_status',
      'settings',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // Sync status and subscription_status
    if (updates.status) {
      if (updates.status === 'suspended') updates.subscription_status = 'suspended';
      else if (updates.status === 'active') updates.subscription_status = 'active';
      else if (updates.status === 'inactive') updates.subscription_status = 'canceled';
    }

    const { data: updatedInst, error: updateError } = await adminClient
      .from('institutes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Log audit event if status changed
    if (body.status !== undefined) {
      try {
        await adminClient.from('audit_logs').insert([
          {
            institute_id: id,
            action: 'institute_status_changed',
            category: 'institute',
            description: `Institute status was changed to "${body.status}"`,
            metadata: { new_status: body.status, updates },
          },
        ]);
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: 'Institute updated successfully',
      institute: updatedInst,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update institute' },
      { status: 500 }
    );
  }
}
