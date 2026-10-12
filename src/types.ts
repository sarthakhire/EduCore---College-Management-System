
export type Role = 'admin' | 'teacher' | 'student';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  photoURL?: string;
  signatureURL?: string;
  address?: string;
  studentClass?: string;
  sectionDiv?: string;
  gpa?: number;
  attendance?: number;
  activeSubjects?: string[];
  backlogs?: number;
  credits?: number;
  branch?: string;
  semester?: number;
  studentId?: string;
  createdAt: string;
}

export interface Course {
  id: string;
  name: string;
  branch: string;
  duration: number; // in years
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  courseId: string;
  semester: number;
  syllabusUrl?: string;
}

export interface Material {
  id: string;
  title: string;
  type: 'notes' | 'pyq' | 'assignment' | 'syllabus';
  fileUrl: string;
  subjectId: string;
  uploadedBy: string;
  uploadedByName?: string;
  isApproved: boolean;
  createdAt: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  subjectId: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent';
  markedBy: string;
}

export interface Mark {
  id: string;
  studentId: string;
  subjectId: string;
  type: 'internal' | 'external' | 'assignment';
  score: number;
  total: number;
  enteredBy: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  targetRole: 'all' | 'student' | 'teacher';
  createdBy: string;
  createdByName?: string;
  createdAt: string;
}

export type SlotType = 'lecture' | 'lab' | 'tutorial' | 'break' | 'seminar' | 'other';

export interface TimetableSlot {
  _id?: string;
  slotIndex?: number;
  timeRange?: string; // e.g. "10:00 - 10:55"
  startTime?: string;
  endTime?: string;
  subject: string; // e.g. "PPS", "M-II", "CHEM"
  subjectCode?: string;
  subjectId?: string;
  teacher?: string;
  teacherId?: string;
  room?: string;
  type?: SlotType;
  color?: string;
  notes?: string;
}

export interface DaySchedule {
  day: string;
  slots: TimetableSlot[];
}

export interface TimetableItem {
  _id: string;
  title: string;
  className: string;
  room: string;
  academicYear: string;
  courseId?: string;
  courseName?: string;
  semester: number;
  section?: string;
  isDefault?: boolean;
  timeSlots: string[];
  days: string[];
  schedule: DaySchedule[];
  updatedAt?: string;
  createdAt?: string;
}

