import {
  Institute,
  UserProfile,
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
  NotificationItem,
  NotificationSettings,
} from '@/types/app.types';

// Seed data removed as requested - Initialized as empty live database arrays
export const MOCK_INSTITUTES: Institute[] = [];
export const MOCK_USERS: UserProfile[] = [];
export const MOCK_CLASSES: ClassBatch[] = [];
export const MOCK_STUDENTS: Student[] = [];
export const MOCK_SUBJECTS: Subject[] = [];
export const MOCK_TIMETABLE: TimetableEntry[] = [];
export const MOCK_NOTES: Note[] = [];
export const MOCK_ANNOUNCEMENTS: Announcement[] = [];
export const MOCK_ATTENDANCE: AttendanceRecord[] = [];
export const MOCK_FEE_PLANS: FeePlan[] = [];
export const MOCK_FEE_DUES: StudentFeeDue[] = [];
export const MOCK_PAYMENTS: FeePayment[] = [];
export const MOCK_EXAMS: Exam[] = [];
export const MOCK_EXAM_SUBJECTS: ExamSubject[] = [];
export const MOCK_MARKS: MarkRecord[] = [];
export const MOCK_NOTIFICATIONS: NotificationItem[] = [];

export const MOCK_NOTIFICATION_SETTINGS: NotificationSettings = {
  id: 'ns-default',
  user_id: null,
  phone: '',
  absent_alert: true,
  fee_due: true,
  fee_paid: true,
  announcement: true,
  new_notes: true,
  timetable_change: true,
  marks_published: true,
  updated_at: new Date().toISOString(),
};
