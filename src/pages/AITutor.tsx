import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Send, 
  BookOpen, 
  GraduationCap, 
  BrainCircuit, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  RotateCw, 
  Copy, 
  Check, 
  Layers, 
  FileCheck2, 
  Zap, 
  Lightbulb, 
  ChevronRight, 
  RefreshCw,
  Library,
  SlidersHorizontal,
  Flame,
  Award,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { MarkdownRenderer } from '../components/MarkdownRenderer';

interface Course {
  _id: string;
  name: string;
  branch: string;
  duration: number;
}

interface Subject {
  _id: string;
  name: string;
  code: string;
  semester: number;
  courseId: string;
}

interface StudyMaterial {
  _id: string;
  title: string;
  type: string;
  subjectId: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  suggestions?: string[];
  mode?: string;
}

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty?: string;
}

interface Flashcard {
  id: number;
  category: string;
  front: string;
  back: string;
  example?: string;
}

export default function AITutor() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Academic Context State
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [loadingContext, setLoadingContext] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'chat' | 'quiz' | 'flashcards' | 'revision'>('chat');

  // Study Mode for Chat
  const [studyMode, setStudyMode] = useState<string>('general_qa');

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizTopic, setQuizTopic] = useState('');

  // Flashcards State
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);

  // Revision Guide State
  const [revisionGuide, setRevisionGuide] = useState<string>('');
  const [isGeneratingRevision, setIsGeneratingRevision] = useState(false);
  const [copiedRevision, setCopiedRevision] = useState(false);

  // Fetch student courses & tutor context
  useEffect(() => {
    fetchTutorContext();
  }, []);

  const fetchTutorContext = async () => {
    try {
      setLoadingContext(true);
      const res = await fetch('/api/ai-tutor/courses', {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to load enrolled courses');
      const data = await res.json();

      setCourses(data.courses || []);
      setSubjects(data.subjects || []);
      setMaterials(data.materials || []);

      if (data.courses && data.courses.length > 0) {
        setSelectedCourseId(data.courses[0]._id);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingContext(false);
    }
  };

  // Filter subjects by selected course
  const filteredSubjects = subjects.filter((s) => s.courseId === selectedCourseId);
  const activeCourse = courses.find((c) => c._id === selectedCourseId);
  const activeSubject = subjects.find((s) => s._id === selectedSubjectId);
  const activeSubjectMaterials = materials.filter(
    (m) => (!selectedSubjectId || m.subjectId === selectedSubjectId)
  );

  // Initialize welcoming chat message when course changes
  useEffect(() => {
    if (activeCourse && messages.length === 0) {
      const subjectName = activeSubject ? activeSubject.name : 'your coursework';
      const welcomeMsg: ChatMessage = {
        id: 'welcome',
        role: 'model',
        text: `### Hello ${user?.displayName || 'Student'}! 🎓\n\nI am your **EduCore AI Tutor**, ready to assist you with **${activeCourse.name} (${activeCourse.branch})**.\n\nYou can ask me conceptual questions, request step-by-step mathematical solutions, generate practice exam problems, or test yourself with quizzes.\n\nWhat topic are you studying today?`,
        timestamp: new Date(),
        suggestions: [
          'What are the core concepts in this semester?',
          'Explain the most challenging formula in simple terms',
          'Give me a 5-mark university exam question with solution',
          'Create a 15-minute quick study plan for this course',
        ],
      };
      setMessages([welcomeMsg]);
    }
  }, [selectedCourseId, selectedSubjectId, user]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isSending, activeTab]);

  // Send message to AI Tutor
  const handleSendMessage = async (textToSend?: string) => {
    const question = textToSend || inputPrompt;
    if (!question.trim() || isSending) return;

    setInputPrompt('');
    setChatError(null);

    const userMessage: ChatMessage = {
      id: String(Date.now()),
      role: 'user',
      text: question.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsSending(true);

    try {
      // Build history
      const historyPayload = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-6)
        .map((m) => ({
          role: m.role,
          text: m.text,
        }));

      const res = await fetch('/api/ai-tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourseId,
          subjectId: selectedSubjectId || undefined,
          message: question.trim(),
          history: historyPayload,
          studyMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to get answer from tutor');
      }

      const modelMessage: ChatMessage = {
        id: String(Date.now() + 1),
        role: 'model',
        text: data.reply,
        timestamp: new Date(),
        suggestions: data.suggestions || [],
        mode: studyMode,
      };

      setMessages((prev) => [...prev, modelMessage]);
    } catch (err: any) {
      console.error(err);
      setChatError(err.message || 'Unable to reach AI Tutor. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Generate Practice Quiz
  const handleGenerateQuiz = async () => {
    setIsGeneratingQuiz(true);
    setSelectedAnswers({});
    try {
      const res = await fetch('/api/ai-tutor/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourseId,
          subjectId: selectedSubjectId || undefined,
          topic: quizTopic.trim() || activeSubject?.name || activeCourse?.name,
          count: 4,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to generate quiz');
      setQuizQuestions(data.questions || []);
    } catch (err: any) {
      alert(err.message || 'Failed to generate practice quiz.');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  // Generate Flashcards
  const handleGenerateFlashcards = async () => {
    setIsGeneratingFlashcards(true);
    setActiveCardIndex(0);
    setIsFlipped(false);
    try {
      const res = await fetch('/api/ai-tutor/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourseId,
          subjectId: selectedSubjectId || undefined,
          topic: activeSubject?.name || activeCourse?.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to generate flashcards');
      setFlashcards(data.flashcards || []);
    } catch (err: any) {
      alert(err.message || 'Failed to generate flashcards.');
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  // Generate Exam Revision Sheet
  const handleGenerateRevision = async () => {
    setIsGeneratingRevision(true);
    try {
      const res = await fetch('/api/ai-tutor/revision-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourseId,
          subjectId: selectedSubjectId || undefined,
          topic: activeSubject?.name || activeCourse?.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to generate revision sheet');
      setRevisionGuide(data.guide || '');
    } catch (err: any) {
      alert(err.message || 'Failed to generate revision guide.');
    } finally {
      setIsGeneratingRevision(false);
    }
  };

  const copyRevisionGuide = () => {
    if (!revisionGuide) return;
    navigator.clipboard.writeText(revisionGuide);
    setCopiedRevision(true);
    setTimeout(() => setCopiedRevision(false), 2000);
  };

  const clearChat = () => {
    setMessages([]);
    if (activeCourse) {
      setMessages([
        {
          id: 'welcome-reset',
          role: 'model',
          text: `### Fresh Study Session Started 📚\n\nI am ready for your questions on **${activeCourse.name}**. Choose a study mode above or type your question below!`,
          timestamp: new Date(),
        },
      ]);
    }
  };

  // Quiz score calculator
  const answeredCount = Object.keys(selectedAnswers).length;
  const correctCount = quizQuestions.reduce((acc, q, idx) => {
    return acc + (selectedAnswers[idx] === q.correctIndex ? 1 : 0);
  }, 0);

  return (
    <div className="flex-1 p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header Card */}
      <div className={`p-6 lg:p-8 rounded-[28px] relative overflow-hidden transition-all ${
        isLight
          ? 'bg-white border border-slate-200/90 shadow-md shadow-slate-200/50'
          : 'glass-panel border border-white/10'
      }`}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${
              isLight
                ? 'bg-blue-100 border border-blue-200 text-blue-800'
                : 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
            }`}>
              <Sparkles className="w-3.5 h-3.5" />
              Gemini 3.8 Flash Academic Tutor
            </div>
            <h1 className={`text-2xl lg:text-3xl font-black tracking-tight flex items-center gap-3 ${
              isLight ? 'text-slate-950' : 'text-white'
            }`}>
              AI Tutor & Study Coach
            </h1>
            <p className={`text-sm max-w-2xl leading-relaxed font-normal ${
              isLight ? 'text-slate-600' : 'text-slate-300'
            }`}>
              Personalized 24/7 study support connected to your enrolled curriculum, syllabus topics, and university examination standards.
            </p>
          </div>

          {/* Context Selector controls */}
          <div className={`flex flex-col sm:flex-row gap-3 p-3 rounded-2xl border ${
            isLight
              ? 'bg-slate-50 border-slate-200 shadow-xs'
              : 'bg-white/5 border-white/10'
          }`}>
            {/* Course select */}
            <div className="space-y-1">
              <label className={`text-[10px] font-bold uppercase tracking-wider block pl-1 ${
                isLight ? 'text-slate-700' : 'text-slate-400'
              }`}>
                Enrolled Course
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => {
                  setSelectedCourseId(e.target.value);
                  setSelectedSubjectId('');
                }}
                disabled={loadingContext || courses.length === 0}
                className={`rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500 cursor-pointer min-w-[180px] border ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 shadow-xs'
                    : 'bg-black/30 border-white/10 text-white'
                }`}
              >
                {courses.length === 0 ? (
                  <option value="">No courses found</option>
                ) : (
                  courses.map((c) => (
                    <option key={c._id} value={c._id} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}>
                      {c.name} ({c.branch})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Subject select */}
            <div className="space-y-1">
              <label className={`text-[10px] font-bold uppercase tracking-wider block pl-1 ${
                isLight ? 'text-slate-700' : 'text-slate-400'
              }`}>
                Subject Focus
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                disabled={loadingContext || filteredSubjects.length === 0}
                className={`rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500 cursor-pointer min-w-[180px] border ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 shadow-xs'
                    : 'bg-black/30 border-white/10 text-white'
                }`}
              >
                <option value="" className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}>All Course Subjects</option>
                {filteredSubjects.map((s) => (
                  <option key={s._id} value={s._id} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Quick status bar */}
        {activeCourse && (
          <div className={`mt-4 pt-4 border-t flex flex-wrap items-center justify-between gap-4 text-xs ${
            isLight ? 'border-slate-200' : 'border-white/10'
          }`}>
            <div className="flex items-center gap-3">
              <span className={`flex items-center gap-1.5 font-bold ${
                isLight ? 'text-blue-700' : 'text-blue-400'
              }`}>
                <GraduationCap className="w-4 h-4" />
                {activeCourse.name} ({activeCourse.branch})
              </span>
              {activeSubject && (
                <>
                  <span className={isLight ? 'text-slate-400' : 'text-white/30'}>•</span>
                  <span className={`font-semibold ${
                    isLight ? 'text-slate-700' : 'text-slate-300'
                  }`}>
                    {activeSubject.name} — Semester {activeSubject.semester}
                  </span>
                </>
              )}
            </div>

            <div className={`flex items-center gap-2 text-[11px] font-medium ${
              isLight ? 'text-slate-600' : 'text-slate-400'
            }`}>
              <Library className={`w-3.5 h-3.5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
              <span>
                {activeSubjectMaterials.length > 0
                  ? `${activeSubjectMaterials.length} college materials linked to this context`
                  : 'Syllabus & coursework grounded'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Feature Tabs */}
      <div className={`flex flex-wrap items-center justify-between gap-3 border-b pb-3 ${
        isLight ? 'border-slate-200' : 'border-white/10'
      }`}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <BrainCircuit className="w-4 h-4" />
            Interactive Tutor (Q&A)
          </button>

          <button
            onClick={() => {
              setActiveTab('quiz');
              if (quizQuestions.length === 0) handleGenerateQuiz();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'quiz'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Practice Quiz
            {quizQuestions.length > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                isLight ? 'bg-blue-100 text-blue-800' : 'bg-blue-400/20 text-blue-300'
              }`}>
                {quizQuestions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('flashcards');
              if (flashcards.length === 0) handleGenerateFlashcards();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'flashcards'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Layers className="w-4 h-4" />
            Smart Flashcards
          </button>

          <button
            onClick={() => {
              setActiveTab('revision');
              if (!revisionGuide) handleGenerateRevision();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'revision'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            Exam Revision Sheet
          </button>
        </div>

        {activeTab === 'chat' && (
          <button
            onClick={clearChat}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors cursor-pointer font-medium ${
              isLight ? 'text-slate-600 hover:text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
            title="Start new conversation"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Reset Session
          </button>
        )}
      </div>

      {/* TAB 1: INTERACTIVE TUTOR CHAT */}
      {activeTab === 'chat' && (
        <div className="space-y-4">
          {/* Study Mode Selector Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 mr-1 ${
              isLight ? 'text-slate-700 font-extrabold' : 'text-slate-400'
            }`}>
              <SlidersHorizontal className="w-3.5 h-3.5" /> Mode:
            </span>

            {[
              { id: 'general_qa', label: '🎓 Standard Q&A', desc: 'Clear conceptual answers' },
              { id: 'concept_explainer', label: '🔍 Deep Dive', desc: 'Analogies + theoretical breakdown' },
              { id: 'problem_solver', label: '📐 Step-by-Step Solver', desc: 'Formulas + derivations' },
              { id: 'exam_prep', label: '🎯 Exam Scoring Tips', desc: 'Mark-scoring structure & pitfalls' },
              { id: 'revision_notes', label: '⚡ Bullet Notes', desc: 'High-yield recall formulas' },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setStudyMode(mode.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  studyMode === mode.id
                    ? isLight
                      ? 'bg-blue-600 text-white font-bold shadow-sm'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-sm'
                    : isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-transparent'
                }`}
                title={mode.desc}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Chat Messages Container */}
          <div className={`rounded-[24px] p-4 lg:p-6 min-h-[480px] max-h-[620px] overflow-y-auto space-y-5 flex flex-col border ${
            isLight
              ? 'bg-slate-50/70 border-slate-200 shadow-inner'
              : 'glass-panel border-white/10'
          }`}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : isLight
                        ? 'bg-emerald-100 border border-emerald-300 text-emerald-800'
                        : 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <span className="text-xs font-bold">You</span>
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                </div>

                {/* Message Bubble */}
                <div className="space-y-2 max-w-full">
                  <div
                    className={`p-4 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-sm shadow-md'
                        : isLight
                          ? 'bg-white border border-slate-200/90 text-slate-900 rounded-tl-sm shadow-md'
                          : 'bg-[#131b2e] border border-white/10 text-slate-100 rounded-tl-sm shadow-sm'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap text-white">{msg.text}</p>
                    ) : (
                      <MarkdownRenderer content={msg.text} />
                    )}
                  </div>

                  {/* Follow-up suggestions */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="pt-1 space-y-1.5">
                      <p className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                        isLight ? 'text-slate-700 font-extrabold' : 'text-slate-400'
                      }`}>
                        <Lightbulb className="w-3 h-3 text-amber-500" />
                        Explore Next:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.suggestions.map((sug, i) => (
                          <button
                            key={i}
                            onClick={() => handleSendMessage(sug)}
                            className={`text-left text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer font-medium ${
                              isLight
                                ? 'bg-blue-50/90 hover:bg-blue-100 border-blue-200 text-blue-800 hover:text-blue-900 font-semibold shadow-xs'
                                : 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20 text-blue-300'
                            }`}
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isSending && (
              <div className="flex gap-3 max-w-2xl mr-auto items-center">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  isLight
                    ? 'bg-emerald-100 border border-emerald-300 text-emerald-800'
                    : 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                }`}>
                  <Sparkles className="w-4 h-4 animate-spin" />
                </div>
                <div className={`p-3.5 rounded-2xl border flex items-center gap-2 ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-800 shadow-xs'
                    : 'bg-white/5 border-white/10 text-slate-300'
                }`}>
                  <span className={`text-xs font-semibold ${
                    isLight ? 'text-slate-800' : 'text-slate-300'
                  }`}>
                    AI Tutor is formulating your answer...
                  </span>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            )}

            {/* Error message */}
            {chatError && (
              <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{chatError}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Subject Suggestion Chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className={`text-[11px] font-bold uppercase tracking-wider mr-1 ${
              isLight ? 'text-slate-700 font-extrabold' : 'text-slate-400'
            }`}>Quick Prompts:</span>
            {[
              'Explain the core theorem step-by-step',
              'Give me a solved numerical problem',
              'What are the most frequent exam questions?',
              'Summarize key formulas with units',
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer border ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-xs'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className={`flex items-center gap-2 p-2 rounded-2xl border transition-all ${
              isLight ? 'bg-white border-slate-300 shadow-sm' : 'glass-panel border-white/10'
            }`}
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder={`Ask your tutor anything about ${activeSubject ? activeSubject.name : activeCourse?.name || 'your course'}...`}
              disabled={isSending}
              className={`flex-1 bg-transparent px-4 py-2.5 text-sm outline-none font-medium ${
                isLight ? 'text-slate-950 placeholder:text-slate-400' : 'text-white placeholder:text-slate-400'
              }`}
            />
            <button
              type="submit"
              disabled={!inputPrompt.trim() || isSending}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/30 cursor-pointer"
            >
              <span>Ask Tutor</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: INTERACTIVE PRACTICE QUIZ */}
      {activeTab === 'quiz' && (
        <div className="space-y-6">
          {/* Quiz Action Bar */}
          <div className={`p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border transition-all ${
            isLight
              ? 'bg-white border-slate-200/90 shadow-md shadow-slate-200/40'
              : 'glass-panel border-white/10'
          }`}>
            <div className="space-y-1">
              <h3 className={`text-base font-bold flex items-center gap-2 ${
                isLight ? 'text-slate-950' : 'text-white'
              }`}>
                <CheckCircle2 className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                Adaptive Practice Quiz
              </h3>
              <p className={`text-xs ${
                isLight ? 'text-slate-600 font-medium' : 'text-slate-300'
              }`}>
                Test your mastery of {activeSubject?.name || activeCourse?.name || 'enrolled topics'} with instant scoring and detailed step-by-step reasoning.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                value={quizTopic}
                onChange={(e) => setQuizTopic(e.target.value)}
                placeholder="Optional topic (e.g. Unit 2, Calculus)..."
                className={`rounded-xl px-3 py-2 text-xs outline-none w-48 border font-medium ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-xs'
                    : 'bg-black/20 border-white/10 text-white'
                }`}
              />
              <button
                onClick={handleGenerateQuiz}
                disabled={isGeneratingQuiz}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isGeneratingQuiz ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    New Quiz
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Score overview banner when answered */}
          {quizQuestions.length > 0 && answeredCount > 0 && (
            <div className={`p-4 rounded-2xl flex items-center justify-between border ${
              isLight
                ? 'bg-white border-slate-200 shadow-sm'
                : 'bg-white/5 border-white/10'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isLight
                    ? 'bg-blue-100 border border-blue-200 text-blue-700'
                    : 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                }`}>
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <p className={`text-xs font-bold ${
                    isLight ? 'text-slate-950' : 'text-white'
                  }`}>
                    Current Score: {correctCount} / {answeredCount} Answered ({Math.round((correctCount / answeredCount) * 100)}%)
                  </p>
                  <p className={`text-[11px] ${
                    isLight ? 'text-slate-600 font-medium' : 'text-slate-400'
                  }`}>
                    {answeredCount === quizQuestions.length ? 'Quiz completed! Review your feedback below.' : 'Continue answering remaining questions.'}
                  </p>
                </div>
              </div>

              {answeredCount === quizQuestions.length && (
                <button
                  onClick={() => setSelectedAnswers({})}
                  className={`px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors ${
                    isLight ? 'text-blue-700 hover:text-blue-900' : 'text-blue-400 hover:text-blue-300'
                  }`}
                >
                  Reset Answers
                </button>
              )}
            </div>
          )}

          {/* Quiz Questions List */}
          {isGeneratingQuiz ? (
            <div className={`p-12 text-center rounded-2xl space-y-3 border ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'glass-panel border-white/10'
            }`}>
              <Sparkles className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
              <p className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Generating university-level test questions...
              </p>
              <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Gemini is synthesizing conceptual multiple-choice items and explanations.
              </p>
            </div>
          ) : quizQuestions.length === 0 ? (
            <div className={`p-12 text-center rounded-2xl space-y-3 border ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'glass-panel border-white/10'
            }`}>
              <BookOpen className={`w-8 h-8 mx-auto ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
              <p className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                No active quiz generated yet
              </p>
              <button
                onClick={handleGenerateQuiz}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                Generate Practice Quiz Now
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {quizQuestions.map((q, qIndex) => {
                const isAnswered = selectedAnswers[qIndex] !== undefined;
                const chosenOption = selectedAnswers[qIndex];
                const isCorrect = chosenOption === q.correctIndex;

                return (
                  <div
                    key={qIndex}
                    className={`p-5 lg:p-6 rounded-2xl space-y-4 border ${
                      isLight
                        ? 'bg-white border-slate-200/90 shadow-md shadow-slate-200/40'
                        : 'glass-panel border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isLight
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {qIndex + 1}
                        </span>
                        <h4 className={`text-sm lg:text-base font-bold ${
                          isLight ? 'text-slate-950' : 'text-white'
                        }`}>
                          {q.question}
                        </h4>
                      </div>

                      {isAnswered && (
                        <div
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                            isCorrect
                              ? isLight
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isLight
                                ? 'bg-red-100 text-red-800 border border-red-300'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {isCorrect ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" /> Incorrect
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {q.options.map((opt, optIndex) => {
                        let btnStyle = isLight
                          ? 'bg-slate-50 hover:bg-slate-100/90 border-slate-200 text-slate-800 shadow-xs'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200';

                        if (isAnswered) {
                          if (optIndex === q.correctIndex) {
                            btnStyle = isLight
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold shadow-xs'
                              : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold';
                          } else if (chosenOption === optIndex) {
                            btnStyle = isLight
                              ? 'bg-red-50 border-red-300 text-red-950 font-bold shadow-xs'
                              : 'bg-red-500/20 border-red-500/40 text-red-300';
                          } else {
                            btnStyle = isLight
                              ? 'opacity-40 bg-slate-50 border-slate-200 text-slate-600'
                              : 'opacity-40 bg-white/5 text-slate-400';
                          }
                        }

                        const optionLetters = ['A', 'B', 'C', 'D'];

                        return (
                          <button
                            key={optIndex}
                            disabled={isAnswered}
                            onClick={() =>
                              setSelectedAnswers((prev) => ({ ...prev, [qIndex]: optIndex }))
                            }
                            className={`p-3.5 rounded-xl border text-left text-xs font-medium transition-all flex items-center gap-3 cursor-pointer ${btnStyle}`}
                          >
                            <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 ${
                              isLight ? 'bg-slate-200/80 text-slate-800' : 'bg-white/10 text-white'
                            }`}>
                              {optionLetters[optIndex]}
                            </span>
                            <span className="flex-1 leading-snug">{opt}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {isAnswered && (
                      <div className={`pt-3 border-t space-y-1 ${
                        isLight ? 'border-slate-200' : 'border-white/10'
                      }`}>
                        <p className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                          isLight ? 'text-slate-700' : 'text-slate-400'
                        }`}>
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                          Explanation & Solution Derivation:
                        </p>
                        <p className={`text-xs leading-relaxed pl-5 ${
                          isLight ? 'text-slate-800 font-normal' : 'text-slate-300'
                        }`}>
                          {q.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SMART FLASHCARDS */}
      {activeTab === 'flashcards' && (
        <div className="space-y-6">
          <div className={`p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border transition-all ${
            isLight
              ? 'bg-white border-slate-200/90 shadow-md shadow-slate-200/40'
              : 'glass-panel border-white/10'
          }`}>
            <div className="space-y-1">
              <h3 className={`text-base font-bold flex items-center gap-2 ${
                isLight ? 'text-slate-950' : 'text-white'
              }`}>
                <Layers className={`w-4 h-4 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
                Active Recall Flashcards
              </h3>
              <p className={`text-xs ${
                isLight ? 'text-slate-600 font-medium' : 'text-slate-300'
              }`}>
                High-yield laws, definitions, and theorems curated for {activeSubject?.name || activeCourse?.name}.
              </p>
            </div>

            <button
              onClick={handleGenerateFlashcards}
              disabled={isGeneratingFlashcards}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isGeneratingFlashcards ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate New Cards
                </>
              )}
            </button>
          </div>

          {isGeneratingFlashcards ? (
            <div className={`p-16 text-center rounded-2xl space-y-3 border ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'glass-panel border-white/10'
            }`}>
              <Sparkles className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
              <p className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Crafting revision flashcards...
              </p>
            </div>
          ) : flashcards.length === 0 ? (
            <div className={`p-16 text-center rounded-2xl space-y-3 border ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'glass-panel border-white/10'
            }`}>
              <Layers className={`w-8 h-8 mx-auto ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
              <p className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                No flashcards created yet
              </p>
              <button
                onClick={handleGenerateFlashcards}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                Generate Study Cards
              </button>
            </div>
          ) : (
            <div className="max-w-xl mx-auto space-y-6">
              {/* Card Container */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className={`cursor-pointer min-h-[280px] p-8 rounded-3xl border flex flex-col justify-between transition-all hover:shadow-2xl relative select-none group ${
                  isLight
                    ? 'bg-white border-slate-300 shadow-md'
                    : 'glass-panel border-white/15'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className={`px-2.5 py-1 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                    isLight
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {flashcards[activeCardIndex].category || 'CORE CONCEPT'}
                  </span>
                  <span className={`font-semibold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Card {activeCardIndex + 1} of {flashcards.length}
                  </span>
                </div>

                <div className="my-auto py-6 text-center space-y-3">
                  {!isFlipped ? (
                    <>
                      <p className={`text-[11px] font-bold uppercase tracking-widest ${
                        isLight ? 'text-blue-700' : 'text-blue-400'
                      }`}>
                        Concept / Question
                      </p>
                      <h3 className={`text-lg lg:text-xl font-bold leading-snug ${
                        isLight ? 'text-slate-950' : 'text-white'
                      }`}>
                        {flashcards[activeCardIndex].front}
                      </h3>
                      <p className={`text-xs transition-colors ${
                        isLight ? 'text-slate-500 group-hover:text-blue-700' : 'text-slate-400 group-hover:text-blue-400'
                      }`}>
                        Click card to flip and reveal answer ↻
                      </p>
                    </>
                  ) : (
                    <>
                      <p className={`text-[11px] font-bold uppercase tracking-widest ${
                        isLight ? 'text-emerald-700' : 'text-emerald-400'
                      }`}>
                        Explanation & Key Formula
                      </p>
                      <p className={`text-sm lg:text-base leading-relaxed font-semibold ${
                        isLight ? 'text-slate-900' : 'text-slate-100'
                      }`}>
                        {flashcards[activeCardIndex].back}
                      </p>
                      {flashcards[activeCardIndex].example && (
                        <div className={`p-3 rounded-xl text-xs italic ${
                          isLight
                            ? 'bg-blue-50/70 border border-blue-200 text-slate-800'
                            : 'bg-black/20 text-slate-300'
                        }`}>
                          💡 Example: {flashcards[activeCardIndex].example}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className={`text-center text-[11px] pt-3 border-t ${
                  isLight
                    ? 'border-slate-200 text-slate-600 font-medium'
                    : 'border-white/10 text-slate-400'
                }`}>
                  {isFlipped ? 'Click again to view front' : 'Active Recall Mode'}
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between gap-3">
                <button
                  disabled={activeCardIndex === 0}
                  onClick={() => {
                    setIsFlipped(false);
                    setActiveCardIndex((prev) => Math.max(0, prev - 1));
                  }}
                  className={`px-4 py-2 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold transition-all cursor-pointer border ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800 shadow-xs'
                      : 'bg-white/10 hover:bg-white/15 border-transparent text-white'
                  }`}
                >
                  Previous Card
                </button>

                <button
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-600/30"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Flip Card
                </button>

                <button
                  disabled={activeCardIndex === flashcards.length - 1}
                  onClick={() => {
                    setIsFlipped(false);
                    setActiveCardIndex((prev) => Math.min(flashcards.length - 1, prev + 1));
                  }}
                  className={`px-4 py-2 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold transition-all cursor-pointer border ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800 shadow-xs'
                      : 'bg-white/10 hover:bg-white/15 border-transparent text-white'
                  }`}
                >
                  Next Card
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: EXAM REVISION SHEET */}
      {activeTab === 'revision' && (
        <div className="space-y-6">
          <div className={`p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border transition-all ${
            isLight
              ? 'bg-white border-slate-200/90 shadow-md shadow-slate-200/40'
              : 'glass-panel border-white/10'
          }`}>
            <div className="space-y-1">
              <h3 className={`text-base font-bold flex items-center gap-2 ${
                isLight ? 'text-slate-950' : 'text-white'
              }`}>
                <FileCheck2 className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                Comprehensive University Exam Revision Sheet
              </h3>
              <p className={`text-xs ${
                isLight ? 'text-slate-600 font-medium' : 'text-slate-300'
              }`}>
                Summary cheat-sheet, top 5 high-yield exam questions, formulas, and common pitfalls for {activeSubject?.name || activeCourse?.name}.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {revisionGuide && (
                <button
                  onClick={copyRevisionGuide}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800 shadow-xs'
                      : 'bg-white/10 hover:bg-white/15 border-transparent text-slate-200'
                  }`}
                >
                  {copiedRevision ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className={isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400'}>Copied Sheet</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Sheet</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={handleGenerateRevision}
                disabled={isGeneratingRevision}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isGeneratingRevision ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Generating Guide...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate Sheet
                  </>
                )}
              </button>
            </div>
          </div>

          {isGeneratingRevision ? (
            <div className={`p-16 text-center rounded-2xl space-y-3 border ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'glass-panel border-white/10'
            }`}>
              <Sparkles className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
              <p className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Synthesizing comprehensive revision guide...
              </p>
              <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Compiling formulas, exam questions, and memory mnemonics with Gemini 3.8 Flash.
              </p>
            </div>
          ) : !revisionGuide ? (
            <div className={`p-16 text-center rounded-2xl space-y-3 border ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'glass-panel border-white/10'
            }`}>
              <FileCheck2 className={`w-8 h-8 mx-auto ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
              <p className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                No revision sheet generated yet
              </p>
              <button
                onClick={handleGenerateRevision}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                Generate Revision Sheet Now
              </button>
            </div>
          ) : (
            <div className={`p-6 lg:p-8 rounded-3xl border transition-all ${
              isLight
                ? 'bg-white border-slate-200/90 shadow-md text-slate-900'
                : 'glass-panel border-white/10'
            }`}>
              <MarkdownRenderer content={revisionGuide} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
