'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/context';
import { Users, Search, Plus, Phone, MapPin, X, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Student, ClassBatch } from '@/types/app.types';
import {
  getLocalDataForInstitute,
  appendLocalData,
  syncLocalWithRemote,
  updateLocalData,
  removeLocalData,
} from '@/lib/storage-helper';

export default function StudentsPage() {
  const { institute, user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const supabase = createClient();
  const instId = institute?.id || user?.institute_id || null;

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [schemaNotice, setSchemaNotice] = useState(false);

  // New Student Form State
  const [fullName, setFullName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [classId, setClassId] = useState('');
  const [address, setAddress] = useState('');

  // Edit Student Form State
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editRollNumber, setEditRollNumber] = useState('');
  const [editAdmissionNumber, setEditAdmissionNumber] = useState('');
  const [editParentName, setEditParentName] = useState('');
  const [editParentPhone, setEditParentPhone] = useState('');
  const [editClassId, setEditClassId] = useState('');
  const [editAddress, setEditAddress] = useState('');

  const loadData = React.useCallback(async () => {
    try {
      let stuData: Student[] | null = null;
      try {
        const apiRes = await fetch(`/api/students${instId ? `?institute_id=${instId}` : ''}`);
        const apiJson = await apiRes.json();
        if (apiJson?.success && Array.isArray(apiJson.students)) {
          stuData = apiJson.students;
        }
      } catch {
        // fallback to supabase
      }

      if (!stuData) {
        let stuQuery = supabase.from('students').select('*');
        if (instId) {
          stuQuery = stuQuery.eq('institute_id', instId);
        }
        const { data, error: stuError } = await stuQuery.order('roll_number');
        if (stuError && (stuError.code === 'PGRST205' || stuError.code === '42P01')) {
          setSchemaNotice(true);
        } else if (data) {
          stuData = data as Student[];
        }
      }

      if (stuData && stuData.length > 0) {
        setStudents(syncLocalWithRemote('students', stuData, instId));
      } else {
        setStudents(getLocalDataForInstitute<Student>('students', instId));
      }

      let clsQuery = supabase.from('classes').select('*');
      if (instId) {
        clsQuery = clsQuery.eq('institute_id', instId);
      }
      const { data: clsData } = await clsQuery.order('name');
      const clsList = (clsData || []) as ClassBatch[];
      if (clsList.length > 0) {
        const mergedCls = syncLocalWithRemote('classes', clsList, instId);
        setClasses(mergedCls);
        setClassId((prev) => prev || mergedCls[0]?.id || '');
      } else {
        const localCls = getLocalDataForInstitute<ClassBatch>('classes', instId);
        setClasses(localCls);
        if (localCls.length > 0) setClassId((prev) => prev || localCls[0]?.id || '');
      }
    } catch {
      setSchemaNotice(true);
      setStudents(getLocalDataForInstitute<Student>('students', instId));
      setClasses(getLocalDataForInstitute<ClassBatch>('classes', instId));
    } finally {
      setLoading(false);
    }
  }, [supabase, instId]);

  useEffect(() => {
    if (authLoading) return;
    const localStu = getLocalDataForInstitute<Student>('students', instId);
    const localCls = getLocalDataForInstitute<ClassBatch>('classes', instId);
    if (localStu.length > 0) setStudents(localStu);
    if (localCls.length > 0) {
      setClasses(localCls);
      setClassId((prev) => prev || localCls[0]?.id || '');
    }
    loadData();
  }, [loadData, instId, authLoading]);

  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveInstId = instId || '00000000-0000-0000-0000-000000000001';
    let targetClassId = classId;
    if (!targetClassId || targetClassId === 'cls-default' || !targetClassId.includes('-')) {
      targetClassId = classes[0]?.id || '';
    }
    if (!targetClassId) {
      alert('Please add a class first before registering students.');
      return;
    }

    const formattedPhone = parentPhone.startsWith('+')
      ? parentPhone
      : `+91${parentPhone.replace(/\D/g, '')}`;

    const localStudent: Student = {
      id: `stu-${Date.now()}`,
      institute_id: effectiveInstId,
      class_id: targetClassId,
      full_name: fullName,
      roll_number: rollNumber,
      admission_number: admissionNumber || `ADM-${Date.now().toString().slice(-4)}`,
      parent_name: parentName,
      parent_phone: formattedPhone,
      parent_email: null,
      address,
      gender: 'other',
      dob: null,
      photo_url: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      let savedStudent: Student = localStudent;
      try {
        const apiRes = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: localStudent.id,
            institute_id: effectiveInstId,
            class_id: targetClassId,
            full_name: fullName,
            roll_number: rollNumber,
            admission_number: localStudent.admission_number,
            parent_name: parentName,
            parent_phone: formattedPhone,
            address,
            is_active: true,
          }),
        });
        const apiJson = await apiRes.json();
        if (apiJson?.success && apiJson.student) {
          savedStudent = apiJson.student as Student;
        }
      } catch {
        // Fallback to client-side supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any)
          .from('students')
          .insert({
            institute_id: effectiveInstId,
            class_id: targetClassId,
            full_name: fullName,
            roll_number: rollNumber,
            admission_number: localStudent.admission_number,
            parent_name: parentName,
            parent_phone: formattedPhone,
            address,
            is_active: true,
          })
          .select()
          .single();
        if (data) savedStudent = data as Student;
      }

      setStudents(appendLocalData('students', savedStudent, instId));

      // Only set active child if current session is parent
      if (user?.role === 'parent') {
        localStorage.setItem('classdesk_active_child', savedStudent.id);
      }

      // Create default current month tuition fee due so student fee section is immediately populated
      const now = new Date();
      const currentMonthName = now.toLocaleDateString('en-US', { month: 'long' });
      const currentYear = now.getFullYear();
      const dueDay = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-10`;
      const defaultFeeDue = {
        id: `due-${savedStudent.id}-${Date.now()}`,
        institute_id: effectiveInstId,
        student_id: savedStudent.id,
        title: `${currentMonthName} ${currentYear} Tuition Fee`,
        original_amount: 2500,
        paid_amount: 0,
        due_date: dueDay,
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      appendLocalData('feeDues', defaultFeeDue, effectiveInstId);
    } catch {
      setStudents(appendLocalData('students', localStudent, instId));
      localStorage.setItem('classdesk_active_child', localStudent.id);
    }

    setShowAddModal(false);
    setFullName('');
    setRollNumber('');
    setAdmissionNumber('');
    setParentName('');
    setParentPhone('');
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setEditFullName(student.full_name);
    setEditRollNumber(student.roll_number || '');
    setEditAdmissionNumber(student.admission_number || '');
    setEditParentName(student.parent_name || '');
    setEditParentPhone(student.parent_phone || '');
    setEditClassId(student.class_id || classes[0]?.id || '');
    setEditAddress(student.address || '');
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const formattedPhone = editParentPhone.startsWith('+')
      ? editParentPhone
      : `+91${editParentPhone.replace(/\D/g, '')}`;

    const updates = {
      full_name: editFullName,
      roll_number: editRollNumber,
      admission_number: editAdmissionNumber,
      parent_name: editParentName,
      parent_phone: formattedPhone,
      class_id: editClassId,
      address: editAddress,
    };

    try {
      const apiRes = await fetch('/api/students', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingStudent.id, ...updates }),
      });
      if (!apiRes.ok) throw new Error('API update failed');
    } catch {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('students')
          .update(updates)
          .eq('id', editingStudent.id);
      } catch (err) {
        console.warn('Update remote student warning:', err);
      }
    }

    setStudents(updateLocalData<Student>('students', editingStudent.id, updates, instId));
    setEditingStudent(null);
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete student "${name}"?`)) {
      return;
    }

    try {
      const apiRes = await fetch(`/api/students?id=${id}`, {
        method: 'DELETE',
      });
      if (!apiRes.ok) throw new Error('API delete failed');
    } catch {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('students')
          .delete()
          .eq('id', id);
      } catch (err) {
        console.warn('Delete remote student warning:', err);
      }
    }

    setStudents(removeLocalData<Student>('students', id, instId));
  };

  const filtered = students.filter((s) => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.parent_phone.includes(search) ||
      s.admission_number?.toLowerCase().includes(search.toLowerCase());
    const matchesClass = selectedClass === 'all' || s.class_id === selectedClass;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {schemaNotice && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-900 leading-snug">
            <strong>Database Setup Required:</strong> Paste and run <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">supabase/schema.sql</code> in your Supabase SQL Editor to initialize all 18 tables.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            {t('nav.students', 'Student Directory')}
          </h2>
          <p className="text-xs text-slate-500">
            Enrollments, roll numbers, and linked parent contact details
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-4 py-2.5 rounded-2xl text-xs font-bold shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5 transition-all min-h-[40px]"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Student</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by student name, roll, or parent phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="bg-white border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} - Section {c.section}
            </option>
          ))}
        </select>
      </div>

      {/* Loading or Empty or List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading student directory...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Students Enrolled Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Add your first student with their roll number and parent mobile number.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold px-4 py-2 rounded-xl text-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Enroll First Student</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((student) => {
            const cls = classes.find((c) => c.id === student.class_id);
            return (
              <div
                key={student.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-200 transition-colors group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {cls?.name || 'Class'} {cls?.section ? `- ${cls.section}` : ''}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">
                        Adm #{student.admission_number}
                      </span>
                      <button
                        onClick={() => handleOpenEdit(student)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit Student"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(student.id, student.full_name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Student"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 mt-3">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                      {student.roll_number || 'ST'}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{student.full_name}</h3>
                      <p className="text-[11px] text-slate-400">Roll #{student.roll_number || '-'}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px]">Parent:</span>
                      <span className="font-semibold text-slate-800">{student.parent_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-semibold text-slate-800">{student.parent_phone}</span>
                    </div>
                    {student.address && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{student.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Register Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Register New Student</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterStudent} className="space-y-4 mt-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Student Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Arun Kumar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Roll Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 101"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Class / Batch
                  </label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.section})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Parent Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Suresh Kumar"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Parent Phone (+91)
                  </label>
                  <input
                    type="tel"
                    placeholder="10-digit number"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Residential Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Near Town Hall, Kochi"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white py-3.5 rounded-2xl text-xs font-bold shadow-md shadow-indigo-100 transition-all min-h-[48px]"
              >
                Save Student to Database
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-600" />
                <span>Edit Student Profile</span>
              </h3>
              <button
                onClick={() => setEditingStudent(null)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStudent} className="space-y-4 mt-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Roll Number
                  </label>
                  <input
                    type="text"
                    value={editRollNumber}
                    onChange={(e) => setEditRollNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Admission Number
                  </label>
                  <input
                    type="text"
                    value={editAdmissionNumber}
                    onChange={(e) => setEditAdmissionNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Class / Batch
                </label>
                <select
                  value={editClassId}
                  onChange={(e) => setEditClassId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.section})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Parent Name
                  </label>
                  <input
                    type="text"
                    value={editParentName}
                    onChange={(e) => setEditParentName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Parent Phone (+91)
                  </label>
                  <input
                    type="tel"
                    value={editParentPhone}
                    onChange={(e) => setEditParentPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Residential Address
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
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
