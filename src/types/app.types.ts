import { Database, UserRole, AttendanceStatus } from './database.types';

export type Institute = Database['public']['Tables']['institutes']['Row'];
export type UserProfile = Database['public']['Tables']['users']['Row'];
export type ClassBatch = Database['public']['Tables']['classes']['Row'];
export type Student = Database['public']['Tables']['students']['Row'];
export type Subject = Database['public']['Tables']['subjects']['Row'];
export type TimetableEntry = Database['public']['Tables']['timetable']['Row'];
export type Note = Database['public']['Tables']['notes']['Row'];
export type Announcement = Database['public']['Tables']['announcements']['Row'];
export type AttendanceRecord = Database['public']['Tables']['attendance']['Row'];
export type FeePlan = Database['public']['Tables']['fee_plans']['Row'];
export type StudentFeeDue = Database['public']['Tables']['student_fee_dues']['Row'];
export type FeePayment = Database['public']['Tables']['fee_payments']['Row'];
export type Exam = Database['public']['Tables']['exams']['Row'];
export type ExamSubject = Database['public']['Tables']['exam_subjects']['Row'];
export type MarkRecord = Database['public']['Tables']['marks']['Row'];
export type NotificationItem = Database['public']['Tables']['notifications']['Row'];
export type NotificationSettings = Database['public']['Tables']['notification_settings']['Row'];

export interface AuthSession {
  user: {
    id: string;
    phone: string;
    role: UserRole;
    full_name: string;
    institute_id: string | null;
  };
  institute?: Institute | null;
  activeChild?: Student | null;
  linkedChildren?: Student[];
}

export interface StudentWithClass extends Student {
  class_name?: string;
  section?: string;
}

export interface AttendanceRowItem {
  student: Student;
  status: AttendanceStatus;
  remarks?: string;
}

export interface ExamReportCardData {
  student: Student;
  classBatch: ClassBatch;
  institute: Institute;
  exam: Exam;
  marks: {
    subject: Subject;
    maxMarks: number;
    passMarks: number;
    obtainedMarks: number | null;
    isAbsent: boolean;
    grade: string;
  }[];
  totalMax: number;
  totalObtained: number;
  percentage: number;
  rank?: number;
  overallGrade: string;
  result: 'PASSED' | 'FAILED';
  teacherRemarks?: string;
}
