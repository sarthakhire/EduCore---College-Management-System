import React from 'react';
import { useAuth } from "./context/AuthContext";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { motion, AnimatePresence } from "motion/react";
import { GraduationCap } from "lucide-react";

import Academics from "./pages/Academics";
import ManageCourses from "./pages/admin/ManageCourses";
import ManageUsers from "./pages/admin/ManageUsers";
import Enrollments from "./pages/admin/Enrollments";
import Timetables from "./pages/Timetables";
import Announcements from "./pages/Announcements";
import Courses from "./pages/Courses";
import Attendance from "./pages/Attendance";
import Performance from "./pages/Performance";
import Profile from "./pages/Profile";
import AITutor from "./pages/AITutor";

function ProtectedRoute({ children, roles }: { children: React.ReactNode, roles?: string[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white">
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-20 h-20 bg-blue-500 rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(96,165,250,0.4)] mb-8"
        >
          <GraduationCap className="w-12 h-12 text-white" />
        </motion.div>
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-3xl font-black tracking-tight">EduCore</h2>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                className="w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_8px_#60a5fa]"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <AnimatePresence mode="wait">
        {!user ? (
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        ) : (
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="/ai-tutor" element={<AITutor />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/academics" element={<Academics />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/performance" element={<Performance />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/announcements" element={<Announcements />} />
              <Route path="/timetables" element={<Timetables />} />
              <Route path="/courses" element={<Courses />} />
              <Route 
                path="/admin/courses" 
                element={<ProtectedRoute roles={['admin']}><ManageCourses /></ProtectedRoute>} 
              />
              <Route 
                path="/admin/students" 
                element={<ProtectedRoute roles={['admin']}><ManageUsers targetRole="student" /></ProtectedRoute>} 
              />
              <Route 
                path="/admin/teachers" 
                element={<ProtectedRoute roles={['admin']}><ManageUsers targetRole="teacher" /></ProtectedRoute>} 
              />
              <Route 
                path="/admin/enrollments" 
                element={<ProtectedRoute roles={['admin', 'teacher']}><Enrollments /></ProtectedRoute>} 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        )}
      </AnimatePresence>
    </Router>
  );
}
