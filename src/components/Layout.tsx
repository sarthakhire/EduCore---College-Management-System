import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  FileText, 
  CheckCircle, 
  BarChart3, 
  Bell, 
  Calendar, 
  LogOut, 
  Menu, 
  X,
  ShieldCheck, 
  UserCircle, 
  Megaphone, 
  GraduationCap,
  Sun,
  Moon
} from "lucide-react";
import { cn } from "../lib/utils";
import { useTheme } from "../context/ThemeContext";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/", roles: ["admin", "teacher", "student"] },
  { label: "Announcements", icon: Megaphone, path: "/announcements", roles: ["admin", "teacher", "student"] },
  { label: "Students", icon: Users, path: "/admin/students", roles: ["admin"] },
  { label: "Teachers", icon: Users, path: "/admin/teachers", roles: ["admin"] },
  { label: "Manage Courses", icon: BookOpen, path: "/admin/courses", roles: ["admin"] },
  { label: "Enrollments", icon: Users, path: "/admin/enrollments", roles: ["admin", "teacher"] },
  { label: "Courses", icon: GraduationCap, path: "/courses", roles: ["admin", "teacher", "student"] },
  { label: "Academics", icon: FileText, path: "/academics", roles: ["admin", "teacher", "student"] },
  { label: "Attendance", icon: CheckCircle, path: "/attendance", roles: ["admin", "teacher"] },
  { label: "Performance", icon: BarChart3, path: "/performance", roles: ["admin", "teacher"] },
  { label: "Timetable", icon: Calendar, path: "/timetables", roles: ["admin", "teacher", "student"] },
  { label: "Profile", icon: UserCircle, path: "/profile", roles: ["admin", "teacher", "student"] },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const filteredNavItems = navItems
    .filter(item => user && item.roles.includes(user.role))
    .map(item => {
      if (user?.role === 'student') {
        if (item.path === '/attendance') return { ...item, label: "My Attendance" };
        if (item.path === '/performance') return { ...item, label: "My Results" };
      }
      if (user?.role === 'teacher') {
        if (item.path === '/attendance') return { ...item, label: "Log Attendance" };
        if (item.path === '/performance') return { ...item, label: "Manage Marks" };
      }
      return item;
    });

  return (
    <div className="min-h-screen flex text-white">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-64 glass-panel m-5 rounded-[24px] sticky top-5 h-[calc(100vh-40px)]">
        <div className="p-8 pb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_15px_#2563eb]"></div>
            <span className="text-2xl font-extrabold tracking-tight">EduCore</span>
          </div>
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition-all cursor-pointer shadow-sm"
            title={theme === "light" ? "Switch to Dark theme" : "Switch to Light theme"}
          >
            {theme === "light" ? (
              <Moon className="w-4 h-4 text-slate-700" />
            ) : (
              <Sun className="w-4 h-4 text-amber-300" />
            )}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 space-y-2">
          {filteredNavItems.map((item) => {
            const isAdminPath = item.path.startsWith('/admin') || item.path === '/courses';
            const isFirstAdminLink = isAdminPath && (item.path === '/admin/students');
            
            return (
              <React.Fragment key={item.path}>
                {user?.role === 'admin' && isFirstAdminLink && (
                  <div className="px-4 pt-6 pb-2 text-[10px] font-black text-white/20 uppercase tracking-[2px]">
                    Core Management
                  </div>
                )}
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm",
                    location.pathname === item.path
                      ? "nav-active"
                      : "text-white/70 hover:text-white"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              </React.Fragment>
            );
          })}
        </nav>

        <div className="p-4 mt-auto space-y-4">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2 bg-white/5 rounded-2xl border border-white/10">
              <img src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName}`} className="w-8 h-8 rounded-full border border-white/20" alt="" />
              <div className="overflow-hidden">
                <p className="text-xs font-bold truncate">{user.displayName}</p>
                <span className="text-[10px] text-blue-400 font-bold uppercase">{user.role}</span>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-red-400 hover:bg-white/5 transition-all font-bold text-sm"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 glass-panel border-x-0 border-t-0 px-4 flex items-center justify-between z-50 rounded-none">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_10px_#2563eb]"></div>
          <span className="text-lg font-bold">EduCore</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition-all cursor-pointer"
            title={theme === "light" ? "Switch to Dark theme" : "Switch to Light theme"}
          >
            {theme === "light" ? (
              <Moon className="w-4 h-4 text-slate-700" />
            ) : (
              <Sun className="w-4 h-4 text-amber-300" />
            )}
          </button>
          <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-white">
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 bg-[#0f172a]/95 backdrop-blur-xl z-40 pt-16 flex flex-col p-4">
          <nav className="flex-1 space-y-1">
            {filteredNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl font-medium",
                  location.pathname === item.path ? "nav-active" : "text-white/70"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-white/10 space-y-3">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                {theme === "light" ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-400" />}
                Theme
              </span>
              <span className="text-xs uppercase font-bold text-blue-500">
                {theme === "light" ? "Light" : "Dark"}
              </span>
            </button>
            <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-400 font-bold hover:bg-white/5 transition-all text-sm">
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:pl-0 pt-16 lg:pt-0">
        <div className="max-w-[1400px] mx-auto p-5 md:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
