'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/context';
import { Users, Phone, Mail, BookOpen, Plus, X, Loader2, Pencil, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { UserProfile, Subject } from '@/types/app.types';
import { SchemaNotice } from '@/components/common/schema-notice';
import {
  getLocalDataForInstitute,
  appendLocalData,
  syncLocalWithRemote,
  updateLocalData,
  removeLocalData,
} from '@/lib/storage-helper';

export default function TeachersPage() {
  const { institute, user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const supabase = createClient();
  const instId = institute?.id || user?.institute_id || null;

  const isStaff = user?.role === 'institute_admin' || user?.role === 'super_admin';

  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State - Add
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [email, setEmail] = useState('');

  // Form State - Edit
  const [editingTeacher, setEditingTeacher] = useState<UserProfile | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const loadData = useCallback(async () => {
    try {
      let tQuery = supabase
        .from('users')
        .select('*')
        .eq('role', 'teacher');
      if (instId) {
        tQuery = tQuery.eq('institute_id', instId);
      }
      const { data: tData, error: tError } = await tQuery;

      if (tError && (tError.code === 'PGRST205' || tError.code === '42P01')) {
        setSchemaMissing(true);
        setTeachers(getLocalDataForInstitute<UserProfile>('teachers', instId));
        setSubjectsList(getLocalDataForInstitute<Subject>('subjects', instId));
        return;
      }

      if (tData && tData.length > 0) {
        setTeachers(syncLocalWithRemote('teachers', tData as UserProfile[], instId));
      } else {
        // Fallback to server API which uses service role to bypass client RLS restrictions
        try {
          const apiRes = await fetch(`/api/teachers${instId ? `?institute_id=${instId}` : ''}`);
          const apiJson = await apiRes.json();
          if (apiJson.success && apiJson.teachers && apiJson.teachers.length > 0) {
            setTeachers(syncLocalWithRemote('teachers', apiJson.teachers as UserProfile[], instId));
          } else {
            setTeachers(getLocalDataForInstitute<UserProfile>('teachers', instId));
          }
        } catch {
          setTeachers(getLocalDataForInstitute<UserProfile>('teachers', instId));
        }
      }

      let sQuery = supabase.from('subjects').select('*');
      if (instId) {
        sQuery = sQuery.eq('institute_id', instId);
      }
      const { data: sData } = await sQuery;
      if (sData) {
        setSubjectsList(syncLocalWithRemote('subjects', sData as Subject[], instId));
      } else {
        setSubjectsList(getLocalDataForInstitute<Subject>('subjects', instId));
      }
    } catch (err) {
      console.warn('Error loading teachers:', err);
      setTeachers(getLocalDataForInstitute<UserProfile>('teachers', instId));
      setSubjectsList(getLocalDataForInstitute<Subject>('subjects', instId));
    } finally {
      setLoading(false);
    }
  }, [supabase, instId]);

  useEffect(() => {
    if (authLoading) return;
    const localTeachers = getLocalDataForInstitute<UserProfile>('teachers', instId);
    const localSubs = getLocalDataForInstitute<Subject>('subjects', instId);
    if (localTeachers.length > 0) setTeachers(localTeachers);
    if (localSubs.length > 0) setSubjectsList(localSubs);
    loadData();
  }, [loadData, instId, authLoading]);

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const effectiveInstId = instId || '00000000-0000-0000-0000-000000000001';
    const cleanDigits = phone.replace(/\D/g, '').slice(-10);
    const cleanPhone = cleanDigits.length === 10 ? `+91${cleanDigits}` : phone.trim();

    const newTeacherPayload = {
      institute_id: effectiveInstId,
      full_name: fullName.trim(),
      phone: cleanPhone,
      email: email ? email.trim() : null,
      role: 'teacher' as const,
    };

    const createdTeacher: UserProfile = {
      id: `usr-teacher-${Date.now()}`,
      ...newTeacherPayload,
      avatar_url: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeacherPayload),
      });
      const resJson = await res.json();

      const teacherToSave = resJson.teacher || createdTeacher;
      setTeachers(appendLocalData('teachers', teacherToSave, instId));
      setShowAddModal(false);
      setFullName('');
      setPhone('+91 ');
      setEmail('');
    } catch {
      setTeachers(appendLocalData('teachers', createdTeacher, instId));
      setShowAddModal(false);
      setFullName('');
      setPhone('+91 ');
      setEmail('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (t: UserProfile) => {
    setEditingTeacher(t);
    setEditFullName(t.full_name || '');
    setEditPhone(t.phone || '+91 ');
    setEditEmail(t.email || '');
  };

  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;

    const cleanDigits = editPhone.replace(/\D/g, '').slice(-10);
    const cleanPhone = cleanDigits.length === 10 ? `+91${cleanDigits}` : editPhone.trim();
    const updates = {
      full_name: editFullName.trim(),
      phone: cleanPhone,
      email: editEmail ? editEmail.trim() : null,
    };

    try {
      await fetch('/api/teachers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingTeacher.id, ...updates }),
      });
    } catch (err) {
      console.warn('Update remote teacher warning:', err);
    }

    setTeachers(updateLocalData<UserProfile>('teachers', editingTeacher.id, updates, instId));
    setEditingTeacher(null);
  };

  const handleDeleteTeacher = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete teacher "${name}"?`)) {
      return;
    }

    try {
      await fetch(`/api/teachers?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('Delete remote teacher warning:', err);
    }

    setTeachers(removeLocalData<UserProfile>('teachers', id, instId));
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <SchemaNotice visible={schemaMissing} />

      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            {t('nav.teachers', 'Teacher Roster')}
          </h2>
          <p className="text-xs text-slate-500">
            Faculty members, subject specializations, and contact phone numbers
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            {teachers.length} Active Faculty Members
          </span>

          {isStaff && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 min-h-[36px]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Faculty</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
          <p className="text-xs">Loading faculty members...</p>
        </div>
      ) : teachers.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Faculty Enrolled Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Onboard teachers and faculty members to assign class periods, mark attendance, and upload study notes.
          </p>
          {isStaff && (
            <div className="pt-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Onboard First Faculty Member</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {teachers.map((teacher) => {
            const subjectsTaught = subjectsList.filter((s) => s.teacher_id === teacher.id);
            return (
              <div
                key={teacher.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-200 transition-colors group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                        {teacher.full_name ? teacher.full_name.slice(0, 1) : 'T'}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{teacher.full_name}</h3>
                        <p className="text-[11px] text-slate-400">Faculty • {institute?.name || 'ClassDesk'}</p>
                      </div>
                    </div>
                    {isStaff && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(teacher)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Faculty"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTeacher(teacher.id, teacher.full_name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Faculty"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{teacher.phone}</span>
                    </div>
                    {teacher.email && (
                      <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                        <Mail className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{teacher.email}</span>
                      </div>
                    )}

                    {subjectsTaught.length > 0 && (
                      <div className="flex items-center gap-2 pt-2">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <div className="flex flex-wrap gap-1">
                          {subjectsTaught.map((s) => (
                            <span
                              key={s.id}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700"
                            >
                              {s.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add Faculty */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Onboard Faculty Member</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddTeacher} className="space-y-4 mt-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rajesh Kumar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Phone (for OTP Login)
                </label>
                <input
                  type="tel"
                  placeholder="+91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="teacher@school.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900"
                />
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
                  <span>{isSubmitting ? 'Onboarding...' : 'Register Teacher'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Teacher Modal */}
      {editingTeacher && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-600" />
                <span>Edit Faculty Details</span>
              </h3>
              <button
                onClick={() => setEditingTeacher(null)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateTeacher} className="space-y-4 mt-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Phone (for OTP Login)
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white py-3 rounded-2xl text-xs font-bold shadow-md shadow-indigo-100 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
