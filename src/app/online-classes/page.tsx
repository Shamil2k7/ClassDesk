'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/context';
import {
  Video,
  Calendar,
  Clock,
  Users,
  Plus,
  X,
  ExternalLink,
  Copy,
  Check,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  Radio,
  Sparkles,
  BookOpen,
  User,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { OnlineClass, Subject, ClassBatch, UserProfile } from '@/types/app.types';
import {
  getLocalDataForInstitute,
  saveLocalData,
  appendLocalData,
  syncLocalWithRemote,
  updateLocalData,
  removeLocalData,
} from '@/lib/storage-helper';

function formatTime(timeStr?: string): string {
  if (!timeStr) return '--:--';
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes} ${ampm}`;
  }
  return timeStr;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getInitialSeedOnlineClasses(targetInstId: string, classBatchId?: string): OnlineClass[] {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const inTwoDays = new Date(Date.now() + 172800000).toISOString().split('T')[0];
  const cId = classBatchId || '00000000-0000-0000-0000-000000000002';

  return [
    {
      id: 'zoom-live-session-1',
      institute_id: targetInstId,
      class_id: cId,
      subject_id: 'sub-math-live',
      teacher_id: null,
      teacher_name: 'Dr. Sarah Mathews (Mathematics)',
      title: 'Mathematics: Live Algebra & Problem Solving Masterclass',
      description: 'Interactive doubt clearance session with live whiteboard walkthroughs and exam questions review.',
      date: today,
      start_time: '10:00',
      end_time: '11:00',
      zoom_url: 'https://zoom.us/j/84529104421?pwd=mathlive2026',
      meeting_id: '845 2910 4421',
      passcode: 'math2026',
      status: 'live',
      created_at: new Date().toISOString(),
    },
    {
      id: 'zoom-upcoming-session-1',
      institute_id: targetInstId,
      class_id: cId,
      subject_id: 'sub-phy-up',
      teacher_id: null,
      teacher_name: 'Prof. Rajesh Nair (Physics)',
      title: 'Physics: Ray Optics & Snell Law Live Demonstration',
      description: 'Demonstration of light reflection principles with live interactive digital simulator apparatus.',
      date: tomorrow,
      start_time: '11:30',
      end_time: '12:30',
      zoom_url: 'https://zoom.us/j/93128405122?pwd=phylive2026',
      meeting_id: '931 2840 5122',
      passcode: 'phy2026',
      status: 'scheduled',
      created_at: new Date().toISOString(),
    },
    {
      id: 'zoom-upcoming-session-2',
      institute_id: targetInstId,
      class_id: cId,
      subject_id: 'sub-eng-up',
      teacher_id: null,
      teacher_name: 'Mrs. Anita Menon (English)',
      title: 'English Literature: Critical Essay Writing & Board Tips',
      description: 'Deep dive into drama excerpts and scoring structure for terminal board examinations.',
      date: inTwoDays,
      start_time: '14:00',
      end_time: '15:00',
      zoom_url: 'https://zoom.us/j/77219403810?pwd=englive2026',
      meeting_id: '772 1940 3810',
      passcode: 'eng2026',
      status: 'scheduled',
      created_at: new Date().toISOString(),
    },
  ];
}

export default function OnlineClassesPage() {
  const { user, institute, activeChild, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const supabase = useMemo(() => createClient(), []);
  const instId = institute?.id || user?.institute_id || null;

  const isStaff =
    user?.role === 'teacher' ||
    user?.role === 'institute_admin' ||
    user?.role === 'super_admin';

  const [classesList, setClassesList] = useState<ClassBatch[]>([]);
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [teachersList, setTeachersList] = useState<UserProfile[]>([]);
  const [onlineClasses, setOnlineClasses] = useState<OnlineClass[]>([]);

  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'upcoming' | 'completed'>('all');

  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State - Add
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('10:45');
  const [zoomUrl, setZoomUrl] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [teacherId, setTeacherId] = useState(user?.role === 'teacher' ? user.id : '');

  // Modal State - Edit
  const [editingClass, setEditingClass] = useState<OnlineClass | null>(null);
  const [editClassId, setEditClassId] = useState('');
  const [editSubjectId, setEditSubjectId] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editZoomUrl, setEditZoomUrl] = useState('');
  const [editMeetingId, setEditMeetingId] = useState('');
  const [editPasscode, setEditPasscode] = useState('');
  const [editTeacherId, setEditTeacherId] = useState('');
  const [editStatus, setEditStatus] = useState<'scheduled' | 'live' | 'completed' | 'cancelled'>('scheduled');

  // Load Data
  const fetchData = useCallback(async () => {
    if (!instId && user?.role !== 'super_admin') {
      setLoading(false);
      return;
    }

    setLoading(true);
    let resolvedClassId = '00000000-0000-0000-0000-000000000002';

    try {
      // 1. Classes
      try {
        let q = supabase.from('classes').select('*').order('name');
        if (instId) q = q.eq('institute_id', instId);
        const { data } = await q;
        if (data && data.length > 0) {
          const synced = syncLocalWithRemote('classes', data as ClassBatch[]);
          setClassesList(synced);
          if (synced[0]?.id) resolvedClassId = synced[0].id;
        } else {
          const local = getLocalDataForInstitute<ClassBatch>('classes', instId);
          setClassesList(local);
          if (local[0]?.id) resolvedClassId = local[0].id;
        }
      } catch {
        const local = getLocalDataForInstitute<ClassBatch>('classes', instId);
        setClassesList(local);
        if (local[0]?.id) resolvedClassId = local[0].id;
      }

      // 2. Subjects
      try {
        let q = supabase.from('subjects').select('*').order('name');
        if (instId) q = q.eq('institute_id', instId);
        const { data } = await q;
        if (data && data.length > 0) {
          setSubjectsList(syncLocalWithRemote('subjects', data as Subject[]));
        } else {
          setSubjectsList(getLocalDataForInstitute<Subject>('subjects', instId));
        }
      } catch {
        setSubjectsList(getLocalDataForInstitute<Subject>('subjects', instId));
      }

      // 3. Teachers
      try {
        let q = supabase.from('users').select('*').eq('role', 'teacher');
        if (instId) q = q.eq('institute_id', instId);
        const { data } = await q;
        if (data && data.length > 0) {
          setTeachersList(syncLocalWithRemote('teachers', data as UserProfile[]));
        } else {
          setTeachersList(getLocalDataForInstitute<UserProfile>('teachers', instId));
        }
      } catch {
        setTeachersList(getLocalDataForInstitute<UserProfile>('teachers', instId));
      }

      // 4. Online Classes
      try {
        let q = (supabase as any).from('online_classes').select('*').order('date', { ascending: false });
        if (instId) q = q.eq('institute_id', instId);
        const { data, error } = await q;
        if (error || !data || data.length === 0) {
          const local = getLocalDataForInstitute<OnlineClass>('onlineClasses', instId);
          if (local.length > 0) {
            setOnlineClasses(local);
          } else {
            const seeded = getInitialSeedOnlineClasses(instId || 'default-inst', resolvedClassId);
            setOnlineClasses(seeded);
            saveLocalData('onlineClasses', seeded);
          }
        } else {
          setOnlineClasses(syncLocalWithRemote('onlineClasses', data as OnlineClass[], instId));
        }
      } catch {
        const local = getLocalDataForInstitute<OnlineClass>('onlineClasses', instId);
        if (local.length > 0) {
          setOnlineClasses(local);
        } else {
          const seeded = getInitialSeedOnlineClasses(instId || 'default-inst', resolvedClassId);
          setOnlineClasses(seeded);
          saveLocalData('onlineClasses', seeded);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [supabase, instId, user?.role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // If student/parent, pre-filter to child's class
  useEffect(() => {
    if (user?.role === 'parent' && activeChild?.class_id) {
      setSelectedClassId(activeChild.class_id);
    }
  }, [user?.role, activeChild?.class_id]);

  // Set default classId for add form when classes load
  useEffect(() => {
    if (classesList.length > 0 && !classId) {
      setClassId(classesList[0].id);
    }
    if (classesList.length > 0 && !editClassId) {
      setEditClassId(classesList[0].id);
    }
  }, [classesList, classId, editClassId]);

  // Filter subjects based on selected class in add form
  const availableSubjectsForAdd = subjectsList.filter(
    (s) => !classId || s.class_id === classId
  );

  const availableSubjectsForEdit = subjectsList.filter(
    (s) => !editClassId || s.class_id === editClassId
  );

  useEffect(() => {
    if (availableSubjectsForAdd.length > 0 && (!subjectId || !availableSubjectsForAdd.some(s => s.id === subjectId))) {
      setSubjectId(availableSubjectsForAdd[0].id);
    }
  }, [classId, availableSubjectsForAdd, subjectId]);

  // Copy zoom details
  const handleCopy = (item: OnlineClass) => {
    const text = `Join Zoom Class:\nTopic: ${item.title}\nDate: ${formatDate(item.date)}\nTime: ${formatTime(item.start_time)} - ${formatTime(item.end_time)}\nZoom Link: ${item.zoom_url}${item.meeting_id ? `\nMeeting ID: ${item.meeting_id}` : ''}${item.passcode ? `\nPasscode: ${item.passcode}` : ''}`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Helper to generate a realistic Zoom link for quick testing
  const handleGenerateSampleZoomLink = () => {
    const randomMeetingId = Math.floor(1000000000 + Math.random() * 9000000000);
    const randomPwd = Math.random().toString(36).substring(2, 8).toUpperCase();
    setZoomUrl(`https://us05web.zoom.us/j/${randomMeetingId}?pwd=${randomPwd.toLowerCase()}`);
    setMeetingId(String(randomMeetingId).replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3'));
    setPasscode(randomPwd);
  };

  // Create Online Class
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Please enter a class topic or title.');
      return;
    }
    if (!zoomUrl.trim()) {
      setFormError('Please enter the Zoom meeting link.');
      return;
    }
    if (!classId) {
      setFormError('Please select a class.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const teacherObj = teachersList.find((t) => t.id === teacherId);
    const teacherName = teacherObj?.full_name || user?.full_name || 'Teacher';

    const newClass: OnlineClass = {
      id: crypto.randomUUID(),
      institute_id: instId || 'default-inst',
      class_id: classId,
      subject_id: subjectId || (availableSubjectsForAdd[0]?.id || ''),
      teacher_id: teacherId || user?.id || null,
      teacher_name: teacherName,
      title: title.trim(),
      description: description.trim() || null,
      date,
      start_time: startTime,
      end_time: endTime,
      zoom_url: zoomUrl.trim(),
      meeting_id: meetingId.trim() || null,
      passcode: passcode.trim() || null,
      status: 'scheduled',
      created_at: new Date().toISOString(),
    };

    try {
      // 1. Try Supabase
      try {
        await (supabase as any).from('online_classes').insert([newClass]);
      } catch (err) {
        console.warn('Supabase insert fallback:', err);
      }

      // 2. Local Storage
      appendLocalData('onlineClasses', newClass, instId);
      setOnlineClasses((prev) => [newClass, ...prev]);

      // Reset form
      setTitle('');
      setDescription('');
      setZoomUrl('');
      setMeetingId('');
      setPasscode('');
      setShowAddModal(false);

      setActionNotice({
        type: 'success',
        text: `Online Zoom class "${newClass.title}" scheduled successfully!`,
      });
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      console.error(err);
      setFormError('Failed to schedule class. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleStartEdit = (item: OnlineClass) => {
    setEditingClass(item);
    setEditClassId(item.class_id);
    setEditSubjectId(item.subject_id);
    setEditTitle(item.title);
    setEditDescription(item.description || '');
    setEditDate(item.date);
    setEditStartTime(item.start_time);
    setEditEndTime(item.end_time);
    setEditZoomUrl(item.zoom_url);
    setEditMeetingId(item.meeting_id || '');
    setEditPasscode(item.passcode || '');
    setEditTeacherId(item.teacher_id || '');
    setEditStatus(item.status);
  };

  // Submit Edit
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;

    setIsSubmitting(true);
    const teacherObj = teachersList.find((t) => t.id === editTeacherId);
    const teacherName = teacherObj?.full_name || editingClass.teacher_name;

    const updates: Partial<OnlineClass> = {
      class_id: editClassId,
      subject_id: editSubjectId,
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      date: editDate,
      start_time: editStartTime,
      end_time: editEndTime,
      zoom_url: editZoomUrl.trim(),
      meeting_id: editMeetingId.trim() || null,
      passcode: editPasscode.trim() || null,
      teacher_id: editTeacherId || null,
      teacher_name: teacherName,
      status: editStatus,
      updated_at: new Date().toISOString(),
    };

    try {
      try {
        await (supabase as any).from('online_classes').update(updates).eq('id', editingClass.id);
      } catch (err) {
        console.warn('Supabase update fallback:', err);
      }

      updateLocalData('onlineClasses', editingClass.id, updates, instId);
      setOnlineClasses((prev) =>
        prev.map((item) => (item.id === editingClass.id ? { ...item, ...updates } : item))
      );

      setEditingClass(null);
      setActionNotice({ type: 'success', text: 'Online Zoom class updated successfully!' });
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete
  const handleDelete = async (id: string, classTitle: string) => {
    if (!confirm(`Are you sure you want to cancel and remove "${classTitle}"?`)) return;

    try {
      try {
        await (supabase as any).from('online_classes').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase delete fallback:', err);
      }

      removeLocalData('onlineClasses', id, instId);
      setOnlineClasses((prev) => prev.filter((item) => item.id !== id));
      setActionNotice({ type: 'success', text: `Online class "${classTitle}" was removed.` });
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  // Quick toggle status for teachers
  const handleToggleStatus = async (item: OnlineClass, newStatus: 'scheduled' | 'live' | 'completed') => {
    const updates: Partial<OnlineClass> = { status: newStatus, updated_at: new Date().toISOString() };
    try {
      await (supabase as any).from('online_classes').update(updates).eq('id', item.id);
    } catch (err) {
      console.warn('Update remote status fallback:', err);
    }

    updateLocalData('onlineClasses', item.id, updates, instId);
    setOnlineClasses((prev) =>
      prev.map((c) => (c.id === item.id ? { ...c, ...updates } : c))
    );
    setActionNotice({
      type: 'success',
      text: `Zoom Class "${item.title}" is now marked as ${newStatus.toUpperCase()}!`,
    });
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Filter Online Classes
  const todayStr = new Date().toISOString().split('T')[0];

  const liveClassesList = onlineClasses.filter(
    (item) => item.status === 'live' || (item.date === todayStr && item.status === 'scheduled')
  );
  const upcomingClassesList = onlineClasses.filter(
    (item) => item.status === 'scheduled' && item.date >= todayStr
  );
  const completedClassesList = onlineClasses.filter(
    (item) => item.status === 'completed' || item.status === 'cancelled' || item.date < todayStr
  );

  const filteredClasses = onlineClasses.filter((item) => {
    if (selectedClassId !== 'all' && item.class_id !== selectedClassId) return false;
    if (selectedSubjectId !== 'all' && item.subject_id !== selectedSubjectId) return false;

    if (activeTab === 'live') {
      return item.status === 'live' || (item.date === todayStr && item.status === 'scheduled');
    }
    if (activeTab === 'upcoming') {
      return item.status === 'scheduled' && item.date >= todayStr;
    }
    if (activeTab === 'completed') {
      return item.status === 'completed' || item.status === 'cancelled' || item.date < todayStr;
    }
    return true; // 'all'
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* Action Notice Toast */}
      {actionNotice && (
        <div
          className={`p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold border animate-in fade-in slide-in-from-top duration-200 ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1d2793] via-[#2a38b8] to-[#4338ca] text-white rounded-3xl p-5 sm:p-7 shadow-lg relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Decorative Watermark */}
        <div className="absolute right-0 -bottom-6 opacity-15 pointer-events-none select-none">
          <Video className="w-48 h-48 text-white" />
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase mb-2">
            <Radio className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
            <span>Live Zoom Classroom</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
            Online Classes & Webinars
          </h2>
          <p className="text-xs text-indigo-100 mt-1 max-w-lg leading-relaxed">
            Live interactive lectures, doubt-clearing sessions, and exam revisions via Zoom video meetings.
          </p>
        </div>

        {isStaff && (
          <button
            onClick={() => setShowAddModal(true)}
            className="relative z-10 self-start sm:self-auto bg-white hover:bg-slate-50 text-[#3233a8] active:scale-95 px-5 py-3 rounded-2xl text-xs font-bold shadow-md shadow-indigo-950/20 inline-flex items-center gap-2 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Zoom Class</span>
          </button>
        )}
      </div>

      {/* Filter & Tab Controls */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs: All, Live Now, Upcoming, Completed */}
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl overflow-x-auto scrollbar-none max-w-full">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>All Classes</span>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-md font-bold">
                {onlineClasses.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('live')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'live'
                  ? 'bg-white text-rose-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Radio className="w-3 h-3 text-rose-500 animate-pulse" />
              <span>Live Now</span>
              {liveClassesList.length > 0 && (
                <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded-md font-black">
                  {liveClassesList.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'upcoming'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3 h-3 text-indigo-600" />
              <span>Upcoming</span>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded-md font-bold">
                {upcomingClassesList.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'completed'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>History</span>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-md font-bold">
                {completedClassesList.length}
              </span>
            </button>
          </div>

          {/* Class and Subject Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Class Filter (Only show if not locked to single child) */}
            {user?.role !== 'parent' && (
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Classes</option>
                {classesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.section ? `(${c.section})` : ''}
                  </option>
                ))}
              </select>
            )}

            {/* Subject Filter */}
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Subjects</option>
              {subjectsList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Prominent Live Broadcast Hero Banner (Shown when a lecture is active) */}
      {liveClassesList.length > 0 && activeTab !== 'completed' && (
        <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-indigo-900 text-white rounded-3xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-rose-400/30">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
              <Radio className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white text-rose-700 px-2.5 py-0.5 rounded-full shadow-sm">
                  ● LIVE BROADCAST IN PROGRESS
                </span>
                <span className="text-xs text-rose-100 font-bold">
                  {liveClassesList[0].teacher_name}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                {liveClassesList[0].title}
              </h3>
              <p className="text-xs text-rose-100 mt-0.5">
                Class Time: {formatTime(liveClassesList[0].start_time)} - {formatTime(liveClassesList[0].end_time)}
                {liveClassesList[0].meeting_id ? ` • Zoom Meeting ID: ${liveClassesList[0].meeting_id}` : ''}
              </p>
            </div>
          </div>
          <a
            href={liveClassesList[0].zoom_url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white hover:bg-rose-50 text-rose-700 px-6 py-3.5 rounded-2xl text-xs font-black shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all shrink-0 min-h-[44px]"
          >
            <Video className="w-4 h-4 text-rose-600" />
            <span>Join Live Room (1-Tap)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Classes List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#4338ca] mb-2" />
          <p className="text-xs">Loading live online classes...</p>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-100 shadow-sm text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-400 flex items-center justify-center mx-auto">
            <Video className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            {activeTab === 'live'
              ? 'No Live Zoom Classes Right Now'
              : activeTab === 'upcoming'
              ? 'No Upcoming Zoom Classes'
              : 'No Classes in this Category'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            {activeTab === 'live'
              ? 'There are no ongoing live Zoom broadcasts at this exact moment. Please check the Upcoming tab for scheduled sessions.'
              : activeTab === 'upcoming'
              ? isStaff
                ? 'Click "Schedule Zoom Class" above to create an online meeting link for your students.'
                : 'Your teachers have not scheduled any upcoming live classes at this moment. Please check back soon.'
              : 'Past online sessions will be recorded and archived here.'}
          </p>

          {isStaff && (
            <div className="pt-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 bg-[#4338ca] hover:bg-[#3730a3] text-white text-xs font-bold py-2.5 px-5 rounded-2xl shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule New Zoom Class</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredClasses.map((item) => {
            const classObj = classesList.find((c) => c.id === item.class_id);
            const subObj = subjectsList.find((s) => s.id === item.subject_id);
            const isToday = item.date === todayStr;
            const isLive = item.status === 'live' || (isToday && item.status === 'scheduled');
            const hasCopied = copiedId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-[#4338ca]">
                        {classObj ? classObj.name : 'Class'}
                      </span>
                      {subObj && (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                          {subObj.name}
                        </span>
                      )}
                    </div>

                    {isLive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-600 border border-rose-200 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <span>LIVE NOW</span>
                      </span>
                    ) : item.status === 'completed' ? (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
                        Ended
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                        Scheduled
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {/* Teacher & Schedule Details */}
                  <div className="mt-3.5 pt-3.5 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="font-semibold text-slate-800">
                        {item.teacher_name || 'Faculty Teacher'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDate(item.date)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {formatTime(item.start_time)} - {formatTime(item.end_time)}
                        </span>
                      </div>
                    </div>

                    {/* Meeting ID & Passcode info box */}
                    {(item.meeting_id || item.passcode) && (
                      <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-600 mt-2">
                        {item.meeting_id && (
                          <div>
                            <span className="text-slate-400">ID: </span>
                            <span className="font-bold text-slate-800">{item.meeting_id}</span>
                          </div>
                        )}
                        {item.passcode && (
                          <div>
                            <span className="text-slate-400">Passcode: </span>
                            <span className="font-bold text-slate-800">{item.passcode}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    {/* Primary Button: Join Zoom Class */}
                    <a
                      href={item.zoom_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold text-white shadow-sm transition-all active:scale-95 ${
                        isLive
                          ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                          : 'bg-[#4338ca] hover:bg-[#3730a3] shadow-indigo-200'
                      }`}
                    >
                      <Video className="w-4 h-4" />
                      <span>
                        {isStaff
                          ? isLive
                            ? 'Manage Live Class'
                            : 'Start Class (Host)'
                          : isLive
                          ? 'Join Live Class Now'
                          : 'Join Zoom Room'}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                    </a>

                    {/* Copy Link Button */}
                    <button
                      onClick={() => handleCopy(item)}
                      className="p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
                      title="Copy meeting details"
                      aria-label="Copy meeting details"
                    >
                      {hasCopied ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                  </div>

                  {/* Staff Host Controls: Toggle Live Status & Edit / Delete */}
                  {isStaff && (
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px] font-semibold text-slate-500">
                      <div className="flex items-center gap-1.5">
                        {item.status !== 'live' ? (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item, 'live')}
                            className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-lg"
                            title="Set to Live status"
                          >
                            <Radio className="w-3 h-3" />
                            <span>Set Live</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item, 'completed')}
                            className="text-slate-600 hover:text-slate-800 font-bold flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg"
                            title="End live broadcast"
                          >
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>End Session</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleStartEdit(item)}
                          className="hover:text-indigo-600 flex items-center gap-1 transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.title)}
                          className="hover:text-rose-600 flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SCHEDULE ONLINE ZOOM CLASS (For Teachers & Admins)                 */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-[#4338ca] flex items-center justify-center">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Schedule Online Zoom Class</h3>
                  <p className="text-[11px] text-slate-400">
                    Add a live Zoom meeting link for your students
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3.5">
              {/* Class & Subject */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Target Class *
                  </label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    {classesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.section ? `(${c.section})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Subject *
                  </label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    {availableSubjectsForAdd.length === 0 ? (
                      <option value="">General / Lecture</option>
                    ) : (
                      availableSubjectsForAdd.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Topic / Title */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Class Topic / Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Physics Chapter 3: Kinematics Live Problem Solving"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2 font-medium"
                  />
                </div>
              </div>

              {/* Zoom Meeting Link */}
              <div className="p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-[#4338ca] uppercase">
                    Zoom Meeting Link (URL) *
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateSampleZoomLink}
                    className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Sample Link</span>
                  </button>
                </div>
                <input
                  type="url"
                  placeholder="https://us05web.zoom.us/j/81234567890?pwd=..."
                  value={zoomUrl}
                  onChange={(e) => setZoomUrl(e.target.value)}
                  required
                  className="w-full bg-white border border-indigo-200 text-slate-900 text-xs rounded-xl p-2.5 font-medium focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-500">
                  Paste the invite link directly from Zoom, Google Meet, or Microsoft Teams.
                </p>

                {/* Meeting ID & Passcode */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Meeting ID (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="812 3456 7890"
                      value={meetingId}
                      onChange={(e) => setMeetingId(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl p-2 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Passcode (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="123456"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl p-2 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Host Teacher */}
              {user?.role !== 'teacher' && teachersList.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Host Teacher
                  </label>
                  <select
                    value={teacherId}
                    onChange={(e) => setTeacherId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 font-medium"
                  >
                    <option value="">Current Administrator</option>
                    {teachersList.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name} ({t.phone})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Description / Instructions */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Instructions for Students (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Please join 5 minutes early with textbook and notebook ready."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 font-medium"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#4338ca] hover:bg-[#3730a3] disabled:opacity-50 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Publish Zoom Class</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT ONLINE ZOOM CLASS                                            */}
      {/* ========================================================================= */}
      {editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-[#4338ca] flex items-center justify-center">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit Online Class</h3>
                  <p className="text-[11px] text-slate-400">Update Zoom link, schedule, or status</p>
                </div>
              </div>

              <button
                onClick={() => setEditingClass(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3.5">
              {/* Status */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Class Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) =>
                    setEditStatus(e.target.value as 'scheduled' | 'live' | 'completed' | 'cancelled')
                  }
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 font-bold"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="live">🔴 Live Now</option>
                  <option value="completed">Completed / Finished</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Class & Subject */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Class
                  </label>
                  <select
                    value={editClassId}
                    onChange={(e) => setEditClassId(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 font-medium"
                  >
                    {classesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Subject
                  </label>
                  <select
                    value={editSubjectId}
                    onChange={(e) => setEditSubjectId(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 font-medium"
                  >
                    {availableSubjectsForEdit.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Topic / Title *
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 font-medium"
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                    Start
                  </label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                    End
                  </label>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2 font-medium"
                  />
                </div>
              </div>

              {/* Zoom Meeting Link */}
              <div className="p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-2">
                <label className="block text-[11px] font-bold text-[#4338ca] uppercase">
                  Zoom Meeting Link (URL) *
                </label>
                <input
                  type="url"
                  value={editZoomUrl}
                  onChange={(e) => setEditZoomUrl(e.target.value)}
                  required
                  className="w-full bg-white border border-indigo-200 text-slate-900 text-xs rounded-xl p-2.5 font-medium"
                />

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Meeting ID
                    </label>
                    <input
                      type="text"
                      value={editMeetingId}
                      onChange={(e) => setEditMeetingId(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl p-2 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Passcode
                    </label>
                    <input
                      type="text"
                      value={editPasscode}
                      onChange={(e) => setEditPasscode(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl p-2 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Instructions / Notes
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 font-medium"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#4338ca] hover:bg-[#3730a3] disabled:opacity-50 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
