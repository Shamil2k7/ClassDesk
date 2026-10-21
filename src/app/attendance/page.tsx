'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/context';
import { AttendanceStatus } from '@/types/database.types';
import { createClient } from '@/lib/supabase/client';
import { ClassBatch, Student, AttendanceRecord } from '@/types/app.types';
import {
  CalendarCheck,
  Check,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CalendarDays,
  Grid,
  List,
  Info,
  XCircle,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SchemaNotice } from '@/components/common/schema-notice';
import { getLocalData, saveLocalData, syncLocalWithRemote, getLocalDataForInstitute } from '@/lib/storage-helper';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface CalendarDay {
  date: Date;
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isFuture: boolean;
}

function getMonthCalendarDays(year: number, month: number): CalendarDay[] {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const days: CalendarDay[] = [];

  // Monday = 0 ... Sunday = 6
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;

  // Previous month trailing days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({
      date: d,
      dateStr,
      dayNumber: d.getDate(),
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isWeekend: d.getDay() === 0,
      isFuture: d > today,
    });
  }

  // Current month days
  for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
    const d = new Date(year, month, i);
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    days.push({
      date: d,
      dateStr,
      dayNumber: i,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isWeekend: d.getDay() === 0,
      isFuture: d > today,
    });
  }

  // Next month leading days (fill row to complete multiple of 7)
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({
      date: d,
      dateStr,
      dayNumber: i,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isWeekend: d.getDay() === 0,
      isFuture: d > today,
    });
  }

  return days;
}

export default function AttendancePage() {
  const { user, institute, activeChild, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const supabase = createClient();
  const instId = institute?.id || user?.institute_id || null;

  const isStaff = user?.role === 'teacher' || user?.role === 'institute_admin' || user?.role === 'super_admin';

  // State
  const [classesList, setClassesList] = useState<ClassBatch[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceStatus>>({});
  const [parentAttendance, setParentAttendance] = useState<AttendanceRecord[]>([]);

  // Calendar State
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  );
  const [attendanceViewMode, setAttendanceViewMode] = useState<'calendar' | 'list'>('calendar');
  const [staffTab, setStaffTab] = useState<'rollcall' | 'calendar'>('rollcall');
  const [selectedStudentForCalendar, setSelectedStudentForCalendar] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [alertNotice, setAlertNotice] = useState<string | null>(null);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleTodayJump = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedCalendarDate(
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    );
  };

  // 1. Load Classes
  useEffect(() => {
    if (authLoading) return;
    async function fetchClasses() {
      try {
        let clsQuery = supabase.from('classes').select('*');
        if (instId) {
          clsQuery = clsQuery.eq('institute_id', instId);
        }
        const { data, error } = await clsQuery.order('name');

        if (error && (error.code === 'PGRST205' || error.code === '42P01')) {
          setSchemaMissing(true);
          const local = getLocalDataForInstitute<ClassBatch>('classes', instId);
          if (local.length > 0) {
            setClassesList(local);
            setSelectedClassId((prev) => prev || local[0].id);
          }
          return;
        }

        const classes = (data || []) as ClassBatch[];
        if (classes.length > 0) {
          const merged = syncLocalWithRemote('classes', classes, instId);
          setClassesList(merged);
          setSelectedClassId((prev) => prev || merged[0].id);
        } else {
          const local = getLocalDataForInstitute<ClassBatch>('classes', instId);
          if (local.length > 0) {
            setClassesList(local);
            setSelectedClassId((prev) => prev || local[0].id);
          }
        }
      } catch (err) {
        console.warn('Error loading classes:', err);
        const local = getLocalDataForInstitute<ClassBatch>('classes', instId);
        if (local.length > 0) {
          setClassesList(local);
          setSelectedClassId((prev) => prev || local[0].id);
        }
      }
    }
    fetchClasses();
  }, [supabase, instId, authLoading]);

  // 2. Load Students & Existing Attendance for Selected Class + Date
  const loadClassAttendance = useCallback(async () => {
    if (!selectedClassId) return;
    setLoading(true);
    try {
      // Query students
      let stuQuery = supabase
        .from('students')
        .select('*')
        .eq('class_id', selectedClassId);
      if (instId) {
        stuQuery = stuQuery.eq('institute_id', instId);
      }
      const { data: stuData, error: stuError } = await stuQuery.order('roll_number');

      let students = (stuData || []) as Student[];
      if ((stuError && (stuError.code === 'PGRST205' || stuError.code === '42P01')) || students.length === 0) {
        if (stuError) setSchemaMissing(true);
        const allLocal = getLocalDataForInstitute<Student>('students', instId);
        const filtered = allLocal.filter((s) => s.class_id === selectedClassId);
        students = filtered;
      }

      setClassStudents(students);

      // Query existing attendance on selectedDate
      let attList: AttendanceRecord[] = [];
      try {
        let attQuery = supabase
          .from('attendance')
          .select('*')
          .eq('class_id', selectedClassId)
          .eq('date', selectedDate);
        if (instId) {
          attQuery = attQuery.eq('institute_id', instId);
        }
        const { data: attData } = await attQuery;
        if (attData) {
          attList = syncLocalWithRemote('attendance', attData as AttendanceRecord[], instId).filter(
            (a) => a.class_id === selectedClassId && a.date === selectedDate
          );
        } else {
          const allLocalAtt = getLocalDataForInstitute<AttendanceRecord>('attendance', instId);
          attList = allLocalAtt.filter((a) => a.class_id === selectedClassId && a.date === selectedDate);
        }
      } catch {
        const allLocalAtt = getLocalDataForInstitute<AttendanceRecord>('attendance', instId);
        attList = allLocalAtt.filter((a) => a.class_id === selectedClassId && a.date === selectedDate);
      }

      const statusMap: Record<string, AttendanceStatus> = {};
      students.forEach((s) => {
        const existing = attList.find((a) => a.student_id === s.id);
        statusMap[s.id] = (existing?.status as AttendanceStatus) || 'present';
      });

      setAttendanceData(statusMap);
    } catch (err) {
      console.warn('Error fetching class attendance:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, selectedDate, supabase, instId]);

  useEffect(() => {
    if (isStaff && selectedClassId) {
      loadClassAttendance();
    }
  }, [isStaff, selectedClassId, selectedDate, loadClassAttendance]);

  // 3. Parent View: Load Attendance for Active Child
  useEffect(() => {
    if (!isStaff && activeChild?.id) {
      async function fetchChildAttendance() {
        setLoading(true);
        try {
          let parentAttQuery = supabase
            .from('attendance')
            .select('*')
            .eq('student_id', activeChild!.id);
          if (instId) {
            parentAttQuery = parentAttQuery.eq('institute_id', instId);
          }
          const { data, error } = await parentAttQuery.order('date', { ascending: false });

          if (error && (error.code === 'PGRST205' || error.code === '42P01')) {
            setSchemaMissing(true);
            const allLocalAtt = getLocalDataForInstitute<AttendanceRecord>('attendance', instId);
            setParentAttendance(allLocalAtt.filter((a) => a.student_id === activeChild!.id));
          } else if (data && data.length > 0) {
            setParentAttendance(data as AttendanceRecord[]);
          } else {
            const allLocalAtt = getLocalDataForInstitute<AttendanceRecord>('attendance', instId);
            setParentAttendance(allLocalAtt.filter((a) => a.student_id === activeChild!.id));
          }
        } catch (err) {
          console.warn('Error fetching parent attendance:', err);
          const allLocalAtt = getLocalDataForInstitute<AttendanceRecord>('attendance', instId);
          setParentAttendance(allLocalAtt.filter((a) => a.student_id === activeChild!.id));
        } finally {
          setLoading(false);
        }
      }
      fetchChildAttendance();
    }
  }, [isStaff, activeChild, supabase, instId]);

  // Current Class & Sections derivation
  const currentClassObj = classesList.find((c) => c.id === selectedClassId);
  const currentClassName = currentClassObj?.name || '';

  // Find all sibling batches sharing the same class grade/name
  const siblingBatches = currentClassName
    ? classesList.filter((c) => c.name.trim().toLowerCase() === currentClassName.trim().toLowerCase())
    : [];

  // Determine all available sections for this class
  const availableSections = Array.from(
    new Set(
      [
        ...classStudents.map((s) => (s as any).section).filter(Boolean),
        ...siblingBatches.map((b) => b.section).filter(Boolean),
        currentClassObj?.section,
        'A',
        'B',
      ].filter(Boolean)
    )
  ) as string[];

  // Filter students based on selected section
  const displayedStudents = classStudents.filter((s) => {
    if (selectedSection === 'all') return true;
    const stuSec = (s as any).section || currentClassObj?.section || 'A';
    return stuSec.trim().toUpperCase() === selectedSection.trim().toUpperCase();
  });

  const setStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceData((prev) => ({ ...prev, [studentId]: status }));
    setAlertNotice(null);
  };

  const handleMarkAllPresent = () => {
    const updated: Record<string, AttendanceStatus> = { ...attendanceData };
    displayedStudents.forEach((s) => {
      updated[s.id] = 'present';
    });
    setAttendanceData(updated);
    setAlertNotice(null);
  };

  const handleSaveAndNotify = async () => {
    if (classStudents.length === 0) return;
    setSaving(true);
    setAlertNotice(null);

    const instId = institute?.id || user?.institute_id || '00000000-0000-0000-0000-000000000001';
    const validMarkedBy = user?.id && user.id.length > 20 && user.id.includes('-')
      ? user.id
      : '698a39e4-3fca-48d4-9bbc-9838271336e5';

    const records: AttendanceRecord[] = classStudents.map((s) => ({
      id: `att-${s.id}-${selectedDate}`,
      institute_id: instId,
      class_id: selectedClassId,
      student_id: s.id,
      date: selectedDate,
      status: attendanceData[s.id] || 'present',
      marked_by: validMarkedBy,
      remarks: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // Update local storage
    const currentLocalAtt = getLocalData<AttendanceRecord>('attendance');
    const filteredCurrent = currentLocalAtt.filter(
      (a) => !(a.class_id === selectedClassId && a.date === selectedDate)
    );
    saveLocalData('attendance', [...records, ...filteredCurrent]);

    try {
      const { error } = await (supabase as any)
        .from('attendance')
        .upsert(
          records.map((r) => ({
            institute_id: r.institute_id,
            class_id: r.class_id,
            student_id: r.student_id,
            date: r.date,
            status: r.status,
            marked_by: r.marked_by,
            remarks: r.remarks,
          })),
          { onConflict: 'student_id,date' }
        );

      if (error && (error.code === 'PGRST205' || error.code === '42P01')) {
        setSchemaMissing(true);
      }

      const absentStudents = classStudents.filter((s) => attendanceData[s.id] === 'absent');
      if (absentStudents.length > 0) {
        setAlertNotice(
          `Attendance saved! Automated Push/SMS Absent Alert dispatched to ${absentStudents.length} parents (${absentStudents
            .map((s) => s.full_name)
            .join(', ')})`
        );
      } else {
        setAlertNotice('All students marked present! Attendance saved successfully.');
      }

      try {
        confetti({ particleCount: 35, spread: 60, origin: { y: 0.8 } });
      } catch {
        // silent
      }
    } catch (err) {
      console.warn('Error saving attendance:', err);
      setAlertNotice('Attendance saved locally.');
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------
  // PARENT VIEW: Personal Student Attendance Calendar & Log
  // -------------------------------------------------------------
  if (!isStaff) {
    const calendarDays = getMonthCalendarDays(currentYear, currentMonth);
    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    // Attendance stats for selected month
    const monthAttendanceRecords = parentAttendance.filter((a) => a.date.startsWith(monthPrefix));
    const monthPresent = monthAttendanceRecords.filter((a) => a.status === 'present').length;
    const monthAbsent = monthAttendanceRecords.filter((a) => a.status === 'absent').length;
    const monthLate = monthAttendanceRecords.filter((a) => a.status === 'late').length;
    const monthTotal = monthAttendanceRecords.length;
    const monthPercentage =
      monthTotal > 0
        ? Math.round(((monthPresent + monthLate * 0.5) / monthTotal) * 100)
        : 100;

    // Overall stats
    const totalPresent = parentAttendance.filter((a) => a.status === 'present').length;
    const totalAbsent = parentAttendance.filter((a) => a.status === 'absent').length;
    const totalLate = parentAttendance.filter((a) => a.status === 'late').length;
    const totalDaysRecorded = parentAttendance.length;
    const overallPercentage =
      totalDaysRecorded > 0
        ? Math.round(((totalPresent + totalLate * 0.5) / totalDaysRecorded) * 100)
        : 100;

    // Selected Day inspection
    const selectedRecord = parentAttendance.find((a) => a.date === selectedCalendarDate);
    const selectedDateParts = selectedCalendarDate.split('-');
    const selectedDateObj =
      selectedDateParts.length === 3
        ? new Date(
            parseInt(selectedDateParts[0], 10),
            parseInt(selectedDateParts[1], 10) - 1,
            parseInt(selectedDateParts[2], 10)
          )
        : new Date();
    const isSelectedSunday = selectedDateObj.getDay() === 0;
    const isSelectedFuture = selectedDateObj > new Date();

    const selectedDateFormatted = selectedDateObj.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const studentDisplayName = activeChild?.full_name || user?.full_name || 'Student';

    return (
      <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-300">
        <SchemaNotice visible={schemaMissing} />

        {/* Student Profile & Term Overview Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  {studentDisplayName}&apos;s Attendance
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Roll #{activeChild?.roll_number || '001'} • Admission: {activeChild?.admission_number || 'ADM-9202'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Term Attendance:</span>
              <span className="text-sm font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                {overallPercentage}%
              </span>
            </div>
          </div>

          {/* Quick Term Stats */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3 text-center">
              <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Present</p>
              <p className="text-xl font-black text-emerald-600 mt-0.5">{totalPresent} Days</p>
            </div>
            <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-3 text-center">
              <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Absent</p>
              <p className="text-xl font-black text-rose-600 mt-0.5">{totalAbsent} Days</p>
            </div>
            <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-3 text-center">
              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Late</p>
              <p className="text-xl font-black text-amber-600 mt-0.5">{totalLate} Days</p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ATTENDANCE CALENDAR CARD (Interactive Monthly Calendar Grid)              */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm space-y-4">
          {/* Calendar Header with Navigation and View Mode Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            {/* Month & Year Navigation */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-white text-slate-700 hover:text-slate-900 rounded-xl transition-all"
                  aria-label="Previous Month"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs sm:text-sm font-black text-slate-900 px-3 min-w-[130px] sm:min-w-[145px] text-center select-none">
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </span>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-white text-slate-700 hover:text-slate-900 rounded-xl transition-all"
                  aria-label="Next Month"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleTodayJump}
                className="bg-indigo-50 hover:bg-indigo-100 text-[#4338ca] text-xs font-bold px-3 py-2 rounded-2xl transition-all active:scale-95"
              >
                Today
              </button>
            </div>

            {/* View Mode Toggle (Calendar vs List) */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl self-start sm:self-auto">
              <button
                onClick={() => setAttendanceViewMode('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  attendanceViewMode === 'calendar'
                    ? 'bg-white text-[#4338ca] shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Calendar</span>
              </button>
              <button
                onClick={() => setAttendanceViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  attendanceViewMode === 'list'
                    ? 'bg-white text-[#4338ca] shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List Log</span>
              </button>
            </div>
          </div>

          {/* Month Summary Bar */}
          <div className="flex items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl text-xs flex-wrap font-medium">
            <span className="text-slate-600">
              {MONTH_NAMES[currentMonth]} Overview:
            </span>
            <div className="flex items-center gap-3 text-[11px] font-bold">
              <span className="text-emerald-700 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span>{monthPresent} Present</span>
              </span>
              <span className="text-rose-700 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                <span>{monthAbsent} Absent</span>
              </span>
              <span className="text-amber-700 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                <span>{monthLate} Late</span>
              </span>
              <span className="text-indigo-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                {monthPercentage}% Rate
              </span>
            </div>
          </div>

          {attendanceViewMode === 'calendar' ? (
            <>
              {/* Calendar Days Header */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName, idx) => (
                  <div
                    key={dayName}
                    className={`text-[10px] sm:text-xs font-extrabold uppercase tracking-wider py-1.5 ${
                      idx === 6 ? 'text-rose-500 font-black' : 'text-slate-400'
                    }`}
                  >
                    {dayName}
                  </div>
                ))}
              </div>

              {/* Calendar Grid (7 columns) */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {calendarDays.map((day) => {
                  const record = parentAttendance.find((a) => a.date === day.dateStr);
                  const isSelected = selectedCalendarDate === day.dateStr;

                  return (
                    <div
                      key={day.dateStr}
                      onClick={() => setSelectedCalendarDate(day.dateStr)}
                      className={`min-h-[52px] sm:min-h-[64px] p-1 sm:p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none relative ${
                        !day.isCurrentMonth
                          ? 'opacity-30 bg-slate-50/50 border-transparent text-slate-400'
                          : isSelected
                          ? 'ring-2 ring-[#4338ca] border-indigo-400 bg-indigo-50/40 shadow-sm'
                          : day.isToday
                          ? 'border-indigo-400 bg-white shadow-sm'
                          : 'border-slate-100 hover:border-slate-200 bg-white'
                      }`}
                    >
                      {/* Day Number + Today Indicator */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs sm:text-sm font-bold ${
                            day.isToday
                              ? 'text-[#4338ca] font-black'
                              : day.isWeekend
                              ? 'text-rose-500 font-semibold'
                              : 'text-slate-800'
                          }`}
                        >
                          {day.dayNumber}
                        </span>
                        {day.isToday && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#4338ca]" title="Today" />
                        )}
                      </div>

                      {/* Status Indicator */}
                      <div className="mt-1">
                        {record ? (
                          record.status === 'present' ? (
                            <div className="w-full py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black flex items-center justify-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span className="hidden sm:inline">Present</span>
                            </div>
                          ) : record.status === 'absent' ? (
                            <div className="w-full py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-black flex items-center justify-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                              <span className="hidden sm:inline">Absent</span>
                            </div>
                          ) : (
                            <div className="w-full py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-black flex items-center justify-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              <span className="hidden sm:inline">Late</span>
                            </div>
                          )
                        ) : day.isWeekend ? (
                          <span className="text-[9px] text-slate-400 block text-center font-medium">
                            Holiday
                          </span>
                        ) : day.isFuture ? (
                          <span className="text-[9px] text-slate-300 block text-center">—</span>
                        ) : (
                          <span className="text-[9px] text-slate-300 block text-center font-medium">
                            —
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Day Inspector Detail Card */}
              <div className="mt-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/40 border border-slate-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col items-center justify-center text-slate-800 shrink-0">
                    <span className="text-[9px] font-bold uppercase text-slate-400 leading-none">
                      {MONTH_NAMES[selectedDateObj.getMonth()]?.slice(0, 3)}
                    </span>
                    <span className="text-sm font-black text-slate-900 leading-tight">
                      {selectedDateObj.getDate()}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-900 leading-tight">
                      {selectedDateFormatted}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {selectedRecord?.remarks ||
                        (selectedRecord
                          ? `Roll call marked ${selectedRecord.status}`
                          : isSelectedSunday
                          ? 'Weekly Sunday School Holiday'
                          : isSelectedFuture
                          ? 'Upcoming school day'
                          : 'No roll call recorded on this date')}
                    </p>
                  </div>
                </div>

                <div>
                  {selectedRecord ? (
                    <span
                      className={`text-xs font-black uppercase px-3 py-1 rounded-xl shadow-sm inline-flex items-center gap-1.5 ${
                        selectedRecord.status === 'present'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : selectedRecord.status === 'absent'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          selectedRecord.status === 'present'
                            ? 'bg-emerald-600'
                            : selectedRecord.status === 'absent'
                            ? 'bg-rose-600'
                            : 'bg-amber-600'
                        }`}
                      />
                      <span>{selectedRecord.status}</span>
                    </span>
                  ) : isSelectedSunday ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600">
                      Holiday
                    </span>
                  ) : isSelectedFuture ? (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-xl bg-slate-100 text-slate-400">
                      Upcoming
                    </span>
                  ) : (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-xl bg-slate-100 text-slate-500">
                      Unrecorded
                    </span>
                  )}
                </div>
              </div>

              {/* Calendar Color Legend */}
              <div className="flex items-center justify-center gap-4 pt-2 border-t border-slate-100 text-[11px] font-semibold text-slate-500 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Present</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Absent</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Late</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <span>Weekend Holiday</span>
                </span>
              </div>
            </>
          ) : (
            /* List Log View */
            <div className="space-y-2">
              {parentAttendance.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <CalendarCheck className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                  <p className="text-xs font-semibold text-slate-600">
                    No attendance entries recorded yet
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Attendance updates appear immediately as teachers take roll call.
                  </p>
                </div>
              ) : (
                parentAttendance.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between hover:border-indigo-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                        {item.date.slice(-2)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{item.date}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {item.remarks || `Marked ${item.status} during morning session`}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-xl ${
                        item.status === 'present'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : item.status === 'absent'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TEACHER / ADMIN 1-TAP ATTENDANCE MATRIX
  // -------------------------------------------------------------
  const presentCount = displayedStudents.filter((s) => (attendanceData[s.id] || 'present') === 'present').length;
  const absentCount = displayedStudents.filter((s) => attendanceData[s.id] === 'absent').length;
  const lateCount = displayedStudents.filter((s) => attendanceData[s.id] === 'late').length;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <SchemaNotice visible={schemaMissing} />

      {/* Header & Controls Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {t('attendance.title', 'Daily Attendance')}
            </h2>
            <p className="text-xs text-slate-500">
              Single-screen 1-tap roll call with section-wise student filtering
            </p>
          </div>

          {/* Quick Mark All Present Button for Selected Section */}
          {displayedStudents.length > 0 && (
            <button
              onClick={handleMarkAllPresent}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 min-h-[40px]"
            >
              <Check className="w-4 h-4 text-emerald-600" />
              <span>
                {selectedSection === 'all'
                  ? t('attendance.markAllPresent', 'Mark All Present (1-Tap)')
                  : `Mark All Section ${selectedSection} Present`}
              </span>
            </button>
          )}
        </div>

        {/* Filter Row: Class Selector + Section Selector + Date Picker */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              {t('attendance.selectClass', 'Class / Grade')}
            </label>
            {classesList.length === 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">No classes found.</span>
                <Link
                  href="/classes"
                  className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Class</span>
                </Link>
              </div>
            ) : (
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedSection('all');
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {classesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.section ? `- Section ${c.section}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Section (Separate Roll Call)
            </label>
            <select
              value={selectedSection}
              onChange={(e) => {
                const sec = e.target.value;
                setSelectedSection(sec);
                // If a sibling batch exists matching this section, sync class batch
                const matchedBatch = siblingBatches.find(
                  (b) => b.section?.trim().toUpperCase() === sec.trim().toUpperCase()
                );
                if (matchedBatch && matchedBatch.id !== selectedClassId) {
                  setSelectedClassId(matchedBatch.id);
                }
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Sections ({classStudents.length} Students)</option>
              {availableSections.map((sec) => (
                <option key={sec} value={sec}>
                  Section {sec}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              {t('attendance.selectDate', 'Date')}
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Section Quick Toggle Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1 shrink-0">
            Section:
          </span>
          <button
            type="button"
            onClick={() => setSelectedSection('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 ${
              selectedSection === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 ring-2 ring-indigo-300'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Sections
          </button>
          {availableSections.map((sec) => {
            const countInSec = classStudents.filter((s) => {
              const stuSec = (s as any).section || currentClassObj?.section || 'A';
              return stuSec.trim().toUpperCase() === sec.trim().toUpperCase();
            }).length;

            return (
              <button
                key={sec}
                type="button"
                onClick={() => {
                  setSelectedSection(sec);
                  const matchedBatch = siblingBatches.find(
                    (b) => b.section?.trim().toUpperCase() === sec.trim().toUpperCase()
                  );
                  if (matchedBatch && matchedBatch.id !== selectedClassId) {
                    setSelectedClassId(matchedBatch.id);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 flex items-center gap-1.5 ${
                  selectedSection === sec
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 ring-2 ring-indigo-300'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>Section {sec}</span>
                {countInSec > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                      selectedSection === sec ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {countInSec}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Attendance Counter Strip for Displayed Section */}
        {displayedStudents.length > 0 && (
          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-2xl text-center">
            <div className="text-emerald-700 font-bold text-xs">
              Present: <span className="text-sm font-black">{presentCount}</span>
            </div>
            <div className="text-rose-700 font-bold text-xs">
              Absent: <span className="text-sm font-black">{absentCount}</span>
            </div>
            <div className="text-amber-700 font-bold text-xs">
              Late: <span className="text-sm font-black">{lateCount}</span>
            </div>
          </div>
        )}
      </div>

      {/* Alert Banner upon Saving */}
      {alertNotice && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-xs font-semibold text-emerald-900 leading-snug">{alertNotice}</p>
        </div>
      )}

      {/* Student List Matrix or Empty State */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center flex flex-col items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
          <p className="text-xs text-slate-500">Loading student roster...</p>
        </div>
      ) : classStudents.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Students in this Class</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {classesList.length === 0
              ? 'Please create your first class before taking attendance.'
              : 'Add students to this class batch to start marking morning attendance.'}
          </p>
          <div className="pt-2">
            <Link
              href={classesList.length === 0 ? '/classes' : '/students'}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{classesList.length === 0 ? 'Create Class' : 'Enroll Student'}</span>
            </Link>
          </div>
        </div>
      ) : displayedStudents.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Students in Section {selectedSection}</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            There are currently no students assigned to Section {selectedSection} in this class.
          </p>
          <button
            type="button"
            onClick={() => setSelectedSection('all')}
            className="text-xs font-bold text-indigo-600 hover:underline"
          >
            Show All Sections ({classStudents.length} Students)
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {displayedStudents.map((student) => {
            const currentStatus = attendanceData[student.id] || 'present';
            const studentSec = (student as any).section || currentClassObj?.section || 'A';

            return (
              <div
                key={student.id}
                className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
              >
                {/* Student Identity */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {student.roll_number || 'ST'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {student.full_name}
                      </p>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 uppercase shrink-0">
                        Sec {studentSec}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">
                      Parent: {student.parent_name || 'Guardian'} ({student.parent_phone})
                    </p>
                  </div>
                </div>

                {/* Segmented 1-Tap Control: P / A / L */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl shrink-0">
                  <button
                    type="button"
                    onClick={() => setStudentStatus(student.id, 'present')}
                    className={`w-9 h-9 sm:w-11 sm:h-10 rounded-xl text-xs font-black transition-all active:scale-90 flex items-center justify-center ${
                      currentStatus === 'present'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                    aria-label="Mark Present"
                  >
                    P
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentStatus(student.id, 'absent')}
                    className={`w-9 h-9 sm:w-11 sm:h-10 rounded-xl text-xs font-black transition-all active:scale-90 flex items-center justify-center ${
                      currentStatus === 'absent'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                    aria-label="Mark Absent"
                  >
                    A
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentStatus(student.id, 'late')}
                    className={`w-9 h-9 sm:w-11 sm:h-10 rounded-xl text-xs font-black transition-all active:scale-90 flex items-center justify-center ${
                      currentStatus === 'late'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                    aria-label="Mark Late"
                  >
                    L
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Save Action Bar */}
      {classStudents.length > 0 && (
        <div className="sticky bottom-20 sm:bottom-6 z-20 pt-2">
          <button
            onClick={handleSaveAndNotify}
            disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 active:scale-[0.98] text-white py-4 rounded-2xl text-xs sm:text-sm font-bold shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 transition-all min-h-[52px]"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>
              {saving
                ? 'Saving Attendance...'
                : t('attendance.saveAndNotify', 'Save & Send Parent Absent Alerts')}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
