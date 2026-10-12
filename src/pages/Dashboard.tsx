import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  Users, 
  BookOpen, 
  CheckCircle, 
  TrendingUp, 
  Bell, 
  Calendar,
  Clock,
  ChevronRight,
  Plus,
  Sparkles,
  BrainCircuit
} from "lucide-react";
import { motion } from "motion/react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { cn, formatDate } from "../lib/utils";
import { api } from "../lib/api";

const data = [
  { name: 'Mon', attendance: 85 },
  { name: 'Tue', attendance: 88 },
  { name: 'Wed', attendance: 92 },
  { name: 'Thu', attendance: 90 },
  { name: 'Fri', attendance: 87 },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    // Fetch Stats
    api('/api/academic/stats')
      .then(res => res.ok ? res.json() : null)
      .then(data => data && setStats(data))
      .catch(console.error);

    // Fetch Announcements
    api('/api/academic/announcements')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setAnnouncements(data.slice(0, 3));
        } else {
          setAnnouncements([]);
        }
      })
      .catch(err => {
        console.error(err);
        setAnnouncements([]);
      });
  }, []);

  if (!user) return null;

  const roleConfigs = {
    admin: {
      title: "Admin Dashboard",
      subtitle: "System Overview & Institutional Control",
      stats: [
        { label: "Total Students", value: stats?.students || "...", change: "Live from database", positive: true },
        { label: "Faculty Members", value: stats?.teachers || "...", change: "Total registered", positive: true },
        { label: "Courses Offered", value: stats?.courses || "...", change: "Active programs", positive: true },
        { label: "Study Materials", value: stats?.materials || "...", change: "Resources available", positive: true }
      ],
      chartTitle: "Institutional Activity"
    },
    teacher: {
      title: "Faculty Dashboard",
      subtitle: "Course Management & Student Success",
      stats: [
        { label: "Assigned Classes", value: "6", change: "3 Subjects this term", positive: true },
        { label: "Students Enrolled", value: "240", change: "↑ 12 New registrations", positive: true },
        { label: "Pending Assignments", value: "14", change: "8 Due this week", positive: false },
        { label: "Avg. Class Performance", value: "78%", change: "↑ 2% improvement", positive: true }
      ],
      chartTitle: "Class Performance History"
    },
    student: {
      title: "Student Portal",
      subtitle: "Academic Progress & Active Learning",
      stats: [
        { label: "Overall GPA", value: "3.8", change: "Dean's List candidate", positive: true },
        { label: "Current Attendance", value: "92%", change: "Minimum 75% required", positive: true },
        { label: "Active Courses", value: "5", change: "18 Credits ongoing", positive: null },
        { label: "Completed Credits", value: "42", change: "On track for graduation", positive: true }
      ],
      chartTitle: "Weekly Attendance Trends"
    }
  };

  const config = roleConfigs[user.role as keyof typeof roleConfigs] || roleConfigs.student;

  return (
    <div className="space-y-10 pb-8 text-white">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">
            {config.title}
          </h1>
          <p className="text-white/60 text-sm mt-1">{config.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {user.role !== 'student' && (
            <button className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-full font-bold text-xs shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all active:scale-95 uppercase tracking-widest">
              <Plus className="w-4 h-4" />
              Quick Action
            </button>
          )}
          <div className="flex items-center gap-3 px-5 py-2 glass-card rounded-full">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="avatar" className="w-8 h-8 rounded-full object-cover ring-2 ring-white/20" />
            ) : (
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center font-bold text-xs ring-2 ring-white/20">
                {user.displayName.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="text-sm font-semibold">
              {user.displayName} <span className="ml-2 text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-md border border-blue-500/30 uppercase font-bold tracking-wider">{user.role}</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Tutor Feature Banner */}
      <div className="glass-panel p-6 rounded-[28px] border-white/10 [data-theme=light]_&:border-slate-200 relative overflow-hidden bg-gradient-to-r from-blue-900/30 via-slate-900/40 to-indigo-900/30 [data-theme=light]_&:from-blue-50 [data-theme=light]_&:via-slate-50 [data-theme=light]_&:to-indigo-50">
        <div className="absolute right-0 top-0 w-80 h-full bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 [data-theme=light]_&:bg-blue-100 text-blue-400 [data-theme=light]_&:text-blue-800 font-bold text-[10px] uppercase tracking-wider">
                  New Feature • Powered by Gemini 3.8 Flash
                </span>
              </div>
              <h3 className="text-lg font-bold text-white [data-theme=light]_&:text-slate-900">
                AI Tutor & Study Coach Ready
              </h3>
              <p className="text-xs text-slate-300 [data-theme=light]_&:text-slate-600 max-w-xl leading-relaxed">
                Need help with your enrolled courses? Ask complex questions, generate practice quizzes, test yourself with flashcards, or create an exam revision cheat sheet.
              </p>
            </div>
          </div>

          <Link
            to="/ai-tutor"
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
          >
            <BrainCircuit className="w-4 h-4" />
            <span>Launch AI Tutor</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {config.stats.map((stat, idx) => (
          <StatCard 
            key={idx}
            label={stat.label} 
            value={stat.value} 
            change={stat.change} 
            positive={stat.positive} 
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Section */}
        <div className="lg:col-span-2 space-y-8">
          <section className="glass-panel p-8 rounded-[32px]">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-bold">{(config as any).chartTitle}</h2>
              <div className="text-xs text-blue-400 font-bold cursor-pointer hover:underline uppercase tracking-widest">View Detailed Report →</div>
            </div>
            <div className="h-[300px] w-full mt-4 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={data}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 10}} dy={10} />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  />
                  <Bar dataKey="attendance" fill="#60a5fa" radius={[6, 6, 0, 0]} opacity={0.6} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="notice-board glass-panel p-8 rounded-[32px]">
            <h3 className="text-lg font-bold mb-6">Notice Board</h3>
            <div className="divide-y divide-white/10">
              {announcements.length > 0 ? announcements.filter(a => a.targetRole === 'all' || a.targetRole === user?.role || user?.role === 'admin' || a.authorId?._id === user?.uid).map((ann) => (
                <NoticeItem 
                  key={ann._id}
                  date={formatDate(ann.createdAt)} 
                  title={ann.title} 
                  excerpt={ann.content} 
                />
              )) : (
                <p className="py-10 text-center text-white/20 text-xs font-bold uppercase tracking-widest">No active notices</p>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar Section */}
        <div className="space-y-8">
          <section className="glass-panel p-8 rounded-[32px]">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-bold">Upcoming Deadlines</h2>
              <Calendar className="w-5 h-5 text-white/30" />
            </div>
            <div className="space-y-6">
              <TimelineItem title="Final Exam Schedule" date="Oct 12" active />
              <TimelineItem title="Guest Lecture: AI" date="Oct 10" />
              <TimelineItem title="Faculty Minutes" date="Oct 08" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, change, positive }: any) {
  return (
    <motion.div 
      whileHover={{ scale: 1.02, y: -5 }}
      className="glass-card p-6 rounded-[24px]"
    >
      <div className="text-[10px] font-bold text-white/50 uppercase tracking-[2px] mb-3">{label}</div>
      <div className="text-3xl font-extrabold mb-2">{value}</div>
      <div className={cn(
        "text-[10px] font-bold",
        positive === true ? "text-emerald-400" : positive === false ? "text-red-400" : "text-white/40"
      )}>
        {change}
      </div>
    </motion.div>
  );
}

function NoticeItem({ date, title, excerpt }: any) {
  return (
    <div className="py-5 first:pt-0 last:pb-0">
      <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">{date}</div>
      <div className="text-sm font-bold mb-1">{title}</div>
      <div className="text-xs text-white/50 leading-relaxed line-clamp-2">{excerpt}</div>
    </div>
  );
}

function TimelineItem({ title, date, active }: any) {
  return (
    <div className="flex items-start gap-4">
      <div className={cn(
        "w-2 h-2 rounded-full mt-1.5",
        active ? "bg-blue-400 shadow-[0_0_10px_#60a5fa]" : "bg-white/20"
      )} />
      <div>
        <h4 className="text-xs font-bold">{title}</h4>
        <p className="text-[10px] text-white/40 mt-1">{date}</p>
      </div>
    </div>
  );
}
