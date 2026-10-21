'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getLocalData,
  getLocalDataForInstitute,
  saveLocalData,
  syncLocalWithRemote,
} from '@/lib/storage-helper';
import {
  Institute,
  ClassBatch,
  Student,
  Subject,
  TimetableEntry,
  Note,
  Announcement,
  AttendanceRecord,
  FeePlan,
  StudentFeeDue,
  FeePayment,
  Exam,
  ExamSubject,
  MarkRecord,
  UserProfile,
  NotificationItem,
  OnlineClass,
} from '@/types/app.types';

export function useSupabaseData(instituteId?: string | null) {
  const supabase = createClient();

  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [classes, setClasses] = useState<ClassBatch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [feePlans, setFeePlans] = useState<FeePlan[]>([]);
  const [feeDues, setFeeDues] = useState<StudentFeeDue[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [examSubjects, setExamSubjects] = useState<ExamSubject[]>([]);
  const [marks, setMarks] = useState<MarkRecord[]>([]);
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [onlineClasses, setOnlineClasses] = useState<OnlineClass[]>([]);

  const [loading, setLoading] = useState(true);
  const [schemaMissing, setSchemaMissing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let isSchemaMissing = false;

    try {
      // 1. Fetch Institutes
      try {
        const { data: instData, error: instError } = await supabase
          .from('institutes')
          .select('*')
          .order('created_at', { ascending: false });

        if (instError && (instError.code === 'PGRST205' || instError.code === '42P01')) {
          isSchemaMissing = true;
          setSchemaMissing(true);
        } else if (instData && instData.length > 0) {
          setInstitutes(syncLocalWithRemote('institutes', instData as Institute[]));
        } else {
          setInstitutes(getLocalData<Institute>('institutes'));
        }
      } catch {
        isSchemaMissing = true;
        setSchemaMissing(true);
        setInstitutes(getLocalData<Institute>('institutes'));
      }

      // If schema is missing on database, load records filtered by institute from local store
      if (isSchemaMissing) {
        setClasses(getLocalDataForInstitute<ClassBatch>('classes', instituteId));
        setStudents(getLocalDataForInstitute<Student>('students', instituteId));
        setSubjects(getLocalDataForInstitute<Subject>('subjects', instituteId));
        setTimetable(getLocalDataForInstitute<TimetableEntry>('timetable', instituteId));
        setNotes(getLocalDataForInstitute<Note>('notes', instituteId));
        setAnnouncements(getLocalDataForInstitute<Announcement>('announcements', instituteId));
        setAttendance(getLocalDataForInstitute<AttendanceRecord>('attendance', instituteId));
        setFeePlans(getLocalDataForInstitute<FeePlan>('feePlans', instituteId));
        setFeeDues(getLocalDataForInstitute<StudentFeeDue>('feeDues', instituteId));
        setPayments(getLocalDataForInstitute<FeePayment>('payments', instituteId));
        setExams(getLocalDataForInstitute<Exam>('exams', instituteId));
        setExamSubjects(getLocalData<ExamSubject>('examSubjects'));
        setMarks(getLocalDataForInstitute<MarkRecord>('marks', instituteId));
        setTeachers(getLocalDataForInstitute<UserProfile>('teachers', instituteId));
        setNotifications(getLocalData<NotificationItem>('notifications'));
        setOnlineClasses(getLocalDataForInstitute<OnlineClass>('onlineClasses', instituteId));
        setLoading(false);
        return;
      }

      // 2. Fetch Classes (Multi-tenant isolated)
      try {
        let clsData: ClassBatch[] | null = null;
        try {
          const apiRes = await fetch(`/api/classes${instituteId ? `?institute_id=${instituteId}` : ''}`);
          const apiJson = await apiRes.json();
          if (apiJson?.classes && Array.isArray(apiJson.classes)) {
            clsData = apiJson.classes;
          }
        } catch {
          // fallback to supabase
        }

        if (!clsData) {
          let classQuery = supabase.from('classes').select('*');
          if (instituteId) classQuery = classQuery.eq('institute_id', instituteId);
          const { data } = await classQuery.order('name');
          clsData = data as ClassBatch[];
        }

        if (clsData && clsData.length > 0) {
          setClasses(syncLocalWithRemote('classes', clsData as ClassBatch[], instituteId));
        } else {
          setClasses(getLocalDataForInstitute<ClassBatch>('classes', instituteId));
        }
      } catch {
        setClasses(getLocalDataForInstitute<ClassBatch>('classes', instituteId));
      }

      // 3. Fetch Students (Multi-tenant isolated)
      try {
        let studentQuery = supabase.from('students').select('*');
        if (instituteId) studentQuery = studentQuery.eq('institute_id', instituteId);
        const { data: stuData } = await studentQuery.order('roll_number');
        if (stuData && stuData.length > 0) {
          setStudents(syncLocalWithRemote('students', stuData as Student[], instituteId));
        } else {
          setStudents(getLocalDataForInstitute<Student>('students', instituteId));
        }
      } catch {
        setStudents(getLocalDataForInstitute<Student>('students', instituteId));
      }

      // 4. Fetch Subjects (Multi-tenant isolated)
      try {
        let subData: Subject[] | null = null;
        try {
          const apiRes = await fetch(`/api/subjects${instituteId ? `?institute_id=${instituteId}` : ''}`);
          const apiJson = await apiRes.json();
          if (apiJson?.subjects && Array.isArray(apiJson.subjects)) {
            subData = apiJson.subjects;
          }
        } catch {
          // fallback to supabase
        }

        if (!subData) {
          let subQuery = supabase.from('subjects').select('*');
          if (instituteId) subQuery = subQuery.eq('institute_id', instituteId);
          const { data } = await subQuery.order('name');
          subData = data as Subject[];
        }

        if (subData && subData.length > 0) {
          setSubjects(syncLocalWithRemote('subjects', subData as Subject[], instituteId));
        } else {
          setSubjects(getLocalDataForInstitute<Subject>('subjects', instituteId));
        }
      } catch {
        setSubjects(getLocalDataForInstitute<Subject>('subjects', instituteId));
      }

      // 5. Fetch Announcements (Multi-tenant isolated)
      try {
        let annQuery = supabase.from('announcements').select('*');
        if (instituteId) annQuery = annQuery.eq('institute_id', instituteId);
        const { data: annData } = await annQuery.order('created_at', { ascending: false });
        if (annData && annData.length > 0) {
          setAnnouncements(syncLocalWithRemote('announcements', annData as Announcement[], instituteId));
        } else {
          setAnnouncements(getLocalDataForInstitute<Announcement>('announcements', instituteId));
        }
      } catch {
        setAnnouncements(getLocalDataForInstitute<Announcement>('announcements', instituteId));
      }

      // 6. Fetch Notes (Multi-tenant isolated)
      try {
        let noteQuery = supabase.from('notes').select('*');
        if (instituteId) noteQuery = noteQuery.eq('institute_id', instituteId);
        const { data: noteData } = await noteQuery.order('created_at', { ascending: false });
        if (noteData && noteData.length > 0) {
          setNotes(syncLocalWithRemote('notes', noteData as Note[], instituteId));
        } else {
          setNotes(getLocalDataForInstitute<Note>('notes', instituteId));
        }
      } catch {
        setNotes(getLocalDataForInstitute<Note>('notes', instituteId));
      }

      // 7. Fetch Fee Dues & Payments & Plans (Multi-tenant isolated)
      try {
        let dueQuery = supabase.from('student_fee_dues').select('*');
        if (instituteId) dueQuery = dueQuery.eq('institute_id', instituteId);
        const { data: dueData } = await dueQuery.order('due_date');
        if (dueData && dueData.length > 0) {
          setFeeDues(syncLocalWithRemote('feeDues', dueData as StudentFeeDue[], instituteId));
        } else {
          setFeeDues(getLocalDataForInstitute<StudentFeeDue>('feeDues', instituteId));
        }

        let payQuery = supabase.from('fee_payments').select('*');
        if (instituteId) payQuery = payQuery.eq('institute_id', instituteId);
        const { data: payData } = await payQuery.order('paid_at', { ascending: false });
        if (payData && payData.length > 0) {
          setPayments(syncLocalWithRemote('payments', payData as FeePayment[], instituteId));
        } else {
          setPayments(getLocalDataForInstitute<FeePayment>('payments', instituteId));
        }

        let planQuery = supabase.from('fee_plans').select('*');
        if (instituteId) planQuery = planQuery.eq('institute_id', instituteId);
        const { data: planData } = await planQuery;
        if (planData && planData.length > 0) {
          setFeePlans(syncLocalWithRemote('feePlans', planData as FeePlan[], instituteId));
        } else {
          setFeePlans(getLocalDataForInstitute<FeePlan>('feePlans', instituteId));
        }
      } catch {
        setFeeDues(getLocalDataForInstitute<StudentFeeDue>('feeDues', instituteId));
        setPayments(getLocalDataForInstitute<FeePayment>('payments', instituteId));
        setFeePlans(getLocalDataForInstitute<FeePlan>('feePlans', instituteId));
      }

      // 8. Fetch Exams, Exam Subjects & Marks (Multi-tenant isolated)
      try {
        let examQuery = supabase.from('exams').select('*');
        if (instituteId) examQuery = examQuery.eq('institute_id', instituteId);
        const { data: examData } = await examQuery.order('created_at', { ascending: false });
        if (examData && examData.length > 0) {
          setExams(syncLocalWithRemote('exams', examData as Exam[], instituteId));
        } else {
          setExams(getLocalDataForInstitute<Exam>('exams', instituteId));
        }

        const { data: esData } = await supabase.from('exam_subjects').select('*');
        if (esData && esData.length > 0) {
          setExamSubjects(esData as ExamSubject[]);
          saveLocalData('examSubjects', esData);
        } else {
          setExamSubjects(getLocalData<ExamSubject>('examSubjects'));
        }

        let markQuery = supabase.from('marks').select('*');
        if (instituteId) markQuery = markQuery.eq('institute_id', instituteId);
        const { data: markData } = await markQuery;
        if (markData && markData.length > 0) {
          setMarks(syncLocalWithRemote('marks', markData as MarkRecord[], instituteId));
        } else {
          setMarks(getLocalDataForInstitute<MarkRecord>('marks', instituteId));
        }
      } catch {
        setExams(getLocalDataForInstitute<Exam>('exams', instituteId));
        setExamSubjects(getLocalData<ExamSubject>('examSubjects'));
        setMarks(getLocalDataForInstitute<MarkRecord>('marks', instituteId));
      }

      // 9. Fetch Timetable (Multi-tenant isolated)
      try {
        let ttData: TimetableEntry[] | null = null;
        try {
          const apiRes = await fetch(`/api/timetable${instituteId ? `?institute_id=${instituteId}` : ''}`);
          const apiJson = await apiRes.json();
          if (apiJson?.timetable && Array.isArray(apiJson.timetable)) {
            ttData = apiJson.timetable;
          }
        } catch {
          // fallback to supabase
        }

        if (!ttData) {
          let ttQuery = supabase.from('timetable').select('*');
          if (instituteId) ttQuery = ttQuery.eq('institute_id', instituteId);
          const { data } = await ttQuery.order('start_time');
          ttData = data as TimetableEntry[];
        }

        if (ttData && ttData.length > 0) {
          setTimetable(syncLocalWithRemote('timetable', ttData as TimetableEntry[], instituteId));
        } else {
          setTimetable(getLocalDataForInstitute<TimetableEntry>('timetable', instituteId));
        }
      } catch {
        setTimetable(getLocalDataForInstitute<TimetableEntry>('timetable', instituteId));
      }

      // 10. Fetch Attendance (Multi-tenant isolated)
      try {
        let attQuery = supabase.from('attendance').select('*');
        if (instituteId) attQuery = attQuery.eq('institute_id', instituteId);
        const { data: attData } = await attQuery.order('date', { ascending: false });
        if (attData && attData.length > 0) {
          setAttendance(syncLocalWithRemote('attendance', attData as AttendanceRecord[], instituteId));
        } else {
          setAttendance(getLocalDataForInstitute<AttendanceRecord>('attendance', instituteId));
        }
      } catch {
        setAttendance(getLocalDataForInstitute<AttendanceRecord>('attendance', instituteId));
      }

      // 11. Fetch Teachers (Multi-tenant isolated)
      try {
        let teacherQuery = supabase.from('users').select('*').eq('role', 'teacher');
        if (instituteId) teacherQuery = teacherQuery.eq('institute_id', instituteId);
        const { data: teacherData } = await teacherQuery;
        if (teacherData && teacherData.length > 0) {
          setTeachers(syncLocalWithRemote('teachers', teacherData as UserProfile[], instituteId));
        } else {
          // Attempt API fetch to bypass RLS
          try {
            const apiRes = await fetch(`/api/teachers${instituteId ? `?institute_id=${instituteId}` : ''}`);
            const apiJson = await apiRes.json();
            if (apiJson.success && apiJson.teachers && apiJson.teachers.length > 0) {
              setTeachers(syncLocalWithRemote('teachers', apiJson.teachers as UserProfile[], instituteId));
            } else {
              setTeachers(getLocalDataForInstitute<UserProfile>('teachers', instituteId));
            }
          } catch {
            setTeachers(getLocalDataForInstitute<UserProfile>('teachers', instituteId));
          }
        }
      } catch {
        setTeachers(getLocalDataForInstitute<UserProfile>('teachers', instituteId));
      }

      // 12. Fetch Notifications
      try {
        const { data: notifData } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);
        if (notifData && notifData.length > 0) {
          setNotifications(notifData as NotificationItem[]);
          saveLocalData('notifications', notifData);
        } else {
          setNotifications(getLocalData<NotificationItem>('notifications'));
        }
      } catch {
        setNotifications(getLocalData<NotificationItem>('notifications'));
      }

      // 16. Fetch Online Classes (Zoom)
      try {
        let ocQuery = (supabase as any)
          .from('online_classes')
          .select('*')
          .order('date', { ascending: false });
        if (instituteId) {
          ocQuery = ocQuery.eq('institute_id', instituteId);
        }
        const { data: ocData } = await ocQuery;
        if (ocData && ocData.length > 0) {
          setOnlineClasses(syncLocalWithRemote('onlineClasses', ocData as OnlineClass[]));
        } else {
          setOnlineClasses(getLocalDataForInstitute<OnlineClass>('onlineClasses', instituteId));
        }
      } catch {
        setOnlineClasses(getLocalDataForInstitute<OnlineClass>('onlineClasses', instituteId));
      }
    } catch (err) {
      console.warn('Supabase data query fallback:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, instituteId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    institutes,
    setInstitutes,
    classes,
    setClasses,
    students,
    setStudents,
    subjects,
    setSubjects,
    timetable,
    setTimetable,
    notes,
    setNotes,
    announcements,
    setAnnouncements,
    attendance,
    setAttendance,
    feePlans,
    setFeePlans,
    feeDues,
    setFeeDues,
    payments,
    setPayments,
    exams,
    setExams,
    examSubjects,
    setExamSubjects,
    marks,
    setMarks,
    teachers,
    setTeachers,
    notifications,
    setNotifications,
    onlineClasses,
    setOnlineClasses,
    loading,
    schemaMissing,
    refetch: fetchData,
  };
}
