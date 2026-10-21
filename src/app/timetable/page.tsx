'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/context';
import {
  Clock,
  Calendar,
  Users,
  MapPin,
  Plus,
  X,
  Loader2,
  Pencil,
  Trash2,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  Video,
  ExternalLink,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { TimetableEntry, Subject, ClassBatch, UserProfile } from '@/types/app.types';
import { SchemaNotice } from '@/components/common/schema-notice';
import {
  getLocalDataForInstitute,
  appendLocalData,
  syncLocalWithRemote,
  updateLocalData,
  removeLocalData,
} from '@/lib/storage-helper';

function formatDisplayTime(t?: string): string {
  if (!t) return '--:--';
  const parts = t.split(':');
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes} ${ampm}`;
  }
  return t;
}

export default function TimetablePage() {
  const { user, institute, activeChild, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const supabase = createClient();
  const instId = institute?.id || user?.institute_id || null;

  const isStaff =
    user?.role === 'teacher' ||
    user?.role === 'institute_admin' ||
    user?.role === 'super_admin';

  // Day 1 = Monday ... 7 = Sunday
  const todayNum = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const [selectedDay, setSelectedDay] = useState<number>(todayNum);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [timetableList, setTimetableList] = useState<TimetableEntry[]>([]);
  const [classesList, setClassesList] = useState<ClassBatch[]>([]);
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [teachersList, setTeachersList] = useState<UserProfile[]>([]);

  const [loading, setLoading] = useState(false);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Slot Form State
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [periodNumber, setPeriodNumber] = useState('1');
  const [addDay, setAddDay] = useState<number>(todayNum);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('09:45');
  const [roomNumber, setRoomNumber] = useState('Room 101');
  const [zoomUrl, setZoomUrl] = useState('');
  const [isNewSubjectMode, setIsNewSubjectMode] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Slot Form State
  const [editingSlot, setEditingSlot] = useState<TimetableEntry | null>(null);
  const [editSubjectId, setEditSubjectId] = useState('');
  const [editTeacherId, setEditTeacherId] = useState('');
  const [editDay, setEditDay] = useState(1);
  const [editStartTime, setEditStartTime] = useState('09:00');
  const [editEndTime, setEditEndTime] = useState('09:45');
  const [editRoomNumber, setEditRoomNumber] = useState('Room 101');
  const [editZoomUrl, setEditZoomUrl] = useState('');
  const [editFormError, setEditFormError] = useState<string | null>(null);

  const days = [
    { num: 1, name: 'Monday' },
    { num: 2, name: 'Tuesday' },
    { num: 3, name: 'Wednesday' },
    { num: 4, name: 'Thursday' },
    { num: 5, name: 'Friday' },
    { num: 6, name: 'Saturday' },
    { num: 7, name: 'Sunday' },
  ];

  const showNotification = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const loadData = useCallback(async () => {
    if (!instId) return;
    setLoading(true);

    try {
      // 1. Classes: Fetch via /api/classes
      let classes: ClassBatch[] = [];
      try {
        const clsRes = await fetch(`/api/classes?institute_id=${instId}`);
        const clsJson = await clsRes.json();
        if (clsJson?.classes && Array.isArray(clsJson.classes)) {
          classes = clsJson.classes;
        }
      } catch {
        // Fallback to supabase anon or local storage
        const { data: dbCls } = await supabase
          .from('classes')
          .select('*')
          .eq('institute_id', instId)
          .order('name');
        if (dbCls) classes = dbCls as ClassBatch[];
      }

      if (classes.length > 0) {
        const mergedClasses = syncLocalWithRemote('classes', classes, instId);
        setClassesList(mergedClasses);

        // Auto-select active student's class if parent or student
        if (activeChild?.class_id && mergedClasses.some((c) => c.id === activeChild.class_id)) {
          setSelectedClassId(activeChild.class_id);
        } else {
          setSelectedClassId((prev) => (mergedClasses.some((c) => c.id === prev) ? prev : mergedClasses[0].id));
        }
      } else {
        const localCls = getLocalDataForInstitute<ClassBatch>('classes', instId);
        setClassesList(localCls);
        if (localCls.length > 0) {
          setSelectedClassId((prev) => (localCls.some((c) => c.id === prev) ? prev : localCls[0].id));
        }
      }

      // 2. Timetable: Fetch via /api/timetable
      try {
        const ttRes = await fetch(`/api/timetable?institute_id=${instId}`);
        const ttJson = await ttRes.json();
        if (ttJson?.timetable && Array.isArray(ttJson.timetable)) {
          setTimetableList(syncLocalWithRemote('timetable', ttJson.timetable as TimetableEntry[], instId));
        } else {
          setTimetableList(getLocalDataForInstitute<TimetableEntry>('timetable', instId));
        }
      } catch {
        setTimetableList(getLocalDataForInstitute<TimetableEntry>('timetable', instId));
      }

      // 3. Subjects: Fetch via /api/subjects
      try {
        const subRes = await fetch(`/api/subjects?institute_id=${instId}`);
        const subJson = await subRes.json();
        if (subJson?.subjects && Array.isArray(subJson.subjects)) {
          const remoteSubs = subJson.subjects as Subject[];
          const mergedSubs = syncLocalWithRemote('subjects', remoteSubs, instId);
          setSubjectsList(mergedSubs);
          if (mergedSubs.length > 0) {
            setSubjectId((prev) => (mergedSubs.some((s) => s.id === prev) ? prev : mergedSubs[0].id));
          }
        } else {
          const localSubs = getLocalDataForInstitute<Subject>('subjects', instId);
          setSubjectsList(localSubs);
          if (localSubs.length > 0) setSubjectId((prev) => prev || localSubs[0].id);
        }
      } catch {
        const localSubs = getLocalDataForInstitute<Subject>('subjects', instId);
        setSubjectsList(localSubs);
        if (localSubs.length > 0) setSubjectId((prev) => prev || localSubs[0].id);
      }

      // 4. Teachers: Fetch via /api/teachers
      try {
        const tRes = await fetch(`/api/teachers?institute_id=${instId}`);
        const tJson = await tRes.json();
        if (tJson?.teachers && Array.isArray(tJson.teachers)) {
          const teachers = tJson.teachers as UserProfile[];
          setTeachersList(syncLocalWithRemote('teachers', teachers, instId));
          if (teachers.length > 0) {
            setTeacherId((prev) => (teachers.some((t) => t.id === prev) ? prev : teachers[0].id));
          }
        } else {
          const localTeachers = getLocalDataForInstitute<UserProfile>('teachers', instId);
          setTeachersList(localTeachers);
          if (localTeachers.length > 0) setTeacherId((prev) => prev || localTeachers[0].id);
        }
      } catch {
        const localTeachers = getLocalDataForInstitute<UserProfile>('teachers', instId);
        setTeachersList(localTeachers);
        if (localTeachers.length > 0) setTeacherId((prev) => prev || localTeachers[0].id);
      }
    } catch (err) {
      console.warn('Error loading timetable data:', err);
      setClassesList(getLocalDataForInstitute<ClassBatch>('classes', instId));
      setTimetableList(getLocalDataForInstitute<TimetableEntry>('timetable', instId));
      setSubjectsList(getLocalDataForInstitute<Subject>('subjects', instId));
      setTeachersList(getLocalDataForInstitute<UserProfile>('teachers', instId));
    } finally {
      setLoading(false);
    }
  }, [instId, supabase, activeChild]);

  // Load subjects for specific selected class if changed
  const refreshSubjectsForClass = useCallback(
    async (clsId: string) => {
      if (!instId || !clsId) return;
      try {
        const res = await fetch(`/api/subjects?institute_id=${instId}&class_id=${clsId}`);
        const json = await res.json();
        if (json?.subjects && Array.isArray(json.subjects)) {
          setSubjectsList((prev) => {
            const map = new Map<string, Subject>();
            prev.forEach((s) => map.set(s.id, s));
            json.subjects.forEach((s: Subject) => map.set(s.id, s));
            return Array.from(map.values());
          });
          if (json.subjects.length > 0) {
            setSubjectId(json.subjects[0].id);
          }
        }
      } catch {
        // keep existing
      }
    },
    [instId]
  );

  useEffect(() => {
    if (authLoading) return;
    const localCls = getLocalDataForInstitute<ClassBatch>('classes', instId);
    const localTT = getLocalDataForInstitute<TimetableEntry>('timetable', instId);
    const localSubs = getLocalDataForInstitute<Subject>('subjects', instId);
    const localTeachers = getLocalDataForInstitute<UserProfile>('teachers', instId);

    if (localCls.length > 0) {
      setClassesList(localCls);
      setSelectedClassId((prev) => prev || localCls[0].id);
    }
    if (localTT.length > 0) setTimetableList(localTT);
    if (localSubs.length > 0) setSubjectsList(localSubs);
    if (localTeachers.length > 0) setTeachersList(localTeachers);

    loadData();
  }, [loadData, instId, authLoading]);

  // When selected class changes, refresh subjects
  useEffect(() => {
    if (selectedClassId) {
      refreshSubjectsForClass(selectedClassId);
    }
  }, [selectedClassId, refreshSubjectsForClass]);

  // Sync addDay with selectedDay when modal opens
  const handleOpenAddModal = () => {
    setAddDay(selectedDay);
    setIsNewSubjectMode(false);
    setNewSubjectName('');
    setFormError(null);

    // Auto-select teacher if not set
    if (!teacherId && teachersList.length > 0) {
      setTeacherId(teachersList[0].id);
    } else if (!teacherId && user?.id) {
      setTeacherId(user.id);
    }

    // Auto-select subject if not set
    const classSubjects = subjectsList.filter(
      (s) => !s.class_id || s.class_id === selectedClassId
    );
    if (classSubjects.length > 0) {
      setSubjectId(classSubjects[0].id);
    } else if (subjectsList.length > 0) {
      setSubjectId(subjectsList[0].id);
    } else {
      setIsNewSubjectMode(true);
    }

    setShowAddModal(true);
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedClassId) {
      setFormError('Please select a class first');
      return;
    }

    if (isNewSubjectMode && !newSubjectName.trim()) {
      setFormError('Please enter a subject name');
      return;
    }

    if (!isNewSubjectMode && !subjectId) {
      setFormError('Please choose a subject or create a new one');
      return;
    }

    if (endTime <= startTime) {
      setFormError('End time must be after start time (e.g., 09:00 - 09:45)');
      return;
    }

    setIsSubmitting(true);
    const effectiveInstId = instId || '00000000-0000-0000-0000-000000000001';

    const payload = {
      institute_id: effectiveInstId,
      class_id: selectedClassId,
      subject_id: isNewSubjectMode ? null : subjectId,
      subject_name: isNewSubjectMode ? newSubjectName.trim() : null,
      teacher_id: teacherId || user?.id || null,
      day_of_week: addDay,
      start_time: startTime,
      end_time: endTime,
      room_number: roomNumber?.trim() || 'Room 101',
      zoom_url: zoomUrl.trim() || null,
    };

    try {
      const res = await fetch('/api/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save timetable period');
      }

      const createdSlot = json.slot as TimetableEntry;
      setTimetableList(appendLocalData('timetable', createdSlot, instId));

      // Refresh subjects list in case a new subject was provisioned
      refreshSubjectsForClass(selectedClassId);

      setShowAddModal(false);
      showNotification('success', 'Period added to timetable successfully!');
    } catch (err: any) {
      console.error('Error creating timetable slot:', err);
      setFormError(err.message || 'Error creating timetable period. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditSlot = (slot: TimetableEntry) => {
    setEditingSlot(slot);
    setEditSubjectId(slot.subject_id);
    setEditTeacherId(slot.teacher_id || '');
    setEditDay(slot.day_of_week);
    setEditStartTime(slot.start_time?.slice(0, 5) || '09:00');
    setEditEndTime(slot.end_time?.slice(0, 5) || '09:45');
    setEditRoomNumber(slot.room_number || 'Room 101');
    setEditZoomUrl((slot as any).zoom_url || '');
    setEditFormError(null);
  };

  const handleUpdateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;
    setEditFormError(null);

    if (editEndTime <= editStartTime) {
      setEditFormError('End time must be after start time');
      return;
    }

    const updates = {
      id: editingSlot.id,
      subject_id: editSubjectId,
      teacher_id: editTeacherId || null,
      day_of_week: editDay,
      start_time: editStartTime,
      end_time: editEndTime,
      room_number: editRoomNumber?.trim() || 'Room 101',
      zoom_url: editZoomUrl.trim() || null,
    };

    try {
      const res = await fetch('/api/timetable', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update timetable period');
      }

      const updated = json.slot as TimetableEntry;
      setTimetableList(updateLocalData<TimetableEntry>('timetable', editingSlot.id, updated, instId));
      setEditingSlot(null);
      showNotification('success', 'Timetable period updated successfully!');
    } catch (err: any) {
      setEditFormError(err.message || 'Failed to update period');
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this period from the timetable?')) {
      return;
    }

    try {
      const res = await fetch(`/api/timetable?id=${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete period');
      }

      setTimetableList(removeLocalData<TimetableEntry>('timetable', id, instId));
      showNotification('success', 'Timetable period deleted.');
    } catch (err: any) {
      console.error('Delete error:', err);
      // Fallback local update
      setTimetableList(removeLocalData<TimetableEntry>('timetable', id, instId));
      showNotification('success', 'Timetable period removed.');
    }
  };

  // Filter slots by selected class and day, sorted by start_time
  const filteredSlots = timetableList
    .filter((slot) => slot.class_id === selectedClassId && slot.day_of_week === selectedDay)
    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

  // Relevant subjects for current class
  const classSubjects = subjectsList.filter(
    (s) => !s.class_id || s.class_id === selectedClassId
  );
  const displaySubjects = classSubjects.length > 0 ? classSubjects : subjectsList;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <SchemaNotice visible={schemaMissing} />

      {/* Floating Action Notification */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold shadow-md transition-all ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            {t('nav.timetable', 'Weekly Timetable')}
          </h2>
          <p className="text-xs text-slate-500">
            {isStaff
              ? 'Class schedule, period timings, subject teachers, and room numbers'
              : 'View daily period timings, subject lectures, faculty, and room locations'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {classesList.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">Class:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {classesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.section ? `(${c.section})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isStaff && (
            <button
              onClick={handleOpenAddModal}
              className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Period</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Online Classes Banner */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-3.5 border border-indigo-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Video className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">Live Online Zoom Classes</p>
            <p className="text-[11px] text-slate-500 truncate">
              Schedule or join live interactive Zoom video lectures & webinars
            </p>
          </div>
        </div>
        <Link
          href="/online-classes"
          className="bg-white hover:bg-indigo-50 border border-indigo-200 text-[#4338ca] text-xs font-bold px-3 py-1.5 rounded-xl transition-all shrink-0 flex items-center gap-1 shadow-sm"
        >
          <span>Open Zoom Classes</span>
          <span>→</span>
        </Link>
      </div>

      {/* Day Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {days.map((d) => {
          const isToday = d.num === todayNum;
          const isCurrentSelected = selectedDay === d.num;
          return (
            <button
              key={d.num}
              onClick={() => setSelectedDay(d.num)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 transition-all active:scale-95 min-h-[42px] flex items-center gap-1.5 ${
                isCurrentSelected
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 ring-2 ring-indigo-300'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{d.name}</span>
              {isToday && (
                <span
                  className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${
                    isCurrentSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-indigo-50 text-indigo-600'
                  }`}
                >
                  Today
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Period Schedule Cards or Empty State */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
          <p className="text-xs">Loading timetable schedule...</p>
        </div>
      ) : classesList.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Classes Created Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Create your classes first to build timetable schedules for each standard and division.
          </p>
          {isStaff && (
            <div className="pt-2">
              <Link
                href="/classes"
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create Class</span>
              </Link>
            </div>
          )}
        </div>
      ) : filteredSlots.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3">
          <Clock className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-xs font-bold text-slate-700">No scheduled periods</h3>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            No periods assigned for {days.find((d) => d.num === selectedDay)?.name} for this class.
          </p>
          {isStaff && (
            <div className="pt-1">
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Period to Schedule</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSlots.map((slot, index) => {
            const subject = subjectsList.find((s) => s.id === slot.subject_id);
            const teacher = teachersList.find((u) => u.id === slot.teacher_id);
            return (
              <div
                key={slot.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center justify-between gap-4 hover:border-indigo-200 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] uppercase font-bold text-indigo-400">Period</span>
                    <span className="text-base font-black text-indigo-700 leading-none">
                      {index + 1}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        {subject?.name || 'Class Subject'}
                      </h3>
                      {subject?.code && (
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                          {subject.code}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Teacher:{' '}
                        <span className="font-semibold text-slate-700">
                          {teacher?.full_name || 'Assigned Faculty'}
                        </span>
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 justify-end">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      <span>
                        {formatDisplayTime(slot.start_time)} - {formatDisplayTime(slot.end_time)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 justify-end mt-1">
                      <MapPin className="w-3 h-3" />
                      <span>{slot.room_number || 'Room 101'}</span>
                    </div>

                    {(slot as any).zoom_url && (
                      <div className="mt-2 flex justify-end">
                        <a
                          href={(slot as any).zoom_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-[#4338ca] hover:bg-[#3730a3] text-white shadow-sm transition-all"
                        >
                          <Video className="w-3 h-3" />
                          <span>Join Zoom</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-80" />
                        </a>
                      </div>
                    )}
                  </div>

                  {isStaff && (
                    <div className="flex items-center gap-1 pl-2 border-l border-slate-100">
                      <button
                        onClick={() => handleOpenEditSlot(slot)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit Period"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Period"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add Period Slot */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Add Timetable Period</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddSlot} className="space-y-4 mt-4">
              {/* Subject Selection / Creation */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase">
                    Subject
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsNewSubjectMode(!isNewSubjectMode)}
                    className="text-[11px] text-indigo-600 font-bold hover:underline"
                  >
                    {isNewSubjectMode ? '← Pick Existing' : '+ New Subject'}
                  </button>
                </div>

                {isNewSubjectMode ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      placeholder="e.g. Mathematics, React JS, Flutter..."
                      className="w-full bg-slate-50 border border-indigo-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      autoFocus
                    />
                    <p className="text-[10px] text-slate-400">
                      This subject will be automatically registered for this class.
                    </p>
                  </div>
                ) : (
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {displaySubjects.length === 0 ? (
                      <option value="">No subjects yet (Click + New Subject)</option>
                    ) : (
                      displaySubjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.code ? `(${s.code})` : ''}
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>

              {/* Teacher Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Assign Teacher / Faculty
                </label>
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {teachersList.length === 0 ? (
                    <option value={user?.id || ''}>
                      {user?.full_name || 'School Administrator'} (Default Faculty)
                    </option>
                  ) : (
                    teachersList.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name} ({t.role === 'teacher' ? 'Teacher' : 'Staff'})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Day & Room */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Day of Week
                  </label>
                  <select
                    value={addDay}
                    onChange={(e) => setAddDay(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    {days.map((d) => (
                      <option key={d.num} value={d.num}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Room / Hall
                  </label>
                  <input
                    type="text"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="e.g. Lab 1, Room 101"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Zoom Link */}
              <div>
                <label className="block text-[11px] font-bold text-[#4338ca] uppercase mb-1">
                  Zoom / Online Class Link (Optional)
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={zoomUrl}
                    onChange={(e) => setZoomUrl(e.target.value)}
                    placeholder="https://zoom.us/j/... (Optional)"
                    className="w-full bg-indigo-50/50 border border-indigo-200 rounded-xl pl-8 pr-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <Video className="w-3.5 h-3.5 text-indigo-600 absolute left-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* Start & End Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 active:scale-[0.98] text-white py-3.5 rounded-2xl text-xs font-bold shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>{isSubmitting ? 'Saving Period...' : 'Add to Schedule'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Period Slot */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-600" />
                <span>Edit Timetable Period</span>
              </h3>
              <button
                onClick={() => setEditingSlot(null)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editFormError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editFormError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateSlot} className="space-y-4 mt-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Subject
                </label>
                <select
                  value={editSubjectId}
                  onChange={(e) => setEditSubjectId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  required
                >
                  {displaySubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.code ? `(${s.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Assign Teacher / Faculty
                </label>
                <select
                  value={editTeacherId}
                  onChange={(e) => setEditTeacherId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                >
                  {teachersList.length === 0 ? (
                    <option value={user?.id || ''}>
                      {user?.full_name || 'School Administrator'}
                    </option>
                  ) : (
                    teachersList.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name} ({t.role === 'teacher' ? 'Teacher' : 'Staff'})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Day
                  </label>
                  <select
                    value={editDay}
                    onChange={(e) => setEditDay(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    {days.map((d) => (
                      <option key={d.num} value={d.num}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Room / Hall
                  </label>
                  <input
                    type="text"
                    value={editRoomNumber}
                    onChange={(e) => setEditRoomNumber(e.target.value)}
                    placeholder="e.g. Room 101"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Zoom Meeting Link */}
              <div>
                <label className="block text-[11px] font-bold text-[#4338ca] uppercase mb-1">
                  Zoom / Online Class Link (Optional)
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={editZoomUrl}
                    onChange={(e) => setEditZoomUrl(e.target.value)}
                    placeholder="https://zoom.us/j/... (Optional)"
                    className="w-full bg-indigo-50/50 border border-indigo-200 rounded-xl pl-8 pr-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <Video className="w-3.5 h-3.5 text-indigo-600 absolute left-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white py-3.5 rounded-2xl text-xs font-bold shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Update Schedule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
