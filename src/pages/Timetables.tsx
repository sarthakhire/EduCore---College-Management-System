import React, { useState, useEffect, useMemo } from "react";
import { 
  Calendar, 
  Clock, 
  Edit3, 
  Trash2, 
  Plus, 
  RotateCcw, 
  Download, 
  Printer, 
  BookOpen, 
  User as UserIcon, 
  MapPin, 
  AlertCircle, 
  Sparkles, 
  ChevronDown, 
  X, 
  Check, 
  Layers, 
  Settings2, 
  Copy,
  Info,
  CalendarCheck,
  FileSpreadsheet
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { api } from "../lib/api";
import { TimetableItem, TimetableSlot, DaySchedule, SlotType } from "../types";

// Default template data in case of brand-new startup or fallback
const DEFAULT_TIME_SLOTS = [
  "10:00 - 10:55",
  "10:55 - 11:50",
  "11:50 - 12:30",
  "12:30 - 01:25",
  "01:25 - 02:20",
];

const DEFAULT_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DEFAULT_GRID: Record<string, string[]> = {
  Monday: ["PPS", "M-II", "CHEM", "BEE", "F1-CHEM"],
  Tuesday: ["BEE", "M-II", "F1-BEE", "CHEM", "CCC-II"],
  Wednesday: ["CHEM", "EG", "BEE", "PPS", "WS"],
  Thursday: ["IKS", "WS", "M-II", "EG", "BEE"],
  Friday: ["PPS", "CHEM", "EG", "PPS", "M-II"],
  Saturday: ["EG", "BEE", "F1-EG", "M-II", "CHEM"],
};

const COMMON_SUBJECT_SUGGESTIONS = [
  { code: "PPS", name: "Programming for Problem Solving", type: "lecture" as SlotType },
  { code: "M-II", name: "Engineering Mathematics II", type: "lecture" as SlotType },
  { code: "CHEM", name: "Engineering Chemistry", type: "lecture" as SlotType },
  { code: "BEE", name: "Basic Electrical Engineering", type: "lecture" as SlotType },
  { code: "EG", name: "Engineering Graphics", type: "lab" as SlotType },
  { code: "WS", name: "Workshop Practice", type: "lab" as SlotType },
  { code: "IKS", name: "Indian Knowledge Systems", type: "lecture" as SlotType },
  { code: "CCC-II", name: "Co-Curricular Course II", type: "tutorial" as SlotType },
  { code: "F1-CHEM", name: "Batch F1 Chemistry Lab", type: "lab" as SlotType },
  { code: "F1-BEE", name: "Batch F1 BEE Lab", type: "lab" as SlotType },
  { code: "F1-EG", name: "Batch F1 EG CAD Lab", type: "lab" as SlotType },
  { code: "RECESS", name: "Lunch & Refreshment Break", type: "break" as SlotType },
];

const TYPE_CONFIG: Record<SlotType, { label: string; badge: string; border: string; bgLight: string; textLight: string; bgDark: string; textDark: string }> = {
  lecture: { 
    label: "Lecture", 
    badge: "Lecture", 
    border: "border-blue-500/30", 
    bgLight: "bg-blue-50 hover:bg-blue-100/80 border-blue-200 text-blue-900", 
    textLight: "text-blue-950 font-bold", 
    bgDark: "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20 text-blue-200", 
    textDark: "text-blue-100" 
  },
  lab: { 
    label: "Lab / Practical", 
    badge: "Lab", 
    border: "border-purple-500/30", 
    bgLight: "bg-purple-50 hover:bg-purple-100/80 border-purple-200 text-purple-900", 
    textLight: "text-purple-950 font-bold", 
    bgDark: "bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20 text-purple-200", 
    textDark: "text-purple-200" 
  },
  tutorial: { 
    label: "Tutorial", 
    badge: "Tutorial", 
    border: "border-amber-500/30", 
    bgLight: "bg-amber-50 hover:bg-amber-100/80 border-amber-200 text-amber-900", 
    textLight: "text-amber-950 font-bold", 
    bgDark: "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-200", 
    textDark: "text-amber-200" 
  },
  break: { 
    label: "Break / Recess", 
    badge: "Break", 
    border: "border-emerald-500/30", 
    bgLight: "bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200 text-emerald-900", 
    textLight: "text-emerald-950 font-bold", 
    bgDark: "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-200", 
    textDark: "text-emerald-200" 
  },
  seminar: { 
    label: "Seminar", 
    badge: "Seminar", 
    border: "border-rose-500/30", 
    bgLight: "bg-rose-50 hover:bg-rose-100/80 border-rose-200 text-rose-900", 
    textLight: "text-rose-950 font-bold", 
    bgDark: "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-200", 
    textDark: "text-rose-200" 
  },
  other: { 
    label: "Other", 
    badge: "Session", 
    border: "border-slate-500/30", 
    bgLight: "bg-slate-100 hover:bg-slate-200/80 border-slate-300 text-slate-900", 
    textLight: "text-slate-950 font-bold", 
    bgDark: "bg-slate-800/40 hover:bg-slate-800/70 border-slate-700/40 text-slate-200", 
    textDark: "text-slate-200" 
  },
};

function createInitialTimetable(): TimetableItem {
  const schedule: DaySchedule[] = DEFAULT_DAYS.map((day) => ({
    day,
    slots: (DEFAULT_GRID[day] || []).map((subject, index) => {
      const isLab = subject.startsWith("F1-") || subject === "WS" || subject === "CCC-II";
      return {
        slotIndex: index,
        timeRange: DEFAULT_TIME_SLOTS[index] || "",
        subject,
        room: isLab ? "Lab 3 / WS" : "Room 331",
        type: isLab ? "lab" : "lecture",
        teacher: subject === "M-II" ? "Dr. Sharma" : subject.includes("CHEM") ? "Dr. Jamdhade" : "Faculty Member",
        notes: isLab ? "Bring journal" : "",
      };
    }),
  }));

  return {
    _id: "default-timetable",
    title: "FE Master Timetable",
    className: "FE F",
    room: "331",
    academicYear: "2025-26",
    semester: 1,
    section: "FE F",
    courseName: "First Year Engineering (FE)",
    isDefault: true,
    timeSlots: DEFAULT_TIME_SLOTS,
    days: DEFAULT_DAYS,
    schedule,
  };
}

export default function Timetables() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === "light";

  // State
  const [timetables, setTimetables] = useState<TimetableItem[]>([]);
  const [activeTimetableId, setActiveTimetableId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(true);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>("all");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Modals state
  const [slotModal, setSlotModal] = useState<{
    isOpen: boolean;
    day: string;
    slotIndex: number;
    slotData: TimetableSlot;
    isNew: boolean;
  } | null>(null);

  const [detailsModalOpen, setDetailsModalOpen] = useState<boolean>(false);
  const [newTimetableModalOpen, setNewTimetableModalOpen] = useState<boolean>(false);
  const [timeSlotsModalOpen, setTimeSlotsModalOpen] = useState<boolean>(false);
  const [daysModalOpen, setDaysModalOpen] = useState<boolean>(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Show Toast
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Fetch timetables
  const fetchTimetables = async () => {
    try {
      setLoading(true);
      const res = await api("/api/academic/timetables");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          // Normalize schedule array if format differs
          const formatted = data.map((t: any) => {
            let schedule = t.schedule || [];
            if ((!schedule || schedule.length === 0) && t.days) {
              schedule = t.days.map((day: string) => ({
                day,
                slots: (DEFAULT_GRID[day] || []).map((sub: string, idx: number) => ({
                  slotIndex: idx,
                  timeRange: (t.timeSlots || DEFAULT_TIME_SLOTS)[idx] || "",
                  subject: sub,
                  room: t.room || "331",
                  type: sub.startsWith("F1-") ? "lab" : "lecture",
                  teacher: "Faculty Member",
                })),
              }));
            }
            return {
              ...t,
              timeSlots: t.timeSlots && t.timeSlots.length > 0 ? t.timeSlots : DEFAULT_TIME_SLOTS,
              days: t.days && t.days.length > 0 ? t.days : DEFAULT_DAYS,
              schedule,
            };
          });
          setTimetables(formatted);
          if (!activeTimetableId || !formatted.some((x: TimetableItem) => x._id === activeTimetableId)) {
            setActiveTimetableId(formatted[0]._id);
          }
          return;
        }
      }
      // If server returned empty or failed, use initial default
      loadLocalOrInitial();
    } catch (err) {
      console.warn("Could not load from API, falling back to local state:", err);
      loadLocalOrInitial();
    } finally {
      setLoading(false);
    }
  };

  const loadLocalOrInitial = () => {
    const saved = localStorage.getItem("edu_timetables_v2");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTimetables(parsed);
          setActiveTimetableId(parsed[0]._id);
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }
    const initial = createInitialTimetable();
    setTimetables([initial]);
    setActiveTimetableId(initial._id);
  };

  useEffect(() => {
    fetchTimetables();
  }, []);

  // Save changes to active timetable
  const saveTimetableChanges = async (updatedTimetable: TimetableItem, successMessage = "Timetable updated successfully") => {
    // Optimistic UI update
    const updatedList = timetables.map((t) => (t._id === updatedTimetable._id ? updatedTimetable : t));
    setTimetables(updatedList);
    localStorage.setItem("edu_timetables_v2", JSON.stringify(updatedList));

    setSaving(true);
    try {
      if (updatedTimetable._id && !updatedTimetable._id.startsWith("default-") && !updatedTimetable._id.startsWith("local-")) {
        const res = await api(`/api/academic/timetables/${updatedTimetable._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedTimetable),
        });
        if (res.ok) {
          showToast(successMessage, "success");
        } else {
          showToast("Saved locally. Server will sync on reconnection.", "info");
        }
      } else {
        // Try creating on server if it's a new or default ID
        const res = await api("/api/academic/timetables", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedTimetable),
        });
        if (res.ok) {
          const created = await res.json();
          const syncedList = timetables.map((t) => (t._id === updatedTimetable._id ? { ...updatedTimetable, _id: created._id } : t));
          setTimetables(syncedList);
          setActiveTimetableId(created._id);
          localStorage.setItem("edu_timetables_v2", JSON.stringify(syncedList));
          showToast(successMessage, "success");
        } else {
          showToast("Saved locally.", "info");
        }
      }
    } catch (e) {
      console.warn("Server save error:", e);
      showToast("Saved locally (offline mode).", "info");
    } finally {
      setSaving(false);
    }
  };

  // Active timetable computed
  const activeTimetable = useMemo(() => {
    return timetables.find((t) => t._id === activeTimetableId) || timetables[0] || createInitialTimetable();
  }, [timetables, activeTimetableId]);

  // Find slot for day and time slot index
  const getSlot = (day: string, slotIndex: number): TimetableSlot | undefined => {
    const dayEntry = activeTimetable.schedule?.find((s) => s.day.toLowerCase() === day.toLowerCase());
    if (!dayEntry) return undefined;
    return dayEntry.slots?.find((slot) => slot.slotIndex === slotIndex || slot.timeRange === activeTimetable.timeSlots[slotIndex]);
  };

  // Open slot editor
  const handleEditSlot = (day: string, slotIndex: number) => {
    const existing = getSlot(day, slotIndex);
    const timeRange = activeTimetable.timeSlots[slotIndex] || "";
    setSlotModal({
      isOpen: true,
      day,
      slotIndex,
      isNew: !existing,
      slotData: existing
        ? { ...existing }
        : {
            slotIndex,
            timeRange,
            subject: "",
            room: activeTimetable.room || "Room 331",
            type: "lecture",
            teacher: "",
            notes: "",
          },
    });
  };

  // Save slot modal
  const handleSaveSlot = () => {
    if (!slotModal) return;
    const { day, slotIndex, slotData } = slotModal;

    if (!slotData.subject.trim()) {
      showToast("Please enter a subject name or code", "error");
      return;
    }

    const currentSchedule = [...(activeTimetable.schedule || [])];
    const dayIdx = currentSchedule.findIndex((s) => s.day.toLowerCase() === day.toLowerCase());

    const updatedSlot: TimetableSlot = {
      ...slotData,
      slotIndex,
      timeRange: activeTimetable.timeSlots[slotIndex] || slotData.timeRange,
    };

    if (dayIdx >= 0) {
      const daySlots = [...(currentSchedule[dayIdx].slots || [])];
      const existingSlotIdx = daySlots.findIndex((s) => s.slotIndex === slotIndex);
      if (existingSlotIdx >= 0) {
        daySlots[existingSlotIdx] = updatedSlot;
      } else {
        daySlots.push(updatedSlot);
      }
      currentSchedule[dayIdx] = { ...currentSchedule[dayIdx], slots: daySlots };
    } else {
      currentSchedule.push({
        day,
        slots: [updatedSlot],
      });
    }

    const updated = {
      ...activeTimetable,
      schedule: currentSchedule,
    };

    setSlotModal(null);
    saveTimetableChanges(updated, `Updated ${slotData.subject} on ${day}`);
  };

  // Delete specific slot
  const handleDeleteSlot = (day: string, slotIndex: number) => {
    const slot = getSlot(day, slotIndex);
    if (!slot) return;

    setDeleteConfirmModal({
      isOpen: true,
      title: "Delete Slot",
      message: `Are you sure you want to remove ${slot.subject} from ${day} at ${activeTimetable.timeSlots[slotIndex]}?`,
      onConfirm: () => {
        const currentSchedule = [...(activeTimetable.schedule || [])];
        const dayIdx = currentSchedule.findIndex((s) => s.day.toLowerCase() === day.toLowerCase());
        if (dayIdx >= 0) {
          const updatedSlots = currentSchedule[dayIdx].slots.filter((s) => s.slotIndex !== slotIndex && s.timeRange !== activeTimetable.timeSlots[slotIndex]);
          currentSchedule[dayIdx] = { ...currentSchedule[dayIdx], slots: updatedSlots };
          const updated = {
            ...activeTimetable,
            schedule: currentSchedule,
          };
          saveTimetableChanges(updated, `Removed slot from ${day}`);
        }
        setDeleteConfirmModal(null);
        if (slotModal?.isOpen) setSlotModal(null);
      },
    });
  };

  // Clear all slots for a given day
  const handleClearDay = (day: string) => {
    setDeleteConfirmModal({
      isOpen: true,
      title: `Clear ${day} Schedule`,
      message: `This will remove all classes scheduled for ${day}. This action cannot be undone.`,
      onConfirm: () => {
        const currentSchedule = [...(activeTimetable.schedule || [])];
        const dayIdx = currentSchedule.findIndex((s) => s.day.toLowerCase() === day.toLowerCase());
        if (dayIdx >= 0) {
          currentSchedule[dayIdx] = { ...currentSchedule[dayIdx], slots: [] };
          const updated = { ...activeTimetable, schedule: currentSchedule };
          saveTimetableChanges(updated, `Cleared schedule for ${day}`);
        }
        setDeleteConfirmModal(null);
      },
    });
  };

  // Copy day schedule to another day
  const handleCopyDay = (sourceDay: string, targetDay: string) => {
    const sourceSchedule = activeTimetable.schedule?.find((s) => s.day.toLowerCase() === sourceDay.toLowerCase());
    if (!sourceSchedule || !sourceSchedule.slots || sourceSchedule.slots.length === 0) {
      showToast(`${sourceDay} has no classes to copy`, "error");
      return;
    }

    const currentSchedule = [...(activeTimetable.schedule || [])];
    const targetIdx = currentSchedule.findIndex((s) => s.day.toLowerCase() === targetDay.toLowerCase());

    const clonedSlots = sourceSchedule.slots.map((s) => ({ ...s }));

    if (targetIdx >= 0) {
      currentSchedule[targetIdx] = { ...currentSchedule[targetIdx], slots: clonedSlots };
    } else {
      currentSchedule.push({ day: targetDay, slots: clonedSlots });
    }

    const updated = { ...activeTimetable, schedule: currentSchedule };
    saveTimetableChanges(updated, `Copied ${sourceDay}'s schedule to ${targetDay}`);
  };

  // Delete entire timetable
  const handleDeleteTimetable = () => {
    if (timetables.length <= 1) {
      showToast("Cannot delete the only remaining timetable. You can reset it instead.", "error");
      return;
    }

    setDeleteConfirmModal({
      isOpen: true,
      title: "Delete Timetable",
      message: `Are you sure you want to permanently delete "${activeTimetable.title}"?`,
      onConfirm: async () => {
        try {
          if (!activeTimetable._id.startsWith("default-") && !activeTimetable._id.startsWith("local-")) {
            await api(`/api/academic/timetables/${activeTimetable._id}`, { method: "DELETE" });
          }
          const remaining = timetables.filter((t) => t._id !== activeTimetable._id);
          setTimetables(remaining);
          setActiveTimetableId(remaining[0]._id);
          localStorage.setItem("edu_timetables_v2", JSON.stringify(remaining));
          showToast("Timetable deleted successfully", "success");
        } catch (e) {
          console.error(e);
          showToast("Error deleting timetable", "error");
        }
        setDeleteConfirmModal(null);
      },
    });
  };

  // Reset to default
  const handleResetTimetable = () => {
    setDeleteConfirmModal({
      isOpen: true,
      title: "Reset to Default Timetable",
      message: "Are you sure you want to reset back to the default FE Master Timetable? Any custom modifications will be restored to original factory defaults.",
      onConfirm: async () => {
        try {
          await api("/api/academic/timetables/reset", { method: "POST" });
        } catch (e) {
          console.warn("Reset endpoint fallback:", e);
        }
        const defaultT = createInitialTimetable();
        setTimetables([defaultT]);
        setActiveTimetableId(defaultT._id);
        localStorage.setItem("edu_timetables_v2", JSON.stringify([defaultT]));
        showToast("Timetable restored to default FE Master template", "success");
        setDeleteConfirmModal(null);
      },
    });
  };

  // Create new timetable
  const handleCreateNewTimetable = (formData: { title: string; className: string; room: string; academicYear: string; semester: number; templateType: string }) => {
    let newSchedule: DaySchedule[] = [];

    if (formData.templateType === "copy_current") {
      newSchedule = JSON.parse(JSON.stringify(activeTimetable.schedule || []));
    } else if (formData.templateType === "default_template") {
      newSchedule = createInitialTimetable().schedule;
    } else {
      // Empty timetable
      newSchedule = DEFAULT_DAYS.map((day) => ({ day, slots: [] }));
    }

    const newId = "local-" + Date.now();
    const newEntry: TimetableItem = {
      _id: newId,
      title: formData.title || "New Class Timetable",
      className: formData.className || "Div A",
      room: formData.room || "Room 101",
      academicYear: formData.academicYear || "2025-26",
      semester: formData.semester || 1,
      section: formData.className || "A",
      courseName: activeTimetable.courseName || "Engineering",
      isDefault: false,
      timeSlots: [...activeTimetable.timeSlots],
      days: [...activeTimetable.days],
      schedule: newSchedule,
    };

    const nextList = [...timetables, newEntry];
    setTimetables(nextList);
    setActiveTimetableId(newId);
    setNewTimetableModalOpen(false);

    saveTimetableChanges(newEntry, `Created timetable "${newEntry.title}"`);
  };

  // Current day calculation
  const todayName = useMemo(() => {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return dayNames[new Date().getDay()];
  }, []);

  // Filtered days
  const displayedDays = useMemo(() => {
    if (selectedDayFilter === "all") return activeTimetable.days;
    if (selectedDayFilter === "today") return [todayName];
    return [selectedDayFilter];
  }, [activeTimetable.days, selectedDayFilter, todayName]);

  // Print timetable
  const handlePrint = () => {
    window.print();
  };

  // Export timetable as JSON file
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeTimetable, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${activeTimetable.title.replace(/\s+/g, "_")}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("Timetable exported to JSON", "info");
  };

  return (
    <div className={`space-y-8 pb-24 transition-colors ${isLight ? "text-slate-900" : "text-white"}`}>
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
          toast.type === "success" 
            ? isLight ? "bg-emerald-600 text-white" : "bg-emerald-500/90 text-white backdrop-blur-md" 
            : toast.type === "error"
            ? isLight ? "bg-rose-600 text-white" : "bg-rose-500/90 text-white backdrop-blur-md"
            : isLight ? "bg-blue-600 text-white" : "bg-blue-500/90 text-white backdrop-blur-md"
        }`}>
          {toast.type === "success" ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-semibold text-sm">{toast.message}</span>
        </div>
      )}

      {/* TOP HEADER & CONTROLS CARD */}
      <div className={`p-6 lg:p-8 rounded-[32px] relative overflow-hidden transition-all ${
        isLight
          ? "bg-white border border-slate-200/90 shadow-lg shadow-slate-200/50"
          : "glass-panel border border-white/10 shadow-2xl"
      }`}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Title and metadata */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                isLight ? "bg-blue-100 text-blue-900 border border-blue-200" : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
              }`}>
                <CalendarCheck className="w-3.5 h-3.5 text-blue-500" />
                Academic Schedule
              </span>
              {activeTimetable.isDefault && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  isLight ? "bg-slate-100 text-slate-700" : "bg-white/10 text-white/70"
                }`}>
                  Master Template
                </span>
              )}
              {saving && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-500 animate-pulse">
                  Saving...
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <h1 className={`text-3xl lg:text-4xl font-black tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                {activeTimetable.title}
              </h1>
              {isEditMode && (
                <button
                  onClick={() => setDetailsModalOpen(true)}
                  title="Edit timetable info"
                  className={`p-2 rounded-xl transition-all ${
                    isLight 
                      ? "hover:bg-slate-100 text-slate-600 hover:text-blue-600" 
                      : "hover:bg-white/10 text-white/60 hover:text-white"
                  }`}
                >
                  <Edit3 className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className={`flex flex-wrap items-center gap-4 text-sm font-medium ${isLight ? "text-slate-600" : "text-white/60"}`}>
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-blue-500" />
                Class: <strong className={isLight ? "text-slate-900" : "text-white"}>{activeTimetable.className}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-purple-500" />
                Room: <strong className={isLight ? "text-slate-900" : "text-white"}>{activeTimetable.room}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-500" />
                Year: <strong className={isLight ? "text-slate-900" : "text-white"}>{activeTimetable.academicYear}</strong>
              </span>
              <span>•</span>
              <span>Semester {activeTimetable.semester}</span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Timetable Switcher */}
            <div className="relative">
              <select
                value={activeTimetableId}
                onChange={(e) => setActiveTimetableId(e.target.value)}
                className={`px-4 py-2.5 rounded-2xl font-bold text-sm appearance-none pr-10 cursor-pointer border transition-all ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900 hover:bg-slate-100"
                    : "bg-[#1e293b] border-white/10 text-white hover:bg-[#334155]"
                }`}
              >
                {timetables.map((t) => (
                  <option key={t._id} value={t._id} className={isLight ? "bg-white text-slate-900" : "bg-slate-900 text-white"}>
                    {t.title} ({t.className})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
            </div>

            {/* New Timetable Button */}
            <button
              onClick={() => setNewTimetableModalOpen(true)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm transition-all shadow-sm ${
                isLight
                  ? "bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200"
                  : "bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30"
              }`}
            >
              <Plus className="w-4 h-4 text-blue-500" />
              <span>New Timetable</span>
            </button>

            {/* Edit Mode Toggle Switch */}
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm transition-all border ${
                isEditMode
                  ? isLight
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20"
                    : "bg-emerald-500/30 text-emerald-300 border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                  : isLight
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                  : "bg-white/5 hover:bg-white/10 text-white/80 border-white/10"
              }`}
            >
              <Edit3 className={`w-4 h-4 ${isEditMode ? "text-emerald-200" : "opacity-60"}`} />
              <span>{isEditMode ? "Edit Mode (Active)" : "View Mode"}</span>
            </button>

            {/* Print / Export button */}
            <button
              onClick={handlePrint}
              title="Print Timetable"
              className={`p-2.5 rounded-2xl transition-all border ${
                isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200" : "bg-white/5 hover:bg-white/10 text-white/80 border-white/10"
              }`}
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={handleExportJSON}
              title="Export as JSON"
              className={`p-2.5 rounded-2xl transition-all border ${
                isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200" : "bg-white/5 hover:bg-white/10 text-white/80 border-white/10"
              }`}
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Secondary Management Bar (in Edit Mode) */}
        {isEditMode && (
          <div className={`mt-6 pt-6 border-t flex flex-wrap items-center justify-between gap-4 ${
            isLight ? "border-slate-200/80" : "border-white/10"
          }`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-500" : "text-white/50"}`}>
                Edit Options:
              </span>

              <button
                onClick={() => setDetailsModalOpen(true)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                  isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-800" : "bg-white/5 hover:bg-white/10 text-white/80"
                }`}
              >
                Class & Room Details
              </button>

              <button
                onClick={() => setTimeSlotsModalOpen(true)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                  isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-800" : "bg-white/5 hover:bg-white/10 text-white/80"
                }`}
              >
                Manage Period Times ({activeTimetable.timeSlots.length})
              </button>

              <button
                onClick={() => setDaysModalOpen(true)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                  isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-800" : "bg-white/5 hover:bg-white/10 text-white/80"
                }`}
              >
                Days of Week ({activeTimetable.days.length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetTimetable}
                title="Restore default FE Master Timetable"
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                  isLight ? "text-amber-700 hover:bg-amber-50 border border-amber-200" : "text-amber-400 hover:bg-amber-500/10 border border-amber-500/20"
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Template
              </button>

              <button
                onClick={handleDeleteTimetable}
                title="Delete this entire timetable"
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                  isLight ? "text-rose-700 hover:bg-rose-50 border border-rose-200" : "text-rose-400 hover:bg-rose-500/10 border border-rose-500/20"
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Timetable
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FILTER TABS & QUICK DAY SELECTOR */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className={`p-1.5 rounded-2xl flex flex-wrap items-center gap-1.5 border ${
          isLight ? "bg-white border-slate-200 shadow-sm" : "glass-panel border-white/10"
        }`}>
          <button
            onClick={() => setSelectedDayFilter("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedDayFilter === "all"
                ? isLight
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-blue-500 text-white shadow-sm"
                : isLight
                ? "text-slate-600 hover:text-slate-900"
                : "text-white/60 hover:text-white"
            }`}
          >
            Full Week View
          </button>

          <button
            onClick={() => setSelectedDayFilter("today")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedDayFilter === "today"
                ? isLight
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-blue-500 text-white shadow-sm"
                : isLight
                ? "text-slate-600 hover:text-slate-900"
                : "text-white/60 hover:text-white"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Today ({todayName})
          </button>

          {activeTimetable.days.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDayFilter(day)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all hidden sm:inline-block ${
                selectedDayFilter === day
                  ? isLight
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-blue-500 text-white shadow-sm"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`font-semibold mr-1 ${isLight ? "text-slate-500" : "text-white/50"}`}>Legend:</span>
          {Object.entries(TYPE_CONFIG).slice(0, 4).map(([key, conf]) => (
            <span
              key={key}
              className={`px-2.5 py-1 rounded-lg font-bold border text-[11px] ${
                isLight ? conf.bgLight : conf.bgDark
              }`}
            >
              {conf.label}
            </span>
          ))}
        </div>
      </div>

      {/* MAIN TIMETABLE GRID TABLE */}
      <div className={`overflow-x-auto rounded-[32px] border transition-all ${
        isLight
          ? "bg-white border-slate-200/90 shadow-md shadow-slate-200/40"
          : "glass-panel border-white/10 shadow-2xl"
      }`}>
        <table className="w-full text-center border-collapse overflow-hidden">
          
          {/* Table Header: Time Slots */}
          <thead className={isLight ? "bg-slate-100/90" : "bg-[#1e293b]"}>
            <tr>
              <th className={`p-4 sm:p-5 border-b border-r font-black uppercase tracking-wider text-xs w-44 text-left ${
                isLight ? "border-slate-200 text-slate-800" : "border-[#334155] text-slate-300"
              }`}>
                <div className="flex items-center justify-between">
                  <span>Day / Period</span>
                  {isEditMode && (
                    <button
                      onClick={() => setTimeSlotsModalOpen(true)}
                      title="Add or edit time periods"
                      className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </th>

              {activeTimetable.timeSlots.map((time, idx) => (
                <th
                  key={idx}
                  className={`p-4 border-b border-r last:border-r-0 font-bold tracking-tight text-xs whitespace-nowrap min-w-[170px] ${
                    isLight ? "border-slate-200 text-slate-800" : "border-[#334155] text-slate-300"
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase font-black tracking-widest opacity-60">Period {idx + 1}</span>
                    <span className="text-sm font-extrabold">{time}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body: Days & Slots */}
          <tbody className={isLight ? "bg-white divide-y divide-slate-100" : "bg-[#0f172a]/60 divide-y divide-[#334155]"}>
            {displayedDays.map((day) => {
              const isToday = day.toLowerCase() === todayName.toLowerCase();

              return (
                <tr
                  key={day}
                  className={`transition-colors ${
                    isToday
                      ? isLight
                        ? "bg-blue-50/40 hover:bg-blue-50/70"
                        : "bg-blue-950/20 hover:bg-blue-950/30"
                      : isLight
                      ? "hover:bg-slate-50/80"
                      : "hover:bg-white/5"
                  }`}
                >
                  {/* Day Column Cell */}
                  <td className={`p-4 sm:p-5 border-r font-bold text-left align-top ${
                    isLight ? "border-slate-200" : "border-[#334155]"
                  }`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-base font-black ${
                          isToday 
                            ? isLight ? "text-blue-700" : "text-blue-400"
                            : isLight ? "text-slate-900" : "text-white/90"
                        }`}>
                          {day}
                        </span>
                        {isToday && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isLight ? "bg-blue-600 text-white" : "bg-blue-500 text-white"
                          }`}>
                            Today
                          </span>
                        )}
                      </div>

                      {/* Day Action Buttons in Edit Mode */}
                      {isEditMode && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            onClick={() => handleClearDay(day)}
                            title={`Clear all classes for ${day}`}
                            className={`p-1 rounded-lg text-xs transition-colors ${
                              isLight
                                ? "hover:bg-rose-100 text-slate-400 hover:text-rose-600"
                                : "hover:bg-rose-500/20 text-white/40 hover:text-rose-400"
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              const otherDay = activeTimetable.days.find((d) => d !== day);
                              if (otherDay) handleCopyDay(day, otherDay);
                            }}
                            title={`Copy ${day} schedule to another day`}
                            className={`p-1 rounded-lg text-xs transition-colors ${
                              isLight
                                ? "hover:bg-slate-100 text-slate-400 hover:text-blue-600"
                                : "hover:bg-white/10 text-white/40 hover:text-white"
                            }`}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Class Slots */}
                  {activeTimetable.timeSlots.map((_, slotIdx) => {
                    const slot = getSlot(day, slotIdx);
                    const slotType: SlotType = (slot?.type as SlotType) || "lecture";
                    const typeStyle = TYPE_CONFIG[slotType] || TYPE_CONFIG.lecture;

                    return (
                      <td
                        key={slotIdx}
                        className={`p-2.5 sm:p-3 border-r last:border-r-0 align-top transition-all ${
                          isLight ? "border-slate-200" : "border-[#334155]"
                        }`}
                      >
                        {slot && slot.subject ? (
                          /* Filled Class Slot */
                          <div
                            onClick={() => isEditMode && handleEditSlot(day, slotIdx)}
                            className={`group relative p-3 sm:p-4 rounded-2xl border transition-all text-left ${
                              isLight ? typeStyle.bgLight : typeStyle.bgDark
                            } ${isEditMode ? "cursor-pointer hover:scale-[1.02] shadow-sm" : ""}`}
                          >
                            {/* Subject Code & Type Badge */}
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className={`text-sm sm:text-base font-black tracking-tight ${
                                isLight ? typeStyle.textLight : typeStyle.textDark
                              }`}>
                                {slot.subject}
                              </span>

                              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                                isLight ? "bg-white/90 text-slate-800 shadow-xs" : "bg-white/10 text-white/80"
                              }`}>
                                {typeStyle.badge}
                              </span>
                            </div>

                            {/* Room / Lab info */}
                            <div className={`text-xs flex items-center gap-1.5 mt-1 font-medium ${
                              isLight ? "text-slate-700" : "text-white/70"
                            }`}>
                              <MapPin className="w-3 h-3 opacity-70 shrink-0" />
                              <span className="truncate">{slot.room || activeTimetable.room || "Room 331"}</span>
                            </div>

                            {/* Teacher info */}
                            {slot.teacher && (
                              <div className={`text-xs flex items-center gap-1.5 mt-0.5 font-medium ${
                                isLight ? "text-slate-600" : "text-white/60"
                              }`}>
                                <UserIcon className="w-3 h-3 opacity-70 shrink-0" />
                                <span className="truncate">{slot.teacher}</span>
                              </div>
                            )}

                            {/* Notes tooltip badge if available */}
                            {slot.notes && (
                              <div className={`mt-1.5 text-[11px] italic truncate px-2 py-0.5 rounded-md ${
                                isLight ? "bg-white/70 text-slate-600" : "bg-black/20 text-white/70"
                              }`}>
                                {slot.notes}
                              </div>
                            )}

                            {/* Action overlay in Edit Mode */}
                            {isEditMode && (
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 rounded-lg p-0.5 shadow-md">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditSlot(day, slotIdx);
                                  }}
                                  title="Edit slot details"
                                  className="p-1 hover:text-blue-600 text-slate-600 dark:text-slate-300"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSlot(day, slotIdx);
                                  }}
                                  title="Delete this class"
                                  className="p-1 hover:text-rose-600 text-slate-600 dark:text-slate-300"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Empty Slot */
                          <div
                            onClick={() => isEditMode && handleEditSlot(day, slotIdx)}
                            className={`p-4 rounded-2xl border border-dashed transition-all text-center flex flex-col items-center justify-center min-h-[95px] ${
                              isEditMode
                                ? isLight
                                  ? "border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 cursor-pointer text-slate-400 hover:text-blue-600"
                                  : "border-white/10 hover:border-blue-400 hover:bg-blue-500/10 cursor-pointer text-white/30 hover:text-blue-400"
                                : isLight
                                ? "border-slate-200/60 bg-slate-50/50 text-slate-400"
                                : "border-white/5 bg-white/[0.02] text-white/20"
                            }`}
                          >
                            {isEditMode ? (
                              <div className="flex flex-col items-center gap-1">
                                <Plus className="w-5 h-5 opacity-70" />
                                <span className="text-[11px] font-bold uppercase tracking-wider">Add Class</span>
                              </div>
                            ) : (
                              <span className="text-xs italic opacity-50">Free Period</span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* FOOTER INFO CARD */}
      <div className={`p-6 rounded-[28px] border transition-all ${
        isLight ? "bg-slate-50 border-slate-200/80 text-slate-700" : "glass-panel border-white/10 text-white/70"
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${isLight ? "bg-blue-100 text-blue-700" : "bg-blue-500/20 text-blue-400"}`}>
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h4 className={`font-bold text-sm ${isLight ? "text-slate-900" : "text-white"}`}>
                Interactive & Editable Timetable
              </h4>
              <p className="text-xs mt-0.5">
                Click on any class period while <strong>Edit Mode</strong> is active to modify subjects, change faculty, update rooms, or delete sessions. Changes persist automatically.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-semibold">
              Total Periods/Week: {activeTimetable.days.length * activeTimetable.timeSlots.length}
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: EDIT / ADD SLOT MODAL */}
      {/* ======================================================== */}
      {slotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-lg rounded-[28px] p-6 lg:p-7 shadow-2xl border transition-all ${
            isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[#0f172a] border-white/20 text-white"
          }`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className={`p-2.5 rounded-2xl ${isLight ? "bg-blue-100 text-blue-800" : "bg-blue-500/20 text-blue-400"}`}>
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">
                    {slotModal.isNew ? "Add Class Session" : "Edit Class Session"}
                  </h3>
                  <p className="text-xs opacity-60">
                    {slotModal.day} • {activeTimetable.timeSlots[slotModal.slotIndex]}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSlotModal(null)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 pt-4">
              {/* Quick Subject Chips */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-70">
                  Quick Select Subject:
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {COMMON_SUBJECT_SUGGESTIONS.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => {
                        setSlotModal({
                          ...slotModal,
                          slotData: {
                            ...slotModal.slotData,
                            subject: item.code,
                            type: item.type,
                            room: item.type === "lab" ? "Lab 3 / WS" : activeTimetable.room || "Room 331",
                          },
                        });
                      }}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition-all ${
                        slotModal.slotData.subject === item.code
                          ? isLight
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-blue-500 text-white border-blue-500"
                          : isLight
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200"
                          : "bg-white/5 hover:bg-white/10 text-white/80 border-white/10"
                      }`}
                    >
                      {item.code}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                  Subject Name / Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g. PPS, M-II, CHEM, BEE, Lab F1"
                  value={slotModal.slotData.subject}
                  onChange={(e) =>
                    setSlotModal({
                      ...slotModal,
                      slotData: { ...slotModal.slotData, subject: e.target.value },
                    })
                  }
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all outline-none ${
                    isLight
                      ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600 focus:bg-white"
                      : "bg-[#1e293b] border-white/10 text-white focus:border-blue-400"
                  }`}
                  autoFocus
                />
              </div>

              {/* Session Type */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                  Session Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["lecture", "lab", "tutorial", "break", "seminar", "other"] as SlotType[]).map((t) => {
                    const conf = TYPE_CONFIG[t];
                    const selected = slotModal.slotData.type === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() =>
                          setSlotModal({
                            ...slotModal,
                            slotData: { ...slotModal.slotData, type: t },
                          })
                        }
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                          selected
                            ? isLight
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                              : "bg-blue-500 text-white border-blue-500 shadow-sm"
                            : isLight
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                            : "bg-white/5 hover:bg-white/10 text-white/70 border-white/10"
                        }`}
                      >
                        {conf.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Room & Teacher Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                    Room / Lab
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Room 331, Lab 3"
                    value={slotModal.slotData.room || ""}
                    onChange={(e) =>
                      setSlotModal({
                        ...slotModal,
                        slotData: { ...slotModal.slotData, room: e.target.value },
                      })
                    }
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all outline-none ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600"
                        : "bg-[#1e293b] border-white/10 text-white focus:border-blue-400"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                    Teacher / Faculty
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Jamdhade, Dr. Sharma"
                    value={slotModal.slotData.teacher || ""}
                    onChange={(e) =>
                      setSlotModal({
                        ...slotModal,
                        slotData: { ...slotModal.slotData, teacher: e.target.value },
                      })
                    }
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all outline-none ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600"
                        : "bg-[#1e293b] border-white/10 text-white focus:border-blue-400"
                    }`}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                  Notes / Instructions (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bring lab manual, Unit Test 1 review"
                  value={slotModal.slotData.notes || ""}
                  onChange={(e) =>
                    setSlotModal({
                      ...slotModal,
                      slotData: { ...slotModal.slotData, notes: e.target.value },
                    })
                  }
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all outline-none ${
                    isLight
                      ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600"
                      : "bg-[#1e293b] border-white/10 text-white focus:border-blue-400"
                  }`}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-3 pt-6 mt-4 border-t border-slate-200 dark:border-white/10">
              {!slotModal.isNew ? (
                <button
                  type="button"
                  onClick={() => handleDeleteSlot(slotModal.day, slotModal.slotIndex)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isLight ? "text-rose-600 hover:bg-rose-50" : "text-rose-400 hover:bg-rose-500/10"
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Class</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSlotModal(null)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isLight ? "hover:bg-slate-100 text-slate-700" : "hover:bg-white/10 text-white/80"
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveSlot}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black shadow-md transition-all ${
                    isLight
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-blue-500 hover:bg-blue-600 text-white"
                  }`}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: TIMETABLE DETAILS MODAL */}
      {/* ======================================================== */}
      {detailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-md rounded-[28px] p-6 lg:p-7 shadow-2xl border transition-all ${
            isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[#0f172a] border-white/20 text-white"
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-lg font-black tracking-tight">Edit Timetable Details</h3>
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const updated = {
                  ...activeTimetable,
                  title: (formData.get("title") as string) || activeTimetable.title,
                  className: (formData.get("className") as string) || activeTimetable.className,
                  room: (formData.get("room") as string) || activeTimetable.room,
                  academicYear: (formData.get("academicYear") as string) || activeTimetable.academicYear,
                  semester: Number(formData.get("semester")) || activeTimetable.semester,
                };
                setDetailsModalOpen(false);
                saveTimetableChanges(updated, "Timetable header updated");
              }}
              className="space-y-4 pt-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                  Timetable Title *
                </label>
                <input
                  name="title"
                  defaultValue={activeTimetable.title}
                  required
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none ${
                    isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-[#1e293b] border-white/10 text-white"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                    Class / Division
                  </label>
                  <input
                    name="className"
                    defaultValue={activeTimetable.className}
                    required
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none ${
                      isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-[#1e293b] border-white/10 text-white"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                    Default Room
                  </label>
                  <input
                    name="room"
                    defaultValue={activeTimetable.room}
                    required
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none ${
                      isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-[#1e293b] border-white/10 text-white"
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                    Academic Year
                  </label>
                  <input
                    name="academicYear"
                    defaultValue={activeTimetable.academicYear}
                    required
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none ${
                      isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-[#1e293b] border-white/10 text-white"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                    Semester
                  </label>
                  <input
                    name="semester"
                    type="number"
                    min="1"
                    max="8"
                    defaultValue={activeTimetable.semester}
                    required
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none ${
                      isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-[#1e293b] border-white/10 text-white"
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setDetailsModalOpen(false)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold ${
                    isLight ? "hover:bg-slate-100 text-slate-700" : "hover:bg-white/10 text-white/80"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-6 py-2.5 rounded-xl text-xs font-black shadow-md ${
                    isLight ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"
                  }`}
                >
                  Save Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: MANAGE TIME SLOTS / PERIODS MODAL */}
      {/* ======================================================== */}
      {timeSlotsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-lg rounded-[28px] p-6 lg:p-7 shadow-2xl border transition-all ${
            isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[#0f172a] border-white/20 text-white"
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
              <div>
                <h3 className="text-lg font-black tracking-tight">Manage Period Times</h3>
                <p className="text-xs opacity-60">Add, rename, or delete time slot periods</p>
              </div>
              <button
                onClick={() => setTimeSlotsModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto pr-1">
              {activeTimetable.timeSlots.map((time, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className={`text-xs font-black w-20 shrink-0 ${isLight ? "text-slate-500" : "text-white/50"}`}>
                    Period {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => {
                      const next = [...activeTimetable.timeSlots];
                      next[idx] = e.target.value;
                      setTimetables(timetables.map((t) => (t._id === activeTimetable._id ? { ...t, timeSlots: next } : t)));
                    }}
                    className={`flex-1 px-3.5 py-2 rounded-xl border text-xs font-bold ${
                      isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-[#1e293b] border-white/10 text-white"
                    }`}
                  />
                  <button
                    onClick={() => {
                      if (activeTimetable.timeSlots.length <= 1) {
                        showToast("Timetable must have at least one period", "error");
                        return;
                      }
                      const next = activeTimetable.timeSlots.filter((_, i) => i !== idx);
                      const updated = { ...activeTimetable, timeSlots: next };
                      saveTimetableChanges(updated, `Deleted Period ${idx + 1}`);
                    }}
                    title="Delete period column"
                    className="p-2 rounded-xl hover:bg-rose-50 text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* Add New Period */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = [...activeTimetable.timeSlots, "02:30 - 03:25"];
                    const updated = { ...activeTimetable, timeSlots: next };
                    saveTimetableChanges(updated, "Added new period time slot");
                  }}
                  className={`w-full py-2.5 rounded-xl border border-dashed flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                    isLight
                      ? "border-blue-300 text-blue-600 hover:bg-blue-50"
                      : "border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Another Period</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-200 dark:border-white/10">
              <button
                onClick={() => {
                  setTimeSlotsModalOpen(false);
                  saveTimetableChanges(activeTimetable, "Period times saved");
                }}
                className={`px-6 py-2.5 rounded-xl text-xs font-black ${
                  isLight ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"
                }`}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: MANAGE DAYS MODAL */}
      {/* ======================================================== */}
      {daysModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-md rounded-[28px] p-6 lg:p-7 shadow-2xl border transition-all ${
            isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[#0f172a] border-white/20 text-white"
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
              <div>
                <h3 className="text-lg font-black tracking-tight">Active Days of Week</h3>
                <p className="text-xs opacity-60">Toggle days to include in this timetable</p>
              </div>
              <button
                onClick={() => setDaysModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 pt-4">
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => {
                const isActive = activeTimetable.days.includes(d);
                return (
                  <div
                    key={d}
                    onClick={() => {
                      let nextDays: string[];
                      if (isActive) {
                        if (activeTimetable.days.length <= 1) {
                          showToast("At least one day must be active", "error");
                          return;
                        }
                        nextDays = activeTimetable.days.filter((x) => x !== d);
                      } else {
                        nextDays = [...activeTimetable.days, d];
                      }
                      const updated = { ...activeTimetable, days: nextDays };
                      saveTimetableChanges(updated, `Updated active days`);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isActive
                        ? isLight
                          ? "bg-blue-50 border-blue-200 text-blue-950 font-bold"
                          : "bg-blue-500/10 border-blue-500/30 text-blue-200 font-bold"
                        : isLight
                        ? "bg-slate-50 border-slate-200 text-slate-500"
                        : "bg-white/5 border-white/10 text-white/50"
                    }`}
                  >
                    <span>{d}</span>
                    <input type="checkbox" checked={isActive} readOnly className="rounded text-blue-600" />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-slate-200 dark:border-white/10">
              <button
                onClick={() => setDaysModalOpen(false)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black ${
                  isLight ? "bg-blue-600 text-white" : "bg-blue-500 text-white"
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: NEW TIMETABLE MODAL */}
      {/* ======================================================== */}
      {newTimetableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-md rounded-[28px] p-6 lg:p-7 shadow-2xl border transition-all ${
            isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[#0f172a] border-white/20 text-white"
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
              <div>
                <h3 className="text-lg font-black tracking-tight">Create New Timetable</h3>
                <p className="text-xs opacity-60">Add a schedule for another division or semester</p>
              </div>
              <button
                onClick={() => setNewTimetableModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleCreateNewTimetable({
                  title: (formData.get("title") as string) || "New Timetable",
                  className: (formData.get("className") as string) || "FE A",
                  room: (formData.get("room") as string) || "Room 301",
                  academicYear: (formData.get("academicYear") as string) || "2025-26",
                  semester: Number(formData.get("semester")) || 1,
                  templateType: (formData.get("templateType") as string) || "default_template",
                });
              }}
              className="space-y-4 pt-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                  Timetable Title *
                </label>
                <input
                  name="title"
                  placeholder="e.g. SE Computer Engineering (Div B)"
                  required
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none ${
                    isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-[#1e293b] border-white/10 text-white"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                    Class / Div
                  </label>
                  <input
                    name="className"
                    placeholder="e.g. SE B"
                    required
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none ${
                      isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-[#1e293b] border-white/10 text-white"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                    Default Room
                  </label>
                  <input
                    name="room"
                    placeholder="e.g. 402"
                    required
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none ${
                      isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-[#1e293b] border-white/10 text-white"
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                    Academic Year
                  </label>
                  <input
                    name="academicYear"
                    defaultValue="2025-26"
                    required
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none ${
                      isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-[#1e293b] border-white/10 text-white"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                    Semester
                  </label>
                  <input
                    name="semester"
                    type="number"
                    min="1"
                    max="8"
                    defaultValue={1}
                    required
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none ${
                      isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-[#1e293b] border-white/10 text-white"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                  Starting Schedule
                </label>
                <select
                  name="templateType"
                  defaultValue="default_template"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none ${
                    isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-[#1e293b] border-white/10 text-white"
                  }`}
                >
                  <option value="default_template">Pre-fill with Default Engineering Template</option>
                  <option value="copy_current">Clone Active Timetable Schedule</option>
                  <option value="blank">Blank Grid (Add all classes from scratch)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setNewTimetableModalOpen(false)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold ${
                    isLight ? "hover:bg-slate-100 text-slate-700" : "hover:bg-white/10 text-white/80"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-6 py-2.5 rounded-xl text-xs font-black shadow-md ${
                    isLight ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"
                  }`}
                >
                  Create Timetable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 6: DELETE CONFIRM MODAL */}
      {/* ======================================================== */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-sm rounded-[28px] p-6 shadow-2xl border transition-all ${
            isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[#0f172a] border-white/20 text-white"
          }`}>
            <div className="flex items-center gap-3 text-rose-500 mb-3">
              <div className="p-3 rounded-2xl bg-rose-500/20">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black">{deleteConfirmModal.title}</h3>
            </div>
            
            <p className="text-xs opacity-80 leading-relaxed mb-6">
              {deleteConfirmModal.message}
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmModal(null)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold ${
                  isLight ? "hover:bg-slate-100 text-slate-700" : "hover:bg-white/10 text-white/80"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={deleteConfirmModal.onConfirm}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30 transition-all"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
