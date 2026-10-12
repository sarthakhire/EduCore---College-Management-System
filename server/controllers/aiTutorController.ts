import { Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { Course } from '../models/Course.ts';
import { Subject } from '../models/Subject.ts';
import { Material } from '../models/Material.ts';
import { Enrollment } from '../models/Enrollment.ts';
import { User } from '../models/User.ts';

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ GEMINI_API_KEY is not defined in environment variables.');
  }
  return new GoogleGenAI({
    apiKey: apiKey || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

/**
 * Get courses and subjects available to the student for AI tutoring
 */
export const getStudentTutorContext = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let courses: any[] = [];

    if (userRole === 'student') {
      // Find courses the student is enrolled in
      let enrollments = await Enrollment.find({ studentId: userId }).populate('courseId');

      // If student has no enrollments yet, automatically enroll in available courses so tutor is immediately usable
      if (enrollments.length === 0) {
        const allAvailableCourses = await Course.find();
        if (allAvailableCourses.length > 0) {
          try {
            // Enroll in the first available course (e.g. Computer Engineering)
            const autoEnroll = new Enrollment({
              studentId: userId,
              courseId: allAvailableCourses[0]._id,
              enrolledBy: userId,
            });
            await autoEnroll.save();
            enrollments = await Enrollment.find({ studentId: userId }).populate('courseId');
          } catch (enrollErr) {
            console.log('Auto-enroll skipped or duplicate:', enrollErr);
          }
        }
      }

      courses = enrollments
        .map((e) => e.courseId)
        .filter((c) => Boolean(c));

      // Fallback if still empty: return all courses so student can still study
      if (courses.length === 0) {
        courses = await Course.find();
      }
    } else {
      // Teachers and Admins have access to all courses
      courses = await Course.find();
    }

    // For all courses, fetch subjects and study materials
    const courseIds = courses.map((c) => c._id);
    const subjects = await Subject.find({ courseId: { $in: courseIds } });
    const materials = await Material.find({ courseId: { $in: courseIds } })
      .select('title type subjectId courseId createdAt')
      .limit(30);

    res.json({
      courses,
      subjects,
      materials,
    });
  } catch (error: any) {
    console.error('Error fetching tutor context:', error);
    res.status(500).json({ message: 'Failed to fetch academic context', error: error.message });
  }
};

/**
 * Chat with AI Tutor for a specific course/subject
 */
export const chatWithTutor = async (req: any, res: Response) => {
  try {
    const { courseId, subjectId, message, history, studyMode = 'general_qa' } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ message: 'A prompt message is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        message: 'GEMINI_API_KEY is not configured on the server. Please check your environment variables.',
      });
    }

    // Fetch Course & Subject Context
    let courseInfo = 'College Course';
    let branchInfo = 'General Studies';
    let subjectInfo = 'General Academic Subject';
    let subjectSyllabus = '';
    let materialsList = '';

    if (courseId) {
      const courseDoc = await Course.findById(courseId);
      if (courseDoc) {
        courseInfo = `${courseDoc.name} (${courseDoc.branch})`;
        branchInfo = courseDoc.branch;
      }
    }

    if (subjectId) {
      const subjectDoc = await Subject.findById(subjectId);
      if (subjectDoc) {
        subjectInfo = `${subjectDoc.name} (Code: ${subjectDoc.code}, Semester ${subjectDoc.semester})`;
        if (subjectDoc.syllabusUrl) {
          subjectSyllabus = `Syllabus reference available: ${subjectDoc.syllabusUrl}`;
        }
      }
      const materials = await Material.find({ subjectId }).limit(6);
      if (materials.length > 0) {
        materialsList = materials.map((m) => `• [${m.type.toUpperCase()}] ${m.title}`).join('\n');
      }
    } else if (courseId) {
      const allSubjects = await Subject.find({ courseId }).limit(8);
      if (allSubjects.length > 0) {
        subjectInfo = allSubjects.map((s) => `${s.name} (${s.code}, Sem ${s.semester})`).join(', ');
      }
    }

    // Customize mode instruction
    let modeInstruction = '';
    switch (studyMode) {
      case 'concept_explainer':
        modeInstruction = 'Explain the core concept in depth. Structure your answer with: 1) Intuitive High-Level Analogy, 2) Formal Academic Definition, 3) Step-by-Step Breakdown with mathematical/theoretical rigor, 4) Real-World Engineering/Practical Application, and 5) Summary Bullet Points.';
        break;
      case 'problem_solver':
        modeInstruction = 'Act as an expert STEM tutor solving a problem. Structure: 1) Given Data & Objective, 2) Underlying Formulas/Theorems, 3) Detailed Step-by-Step Mathematical Derivation, 4) Final Answer with Units, and 5) Sanity Check / Edge Cases.';
        break;
      case 'exam_prep':
        modeInstruction = 'Focus heavily on scoring top marks in college exams. Highlight: 1) High-yield points examiners look for, 2) Ideal answer-sheet presentation format, 3) Key diagrams or formula boxes to draw, and 4) Common student mistakes & misconceptions to avoid.';
        break;
      case 'revision_notes':
        modeInstruction = 'Produce concise, high-yield bullet revision notes. Include key definitions, primary equations/laws, comparison tables if relevant, and memory mnemonics.';
        break;
      default:
        modeInstruction = 'Provide a comprehensive, engaging, and pedagogically clear academic explanation. Use formatting (bold headings, bullet points, numbered steps, code blocks or LaTeX-styled formulas) to make it easy to study.';
        break;
    }

    const systemInstruction = `You are "EduCore AI Tutor", an elite university professor and dedicated personal study mentor at EduCore College.
Student Information:
- Current Student: ${req.user.displayName || 'Student'}
- Enrolled Course: ${courseInfo}
- Branch: ${branchInfo}
- Focused Subject: ${subjectInfo}
${subjectSyllabus ? `- Syllabus details: ${subjectSyllabus}` : ''}
${materialsList ? `- Available Department Study Materials:\n${materialsList}` : ''}

Your Mission:
1. Provide accurate, clear, and contextually grounded academic tutoring specifically tailored to the student's enrolled course and subject curriculum.
2. Mode focus: ${modeInstruction}
3. Always maintain an encouraging, intellectual, and supportive academic tone.
4. When writing code, provide clean, commented snippets with language tags.
5. When writing formulas or equations, format them clearly (using markdown math format like $$E = mc^2$$ or inline $x$).
6. Provide structured answers with clear markdown headers, bold keywords, and bullet lists.
7. Conclude with 1-2 insightful thought-provoking study questions to test the student's understanding.`;

    const ai = getGeminiClient();

    // Prepare contents with conversation history if supplied
    const contents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      // Keep up to 6 previous turns for compact context
      const recentHistory = history.slice(-6);
      for (const turn of recentHistory) {
        if (turn.role === 'user' || turn.role === 'model') {
          contents.push({
            role: turn.role,
            parts: [{ text: String(turn.text || turn.content || '') }],
          });
        }
      }
    }

    // Append current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const replyText = response.text || 'I apologize, but I could not formulate an answer at this time. Please try rephrasing your question.';

    // Generate 3 contextual follow-up chips
    let suggestions = [
      'Can you explain this with a real-world example?',
      'What are the common exam questions on this topic?',
      'Can you give me a practice problem to test my understanding?',
    ];

    if (subjectInfo.toLowerCase().includes('math')) {
      suggestions = [
        'Can you show a step-by-step solved numerical problem?',
        'What are the key formulas I must memorize for this?',
        'Can you quiz me on this mathematical theorem?',
      ];
    } else if (subjectInfo.toLowerCase().includes('physic')) {
      suggestions = [
        'How does this concept apply in practical engineering?',
        'Can you provide a derivation for this formula?',
        'What are the standard university exam questions for this unit?',
      ];
    }

    res.json({
      reply: replyText,
      suggestions,
      subject: subjectInfo,
      course: courseInfo,
    });
  } catch (error: any) {
    console.error('AI Tutor chat error:', error);
    res.status(500).json({
      message: 'Failed to generate tutor response',
      error: error.message || 'Unknown error occurred',
    });
  }
};

/**
 * Generate an interactive practice quiz for the student
 */
export const generateQuiz = async (req: any, res: Response) => {
  try {
    const { courseId, subjectId, topic, count = 4 } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ message: 'GEMINI_API_KEY is not configured.' });
    }

    let subjectName = 'Engineering & Science';
    let courseName = 'Academic Course';

    if (courseId) {
      const c = await Course.findById(courseId);
      if (c) courseName = c.name;
    }
    if (subjectId) {
      const s = await Subject.findById(subjectId);
      if (s) subjectName = `${s.name} (${s.code})`;
    }

    const targetTopic = topic || subjectName;

    const prompt = `Generate a high-quality ${count}-question multiple-choice practice quiz for college students studying:
Course: ${courseName}
Subject: ${subjectName}
Topic: ${targetTopic}

Requirements:
1. Each question must test conceptual understanding or problem-solving.
2. Provide exactly 4 plausible options (A, B, C, D).
3. Provide the index of the correct option (0, 1, 2, or 3).
4. Provide a thorough, educational explanation of why the correct option is right and common mistakes in other options.`;

    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are an academic test maker creating rigorous, helpful university exam questions.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  correctIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                  difficulty: { type: Type.STRING },
                },
                required: ['id', 'question', 'options', 'correctIndex', 'explanation'],
              },
            },
          },
          required: ['questions'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Quiz generation error:', error);
    res.status(500).json({ message: 'Failed to generate quiz', error: error.message });
  }
};

/**
 * Generate smart flashcards for quick revision
 */
export const generateFlashcards = async (req: any, res: Response) => {
  try {
    const { courseId, subjectId, topic } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ message: 'GEMINI_API_KEY is not configured.' });
    }

    let subjectName = 'Engineering & Science';
    if (subjectId) {
      const s = await Subject.findById(subjectId);
      if (s) subjectName = s.name;
    }

    const prompt = `Generate 5 high-yield study flashcards for college students studying ${subjectName}.
Specific Topic/Focus: ${topic || subjectName}.
Each flashcard should cover a core law, definition, formula, or concept.`;

    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING },
            flashcards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  category: { type: Type.STRING },
                  front: { type: Type.STRING },
                  back: { type: Type.STRING },
                  example: { type: Type.STRING },
                },
                required: ['id', 'category', 'front', 'back'],
              },
            },
          },
          required: ['flashcards'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Flashcard error:', error);
    res.status(500).json({ message: 'Failed to generate flashcards', error: error.message });
  }
};

/**
 * Generate comprehensive Revision Guide / Exam Sheet
 */
export const generateRevisionGuide = async (req: any, res: Response) => {
  try {
    const { courseId, subjectId, topic } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ message: 'GEMINI_API_KEY is not configured.' });
    }

    let subjectName = 'Core Studies';
    let courseName = 'Engineering';

    if (courseId) {
      const c = await Course.findById(courseId);
      if (c) courseName = c.name;
    }
    if (subjectId) {
      const s = await Subject.findById(subjectId);
      if (s) subjectName = `${s.name} (${s.code})`;
    }

    const targetTopic = topic || subjectName;

    const prompt = `Create a comprehensive high-yield College Exam Revision Sheet for:
Course: ${courseName}
Subject: ${subjectName}
Topic: ${targetTopic}

Format in structured Markdown:
1. 📌 **Executive Summary & Big Picture**
2. 📐 **Essential Formulas, Laws & Definitions**
3. ⚡ **Top 5 High-Probability University Exam Questions & How to Answer Them**
4. ⚠️ **Common Pitfalls & Marks-Losing Mistakes**
5. 🧠 **Quick Recall Mnemonics & Pro-Tips**`;

    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are an academic university professor creating the ultimate exam revision cheat sheet.',
      },
    });

    res.json({
      topic: targetTopic,
      subject: subjectName,
      guide: response.text || '',
    });
  } catch (error: any) {
    console.error('Revision guide error:', error);
    res.status(500).json({ message: 'Failed to generate revision guide', error: error.message });
  }
};
