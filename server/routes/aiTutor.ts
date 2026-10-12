import express from 'express';
import { authenticate } from '../middleware/authMiddleware.ts';
import * as aiTutorController from '../controllers/aiTutorController.ts';

const router = express.Router();

// Get enrolled courses, subjects, and study materials for AI Tutor context
router.get('/courses', authenticate, aiTutorController.getStudentTutorContext);

// Ask questions and study with AI Tutor
router.post('/chat', authenticate, aiTutorController.chatWithTutor);

// Interactive Practice Quiz
router.post('/quiz', authenticate, aiTutorController.generateQuiz);

// Smart Flashcards
router.post('/flashcards', authenticate, aiTutorController.generateFlashcards);

// Comprehensive Exam Revision Guide
router.post('/revision-guide', authenticate, aiTutorController.generateRevisionGuide);

export default router;
