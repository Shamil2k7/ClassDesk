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
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useSupabaseData } from '@/lib/use-supabase-data';
import { SchemaNotice } from '@/components/common/schema-notice';

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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {institutes.map((inst) => (
                <div
                  key={inst.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{inst.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {inst.city || 'India'}, {inst.state || ''} • Phone: {inst.phone || 'N/A'}
                    </p>
                    <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {inst.subscription_status?.toUpperCase() || 'ACTIVE'} • {inst.subscription_plan?.toUpperCase() || 'STANDARD'} PLAN
                    </span>
                  </div>
                  <Link
                    href="/super-admin"
                    className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. PARENT / STUDENT DASHBOARD
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
    const totalDays = childAttendanceRecords.length;
    const attendancePct = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

    const childAnnouncements = announcements.filter(
      (a) => a.target_type === 'all' || (activeChild && a.target_class_id === activeChild.class_id)
    );

    return (
      <div className="space-y-5 animate-in fade-in duration-300">
        <SchemaNotice visible={schemaMissing} />

        {/* Child Banner */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white rounded-3xl p-5 sm:p-7 shadow-lg relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-xl font-black border border-white/30">
                {activeChild?.full_name ? activeChild.full_name.slice(0, 2).toUpperCase() : 'ST'}
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase bg-white/20 px-2 py-0.5 rounded-md">
                  Active Student
                </span>
                <h2 className="text-lg sm:text-xl font-bold mt-1 leading-tight">
                  {activeChild?.full_name || 'Select Child'}
                </h2>
                <p className="text-xs text-indigo-100 mt-0.5">
                  Roll #{activeChild?.roll_number || 'N/A'} • Admission: {activeChild?.admission_number || 'N/A'}
                </p>
              </div>
            </div>

            {/* Quick Status Pill */}
            <div className="flex items-center gap-2">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2 text-center">
                <p className="text-[10px] text-indigo-200">Today&apos;s Status</p>
                <p className="text-xs font-bold text-white mt-0.5 flex items-center justify-center gap-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      todayAttendance?.status === 'present'
                        ? 'bg-emerald-400'
                        : todayAttendance?.status === 'absent'
                        ? 'bg-rose-400'
                        : todayAttendance?.status === 'late'
                        ? 'bg-amber-400'
                        : 'bg-slate-300'
                    }`}
                  />
                  {todayAttendance?.status
                    ? todayAttendance.status.toUpperCase()
                    : 'NOT MARKED YET'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Fee Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    {t('dashboard.parentBanner.dueFees', 'Pending Fees')}
                  </h3>
                </div>
                {totalDue > 0 ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-200">
                    Payment Due
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200">
                    All Paid
                  </span>
                )}
              </div>

              <div className="my-4">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  ₹{totalDue.toLocaleString('en-IN')}
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  {totalDue > 0
                    ? `${pendingDues[0]?.title || 'Tuition Fee'} due on ${pendingDues[0]?.due_date}`
                    : 'No pending dues at this moment.'}
                </p>
              </div>
            </div>

            <Link
              href="/fees"
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all min-h-[44px]"
            >
              <span>{totalDue > 0 ? 'Pay Online (Razorpay)' : 'View Receipts'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Attendance & Academics Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Attendance & Performance
                </h3>
              </div>

              <div className="my-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Overall Attendance</span>
                  <span className="font-bold text-emerald-600">{attendancePct}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, attendancePct)}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  {presentDays} Present out of {totalDays} recorded days
                </p>
              </div>
            </div>

            <Link
              href="/attendance"
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-colors min-h-[44px]"
            >
              <span>View Full Calendar</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Latest Announcements */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600" />
              <span>School Announcements</span>
            </h3>
            <Link href="/announcements" className="text-xs font-bold text-indigo-600 hover:underline">
              View All
            </Link>
          </div>

          {childAnnouncements.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-slate-400">
              <p className="text-xs font-medium text-slate-600">No new notices posted</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                School circulars and event alerts will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {childAnnouncements.slice(0, 3).map((ann) => (
                <div
                  key={ann.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {ann.target_type === 'all' ? 'All School' : 'Class Notice'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(ann.created_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">{ann.title}</h4>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                    {ann.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 3. INSTITUTE ADMIN & TEACHER DASHBOARD
  // -------------------------------------------------------------
  const totalStudents = students.length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecords = attendance.filter((a) => a.date === todayStr);
  const todayPresent = todayRecords.filter((a) => a.status === 'present').length;
  const todayAttendanceRate =
    todayRecords.length > 0
      ? `${Math.round((todayPresent / todayRecords.length) * 100)}%`
      : 'Not Taken';

  const pendingFeeTotal = feeDues
    .filter((d) => d.status !== 'paid')
    .reduce((acc, d) => acc + (d.original_amount - d.paid_amount), 0);

  const activeTeachersCount = teachers.length;

  const todayDay = new Date().getDay();
  const currentDayOfWeek = todayDay === 0 ? 7 : todayDay; // 1 = Mon ... 7 = Sun
  const todayScheduleSlots = timetable.filter((t) => t.day_of_week === currentDayOfWeek);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <SchemaNotice visible={schemaMissing} />

      {/* Welcome Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2.5 py-1 rounded-full">
            {role === 'institute_admin' ? 'Principal Dashboard' : 'Teacher Portal'}
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-2">
            {t('dashboard.welcomeBack', 'Welcome back')}, {user?.full_name || 'Educator'}!
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {institute?.name || 'ClassDesk Education'} • Academic Year 2026-2027
          </p>
        </div>

        {/* Quick Action Button */}
        <Link
          href="/attendance"
          className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-md shadow-indigo-100 flex items-center justify-center gap-2 transition-all min-h-[44px]"
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Mark Class Attendance</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
            <Users className="w-4 h-4" />
          </div>
          <p className="text-[11px] text-slate-500">{t('dashboard.stats.totalStudents', 'Total Students')}</p>
          <p className="text-xl font-black text-slate-900 mt-0.5">{totalStudents}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-[11px] text-slate-500">{t('dashboard.stats.attendanceRate', "Today's Attendance")}</p>
          <p className="text-xl font-black text-emerald-600 mt-0.5">{todayAttendanceRate}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
            <CreditCard className="w-4 h-4" />
          </div>
          <p className="text-[11px] text-slate-500">{t('dashboard.stats.pendingFees', 'Pending Fees')}</p>
          <p className="text-xl font-black text-amber-600 mt-0.5">
            ₹{pendingFeeTotal.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2">
            <GraduationCap className="w-4 h-4" />
          </div>
          <p className="text-[11px] text-slate-500">{t('dashboard.stats.activeTeachers', 'Active Teachers')}</p>
          <p className="text-xl font-black text-slate-900 mt-0.5">{activeTeachersCount}</p>
        </div>
      </div>

      {/* Today's Schedule & Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Today's Schedule Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>{t('dashboard.todaySchedule', "Today's Schedule")}</span>
            </h3>
            <Link href="/timetable" className="text-xs font-bold text-indigo-600 hover:underline">
              Full Schedule
            </Link>
          </div>

          {todayScheduleSlots.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <Clock className="w-8 h-8 mx-auto mb-1.5 opacity-40 text-slate-400" />
              <p className="text-xs font-medium text-slate-600">No scheduled periods today</p>
              <Link href="/timetable" className="text-[11px] text-indigo-600 font-bold hover:underline mt-1 inline-block">
                Configure Timetable
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {todayScheduleSlots.slice(0, 3).map((slot, index) => {
                const sub = subjects.find((s) => s.id === slot.subject_id);
                return (
                  <div
                    key={slot.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-indigo-600 bg-indigo-100 w-6 h-6 rounded-lg flex items-center justify-center">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{sub?.name || 'Class Subject'}</p>
                        <p className="text-[10px] text-slate-500">
                          {slot.start_time} - {slot.end_time} • {slot.room_number || 'Room 101'}
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

        {/* Quick Academic Actions */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3">
              {t('dashboard.quickActions', 'Quick Actions')}
            </h3>

            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/fees"
                className="p-3.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-2xl text-left transition-all active:scale-95"
              >
                <CreditCard className="w-4 h-4 text-indigo-600 mb-1" />
                <p className="text-xs font-bold text-slate-800">Record Fee</p>
                <p className="text-[10px] text-slate-500">Cash / UPI entry</p>
              </Link>

              <Link
                href="/notes"
                className="p-3.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 rounded-2xl text-left transition-all active:scale-95"
              >
                <BookOpen className="w-4 h-4 text-emerald-600 mb-1" />
                <p className="text-xs font-bold text-slate-800">Upload Notes</p>
                <p className="text-[10px] text-slate-500">PDFs & study guides</p>
              </Link>

              <Link
                href="/announcements"
                className="p-3.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-2xl text-left transition-all active:scale-95"
              >
                <Bell className="w-4 h-4 text-blue-600 mb-1" />
                <p className="text-xs font-bold text-slate-800">Send Notice</p>
                <p className="text-[10px] text-slate-500">To school / class</p>
              </Link>

              <Link
                href="/exams"
                className="p-3.5 bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-200 rounded-2xl text-left transition-all active:scale-95"
              >
                <GraduationCap className="w-4 h-4 text-purple-600 mb-1" />
                <p className="text-xs font-bold text-slate-800">Enter Marks</p>
                <p className="text-[10px] text-slate-500">Exams & report cards</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
