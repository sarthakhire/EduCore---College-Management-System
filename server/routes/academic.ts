import express from 'express';
import { authenticate } from '../middleware/authMiddleware.ts';
import { checkRole } from '../middleware/roleMiddleware.ts';
import * as courseController from '../controllers/courseController.ts';
import * as materialController from '../controllers/materialController.ts';
import { Timetable } from '../models/Timetable.ts';
import { Announcement } from '../models/Announcement.ts';
import { User } from '../models/User.ts';
import bcrypt from 'bcryptjs';
import { upload } from '../middleware/uploadMiddleware.ts';

const router = express.Router();

// Courses
router.get('/stats', courseController.getStats);
router.get('/courses', courseController.getAllCourses);
router.post('/courses', authenticate, checkRole(['admin']), courseController.createCourse);
router.patch('/courses/:id', authenticate, checkRole(['admin']), courseController.updateCourse);
router.delete('/courses/:id', authenticate, checkRole(['admin']), courseController.deleteCourse);

// Subjects
router.get('/subjects', courseController.getAllSubjects);
router.get('/subjects/:id/syllabus', courseController.getSubjectSyllabus);
router.post('/subjects', authenticate, checkRole(['admin']), upload.single('file'), courseController.createSubject);
router.patch('/subjects/:id', authenticate, checkRole(['admin', 'teacher']), upload.single('file'), courseController.updateSubject);
router.delete('/subjects/:id', authenticate, checkRole(['admin']), courseController.deleteSubject);

// Materials
router.get('/materials', materialController.getAllMaterials);
router.get('/materials/:id/download', materialController.getMaterialDownload);
router.post('/materials', authenticate, checkRole(['admin', 'teacher']), upload.single('file'), materialController.uploadMaterial);
router.delete('/materials/:id', authenticate, checkRole(['admin', 'teacher']), materialController.deleteMaterial);

// Admin: Users
import * as adminController from '../controllers/adminController.ts';
import * as enrollmentController from '../controllers/enrollmentController.ts';
import * as recordController from '../controllers/recordController.ts';

// Enrollments
router.get('/enrollments', authenticate, checkRole(['admin', 'teacher', 'student']), enrollmentController.getEnrollments);
router.post('/enrollments', authenticate, checkRole(['admin', 'teacher']), enrollmentController.enrollStudent);
router.delete('/enrollments/:id', authenticate, checkRole(['admin', 'teacher']), enrollmentController.removeEnrollment);

// Attendance & Performance
router.get('/attendance', authenticate, recordController.getAttendance);
router.post('/attendance', authenticate, checkRole(['admin', 'teacher']), recordController.saveAttendance);

router.get('/performance', authenticate, recordController.getPerformance);
router.post('/performance', authenticate, checkRole(['admin', 'teacher']), recordController.savePerformance);

router.get('/users', authenticate, checkRole(['admin', 'teacher']), adminController.getAllUsers);
router.post('/users', authenticate, checkRole(['admin']), adminController.createUser);
router.patch('/users/:id', authenticate, checkRole(['admin', 'teacher']), adminController.updateUser);
router.delete('/users/:id', authenticate, checkRole(['admin']), adminController.deleteUser);

// Timetables
router.get('/timetables', adminController.getTimetables);
router.post('/timetables', authenticate, checkRole(['admin', 'teacher', 'student']), adminController.createTimetable);
router.patch('/timetables/:id', authenticate, checkRole(['admin', 'teacher', 'student']), adminController.updateTimetable);
router.put('/timetables/:id', authenticate, checkRole(['admin', 'teacher', 'student']), adminController.updateTimetable);
router.delete('/timetables/:id', authenticate, checkRole(['admin', 'teacher', 'student']), adminController.deleteTimetable);
router.post('/timetables/reset', authenticate, checkRole(['admin', 'teacher', 'student']), adminController.resetTimetable);

// Announcements
router.get('/announcements', adminController.getAnnouncements);
router.post('/announcements', authenticate, checkRole(['admin', 'teacher']), adminController.createAnnouncement);
router.patch('/announcements/:id', authenticate, checkRole(['admin', 'teacher']), adminController.updateAnnouncement);
router.delete('/announcements/:id', authenticate, checkRole(['admin', 'teacher']), adminController.deleteAnnouncement);

export default router;
