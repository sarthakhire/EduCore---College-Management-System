import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema({
  slotIndex: { type: Number },
  timeRange: { type: String }, // e.g. "10:00 - 10:55"
  startTime: { type: String },
  endTime: { type: String },
  subject: { type: String, required: true }, // e.g. "PPS", "M-II", "CHEM", "BEE"
  subjectCode: { type: String },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  teacher: { type: String },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  room: { type: String },
  type: { 
    type: String, 
    enum: ['lecture', 'lab', 'tutorial', 'break', 'seminar', 'other'],
    default: 'lecture' 
  },
  color: { type: String },
  notes: { type: String }
}, { _id: true });

const dayScheduleSchema = new mongoose.Schema({
  day: { 
    type: String, 
    required: true 
  },
  slots: [slotSchema]
}, { _id: false });

const timetableSchema = new mongoose.Schema({
  title: { type: String, default: 'FE Master Timetable' },
  className: { type: String, default: 'FE F' },
  room: { type: String, default: '331' },
  academicYear: { type: String, default: '2025-26' },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: false },
  courseName: { type: String, default: 'First Year Engineering (FE)' },
  semester: { type: Number, default: 1 },
  section: { type: String, default: 'FE F' },
  isDefault: { type: Boolean, default: false },
  timeSlots: { 
    type: [String], 
    default: [
      "10:00 - 10:55",
      "10:55 - 11:50",
      "11:50 - 12:30",
      "12:30 - 01:25",
      "01:25 - 02:20"
    ] 
  },
  days: { 
    type: [String], 
    default: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] 
  },
  schedule: [dayScheduleSchema],
  // Legacy compatibility fields
  day: { type: String },
  slots: [slotSchema],
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const Timetable = mongoose.model('Timetable', timetableSchema);
