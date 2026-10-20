'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/context';
import { Users, Plus, X, GraduationCap, BookOpen, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ClassBatch } from '@/types/app.types';

import {
  getLocalData,
  getLocalDataForInstitute,
  saveLocalData,
  appendLocalData,
  syncLocalWithRemote,
  updateLocalData,
  removeLocalData,
} from '@/lib/storage-helper';

export default function ClassesPage() {
  const { institute, user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const supabase = createClient();
  const instId = institute?.id || user?.institute_id || null;

  const [classesList, setClassesList] = useState<ClassBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [schemaNotice, setSchemaNotice] = useState(false);

  // Form State - Create
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('A');
  const [academicYear, setAcademicYear] = useState('2026-2027');

  // Form State - Edit
  const [editingClass, setEditingClass] = useState<ClassBatch | null>(null);
  const [editClassName, setEditClassName] = useState('');
  const [editSection, setEditSection] = useState('A');
  const [editAcademicYear, setEditAcademicYear] = useState('2026-2027');

  const loadClasses = React.useCallback(async () => {
    try {
      let classes: ClassBatch[] = [];
      try {
        const res = await fetch(`/api/classes?institute_id=${instId || ''}`);
        const json = await res.json();
        if (json?.classes && Array.isArray(json.classes)) {
          classes = json.classes;
        }
      } catch {
        // fallback to supabase client
        let query = supabase.from('classes').select('*');
        if (instId) {
          query = query.eq('institute_id', instId);
        }
        const { data, error } = await query.order('name');
        if (error && (error.code === 'PGRST205' || error.code === '42P01')) {
          setSchemaNotice(true);
        } else if (data) {
          classes = data as ClassBatch[];
        }
      }

      if (classes.length > 0) {
        setClassesList(syncLocalWithRemote('classes', classes, instId));
      } else {
        setClassesList(getLocalDataForInstitute<ClassBatch>('classes', instId));
      }
    } catch {
      setSchemaNotice(true);
      setClassesList(getLocalDataForInstitute<ClassBatch>('classes', instId));
    } finally {
      setLoading(false);
    }
  }, [supabase, instId]);

  useEffect(() => {
    if (authLoading) return;
    const local = getLocalDataForInstitute<ClassBatch>('classes', instId);
    if (local.length > 0) setClassesList(local);
    loadClasses();
  }, [loadClasses, instId, authLoading]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveInstId = instId || '00000000-0000-0000-0000-000000000001';

    const localClass: ClassBatch = {
      id: `cls-${Date.now()}`,
      institute_id: effectiveInstId,
      name: className.trim(),
      section: section.trim(),
      academic_year: academicYear,
      class_teacher_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institute_id: effectiveInstId,
          name: className.trim(),
          section: section.trim(),
          academic_year: academicYear,
        }),
      });

      const json = await res.json();
      if (json?.class) {
        setClassesList(appendLocalData('classes', json.class as ClassBatch, instId));
      } else {
        setClassesList(appendLocalData('classes', localClass, instId));
      }
    } catch {
      setClassesList(appendLocalData('classes', localClass, instId));
      setSchemaNotice(true);
    }

    setShowAddModal(false);
    setClassName('');
  };

  const handleOpenEdit = (cls: ClassBatch) => {
    setEditingClass(cls);
    setEditClassName(cls.name);
    setEditSection(cls.section || 'A');
    setEditAcademicYear(cls.academic_year || '2026-2027');
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;

    const updates = {
      name: editClassName.trim(),
      section: editSection.trim(),
      academic_year: editAcademicYear,
    };

    try {
      const res = await fetch('/api/classes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingClass.id,
          ...updates,
        }),
      });
      const json = await res.json();
      const updated = json?.class || { ...editingClass, ...updates };
      setClassesList(updateLocalData<ClassBatch>('classes', editingClass.id, updated, instId));
    } catch (err) {
      console.warn('Update remote class warning:', err);
      setClassesList(updateLocalData<ClassBatch>('classes', editingClass.id, updates, instId));
    }

    setEditingClass(null);
  };

  const handleDeleteClass = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete class "${name}"?`)) {
      return;
    }

    try {
      await fetch(`/api/classes?id=${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Delete remote class warning:', err);
    }

    setClassesList(removeLocalData<ClassBatch>('classes', id, instId));
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {schemaNotice && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-900 leading-snug">
            <strong>Database Setup Required:</strong> Tables have not been run in your Supabase project yet. Paste and run <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">supabase/schema.sql</code> in your Supabase SQL Editor.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            {t('nav.classes', 'Classes & Batches')}
          </h2>
          <p className="text-xs text-slate-500">
            Standards, divisions, academic sessions, and assigned teachers
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-4 py-2.5 rounded-2xl text-xs font-bold shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5 transition-all min-h-[40px]"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Class / Batch</span>
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading classes...</div>
      ) : classesList.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Classes Registered Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Get started by creating your first standard or batch (e.g. Class 10, Batch A).
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold px-4 py-2 rounded-xl text-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Class</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {classesList.map((cls) => (
            <div
              key={cls.id}
              className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-200 transition-colors group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Session {cls.academic_year}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">
                      Section {cls.section || 'A'}
                    </span>
                    <button
                      onClick={() => handleOpenEdit(cls)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit Class"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteClass(cls.id, cls.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Class"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <h3 className="text-base font-bold text-slate-900">{cls.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Class ID: {cls.id.slice(0, 8)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Class Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <span>Create New Class or Batch</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-4 mt-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Class / Standard Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Class 10 or 10th State Board"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Section / Batch
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. A or Morning Batch"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Academic Year
                  </label>
                  <input
                    type="text"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white py-3.5 rounded-2xl text-xs font-bold shadow-md shadow-indigo-100 transition-all min-h-[48px]"
              >
                Create Class in Database
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Class Modal */}
      {editingClass && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-600" />
                <span>Edit Class / Batch</span>
              </h3>
              <button
                onClick={() => setEditingClass(null)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateClass} className="space-y-4 mt-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Class / Standard Name
                </label>
                <input
                  type="text"
                  value={editClassName}
                  onChange={(e) => setEditClassName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Section / Batch
                  </label>
                  <input
                    type="text"
                    value={editSection}
                    onChange={(e) => setEditSection(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Academic Year
                  </label>
                  <input
                    type="text"
                    value={editAcademicYear}
                    onChange={(e) => setEditAcademicYear(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
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
