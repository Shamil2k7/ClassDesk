'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/context';
import {
  BookOpen,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Download,
  Plus,
  X,
  Search,
  Loader2,
  Pencil,
  Trash2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Note, Subject, ClassBatch } from '@/types/app.types';
import { SchemaNotice } from '@/components/common/schema-notice';
import {
  getLocalDataForInstitute,
  appendLocalData,
  syncLocalWithRemote,
  updateLocalData,
  removeLocalData,
} from '@/lib/storage-helper';

export default function NotesPage() {
  const { user, institute, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const supabase = createClient();
  const instId = institute?.id || user?.institute_id || null;

  const isStaff = user?.role === 'teacher' || user?.role === 'institute_admin' || user?.role === 'super_admin';

  const [notesList, setNotesList] = useState<Note[]>([]);
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [classesList, setClassesList] = useState<ClassBatch[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schemaMissing, setSchemaMissing] = useState(false);

  // New Note Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [classId, setClassId] = useState('');
  const [noteType, setNoteType] = useState<Note['type']>('pdf');
  const [fileUrl, setFileUrl] = useState('');

  // Edit Note Form
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSubjectId, setEditSubjectId] = useState('');
  const [editClassId, setEditClassId] = useState('');
  const [editNoteType, setEditNoteType] = useState<Note['type']>('pdf');
  const [editFileUrl, setEditFileUrl] = useState('');

  const loadData = useCallback(async () => {
    try {
      // Notes
      let nQuery = supabase.from('notes').select('*');
      if (instId) {
        nQuery = nQuery.eq('institute_id', instId);
      }
      const { data: nData, error: nError } = await nQuery.order('created_at', { ascending: false });

      if (nError && (nError.code === 'PGRST205' || nError.code === '42P01')) {
        setSchemaMissing(true);
        setNotesList(getLocalDataForInstitute<Note>('notes', instId));
        setSubjectsList(getLocalDataForInstitute<Subject>('subjects', instId));
        setClassesList(getLocalDataForInstitute<ClassBatch>('classes', instId));
        return;
      }
      if (nData) {
        setNotesList(syncLocalWithRemote('notes', nData as Note[], instId));
      } else {
        setNotesList(getLocalDataForInstitute<Note>('notes', instId));
      }

      // Subjects
      let sQuery = supabase.from('subjects').select('*');
      if (instId) {
        sQuery = sQuery.eq('institute_id', instId);
      }
      const { data: sData } = await sQuery.order('name');
      if (sData) {
        const mergedSubs = syncLocalWithRemote('subjects', sData as Subject[], instId);
        setSubjectsList(mergedSubs);
        setSubjectId((prev) => prev || mergedSubs[0]?.id || '');
      } else {
        const localSubs = getLocalDataForInstitute<Subject>('subjects', instId);
        setSubjectsList(localSubs);
        if (localSubs.length > 0) setSubjectId((prev) => prev || localSubs[0].id);
      }

      // Classes
      let cQuery = supabase.from('classes').select('*');
      if (instId) {
        cQuery = cQuery.eq('institute_id', instId);
      }
      const { data: cData } = await cQuery.order('name');
      if (cData) {
        const mergedClasses = syncLocalWithRemote('classes', cData as ClassBatch[], instId);
        setClassesList(mergedClasses);
        setClassId((prev) => prev || mergedClasses[0]?.id || '');
      } else {
        const localCls = getLocalDataForInstitute<ClassBatch>('classes', instId);
        setClassesList(localCls);
        if (localCls.length > 0) setClassId((prev) => prev || localCls[0].id);
      }
    } catch (err) {
      console.warn('Error loading notes:', err);
      setNotesList(getLocalDataForInstitute<Note>('notes', instId));
      setSubjectsList(getLocalDataForInstitute<Subject>('subjects', instId));
      setClassesList(getLocalDataForInstitute<ClassBatch>('classes', instId));
    } finally {
      setLoading(false);
    }
  }, [supabase, instId]);

  useEffect(() => {
    if (authLoading) return;
    const localNotes = getLocalDataForInstitute<Note>('notes', instId);
    const localSubs = getLocalDataForInstitute<Subject>('subjects', instId);
    const localCls = getLocalDataForInstitute<ClassBatch>('classes', instId);
    if (localNotes.length > 0) setNotesList(localNotes);
    if (localSubs.length > 0) {
      setSubjectsList(localSubs);
      setSubjectId((prev) => prev || localSubs[0].id);
    }
    if (localCls.length > 0) {
      setClassesList(localCls);
      setClassId((prev) => prev || localCls[0].id);
    }
    loadData();
  }, [loadData, instId, authLoading]);

  const filteredNotes = notesList.filter(
    (n) => selectedSubjectId === 'all' || n.subject_id === selectedSubjectId
  );

  const handleUploadNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const effectiveInstId = instId || '00000000-0000-0000-0000-000000000001';
    const targetClassId = classId || classesList[0]?.id || '00000000-0000-0000-0000-000000000002';
    const targetSubjectId = subjectId || subjectsList[0]?.id || '00000000-0000-0000-0000-000000000003';

    const newNotePayload = {
      institute_id: effectiveInstId,
      class_id: targetClassId,
      subject_id: targetSubjectId,
      uploaded_by: user?.id || null,
      title,
      description,
      type: noteType,
      file_url:
        fileUrl ||
        'https://raw.githubusercontent.com/mozilla/pdf.js/master/web/compressed.tracemonkey-pldi-09.pdf',
      file_size_bytes: 750000,
    };

    const createdNote: Note = {
      id: `note-${Date.now()}`,
      ...newNotePayload,
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await (supabase as any)
        .from('notes')
        .insert([newNotePayload])
        .select()
        .single();

      if (error && (error.code === 'PGRST205' || error.code === '42P01')) {
        setSchemaMissing(true);
      }

      const noteToSave: Note = (data as Note) || createdNote;
      setNotesList(appendLocalData('notes', noteToSave, instId));
      setShowUploadModal(false);
      setTitle('');
      setDescription('');
      setFileUrl('');
    } catch {
      setNotesList(appendLocalData('notes', createdNote, instId));
      setShowUploadModal(false);
      setTitle('');
      setDescription('');
      setFileUrl('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (note: Note) => {
    setEditingNote(note);
    setEditTitle(note.title);
    setEditDescription(note.description || '');
    setEditSubjectId(note.subject_id);
    setEditClassId(note.class_id);
    setEditNoteType(note.type);
    setEditFileUrl(note.file_url || '');
  };

  const handleUpdateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;

    const updates = {
      title: editTitle,
      description: editDescription,
      subject_id: editSubjectId,
      class_id: editClassId,
      type: editNoteType,
      file_url: editFileUrl || editingNote.file_url,
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('notes')
        .update(updates)
        .eq('id', editingNote.id);
    } catch (err) {
      console.warn('Update remote note warning:', err);
    }

    setNotesList(updateLocalData<Note>('notes', editingNote.id, updates, instId));
    setEditingNote(null);
  };

  const handleDeleteNote = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this study note/material?')) {
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('notes')
        .delete()
        .eq('id', id);
    } catch (err) {
      console.warn('Delete remote note warning:', err);
    }

    setNotesList(removeLocalData<Note>('notes', id, instId));
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <SchemaNotice visible={schemaMissing} />

      {/* Header */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            {t('notes.title', 'Study Notes & Materials')}
          </h2>
          <p className="text-xs text-slate-500">
            Subject-wise PDFs, diagrams, lecture slides, and practice problem sets
          </p>
        </div>

        {isStaff && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-4 py-2.5 rounded-2xl text-xs font-bold shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5 transition-all min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>{t('notes.uploadNote', 'Upload Note')}</span>
          </button>
        )}
      </div>

      {/* Subject Filter Chips */}
      {subjectsList.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedSubjectId('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
              selectedSubjectId === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Subjects ({notesList.length})
          </button>
          {subjectsList.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setSelectedSubjectId(sub.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                selectedSubjectId === sub.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>
      )}

      {/* Notes Card List or Empty State */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
          <p className="text-xs">Loading study notes...</p>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Study Notes Uploaded Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {isStaff
              ? 'Share revision guides, formula sheets, or syllabus PDFs with your students.'
              : 'Study materials uploaded by your subject teachers will be accessible here.'}
          </p>
          {isStaff && (
            <div className="pt-2">
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Upload First Note</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredNotes.map((note) => {
            const sub = subjectsList.find((s) => s.id === note.subject_id);
            return (
              <div
                key={note.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-200 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {sub?.name || 'General'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400">
                        {new Date(note.created_at).toLocaleDateString('en-IN')}
                      </span>
                      {isStaff && (
                        <div className="flex items-center gap-1 ml-1.5">
                          <button
                            onClick={() => handleOpenEdit(note)}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit Note"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3 mt-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      {note.type === 'pdf' ? (
                        <FileText className="w-5 h-5" />
                      ) : note.type === 'image' ? (
                        <ImageIcon className="w-5 h-5" />
                      ) : (
                        <ExternalLink className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                        {note.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {note.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {note.type.toUpperCase()}{' '}
                    {note.file_size_bytes
                      ? `• ${(note.file_size_bytes / 1024).toFixed(0)} KB`
                      : ''}
                  </span>

                  <a
                    href={note.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t('notes.download', 'View / Download')}</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Note Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Upload Study Material</span>
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadNote} className="space-y-4 mt-4">
              {classesList.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Target Class
                  </label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
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

              {subjectsList.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Subject
                  </label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    {subjectsList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Note Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chapter 4: Trigonometry Formula Sheet"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Description / Topic Summary
                </label>
                <textarea
                  placeholder="Summary or revision instructions for students..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Material Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['pdf', 'image', 'link'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNoteType(t)}
                      className={`py-2 rounded-xl text-xs font-bold border uppercase transition-all ${
                        noteType === t
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-700'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  File URL / Cloud Link (PDF / Image)
                </label>
                <input
                  type="url"
                  placeholder="https://... or Supabase storage public URL"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 active:scale-[0.98] text-white py-3.5 rounded-2xl text-xs font-bold shadow-md shadow-indigo-100 transition-all min-h-[48px] flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>{isSubmitting ? 'Publishing...' : 'Publish Note to Class'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Note Modal */}
      {editingNote && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-600" />
                <span>Edit Study Material</span>
              </h3>
              <button
                onClick={() => setEditingNote(null)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateNote} className="space-y-4 mt-4">
              {classesList.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Target Class
                  </label>
                  <select
                    value={editClassId}
                    onChange={(e) => setEditClassId(e.target.value)}
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

              {subjectsList.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Subject
                  </label>
                  <select
                    value={editSubjectId}
                    onChange={(e) => setEditSubjectId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    {subjectsList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Note Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chapter 4: Trigonometry Formula Sheet"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Description / Topic Summary
                </label>
                <textarea
                  placeholder="Summary or revision instructions for students..."
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Material Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['pdf', 'image', 'link'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEditNoteType(t)}
                      className={`py-2 rounded-xl text-xs font-bold border uppercase transition-all ${
                        editNoteType === t
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-700'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  File URL / Cloud Link (PDF / Image)
                </label>
                <input
                  type="url"
                  placeholder="https://... or Supabase storage public URL"
                  value={editFileUrl}
                  onChange={(e) => setEditFileUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingNote(null)}
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
