import { Request, Response } from 'express';
import { User } from '../models/User.ts';
import { Timetable } from '../models/Timetable.ts';
import { Announcement } from '../models/Announcement.ts';
import bcrypt from 'bcryptjs';

// User Management
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { role } = req.query;
    const query = role ? { role: role as any } : {};
    const users = await User.find(query).select('-password');
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, password, displayName, role, branch, semester } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, displayName, role, branch, semester });
    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { password, ...updates } = req.body;
    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteUser = async (req: any, res: Response) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ message: 'Cannot delete self' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Timetables
const defaultTimeSlots = [
  "10:00 - 10:55",
  "10:55 - 11:50",
  "11:50 - 12:30",
  "12:30 - 01:25",
  "01:25 - 02:20"
];

const defaultDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const defaultTimetableGrid: Record<string, string[]> = {
  Monday: ["PPS", "M-II", "CHEM", "BEE", "F1-CHEM"],
  Tuesday: ["BEE", "M-II", "F1-BEE", "CHEM", "CCC-II"],
  Wednesday: ["CHEM", "EG", "BEE", "PPS", "WS"],
  Thursday: ["IKS", "WS", "M-II", "EG", "BEE"],
  Friday: ["PPS", "CHEM", "EG", "PPS", "M-II"],
  Saturday: ["EG", "BEE", "F1-EG", "M-II", "CHEM"]
};

const buildDefaultSchedule = () => {
  return defaultDays.map(day => ({
    day,
    slots: (defaultTimetableGrid[day] || []).map((subject, index) => {
      const isLab = subject.startsWith('F1-') || subject === 'WS' || subject === 'CCC-II';
      return {
        slotIndex: index,
        timeRange: defaultTimeSlots[index] || '',
        subject,
        room: isLab ? 'Lab 3 / WS' : 'Room 331',
        type: isLab ? 'lab' : 'lecture',
        teacher: subject === 'M-II' ? 'Dr. Sharma' : subject === 'CHEM' || subject === 'F1-CHEM' ? 'Dr. Jamdhade' : 'Faculty Member',
        notes: isLab ? 'Bring lab manual & journal' : ''
      };
    })
  }));
};

export const getTimetables = async (req: Request, res: Response) => {
  try {
    const { courseId, semester } = req.query;
    const query: any = {};
    if (courseId) query.courseId = courseId;
    if (semester) query.semester = semester;
    let timetables = await Timetable.find(query).sort({ isDefault: -1, createdAt: 1 }).populate('slots.subjectId slots.teacherId schedule.slots.subjectId schedule.slots.teacherId');
    
    // Auto-seed if database is currently empty
    if (timetables.length === 0 && Object.keys(query).length === 0) {
      const defaultSchedule = buildDefaultSchedule();
      const defaultTimetable = new Timetable({
        title: 'FE Master Timetable',
        className: 'FE F',
        room: '331',
        academicYear: '2025-26',
        semester: 1,
        section: 'FE F',
        courseName: 'First Year Engineering (FE)',
        isDefault: true,
        timeSlots: defaultTimeSlots,
        days: defaultDays,
        schedule: defaultSchedule
      });
      await defaultTimetable.save();
      timetables = [defaultTimetable];
    }

    res.json(timetables);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createTimetable = async (req: Request, res: Response) => {
  try {
    const timetableData = { ...req.body };
    if (!timetableData.timeSlots || timetableData.timeSlots.length === 0) {
      timetableData.timeSlots = defaultTimeSlots;
    }
    if (!timetableData.days || timetableData.days.length === 0) {
      timetableData.days = defaultDays;
    }
    const timetable = new Timetable(timetableData);
    await timetable.save();
    res.status(201).json(timetable);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTimetable = async (req: Request, res: Response) => {
  try {
    const timetable = await Timetable.findByIdAndUpdate(
      req.params.id, 
      { ...req.body, updatedAt: new Date() }, 
      { new: true, runValidators: true }
    );
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }
    res.json(timetable);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteTimetable = async (req: Request, res: Response) => {
  try {
    const deleted = await Timetable.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Timetable not found' });
    }
    res.json({ message: 'Timetable deleted successfully', id: req.params.id });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const resetTimetable = async (req: Request, res: Response) => {
  try {
    await Timetable.deleteMany({});
    const defaultSchedule = buildDefaultSchedule();
    const defaultTimetable = new Timetable({
      title: 'FE Master Timetable',
      className: 'FE F',
      room: '331',
      academicYear: '2025-26',
      semester: 1,
      section: 'FE F',
      courseName: 'First Year Engineering (FE)',
      isDefault: true,
      timeSlots: defaultTimeSlots,
      days: defaultDays,
      schedule: defaultSchedule
    });
    await defaultTimetable.save();
    res.json({ message: 'Timetables reset to initial default', timetable: defaultTimetable });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Announcements
export const getAnnouncements = async (req: Request, res: Response) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 }).populate('authorId', 'displayName');
    res.json(announcements);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createAnnouncement = async (req: any, res: Response) => {
  try {
    const announcement = new Announcement({
      ...req.body,
      authorId: req.user.id
    });
    await announcement.save();
    res.status(201).json(announcement);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAnnouncement = async (req: any, res: Response) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });
    
    if (req.user.role !== 'admin' && announcement.authorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to edit this announcement' });
    }

    const updated = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteAnnouncement = async (req: any, res: Response) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });
    
    if (req.user.role !== 'admin' && announcement.authorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this announcement' });
    }

    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Announcement deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
