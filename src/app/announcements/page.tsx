'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/context';
import {
  Bell,
  Plus,
  Send,
  X,
  Megaphone,
  Users,
  Calendar,
  Loader2,
  Pencil,
  Trash2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Announcement, ClassBatch } from '@/types/app.types';
import { SchemaNotice } from '@/components/common/schema-notice';
import {
  getLocalDataForInstitute,
  appendLocalData,
  syncLocalWithRemote,
  updateLocalData,
  removeLocalData,
} from '@/lib/storage-helper';

export default function AnnouncementsPage() {
  const { user, institute, activeChild, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const supabase = createClient();
  const instId = institute?.id || user?.institute_id || null;

  const isStaff = user?.role === 'institute_admin' || user?.role === 'super_admin' || user?.role === 'teacher';

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [classesList, setClassesList] = useState<ClassBatch[]>([]);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schemaMissing, setSchemaMissing] = useState(false);

  // New Notice form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'class'>('all');
  const [targetClassId, setTargetClassId] = useState('');

  // Edit Notice form state
  const [editingAnn, setEditingAnn] = useState<Announcement | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTargetType, setEditTargetType] = useState<'all' | 'class'>('all');
  const [editTargetClassId, setEditTargetClassId] = useState('');

  const loadData = useCallback(async () => {
    try {
      // Announcements
      let annQuery = supabase.from('announcements').select('*');
      if (instId) {
        annQuery = annQuery.eq('institute_id', instId);
      }
      const { data: annData, error: annError } = await annQuery.order('created_at', { ascending: false });

      if (annError && (annError.code === 'PGRST205' || annError.code === '42P01')) {
        setSchemaMissing(true);
        setAnnouncements(getLocalDataForInstitute<Announcement>('announcements', instId));
        setClassesList(getLocalDataForInstitute<ClassBatch>('classes', instId));
        return;
      }
      if (annData && annData.length > 0) {
        setAnnouncements(syncLocalWithRemote('announcements', annData as Announcement[], instId));
      } else {
        setAnnouncements(getLocalDataForInstitute<Announcement>('announcements', instId));
      }

      // Classes
      let clsQuery = supabase.from('classes').select('*');
      if (instId) {
        clsQuery = clsQuery.eq('institute_id', instId);
      }
      const { data: clsData } = await clsQuery.order('name');
      const classes = (clsData || []) as ClassBatch[];
      if (classes.length > 0) {
        const mergedClasses = syncLocalWithRemote('classes', classes, instId);
        setClassesList(mergedClasses);
        setTargetClassId((prev) => prev || mergedClasses[0].id);
      } else {
        const localCls = getLocalDataForInstitute<ClassBatch>('classes', instId);
        setClassesList(localCls);
        if (localCls.length > 0) setTargetClassId((prev) => prev || localCls[0].id);
      }
    } catch (err) {
      console.warn('Error loading announcements:', err);
      setAnnouncements(getLocalDataForInstitute<Announcement>('announcements', instId));
      setClassesList(getLocalDataForInstitute<ClassBatch>('classes', instId));
    } finally {
      setLoading(false);
    }
  }, [supabase, instId]);

  useEffect(() => {
    if (authLoading) return;
    const localAnn = getLocalDataForInstitute<Announcement>('announcements', instId);
    const localCls = getLocalDataForInstitute<ClassBatch>('classes', instId);
    if (localAnn.length > 0) setAnnouncements(localAnn);
    if (localCls.length > 0) {
      setClassesList(localCls);
      setTargetClassId((prev) => prev || localCls[0].id);
    }
    loadData();
  }, [loadData, instId, authLoading]);

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const effectiveInstId = instId || '00000000-0000-0000-0000-000000000001';
    const newPayload = {
      institute_id: effectiveInstId,
      created_by: user?.id || null,
      title,
      content,
      target_type: targetType,
      target_class_id: targetType === 'class' ? (targetClassId || null) : null,
      attachment_url: null,
    };

    const createdAnn: Announcement = {
      id: `ann-${Date.now()}`,
      ...newPayload,
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await (supabase as any)
        .from('announcements')
        .insert([newPayload])
        .select()
        .single();

      if (error && (error.code === 'PGRST205' || error.code === '42P01')) {
        setSchemaMissing(true);
      }

      const annToSave = (data as Announcement) || createdAnn;
      setAnnouncements(appendLocalData('announcements', annToSave, instId));
      setShowComposeModal(false);
      setTitle('');
      setContent('');
    } catch {
      setAnnouncements(appendLocalData('announcements', createdAnn, instId));
      setShowComposeModal(false);
      setTitle('');
      setContent('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (ann: Announcement) => {
    setEditingAnn(ann);
    setEditTitle(ann.title);
    setEditContent(ann.content);
    setEditTargetType(ann.target_type === 'class' ? 'class' : 'all');
    setEditTargetClassId(ann.target_class_id || (classesList[0]?.id || ''));
  };

  const handleUpdateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnn) return;

    const updates = {
      title: editTitle,
      content: editContent,
      target_type: editTargetType,
      target_class_id: editTargetType === 'class' ? (editTargetClassId || null) : null,
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('announcements')
        .update(updates)
        .eq('id', editingAnn.id);
    } catch (err) {
      console.warn('Update remote announcement warning:', err);
    }

    setAnnouncements(updateLocalData<Announcement>('announcements', editingAnn.id, updates, instId));
    setEditingAnn(null);
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('announcements')
        .delete()
        .eq('id', id);
    } catch (err) {
      console.warn('Delete remote announcement warning:', err);
    }

    setAnnouncements(removeLocalData('announcements', id, instId));
  };

  // Filter for parents: either targeting 'all' or active child's class
  const filteredAnnouncements = announcements.filter((ann) => {
    if (isStaff) return true;
    if (ann.target_type === 'all') return true;
    if (activeChild && ann.target_class_id === activeChild.class_id) return true;
    return false;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <SchemaNotice visible={schemaMissing} />

      {/* Header */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            {t('announcements.title', 'Broadcasts & Announcements')}
          </h2>
          <p className="text-xs text-slate-500">
            School-wide alerts, holiday notices, and class-specific instructions
          </p>
        </div>

        {isStaff && (
          <button
            onClick={() => setShowComposeModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-4 py-2.5 rounded-2xl text-xs font-bold shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5 transition-all min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>{t('announcements.newAnnouncement', 'Create Announcement')}</span>
          </button>
        )}
      </div>

      {/* Announcements Feed or Empty State */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
          <p className="text-xs">Loading announcements...</p>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3">
          <Megaphone className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Announcements Posted Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {isStaff
              ? 'Send circulars, exam schedules, or holiday reminders directly to parents and students.'
              : 'School circulars, event notifications, and holiday announcements will appear here.'}
          </p>
          {isStaff && (
            <div className="pt-2">
              <button
                onClick={() => setShowComposeModal(true)}
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Post First Announcement</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((ann) => {
            const targetClass = classesList.find((c) => c.id === ann.target_class_id);
            return (
              <div
                key={ann.id}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                      ann.target_type === 'all'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}
                  >
                    {ann.target_type === 'all'
                      ? 'All School'
                      : targetClass
                      ? `${targetClass.name} - ${targetClass.section}`
                      : 'Class Notice'}
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">
                      {new Date(ann.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    {isStaff && (
                      <div className="flex items-center gap-1 ml-1.5">
                        <button
                          onClick={() => handleOpenEdit(ann)}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Announcement"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAnnouncement(ann.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Announcement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                  {ann.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {ann.content}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Compose Announcement Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-indigo-600" />
                <span>Create New Announcement</span>
              </h3>
              <button
                onClick={() => setShowComposeModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePostAnnouncement} className="space-y-4 mt-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Recipient Audience
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetType('all')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      targetType === 'all'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    All School & Parents
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('class')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      targetType === 'class'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Specific Class
                  </button>
                </div>
              </div>

              {targetType === 'class' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Select Target Class
                  </label>
                  <select
                    value={targetClassId}
                    onChange={(e) => setTargetClassId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    {classesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} - Section {c.section}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Notice Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Diwali Vacation Notice & Homework Guidelines"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Notice Content / Body
                </label>
                <textarea
                  placeholder="Write notice details here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 leading-relaxed"
                  required
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
                    <Send className="w-4 h-4" />
                  )}
                  <span>{isSubmitting ? 'Publishing...' : 'Broadcast Announcement'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Announcement Modal */}
      {editingAnn && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-600" />
                <span>Edit Announcement</span>
              </h3>
              <button
                onClick={() => setEditingAnn(null)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateAnnouncement} className="space-y-4 mt-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Recipient Audience
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditTargetType('all')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      editTargetType === 'all'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    All School & Parents
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTargetType('class')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      editTargetType === 'class'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Specific Class
                  </button>
                </div>
              </div>

              {editTargetType === 'class' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Select Target Class
                  </label>
                  <select
                    value={editTargetClassId}
                    onChange={(e) => setEditTargetClassId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    {classesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} - Section {c.section}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Notice Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Diwali Vacation Notice & Homework Guidelines"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Notice Content / Body
                </label>
                <textarea
                  placeholder="Write notice details here..."
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 leading-relaxed"
                  required
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingAnn(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-2xl text-xs font-bold transition-all text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white py-3.5 rounded-2xl text-xs font-bold shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                >
                  <Pencil className="w-4 h-4" />
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
