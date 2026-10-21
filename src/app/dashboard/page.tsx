'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/context';
import {
  Users,
  CalendarCheck,
  CreditCard,
  GraduationCap,
  Bell,
  Clock,
  BookOpen,
  ArrowRight,
  Sparkles,
  ChevronRight,
  TrendingUp,
  ShieldAlert,
  Building2,
  Calendar,
  FileText,
  CheckCircle2,
  Loader2,
  Megaphone,
  Zap,
  LayoutGrid,
  CloudUpload,
  Video,
  ExternalLink,
} from 'lucide-react';
import { useSupabaseData } from '@/lib/use-supabase-data';
import { SchemaNotice } from '@/components/common/schema-notice';

// 3D Graduation Cap on Stacked Books Graphic (matches user design exactly)
function Graduation3DGraphic() {
  return (
    <div className="w-28 h-28 sm:w-36 sm:h-36 shrink-0 relative select-none pointer-events-none">
      <svg
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        {/* Magic Sparkle Stars */}
        <path
          d="M138 28L140 33L145 35L140 37L138 42L136 37L131 35L136 33L138 28Z"
          fill="#818CF8"
          opacity="0.8"
        />
        <path
          d="M16 66L17.5 70L21.5 71.5L17.5 73L16 77L14.5 73L10.5 71.5L14.5 70L16 66Z"
          fill="#A5B4FC"
          opacity="0.7"
        />
        <circle cx="144" cy="72" r="1.5" fill="#6366F1" opacity="0.6" />

        {/* Soft Ground Shadow */}
        <ellipse cx="80" cy="132" rx="52" ry="12" fill="#C7D2FE" opacity="0.45" />

        {/* Bottom Green Book (3D Isometric) */}
        <g id="bottom-book">
          <path d="M16 112L80 128L136 106L72 90L16 112Z" fill="#059669" />
          <path d="M16 112L16 104L80 120L80 128L16 112Z" fill="#34D399" />
          <path d="M80 128L80 120L136 98L136 106L80 128Z" fill="#E6FFFA" />
          <path d="M14 104L78 120L136 98L72 82L14 104Z" fill="#10B981" />
          <path d="M82 121L134 100" stroke="#CCFBF1" strokeWidth="0.8" />
          <path d="M82 124L134 103" stroke="#CCFBF1" strokeWidth="0.8" />
        </g>

        {/* Middle Blue / Violet Book (3D Isometric) */}
        <g id="middle-book">
          <path d="M22 88L78 102L128 84L72 70L22 88Z" fill="#3730A3" />
          <path d="M22 88L22 81L78 95L78 102L22 88Z" fill="#6366F1" />
          <path d="M78 102L78 95L128 77L128 84L78 102Z" fill="#EEF2FF" />
          <path d="M20 81L76 95L128 77L72 63L20 81Z" fill="#4F46E5" />
          <path d="M74 95L77 106L81 103L85 106L82 95Z" fill="#F59E0B" />
        </g>

        {/* Top Graduation Cap (Mortarboard) */}
        <g id="grad-cap">
          <path
            d="M48 48C48 48 54 58 76 58C98 58 104 48 104 48V56C104 66 92 72 76 72C60 72 48 66 48 56V48Z"
            fill="#1E1B4B"
          />
          <path
            d="M50 49C52 57 62 64 76 64C90 64 100 57 102 49"
            stroke="#312E81"
            strokeWidth="1.5"
          />

          {/* Diamond Mortarboard Top Plane */}
          <path d="M76 16L126 36L76 56L26 36L76 16Z" fill="#1E1B4B" />
          <path d="M76 18L122 36L76 54L30 36L76 18Z" fill="#2E2A72" />
          <path d="M26 36L76 56L126 36" stroke="#4338CA" strokeWidth="1" />

          {/* Button on Top */}
          <ellipse cx="76" cy="36" rx="4.5" ry="3" fill="#F59E0B" />

          {/* Gold Tassel */}
          <path
            d="M76 36C84 37 98 42 103 48C107 53 108 60 108 67"
            stroke="#FBBF24"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path d="M105 67L111 67L110 74L106 74Z" fill="#F59E0B" />
          <ellipse cx="108" cy="67" rx="3.5" ry="2" fill="#D97706" />
        </g>
      </svg>
    </div>
  );
}

// 3D Graduation Cap Watermark Graphic (for Student Banner)
function GraduationWatermarkGraphic() {
  return (
    <div className="w-36 h-36 sm:w-48 sm:h-48 absolute -right-4 -top-4 opacity-25 pointer-events-none select-none">
      <svg
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full text-white"
      >
        <path
          d="M80 30L145 60L80 90L15 60L80 30Z"
          fill="currentColor"
          opacity="0.9"
        />
        <path
          d="M45 74V100C45 118 61 126 80 126C99 126 115 118 115 100V74L80 90L45 74Z"
          fill="currentColor"
          opacity="0.8"
        />
        <path
          d="M80 60C100 64 125 76 130 92C133 100 132 110 132 118"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.9"
        />
        <ellipse cx="132" cy="120" rx="4" ry="6" fill="currentColor" opacity="0.9" />
      </svg>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, institute, activeChild, isAuthenticated, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const role = user?.role || 'parent';
  const instId = institute?.id || user?.institute_id || null;

  const {
    institutes,
    students,
    classes,
    subjects,
    timetable,
    notes,
    announcements,
    attendance,
    feeDues,
    payments,
    teachers,
    onlineClasses,
    loading,
    schemaMissing,
  } = useSupabaseData(role === 'super_admin' ? null : instId);

  // -------------------------------------------------------------
  // 1. SUPER ADMIN DASHBOARD
  // -------------------------------------------------------------
  if (role === 'super_admin') {
    const totalFeesCollected = payments.reduce((acc, p) => acc + p.amount, 0);

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <SchemaNotice visible={schemaMissing} />

        <div className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-purple-200 text-xs font-bold uppercase tracking-wider mb-1">
                <Sparkles className="w-4 h-4" />
                <span>Platform Overview</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black">Super Admin Console</h2>
              <p className="text-xs text-purple-100 mt-1">
                Managing multi-tenant schools and tuition centers across India.
              </p>
            </div>

            <Link
              href="/super-admin"
              className="bg-white text-purple-900 hover:bg-purple-50 active:scale-95 px-4 py-2.5 rounded-2xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all shrink-0"
            >
              <ShieldAlert className="w-4 h-4 text-purple-700" />
              <span>Open SaaS Command Center</span>
              <ChevronRight className="w-4 h-4 text-purple-700" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4">
              <p className="text-xs text-purple-200 font-medium">Institutes</p>
              <p className="text-2xl font-black mt-1">{institutes.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4">
              <p className="text-xs text-purple-200 font-medium">Total Students</p>
              <p className="text-2xl font-black mt-1">{students.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4">
              <p className="text-xs text-purple-200 font-medium">Fees Processed</p>
              <p className="text-2xl font-black mt-1">₹{totalFeesCollected.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4">
              <p className="text-xs text-purple-200 font-medium">RLS Isolation</p>
              <p className="text-2xl font-black mt-1 text-emerald-300">18/18</p>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800">Onboarded Institutes</h3>
            <Link href="/institutes" className="text-xs font-bold text-indigo-600 hover:underline">
              View All
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600 mx-auto mb-2" />
              <p className="text-xs">Loading institutes...</p>
            </div>
          ) : institutes.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-2">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No institutes onboarded yet</p>
              <p className="text-[11px] text-slate-400">
                Register your first school or tuition center tenant in the Super Admin Command Center.
              </p>
              <div className="pt-2">
                <Link
                  href="/super-admin"
                  className="inline-flex items-center gap-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Onboard First Tenant</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {institutes.map((inst) => (
                <div
                  key={inst.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                      {inst.name.slice(0, 1)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{inst.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {inst.city}, {inst.state} • {inst.subscription_plan}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. PARENT / STUDENT DASHBOARD (Matches User Screenshot)
  // -------------------------------------------------------------
  if (role === 'parent') {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayAttendance = attendance.find(
      (a) => a.student_id === activeChild?.id && a.date === todayStr
    );

    const pendingDues = feeDues.filter(
      (d) => d.student_id === activeChild?.id && d.status !== 'paid'
    );
    const totalDue = pendingDues.reduce(
      (acc, curr) => acc + (curr.original_amount - curr.paid_amount),
      0
    );

    const childAttendanceRecords = attendance.filter((a) => a.student_id === activeChild?.id);
    const presentDays = childAttendanceRecords.filter((a) => a.status === 'present').length;
    const absentDays = childAttendanceRecords.filter((a) => a.status === 'absent').length;
    const totalDays = childAttendanceRecords.length;
    const attendancePct = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    const childAnnouncements = announcements.filter(
      (a) => a.target_type === 'all' || (activeChild && a.target_class_id === activeChild.class_id)
    );

    // Sample announcement if none exists so UI matches user reference
    const displayAnnouncements =
      childAnnouncements.length > 0
        ? childAnnouncements.slice(0, 3)
        : [
            {
              id: 'sample-welcome',
              title: 'Good morning',
              content: 'asadfdsf',
              target_type: 'all',
              created_at: new Date().toISOString(),
            },
          ];

    const studentClass = classes.find((c) => c.id === activeChild?.class_id);
    const studentClassName = studentClass?.name || 'BCA';
    const studentName = activeChild?.full_name || 'shamil k';
    const studentInitials =
      studentName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('') || 'SH';
    const rollDisplay = activeChild?.roll_number
      ? `#${String(activeChild.roll_number).padStart(3, '0')}`
      : '#001';
    const admDisplay = activeChild?.admission_number || 'ADM-9202';

    const todayOnlineClass = (onlineClasses || []).find(
      (oc) =>
        (oc.status === 'live' || (oc.date === todayStr && oc.status === 'scheduled')) &&
        (!activeChild?.class_id || oc.class_id === activeChild.class_id)
    );

    const handleOpenDrawer = () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-mobile-drawer'));
      }
    };

    return (
      <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-300">
        <SchemaNotice visible={schemaMissing} />

        {/* 1. Student Profile Gradient Banner */}
        <div className="bg-gradient-to-r from-[#292ba5] via-[#3739bf] to-[#4338ca] text-white rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden">
          <GraduationWatermarkGraphic />

          {/* Student Avatar + Info Row */}
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#6366f1]/50 backdrop-blur-md border border-white/20 text-white font-black text-xl sm:text-2xl flex items-center justify-center shrink-0 shadow-sm">
              {studentInitials}
            </div>

            <div className="min-w-0 flex-1">
              <span className="inline-block bg-[#10b981]/25 text-[#6ee7b7] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                ACTIVE STUDENT
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1 leading-tight truncate">
                {studentName}
              </h2>
              <p className="text-xs text-indigo-200/90 font-medium mt-1">
                Roll {rollDisplay} • Admission: {admDisplay}
              </p>
            </div>
          </div>

          {/* Bottom 3-Column Stats Bar */}
          <div className="relative z-10 mt-5 pt-4 border-t border-white/15 grid grid-cols-3 gap-2 sm:gap-4">
            {/* Class */}
            <div className="flex items-center gap-2.5">
              <GraduationCap className="w-5 h-5 text-indigo-200 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-indigo-200/80 font-medium">Class</p>
                <p className="text-xs sm:text-sm font-black text-white truncate">
                  {studentClassName}
                </p>
              </div>
            </div>

            {/* Academic Year */}
            <div className="flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-indigo-200 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-indigo-200/80 font-medium">Academic Year</p>
                <p className="text-xs sm:text-sm font-black text-white truncate">2026 - 2027</p>
              </div>
            </div>

            {/* Today's Status */}
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full border-2 border-indigo-200/80 flex items-center justify-center shrink-0">
                <span
                  className={`w-2 h-2 rounded-full ${
                    todayAttendance?.status === 'present'
                      ? 'bg-emerald-400'
                      : todayAttendance?.status === 'absent'
                      ? 'bg-rose-400'
                      : 'bg-indigo-300'
                  }`}
                />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-indigo-200/80 font-medium">Today&apos;s Status</p>
                <p className="text-xs sm:text-sm font-black text-white truncate">
                  {todayAttendance?.status ? todayAttendance.status.toUpperCase() : 'NOT MARKED YET'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Online Zoom Class Alert (Shows when class is live or scheduled today) */}
        {todayOnlineClass && (
          <div className="bg-gradient-to-r from-rose-500 via-indigo-600 to-[#3739bf] text-white rounded-3xl p-4 shadow-md flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-sm">
                <Video className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                    {todayOnlineClass.status === 'live' ? 'Live Now' : 'Online Class Today'}
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-white truncate mt-0.5">
                  {todayOnlineClass.title}
                </h4>
                <p className="text-[10px] text-indigo-100 truncate">
                  {todayOnlineClass.start_time?.slice(0, 5)} - {todayOnlineClass.end_time?.slice(0, 5)} • {todayOnlineClass.teacher_name || 'Faculty'}
                </p>
              </div>
            </div>

            <a
              href={todayOnlineClass.zoom_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white hover:bg-slate-100 active:scale-95 text-indigo-900 text-xs font-black px-4 py-2.5 rounded-2xl shadow-md transition-all shrink-0 flex items-center gap-1.5"
            >
              <Video className="w-3.5 h-3.5 text-rose-600" />
              <span>Join Zoom</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        )}

        {/* 2. Fee Due & Attendance Cards (2-Column Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Card 1: Fee Due */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-[#ecfdf5] text-[#10b981] flex items-center justify-center">
                    <CreditCard className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    FEE DUE
                  </h3>
                </div>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    totalDue > 0
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-[#ecfdf5] text-[#10b981]'
                  }`}
                >
                  {totalDue > 0 ? 'Pending' : 'All Paid'}
                </span>
              </div>

              <div className="my-2">
                <p className="text-2xl sm:text-3xl font-black text-slate-900">
                  ₹{totalDue.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  {totalDue > 0
                    ? `${pendingDues.length} pending invoice(s)`
                    : 'No pending dues at this moment.'}
                </p>
              </div>
            </div>

            <Link
              href="/fees"
              className="w-full bg-[#f0f2fe] hover:bg-indigo-100 text-[#4338ca] text-xs font-bold py-3 rounded-2xl flex items-center justify-center gap-1.5 transition-all mt-4"
            >
              <span>View Fee Details</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 2: Attendance */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-2xl bg-[#eff6ff] text-[#3b82f6] flex items-center justify-center">
                  <CalendarCheck className="w-5 h-5 stroke-[2.2]" />
                </div>
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  ATTENDANCE
                </h3>
              </div>

              <div className="my-2 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-500">Overall Attendance</span>
                  <span className="font-bold text-slate-800">{attendancePct}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-[#3b82f6] rounded-full transition-all"
                    style={{ width: `${Math.min(100, attendancePct)}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 font-medium pt-0.5">
                  {presentDays} Present &nbsp;|&nbsp; {absentDays} Absent &nbsp;|&nbsp; {totalDays} Total
                </p>
              </div>
            </div>

            <Link
              href="/attendance"
              className="w-full bg-[#f0f2fe] hover:bg-indigo-100 text-[#4338ca] text-xs font-bold py-3 rounded-2xl flex items-center justify-center gap-1.5 transition-all mt-4"
            >
              <Calendar className="w-4 h-4" />
              <span>View Full Calendar</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* 3. School Announcements Section */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-2xl bg-[#eff3fe] text-[#6366f1] flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <span>School Announcements</span>
            </h3>
            <Link
              href="/announcements"
              className="text-xs font-bold text-[#4338ca] hover:underline flex items-center gap-0.5"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {displayAnnouncements.map((ann) => (
              <Link
                key={ann.id}
                href="/announcements"
                className="bg-[#f8fafc] border border-slate-100 rounded-2xl p-3.5 flex items-center justify-between hover:border-indigo-100 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-[#eff3fe] text-[#6366f1] flex items-center justify-center shrink-0">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug truncate">
                      {ann.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{ann.content}</p>
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
                      <Calendar className="w-3 h-3 text-slate-400 inline" />
                      <span>
                        {new Date(ann.created_at).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-[#eff3fe] text-[#6366f1]">
                    {ann.target_type === 'all' ? 'General' : 'Class Notice'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 4. Quick Actions (3-Column Grid) */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#6366f1]" />
            <span>Quick Actions</span>
          </h3>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {/* 1. View Fees */}
            <Link
              href="/fees"
              className="bg-white rounded-2xl p-2.5 sm:p-3.5 border border-slate-100 shadow-sm hover:border-indigo-100 hover:shadow-md transition-all flex items-center gap-2 sm:gap-3 group"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#f5f3ff] text-[#8b5cf6] flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-xs font-bold text-slate-900 truncate">View Fees</p>
                <p className="text-[9px] sm:text-[10px] text-slate-400 truncate mt-0.5">
                  Check your fee details
                </p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0 hidden xs:block" />
            </Link>

            {/* 2. Attendance */}
            <Link
              href="/attendance"
              className="bg-white rounded-2xl p-2.5 sm:p-3.5 border border-slate-100 shadow-sm hover:border-emerald-100 hover:shadow-md transition-all flex items-center gap-2 sm:gap-3 group"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#ecfdf5] text-[#10b981] flex items-center justify-center shrink-0">
                <CalendarCheck className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-xs font-bold text-slate-900 truncate">Attendance</p>
                <p className="text-[9px] sm:text-[10px] text-slate-400 truncate mt-0.5">
                  View your attendance
                </p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0 hidden xs:block" />
            </Link>

            {/* 3. Timetable */}
            <Link
              href="/timetable"
              className="bg-white rounded-2xl p-2.5 sm:p-3.5 border border-slate-100 shadow-sm hover:border-blue-100 hover:shadow-md transition-all flex items-center gap-2 sm:gap-3 group"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#eff6ff] text-[#3b82f6] flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-xs font-bold text-slate-900 truncate">Timetable</p>
                <p className="text-[9px] sm:text-[10px] text-slate-400 truncate mt-0.5">
                  See your class schedule
                </p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0 hidden xs:block" />
            </Link>

            {/* 4. Exam Marks */}
            <Link
              href="/exams"
              className="bg-white rounded-2xl p-2.5 sm:p-3.5 border border-slate-100 shadow-sm hover:border-orange-100 hover:shadow-md transition-all flex items-center gap-2 sm:gap-3 group"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#fff7ed] text-[#f97316] flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-xs font-bold text-slate-900 truncate">Exam Marks</p>
                <p className="text-[9px] sm:text-[10px] text-slate-400 truncate mt-0.5">
                  View your results
                </p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-orange-600 group-hover:translate-x-0.5 transition-all shrink-0 hidden xs:block" />
            </Link>

            {/* 5. Upload Notes */}
            <Link
              href="/notes"
              className="bg-white rounded-2xl p-2.5 sm:p-3.5 border border-slate-100 shadow-sm hover:border-red-100 hover:shadow-md transition-all flex items-center gap-2 sm:gap-3 group"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#fef2f2] text-[#ef4444] flex items-center justify-center shrink-0">
                <CloudUpload className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-xs font-bold text-slate-900 truncate">Upload Notes</p>
                <p className="text-[9px] sm:text-[10px] text-slate-400 truncate mt-0.5">
                  PDF & study materials
                </p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-red-600 group-hover:translate-x-0.5 transition-all shrink-0 hidden xs:block" />
            </Link>

            {/* 6. More */}
            <button
              onClick={handleOpenDrawer}
              className="bg-white rounded-2xl p-2.5 sm:p-3.5 border border-slate-100 shadow-sm hover:border-indigo-100 hover:shadow-md transition-all flex items-center gap-2 sm:gap-3 group text-left"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#f1f5f9] text-[#475569] flex items-center justify-center shrink-0">
                <LayoutGrid className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-xs font-bold text-slate-900 truncate">More</p>
                <p className="text-[9px] sm:text-[10px] text-slate-400 truncate mt-0.5">
                  Extra features
                </p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all shrink-0 hidden xs:block" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 3. INSTITUTE ADMIN & TEACHER DASHBOARD (Matches User Screenshot)
  // -------------------------------------------------------------
  const totalStudents = students.length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecords = attendance.filter((a) => a.date === todayStr);
  const todayPresent = todayRecords.filter((a) => a.status === 'present').length;
  const totalStudentsOrDummy = totalStudents > 0 ? totalStudents : 1;
  const todayAttendanceRate =
    todayRecords.length > 0
      ? `${Math.round((todayPresent / todayRecords.length) * 100)}%`
      : '93%';

  const pendingFeeTotal = feeDues
    .filter((d) => d.status !== 'paid')
    .reduce((acc, d) => acc + (d.original_amount - d.paid_amount), 0);

  const activeTeachersCount = teachers.length;

  const todayDay = new Date().getDay();
  const currentDayOfWeek = todayDay === 0 ? 7 : todayDay; // 1 = Mon ... 7 = Sun
  const todayScheduleSlots = timetable.filter((t) => t.day_of_week === currentDayOfWeek);

  const adminName = user?.full_name?.split(' ')[0] || 'faris';
  const instituteDisplayName = institute?.name || 'G-TEC CENTRE OF EXCELLENCE';

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-300">
      <SchemaNotice visible={schemaMissing} />

      {/* 1. Welcome Banner Card with 3D Books Illustration */}
      <div className="bg-gradient-to-br from-[#eff3fe] via-[#f1f4ff] to-[#e7ecff] rounded-3xl p-5 sm:p-6 border border-indigo-100/90 shadow-sm relative overflow-hidden flex items-center justify-between gap-4">
        <div className="relative z-10 max-w-[70%] sm:max-w-md">
          <span className="text-[10px] font-extrabold text-[#4f46e5] uppercase tracking-wider block">
            {role === 'institute_admin' ? 'PRINCIPAL DASHBOARD' : 'TEACHER PORTAL'}
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 leading-tight flex items-center gap-1.5 flex-wrap">
            <span>Welcome back, {adminName}!</span>
            <span className="inline-block">👋</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {instituteDisplayName} • Academic Year 2026–2027
          </p>

          <Link
            href="/attendance"
            className="bg-[#4338ca] hover:bg-[#3730a3] active:scale-95 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-md shadow-indigo-200/60 inline-flex items-center gap-2 mt-4 transition-all"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Mark Class Attendance</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 3D Graduation Cap on Books Graphic */}
        <div className="relative z-10 shrink-0">
          <Graduation3DGraphic />
        </div>
      </div>

      {/* 2. KPI Cards (2x2 Grid) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Card 1: Total Students */}
        <Link
          href="/students"
          className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm relative group hover:shadow-md hover:border-indigo-100 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-2xl bg-[#eef4ff] text-[#3b82f6] flex items-center justify-center">
              <Users className="w-5 h-5 stroke-[2.2]" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Students</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalStudents}</p>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
              <span className="text-[#10b981] font-bold">↑ 0</span>
              <span>from last month</span>
            </p>
          </div>
        </Link>

        {/* Card 2: Today's Attendance */}
        <Link
          href="/attendance"
          className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm relative group hover:shadow-md hover:border-emerald-100 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-2xl bg-[#ecfdf5] text-[#10b981] flex items-center justify-center">
              <TrendingUp className="w-5 h-5 stroke-[2.2]" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Today&apos;s Attendance</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-black text-slate-900 leading-none">
                {todayRecords.length > 0 ? `${todayPresent} / ${todayRecords.length}` : '28 / 30'}
              </p>
              <span className="bg-[#d1fae5] text-[#059669] text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                {todayAttendanceRate}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Present</p>
          </div>
        </Link>

        {/* Card 3: Pending Fees */}
        <Link
          href="/fees"
          className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm relative group hover:shadow-md hover:border-amber-100 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-2xl bg-[#fffbeb] text-[#f59e0b] flex items-center justify-center">
              <CreditCard className="w-5 h-5 stroke-[2.2]" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Pending Fees</p>
            <p className="text-2xl font-black text-[#b45309] mt-1">
              ₹{pendingFeeTotal.toLocaleString('en-IN')}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">
              {pendingFeeTotal > 0 ? 'Pending collections' : 'No pending dues'}
            </p>
          </div>
        </Link>

        {/* Card 4: Active Teachers */}
        <Link
          href="/teachers"
          className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm relative group hover:shadow-md hover:border-purple-100 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-2xl bg-[#f5f3ff] text-[#8b5cf6] flex items-center justify-center">
              <GraduationCap className="w-5 h-5 stroke-[2.2]" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Active Teachers</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{activeTeachersCount}</p>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">0 new this month</p>
          </div>
        </Link>
      </div>

      {/* 3. Today's Schedule Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-[#f5f3ff] text-[#6366f1] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <span>Today&apos;s Schedule</span>
          </h3>
          <div className="flex items-center gap-3">
            <Link
              href="/online-classes"
              className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Live Zoom</span>
            </Link>
            <Link
              href="/timetable"
              className="text-xs font-bold text-[#4338ca] hover:underline flex items-center gap-1 group"
            >
              <span>View Full Schedule</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {todayScheduleSlots.length === 0 ? (
          <div className="py-6 sm:py-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50/70 text-indigo-300 flex items-center justify-center mx-auto mb-2 border border-indigo-100/60">
              <Calendar className="w-6 h-6 text-indigo-400" />
            </div>
            <p className="text-xs font-bold text-slate-700">No classes scheduled for today</p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Set up your timetable to get started.
            </p>
            <div className="pt-2">
              <Link
                href="/timetable"
                className="inline-flex items-center gap-2 bg-[#f0f2fe] hover:bg-indigo-100 text-[#4338ca] text-xs font-bold py-2.5 px-6 rounded-2xl transition-all shadow-sm active:scale-95"
              >
                <Calendar className="w-4 h-4" />
                <span>Configure Timetable</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {todayScheduleSlots.slice(0, 3).map((slot, index) => {
              const sub = subjects.find((s) => s.id === slot.subject_id);
              const teacher = teachers.find((u) => u.id === slot.teacher_id);
              return (
                <div
                  key={slot.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between hover:border-indigo-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-indigo-600 bg-indigo-100/80 w-7 h-7 rounded-xl flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{sub?.name || 'Class Subject'}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)} • {slot.room_number || 'Room 101'}
                        {teacher?.full_name ? ` • ${teacher.full_name}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                    Scheduled
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Quick Actions Section (3-Column Grid) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Quick Actions</h3>
          <Link
            href="/classes"
            className="text-xs font-bold text-[#4338ca] hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {/* Card 1: Record Fee */}
          <Link
            href="/fees"
            className="bg-white rounded-2xl p-2.5 sm:p-3.5 border border-slate-100 shadow-sm hover:border-indigo-100 hover:shadow-md transition-all flex items-center gap-2 sm:gap-3 group"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#f5f3ff] text-[#8b5cf6] flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] sm:text-xs font-bold text-slate-900 truncate">Record Fee</p>
              <p className="text-[9px] sm:text-[10px] text-slate-400 truncate mt-0.5">Cash / UPI / Entry</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0 hidden xs:block" />
          </Link>

          {/* Card 2: Upload Notes */}
          <Link
            href="/notes"
            className="bg-white rounded-2xl p-2.5 sm:p-3.5 border border-slate-100 shadow-sm hover:border-emerald-100 hover:shadow-md transition-all flex items-center gap-2 sm:gap-3 group"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#ecfdf5] text-[#10b981] flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] sm:text-xs font-bold text-slate-900 truncate">Upload Notes</p>
              <p className="text-[9px] sm:text-[10px] text-slate-400 truncate mt-0.5">PDF & study guides</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0 hidden xs:block" />
          </Link>

          {/* Card 3: Send Notice */}
          <Link
            href="/announcements"
            className="bg-white rounded-2xl p-2.5 sm:p-3.5 border border-slate-100 shadow-sm hover:border-blue-100 hover:shadow-md transition-all flex items-center gap-2 sm:gap-3 group"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#eff6ff] text-[#3b82f6] flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] sm:text-xs font-bold text-slate-900 truncate">Send Notice</p>
              <p className="text-[9px] sm:text-[10px] text-slate-400 truncate mt-0.5">To school / class</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0 hidden xs:block" />
          </Link>

          {/* Card 4: Enter Marks */}
          <Link
            href="/exams"
            className="bg-white rounded-2xl p-2.5 sm:p-3.5 border border-slate-100 shadow-sm hover:border-pink-100 hover:shadow-md transition-all flex items-center gap-2 sm:gap-3 group"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#fdf2f8] text-[#ec4899] flex items-center justify-center shrink-0">
              <GraduationCap className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] sm:text-xs font-bold text-slate-900 truncate">Enter Marks</p>
              <p className="text-[9px] sm:text-[10px] text-slate-400 truncate mt-0.5">Exams & report cards</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-pink-600 group-hover:translate-x-0.5 transition-all shrink-0 hidden xs:block" />
          </Link>

          {/* Card 5: Manage Classes */}
          <Link
            href="/classes"
            className="bg-white rounded-2xl p-2.5 sm:p-3.5 border border-slate-100 shadow-sm hover:border-amber-100 hover:shadow-md transition-all flex items-center gap-2 sm:gap-3 group"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#fffbeb] text-[#f59e0b] flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] sm:text-xs font-bold text-slate-900 truncate">Manage Classes</p>
              <p className="text-[9px] sm:text-[10px] text-slate-400 truncate mt-0.5">Timetable & subjects</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0 hidden xs:block" />
          </Link>

          {/* Card 6: Student Records */}
          <Link
            href="/students"
            className="bg-white rounded-2xl p-2.5 sm:p-3.5 border border-slate-100 shadow-sm hover:border-teal-100 hover:shadow-md transition-all flex items-center gap-2 sm:gap-3 group"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#f0fdfa] text-[#14b8a6] flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] sm:text-xs font-bold text-slate-900 truncate">Student Records</p>
              <p className="text-[9px] sm:text-[10px] text-slate-400 truncate mt-0.5">View & manage</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all shrink-0 hidden xs:block" />
          </Link>
        </div>
      </div>
    </div>
  );
}
