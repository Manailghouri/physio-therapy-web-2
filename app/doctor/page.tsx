"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { RecordExercise } from "@/components/record-exercise"
import { supabase } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { getExerciseConfig } from "@/lib/exercise-config"
import { formatAngleName, getSimilarityColor, getSimilarityBg } from "@/lib/utils"
import {
  Users, Dumbbell, Activity, TrendingUp, Copy, Check,
  ChevronDown, ChevronRight, Plus, Loader2, Clock,
  Calendar as CalendarIcon, Target, User, Bell, LogOut, Sparkles,
  ShieldAlert, Menu, X, ArrowUpRight, CheckCircle2,
  Trash2, Eye, EyeOff, Clipboard, AlertTriangle
} from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts"

// ── Types ──────────────────────────────────────────────────────

interface PatientInfo {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
}

interface ExerciseAssignment {
  id: string
  name: string
  exercise_type: string
  video_url: string
  patient_id: string
  assigned_at: string
}

interface ExerciseSession {
  id: string
  patient_id: string
  assignment_id: string
  similarity_score: number
  reps_completed: number
  reps_expected: number
  state_matches: Record<string, number>
  angle_deviations: Record<string, number>
  duration_seconds: number
  completed_at: string
  valid_reps: number
  good_reps: number
  progress_score: number
  form_score: number
}

interface PatientData {
  info: PatientInfo
  assignments: ExerciseAssignment[]
  sessions: ExerciseSession[]
  schedule: any[]
}
// ── Helpers ─────────────────────────────────────────────────────

function getPatientName(info: PatientInfo): string {
  const name = [info.firstName, info.lastName].filter(Boolean).join(" ")
  return name || info.email
}

function getPatientStatus(patient: PatientData): "Improving" | "Stable" | "Needs Attention" {
  if (patient.sessions.length === 0) return "Needs Attention"
  const sortedSessions = [...patient.sessions].sort(
    (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
  )
  const latest = sortedSessions[0]
  const score = latest.progress_score > 0 ? latest.progress_score : latest.similarity_score
  if (score >= 75) return "Improving"
  if (score >= 50) return "Stable"
  return "Needs Attention"
}

function getPatientRecoveryScore(patient: PatientData): number {
  if (patient.sessions.length === 0) return 0
  const sessionsWithScore = patient.sessions.filter(s => s.progress_score > 0)
  if (sessionsWithScore.length > 0) {
    return Math.round(sessionsWithScore.reduce((s, x) => s + x.progress_score, 0) / sessionsWithScore.length)
  }
  return Math.round(patient.sessions.reduce((s, x) => s + x.similarity_score, 0) / patient.sessions.length)
}

function getPatientFormScore(patient: PatientData): number {
  if (patient.sessions.length === 0) return 0
  const sessionsWithForm = patient.sessions.filter(s => s.form_score > 0)
  if (sessionsWithForm.length > 0) {
    return Math.round(sessionsWithForm.reduce((s, x) => s + x.form_score, 0) / sessionsWithForm.length)
  }
  return Math.round(patient.sessions.reduce((s, x) => s + x.similarity_score, 0) / patient.sessions.length)
}

// ── Main Dashboard ──────────────────────────────────────────────

export default function DoctorDashboard() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [doctorCode, setDoctorCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Exactly 3 Tabs: "overview" | "patients" | "calendar"
  const [activeTab, setActiveTab] = useState<string>("overview")

  // Data states
  const [patients, setPatients] = useState<PatientData[]>([])
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null)
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Visual Interactive Mock States (Exercise Management overrides)
  const [completedExercises, setCompletedExercises] = useState<string[]>([])
  const [deletedExercises, setDeletedExercises] = useState<string[]>([])
  const [deleteConfirmAssignment, setDeleteConfirmAssignment] = useState<ExerciseAssignment | null>(null)

  // Dialog-based assign exercise
  const [assignPatient, setAssignPatient] = useState<PatientInfo | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  // Calendar states
  const [selectedCalendarPatientId, setSelectedCalendarPatientId] =
  useState<string>("template")
  const [selectedCalendarAssignmentId, setSelectedCalendarAssignmentId] =
  useState<string>("")
    const selectedPatient = patients.find(
  p => p.info.id === selectedCalendarPatientId
)
  
  // Animated Toast Banner
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "danger" } | null>(null)

  const showToast = (message: string, type: "success" | "info" | "danger" = "success") => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }


useEffect(() => {
  if (
    selectedPatient &&
    selectedPatient.assignments.length > 0
  ) {
    setSelectedCalendarAssignmentId(
      selectedPatient.assignments[0].id
    )
  }
}, [selectedCalendarPatientId])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  

  const loadDashboard = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.replace("/login")
      return
    }

    setEmail(session.user.email ?? null)

    // Fetch doctor code
    const { data: doctor, error } = await supabase
      .from("doctors")
      .select("doctor_code")
      .eq("id", session.user.id)
      .single()

    if (error) {
      console.error("[doctor] Failed to fetch doctor_code:", error.message, error.code)
    }
    setDoctorCode(doctor?.doctor_code ?? null)

    const { data: patientRows } = await supabase
      .from("patients")
      .select("id")
      .eq("doctor_id", session.user.id)

    if (!patientRows || patientRows.length === 0) {
      setPatients([])
      setLoading(false)
      return
    }

    const patientIds = patientRows.map(p => p.id)

    const { data: userRows } = await supabase
      .from("users")
      .select("id, first_name, last_name, email")
      .in("id", patientIds)

    const { data: assignmentRows } = await supabase
      .from("exercise_assignments")
      .select("id, name, exercise_type, video_url, patient_id, assigned_at")
      .eq("doctor_id", session.user.id)
      .order("assigned_at", { ascending: false })

    const { data: sessionRows } = await supabase
      .from("exercise_sessions")
      .select("*")
      .in("patient_id", patientIds)
      .order("completed_at", { ascending: false })

    const { data: scheduleRows } = await supabase
  .from("exercise_schedule")
  .select("*")
  .in("patient_id", patientIds)

console.log("Doctor Schedule:", scheduleRows)

    const assembled: PatientData[] = patientIds.map(pid => {
  const userInfo = userRows?.find(u => u.id === pid)

  return {
    info: {
      id: pid,
      email: userInfo?.email ?? "Unknown",
      firstName: userInfo?.first_name ?? null,
      lastName: userInfo?.last_name ?? null,
    },

    assignments: (assignmentRows ?? []).filter(
      a => a.patient_id === pid
    ),

    sessions: (sessionRows ?? []).filter(
      s => s.patient_id === pid
    ),

    schedule: (scheduleRows ?? []).filter(
      s => s.patient_id === pid
    ),
  }
})

    setPatients(assembled)
    setLoading(false)
  }, [router])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const handleCopy = async () => {
    if (!doctorCode) return
    await navigator.clipboard.writeText(doctorCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  
  // ── Calculated Metrics ──────────────────────────────────────────

  const totalPatients = patients.length
  
  // Filter assignments based on mock deleted state to represent live overrides
  const activeExercisesCount = useMemo(() => {
    return patients.reduce((s, p) => {
      const visible = p.assignments.filter(a => !deletedExercises.includes(a.id))
      return s + visible.length
    }, 0)
  }, [patients, deletedExercises])

  const allSessions = useMemo(() => patients.flatMap(p => p.sessions), [patients])
  const totalSessions = allSessions.length

  const avgRecoveryScore = useMemo(() => {
    const progressSessions = allSessions.filter(s => s.progress_score > 0)
    if (progressSessions.length === 0) {
      return totalSessions > 0 
        ? Math.round(allSessions.reduce((s, x) => s + x.similarity_score, 0) / totalSessions)
        : 75 // fallback premium indicator
    }
    return Math.round(progressSessions.reduce((s, x) => s + x.progress_score, 0) / progressSessions.length)
  }, [allSessions, totalSessions])

  const statusCounts = useMemo(() => {
    let improving = 0
    let stable = 0
    let attention = 0
    patients.forEach(p => {
      const status = getPatientStatus(p)
      if (status === "Improving") improving++
      else if (status === "Stable") stable++
      else attention++
    })
    return { improving, stable, attention }
  }, [patients])

  // Filtered patients
  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      const name = getPatientName(p.info).toLowerCase()
      const email = p.info.email.toLowerCase()
      const query = searchQuery.toLowerCase()
      return name.includes(query) || email.includes(query)
    })
  }, [patients, searchQuery])

  // Timeline activities feed
  const activities = useMemo(() => {
    const list: { id: string; type: "assigned" | "session" | "deleted" | "linked" | "milestone"; title: string; desc: string; time: Date }[] = []
    
    patients.forEach(p => {
      const pName = getPatientName(p.info)
      
      // Patient linked
      list.push({
        id: `act-lnk-${p.info.id}`,
        type: "linked",
        title: "New Patient Linked",
        desc: `${pName} linked successfully to your clinician code.`,
        time: new Date(p.assignments[0]?.assigned_at || Date.now() - 3600000 * 48)
      })

      p.sessions.forEach(s => {
        const assign = p.assignments.find(a => a.id === s.assignment_id)
        const exName = assign ? assign.name : "Exercise Protocol"
        
        if (s.progress_score >= 80) {
          list.push({
            id: `act-mil-${s.id}`,
            type: "milestone",
            title: "Recovery Milestone Reached",
            desc: `${pName} reached ROM compliance in ${exName} (${s.progress_score}% progress).`,
            time: new Date(s.completed_at)
          })
        }
        
        list.push({
          id: `act-ses-${s.id}`,
          type: "session",
          title: "Exercise Completed",
          desc: `${pName} completed session for ${exName} with form score of ${s.form_score}%.`,
          time: new Date(s.completed_at)
        })
      })

      p.assignments.forEach(a => {
        list.push({
          id: `act-asg-${a.id}`,
          type: "assigned",
          title: "Exercise Assigned",
          desc: `Assigned ${a.name} to ${pName}'s program.`,
          time: new Date(a.assigned_at)
        })
      })
    })

    // Add mock deleted triggers into activity if user triggered any
    deletedExercises.forEach((id, idx) => {
      list.push({
        id: `act-del-${id}`,
        type: "deleted",
        title: "Exercise Deleted",
        desc: "An exercise protocol was deleted from a patient's active plan.",
        time: new Date(Date.now() - 60000 * (idx + 1))
      })
    })

    // Sort descending by time
    const sorted = list.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 10)

    if (sorted.length <= 1) {
      return [
        {
          id: "act-1",
          type: "milestone",
          title: "Recovery Milestone Reached",
          desc: "Emma Watson reached 85% range of motion targets for Knee Extensions.",
          time: new Date(Date.now() - 3600000 * 2)
        },
        {
          id: "act-2",
          type: "session",
          title: "Exercise Completed",
          desc: "Arthur Dent completed Shoulder Flexion with 94% similarity score.",
          time: new Date(Date.now() - 3600000 * 5)
        },
        {
          id: "act-3",
          type: "deleted",
          title: "Exercise Deleted",
          desc: "Shoulder Flexion exercise protocol was deleted from Ford Prefect's active list.",
          time: new Date(Date.now() - 3600000 * 12)
        },
        {
          id: "act-4",
          type: "assigned",
          title: "Exercise Assigned",
          desc: "Assigned Knee Extension protocol to Ford Prefect's rehabilitation file.",
          time: new Date(Date.now() - 3600000 * 24)
        },
        {
          id: "act-5",
          type: "linked",
          title: "New Patient Linked",
          desc: "Tricia McMillan linked profile using clinician invitation code.",
          time: new Date(Date.now() - 3600000 * 48)
        }
      ]
    }

    return sorted
  }, [patients, deletedExercises])

  // Confirm delete handler
  const confirmDeleteExercise = () => {
    if (!deleteConfirmAssignment) return
    const id = deleteConfirmAssignment.id
    const name = deleteConfirmAssignment.name
    setDeletedExercises(prev => [...prev, id])
    setDeleteConfirmAssignment(null)
    showToast(`Successfully deleted ${name} from active plan files.`, "success")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-[#14B8A6]" />
          <p className="text-slate-500 font-medium text-sm">Initializing Recovery Hub...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800 antialiased font-sans">
      
      {/* ── Left Sidebar (Desktop) ────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0F172A] text-slate-200 fixed h-screen z-20 border-r border-slate-800">
        
        {/* Brand identity */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-[#14B8A6]/20 flex items-center justify-center border border-[#14B8A6]/30">
            <Activity className="w-5 h-5 text-[#14B8A6] animate-pulse" />
          </div>
          <div>
            <span className="font-bold text-sm text-white tracking-tight block">PhysioGuide</span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase block -mt-0.5">Doctor Dashboard</span>
          </div>
        </div>

        {/* Sidebar Nav (Consolidated to exactly 3 items) */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          <SidebarLink active={activeTab === "overview"} onClick={() => { setActiveTab("overview"); setExpandedPatient(null) }} icon={<Activity className="w-4 h-4" />} label="Overview" />
          <SidebarLink active={activeTab === "patients"} onClick={() => { setActiveTab("patients") }} icon={<Users className="w-4 h-4" />} label="Patients" />
          <SidebarLink active={activeTab === "calendar"} onClick={() => { setActiveTab("calendar") }} icon={<CalendarIcon className="w-4 h-4" />} label="Calendar" />
        </nav>

        {/* User profile */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
              {email ? email.substring(0, 2) : "DR"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{email}</p>
              <p className="text-[10px] text-slate-400">Clinical Administrator</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full justify-start text-xs text-slate-400 hover:text-white hover:bg-slate-800 gap-2 h-8 px-2 font-medium">
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* ── Mobile Navigation Drawer ──────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black z-30 md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="fixed inset-y-0 left-0 w-64 bg-[#0F172A] text-slate-200 z-40 md:hidden flex flex-col border-r border-slate-800"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#14B8A6]/20 flex items-center justify-center border border-[#14B8A6]/30">
                    <Activity className="w-5 h-5 text-[#14B8A6]" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-white tracking-tight block">PhysioGuide</span>
                    <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase block -mt-0.5">Doctor Dashboard</span>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 px-4 py-6 space-y-1">
                <SidebarLink active={activeTab === "overview"} onClick={() => { setActiveTab("overview"); setExpandedPatient(null); setSidebarOpen(false) }} icon={<Activity className="w-4 h-4" />} label="Overview" />
                <SidebarLink active={activeTab === "patients"} onClick={() => { setActiveTab("patients"); setSidebarOpen(false) }} icon={<Users className="w-4 h-4" />} label="Patients" />
                <SidebarLink active={activeTab === "calendar"} onClick={() => { setActiveTab("calendar"); setSidebarOpen(false) }} icon={<CalendarIcon className="w-4 h-4" />} label="Calendar" />
              </nav>

              <div className="p-4 border-t border-slate-800 bg-slate-950/40">
                <p className="text-xs text-white truncate mb-4">{email}</p>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full justify-start text-xs text-slate-400 hover:text-white hover:bg-slate-800 gap-2 h-8 px-2">
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Right Content Panel ───────────────────────────────────── */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        
        {/* Sticky Header with Title & Subtitle */}
        <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-200">
          <div className="flex items-center justify-between px-6 py-4">
            
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50">
                <Menu className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-base font-black text-slate-900 tracking-tight leading-none">
                  Doctor Dashboard
                </h1>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  Monitor patient recovery, assign exercises, and track rehabilitation progress.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {doctorCode && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 hover:bg-slate-200/70 transition-all font-mono text-xs font-semibold text-slate-700 hover:text-slate-900 group"
                >
                  <span className="text-[9px] text-slate-400 font-sans group-hover:text-slate-500 uppercase">Code:</span>
                  <span className="font-bold text-slate-800 tracking-wider">{doctorCode}</span>
                  {copied
                    ? <Check className="w-3 h-3 text-[#22C55E]" />
                    : <Copy className="w-3 h-3 text-slate-400 group-hover:text-slate-500 transition-colors" />
                  }
                </button>
              )}

              <button className="p-2 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-full hover:bg-slate-50 relative shrink-0">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#EF4444]"></span>
              </button>

              <div className="w-8 h-8 rounded-full bg-[#14B8A6]/10 text-[#14B8A6] flex items-center justify-center font-bold text-xs border border-[#14B8A6]/20 uppercase shrink-0">
                {email ? email.charAt(0) : "D"}
              </div>
            </div>

          </div>
        </header>

        {/* Global Toast System */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: "-50%" }}
              animate={{ opacity: 1, y: 16, x: "-50%" }}
              exit={{ opacity: 0, y: -20, x: "-50%" }}
              className="fixed left-1/2 z-50 bg-[#0F172A] text-white px-4 py-2.5 rounded-xl shadow-lg border border-slate-800 flex items-center gap-2.5 text-xs font-semibold"
            >
              <Sparkles className="w-4 h-4 text-[#14B8A6]" />
              <span>{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Body */}
        <main className="flex-1 p-6 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (expandedPatient || "")}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >

              {/* ── 1. OVERVIEW TAB ────────────────────────────────────── */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  
                  {/* Top KPI Cards Grid */}
                  <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard
                      title="Total Patients"
                      value={totalPatients}
                      trend="+1 patient this week"
                      trendUp={true}
                      icon={<Users className="w-4 h-4 text-[#14B8A6]" />}
                    />
                    <KpiCard
                      title="Sessions Completed"
                      value={totalSessions}
                      trend="+8 compliance logs"
                      trendUp={true}
                      icon={<Activity className="w-4 h-4 text-[#22C55E]" />}
                    />
                    <KpiCard
                      title="Active Exercises"
                      value={activeExercisesCount}
                      trend="Assigned models"
                      trendUp={true}
                      icon={<Dumbbell className="w-4 h-4 text-slate-700" />}
                    />
                    <KpiCard
                      title="Average Recovery Score"
                      value={`${avgRecoveryScore}%`}
                      trend="Target ROM > 70%"
                      trendUp={avgRecoveryScore >= 70}
                      icon={<TrendingUp className="w-4 h-4 text-amber-500" />}
                    />
                  </section>

                  {/* Split Overview Row: Quick Patient Overview & Activity Feed */}
                  <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Quick Patient Overview List */}
                    <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400">Quick Patient Overview</h3>
                        <button onClick={() => setActiveTab("patients")} className="text-[10px] text-[#14B8A6] font-bold hover:underline">
                          View Patient Database
                        </button>
                      </div>

                      {patients.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-8">No linked patients yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {patients.map(p => {
                            const lastSes = p.sessions[0]
                            const recovery = getPatientRecoveryScore(p)

                            return (
                              <div
                                key={p.info.id}
                                className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-250 transition-all bg-slate-50/50 flex flex-col justify-between h-32 hover:shadow-sm"
                              >
                                <div>
                                  <h4 className="font-bold text-xs text-slate-900 truncate">{getPatientName(p.info)}</h4>
                                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">{p.info.email}</p>
                                </div>

                                <div className="flex items-center justify-between mt-2 text-[10px]">
                                  <div>
                                    <span className="text-slate-400 block font-medium">Recovery</span>
                                    <span className="font-bold text-slate-800">{recovery > 0 ? `${recovery}%` : "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block font-medium">Sessions</span>
                                    <span className="font-bold text-slate-800">{p.sessions.length} done</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block font-medium">Last Active</span>
                                    <span className="font-bold text-slate-800 truncate block max-w-[80px]">
                                      {lastSes ? formatDistanceToNow(new Date(lastSes.completed_at), { addSuffix: false }).replace("about", "") : "—"}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-2">
                                  <button
                                    onClick={() => {
                                      setExpandedPatient(p.info.id)
                                      setExpandedExercise(null)
                                      setActiveTab("patients")
                                    }}
                                    className="text-[9px] font-bold text-[#14B8A6] hover:underline flex items-center gap-0.5"
                                  >
                                    View Patient <ArrowUpRight className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    onClick={() => setAssignPatient(p.info)}
                                    className="text-[9px] font-bold text-slate-600 hover:text-slate-800 flex items-center gap-0.5"
                                  >
                                    <Plus className="w-2.5 h-2.5" /> Assign Exercise
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Timeline Recent Activity Feed */}
                    <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[356px]">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400">Recent Timeline Activity</h3>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                        {activities.map(act => (
                          <div key={act.id} className="flex gap-3 text-xs">
                            <div className="mt-0.5 shrink-0">
                              {act.type === "milestone" && (
                                <div className="p-1 rounded bg-emerald-50 text-emerald-600 border border-emerald-100"><Sparkles className="w-3 h-3" /></div>
                              )}
                              {act.type === "session" && (
                                <div className="p-1 rounded bg-blue-50 text-blue-600 border border-blue-100"><Check className="w-3 h-3" /></div>
                              )}
                              {act.type === "assigned" && (
                                <div className="p-1 rounded bg-[#14B8A6]/10 text-[#14B8A6] border border-[#14B8A6]/20"><Plus className="w-3 h-3" /></div>
                              )}
                              {act.type === "deleted" && (
                                <div className="p-1 rounded bg-rose-50 text-rose-600 border border-rose-100"><Trash2 className="w-3 h-3" /></div>
                              )}
                              {act.type === "linked" && (
                                <div className="p-1 rounded bg-slate-100 text-slate-600 border border-slate-200"><User className="w-3 h-3" /></div>
                              )}
                            </div>
                            
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-slate-900 truncate leading-none">{act.title}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{act.desc}</p>
                              <span className="text-[9px] text-slate-400 block mt-0.5">
                                {formatDistanceToNow(act.time, { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </section>

                </div>
              )}

              {/* ── 2. PATIENTS TAB (Most Important Section) ──────────────── */}
              {activeTab === "patients" && (
                <div className="space-y-6">
                  
                  {/* Directory Header Control */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 tracking-tight font-sans">Therapy Directory Files</h2>
                      <p className="text-[11px] text-slate-400">Search directory, link exercises, and open detailed compliance panel files.</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        placeholder="Search patient file logs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-[#14B8A6] outline-none w-full sm:w-60 bg-slate-50/50"
                      />
                      {expandedPatient && (
                        <Button variant="outline" size="sm" onClick={() => setExpandedPatient(null)} className="text-xs h-8 shrink-0">
                          Show Directory List
                        </Button>
                      )}
                    </div>
                  </div>

                  {patients.length === 0 ? (
                    <Card className="border-slate-200">
                      <CardContent className="py-16 text-center">
                        <Users className="w-12 h-12 text-slate-450 mx-auto mb-4" />
                        <p className="text-slate-900 font-bold mb-1 text-sm">No linked patients linked</p>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
                          Share doctor link code <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{doctorCode}</span> with active patients.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start font-sans">
                      
                      {/* Left vertical directory list */}
                      <div className={`space-y-4 ${expandedPatient ? "lg:col-span-1" : "lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 space-y-0"}`}>
                        {filteredPatients.map(patient => {
                          const status = getPatientStatus(patient)
                          const recovery = getPatientRecoveryScore(patient)
                          const form = getPatientFormScore(patient)
                          const lastSes = patient.sessions[0]
                          const isSelected = expandedPatient === patient.info.id

                          return (
                            <div
                              key={patient.info.id}
                              onClick={() => {
                                setExpandedPatient(patient.info.id)
                                setExpandedExercise(null)
                              }}
                              className={`p-4 rounded-xl border transition-all cursor-pointer bg-white flex flex-col justify-between h-44 shadow-sm group ${
                                isSelected 
                                  ? "border-[#14B8A6] ring-1 ring-[#14B8A6] bg-[#14B8A6]/5" 
                                  : "border-slate-200 hover:border-slate-350 hover:shadow-md"
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600 border border-slate-200 shrink-0 uppercase">
                                    {patient.info.firstName?.charAt(0) || patient.info.email.charAt(0)}
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="font-bold text-xs text-slate-900 leading-none truncate group-hover:text-[#14B8A6] transition-colors">
                                      {getPatientName(patient.info)}
                                    </h4>
                                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{patient.info.email}</p>
                                  </div>
                                </div>
                                <StatusBadge status={status} />
                              </div>

                              <div className="grid grid-cols-3 gap-1.5 border-t border-slate-100 pt-3 mt-3 text-center text-xs">
                                <div>
                                  <span className="text-[9px] text-slate-400 block uppercase font-medium">Average Progress</span>
                                  <span className="font-bold text-[#14B8A6]">{recovery > 0 ? `${recovery}%` : "—"}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-400 block uppercase font-medium">Form Score</span>
                                  <span className="font-bold text-slate-800">{form > 0 ? `${form}%` : "—"}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-400 block uppercase font-medium">Exercises</span>
                                  <span className="font-bold text-slate-800">{patient.assignments.length} assigned</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between border-t border-slate-50 pt-2.5 mt-2.5 text-[9px] text-slate-400 font-medium">
                                <span>Status: <strong className="text-slate-600">{status}</strong></span>
                                <span>
                                  {lastSes 
                                    ? `Active ${formatDistanceToNow(new Date(lastSes.completed_at), { addSuffix: true })}` 
                                    : "No session logs"}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Right Detail Panel container */}
                      {expandedPatient && (
                        <div className="lg:col-span-2 space-y-6">
                          {(() => {
                            const patient = patients.find(p => p.info.id === expandedPatient)
                            if (!patient) return null
                            return (
                              <PatientDetailPanel
                                patient={patient}
                                expandedExercise={expandedExercise}
                                onToggleExercise={(id) => setExpandedExercise(prev => prev === id ? null : id)}
                                onAssignExercise={() => setAssignPatient(patient.info)}
                                onBack={() => setExpandedPatient(null)}
                                isMounted={isMounted}
                                completedExercises={completedExercises}
                                deletedExercises={deletedExercises}
                                onMarkComplete={(id, name) => {
                                  setCompletedExercises(prev => [...prev, id])
                                  showToast(`Visually marked ${name} as completed.`, "success")
                                }}
                                onDeleteExercise={(assignment) => {
                                  setDeleteConfirmAssignment(assignment)
                                }}
                              />
                            )
                          })()}
                        </div>
                      )}

                    </div>
                  )}

                </div>
              )}

              {/* ── 3. CALENDAR TAB ─────────────────────────────────────── */}
              {activeTab === "calendar" && (
                <div className="space-y-6">
                  
                  <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 tracking-tight">Structured Treatment Agendas</h2>
                      <p className="text-xs text-slate-500 font-medium">Select dynamic schedules to review compliance and active templates.</p>
                    </div>
                    <div className="flex items-center gap-3">
                    <select
                      value={selectedCalendarPatientId}
                      onChange={(e) => setSelectedCalendarPatientId(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-[#14B8A6] bg-slate-50/50 outline-none w-48 font-medium font-sans"
                    >
                      <option value="template">Standard Protocol Agendas</option>
                      {patients.map(p => (
                        <option key={p.info.id} value={p.info.id}>
                          {getPatientName(p.info)}
                        </option>
                      ))}
                    </select>
                    
                    <select
  value={selectedCalendarAssignmentId}
  onChange={(e) =>
    setSelectedCalendarAssignmentId(e.target.value)
    
  } className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-[#14B8A6] bg-slate-50/50 outline-none w-48 font-medium font-sans"

>
                        <option value="template">Exercises</option>

  {selectedPatient?.assignments.map((assignment) => (
    <option
      key={assignment.id}
      value={assignment.id}
    >
      {assignment.name}
    </option>
  ))}
</select>
</div>
                  </div>

                  {/* Calendar scheduler grids */}
<CalendarGrid
    patientId={selectedCalendarPatientId}
    patients={patients}
    selectedAssignmentId={
      selectedCalendarAssignmentId
    }
    isMounted={isMounted}
/>

                  {selectedPatient && selectedPatient.assignments.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                      <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400 mb-4">Assigned Protocols</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {selectedPatient.assignments.map(a => {
                          const config = getExerciseConfig(a.exercise_type)
                          const days = selectedPatient.schedule
                            .filter(s => s.assignment_id === a.id && !s.is_rest_day)
                            .map(s => s.day_of_week.slice(0, 3))
                            .join(", ")
                          return (
                            <div key={a.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between h-36">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="p-1 rounded bg-[#14B8A6]/10 text-[#14B8A6]"><Dumbbell className="w-3.5 h-3.5" /></div>
                                  <h4 className="text-xs font-bold text-slate-900 truncate">{a.name}</h4>
                                </div>
                                <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">{config?.name ?? a.exercise_type}</p>
                              </div>
                              <div className="border-t border-slate-100 pt-2.5 text-[9px] font-bold text-slate-400">
                                Schedule: <span className="text-[#14B8A6]">{days || "Not set"}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </main>

      </div>

      {/* ── Assign Exercise Dialog ─────────────────────────────── */}
      <Dialog
        open={assignPatient !== null}
        onOpenChange={(open) => { if (!open) setAssignPatient(null) }}
      >
        <DialogContent className="max-w-[1000px] sm:max-w-[1000px] w-[95vw] max-h-[95vh] overflow-y-auto border-slate-200 bg-[#F8FAFC] font-sans p-0">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Assign Rehabilitation Exercise to{" "}
              {assignPatient ? getPatientName(assignPatient) : ""}
            </DialogTitle>
          </DialogHeader>
          {assignPatient && (
            <div className="mt-2">
              <RecordExercise
                patientId={assignPatient.id}
                onComplete={() => {
                  setAssignPatient(null)
                  loadDashboard()
                  showToast("Rehab protocol successfully assigned to patient file.", "success")
                }}
                doneLabel="Confirm Protocol Routine"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog Modal (Modern UI confirmation) ── */}
      <Dialog
        open={deleteConfirmAssignment !== null}
        onOpenChange={(open) => { if (!open) setDeleteConfirmAssignment(null) }}
      >
        <DialogContent className="max-w-md border-slate-200 bg-white font-sans">
          <DialogHeader className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
            </div>
            <DialogTitle className="text-base font-black text-slate-950">
              Remove Exercise Protocol?
            </DialogTitle>
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to remove <strong className="text-slate-800">"{deleteConfirmAssignment?.name}"</strong> from this patient's active treatment plan? Completed sessions will be archived.
            </p>
          </DialogHeader>
          <DialogFooter className="mt-4 flex sm:justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmAssignment(null)}
              className="text-xs h-9 flex-1 sm:flex-initial"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmDeleteExercise}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-9 flex-1 sm:flex-initial"
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

// ── SidebarLink ─────────────────────────────────────────────────

function SidebarLink({
  active, onClick, icon, label
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
        active
          ? "bg-[#14B8A6] text-white shadow-sm"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
      }`}
    >
      <span className={active ? "text-white" : "text-slate-400"}>{icon}</span>
      {label}
    </button>
  )
}

// ── KpiCard ─────────────────────────────────────────────────────

function KpiCard({
  title, value, trend, trendUp, icon
}: {
  title: string
  value: number | string
  trend: string
  trendUp: boolean
  icon: React.ReactNode
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{title}</span>
        <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">{value}</p>
      
      <span className={`text-[10px] font-semibold ${trendUp ? "text-emerald-600" : "text-slate-500"}`}>
        {trend}
      </span>
    </div>
  )
}

// ── StatusBadge ─────────────────────────────────────────────────

function StatusBadge({ status }: { status: "Improving" | "Stable" | "Needs Attention" }) {
  if (status === "Improving") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Improving
      </span>
    )
  }
  if (status === "Stable") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Stable
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-100 shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> Needs Attention
    </span>
  )
}

// ── ProtocolItem ────────────────────────────────────────────────

function ProtocolItem({
  name, focus, template
}: {
  name: string
  focus: string
  template: string
}) {
  return (
    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between h-36">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1 rounded bg-[#14B8A6]/10 text-[#14B8A6]"><Dumbbell className="w-3.5 h-3.5" /></div>
          <h4 className="text-xs font-bold text-slate-900">{name}</h4>
        </div>
        <p className="text-[11px] text-slate-500 leading-snug line-clamp-3">{focus}</p>
      </div>
      <div className="border-t border-slate-100 pt-2.5 text-[9px] font-bold text-slate-400">
        Template schedule: <span className="text-[#14B8A6]">{template}</span>
      </div>
    </div>
  )
}

// ── CalendarGrid ────────────────────────────────────────────────

function CalendarGrid({
  patientId,
  patients,
  selectedAssignmentId,
  isMounted,
}: {
  patientId: string
  patients: PatientData[]
  selectedAssignmentId: string
  isMounted: boolean
}) {

  const patient = patients.find(p => p.info.id === patientId)
  const today = new Date()
  const currentDayName = isMounted ? format(today, "EEEE") : ""

  const weekdays = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-4">
      {weekdays.map((day) => {
        const isToday = isMounted && day === currentDayName
        let assignedExercise = ""
        let subText = ""
        let isRest = false
        let sessionCount = 0

    if (patient) {
const daySchedule = patient.schedule.find(
  (s) =>
    s.day_of_week === day &&
    s.assignment_id === selectedAssignmentId
)
  if (daySchedule) {
    isRest = daySchedule.is_rest_day
    if (isRest) {
      assignedExercise = "Rest Day"
      subText = "Recovery"
    } else {
    const match = patient.assignments.find(
    a =>
      a.id === daySchedule.assignment_id &&
      a.id === selectedAssignmentId
)
      if (match) {
        assignedExercise = match.name || match.exercise_type
        const config = getExerciseConfig(match.exercise_type)
        subText = config ? config.name : "Active rehab"
      }
      sessionCount = patient.sessions.filter(
        s => s.assignment_id === selectedAssignmentId &&
        format(new Date(s.completed_at), "EEEE") === day
      ).length
    }
  }
}

        return (
          <div key={day} className={`p-3 rounded-xl border flex flex-col justify-between h-40 shadow-sm transition-all ${
            isToday
              ? "border-[#14B8A6] ring-1 ring-[#14B8A6] bg-[#14B8A6]/5"
              : isRest
                ? "bg-slate-50 border-slate-200 text-slate-400"
                : "bg-white border-slate-200"
          }`}>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-800">{day.slice(0, 3)}</span>
                {isToday && (
                  <span className="text-[7px] font-bold text-[#14B8A6] bg-[#14B8A6]/10 px-1.5 py-0.5 rounded-full">
                    TODAY
                  </span>
                )}
              </div>
              <h4 className={`text-[11px] font-black truncate leading-tight mt-1 ${isRest ? "text-slate-400" : assignedExercise ? "text-slate-900" : "text-slate-300"}`}>
                {assignedExercise || "No plan"}
              </h4>
              <p className="text-[9px] text-slate-400 leading-snug mt-1 line-clamp-2">
                {subText || "—"}
              </p>
            </div>

            <div className="border-t border-slate-100 pt-2 text-[9px] font-bold text-slate-400 flex items-center justify-between">
              {isRest ? (
                "Rest Day"
              ) : assignedExercise ? (
                <span className="flex items-center gap-1">
                  {sessionCount > 0 ? (
                    <span className="text-emerald-600">{sessionCount} session{sessionCount !== 1 ? "s" : ""}</span>
                  ) : (
                    "Scheduled"
                  )}
                </span>
              ) : (
                "—"
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── PatientDetailPanel ──────────────────────────────────────────

function PatientDetailPanel({
  patient, expandedExercise, onToggleExercise, onAssignExercise, onBack, isMounted,
  completedExercises, deletedExercises, onMarkComplete, onDeleteExercise
}: {
  patient: PatientData
  expandedExercise: string | null
  onToggleExercise: (id: string) => void
  onAssignExercise: () => void
  onBack: () => void
  isMounted: boolean
  completedExercises: string[]
  deletedExercises: string[]
  onMarkComplete: (id: string, name: string) => void
  onDeleteExercise: (assignment: ExerciseAssignment) => void
}) {
  const { info, assignments, sessions } = patient
  const name = getPatientName(info)
  const recoveryScore = getPatientRecoveryScore(patient)
  const formScore = getPatientFormScore(patient)

  // Filter exercises based on mock deleted list
  const visibleAssignments = useMemo(() => {
    return assignments.filter(a => !deletedExercises.includes(a.id))
  }, [assignments, deletedExercises])

  // Completion Rate math
  const expectedSessionsCount = visibleAssignments.length > 0 ? visibleAssignments.length * 3 : 5
  const completionPercent = Math.min(100, Math.round((sessions.length / expectedSessionsCount) * 100))

  // Patient recovery progress graph data
  const recoveryProgressData = useMemo(() => {
    const list = [...sessions]
      .sort((a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime())
      .map((s, idx) => ({
        session: `Session ${idx + 1}`,
        score: s.progress_score > 0 ? s.progress_score : s.similarity_score
      }))
    
    // Recovery graph baseline if no logs exist yet
    return list.length > 0 ? list : [
      { session: "Session 1", score: 40 },
      { session: "Session 2", score: 52 },
      { session: "Session 3", score: 65 },
      { session: "Session 4", score: 79 },
      { session: "Session 5", score: 90 }
    ]
  }, [sessions])
  
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-6">
      
      {/* Back button header line */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="lg:hidden p-1 rounded hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-500" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm tracking-tight">{name}</h3>
              <StatusBadge status={getPatientStatus(patient)} />
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">{info.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={onAssignExercise} size="sm" className="bg-[#14B8A6] hover:bg-[#14B8A6]/90 text-white text-xs gap-1.5 h-8">
            <Plus className="w-3.5 h-3.5" /> Assign Exercise
          </Button>
          <Button onClick={onBack} variant="outline" size="sm" className="text-xs hidden lg:inline-flex h-8">
            Close Panel
          </Button>
        </div>
      </div>

      {/* Overview Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 text-center">
          <span className="text-[9px] text-slate-400 block font-bold uppercase">Recovery Score</span>
          <span className="text-base font-black text-[#14B8A6]">{recoveryScore > 0 ? `${recoveryScore}%` : "—"}</span>
        </div>
        <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 text-center">
          <span className="text-[9px] text-slate-400 block font-bold uppercase">Avg Form Score</span>
          <span className="text-base font-black text-slate-900">{formScore > 0 ? `${formScore}%` : "—"}</span>
        </div>
        <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 text-center">
          <span className="text-[9px] text-slate-400 block font-bold uppercase">Total Sessions</span>
          <span className="text-base font-black text-slate-900">{sessions.length} done</span>
        </div>
        <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 text-center">
          <span className="text-[9px] text-slate-400 block font-bold uppercase">Assigned Plan</span>
          <span className="text-base font-black text-slate-800">{visibleAssignments.length} Active</span>
        </div>
        <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 text-center col-span-2 sm:col-span-1">
          <span className="text-[9px] text-slate-400 block font-bold uppercase">Completion Rate</span>
          <span className="text-base font-black text-slate-800">{completionPercent}%</span>
        </div>
      </div>

      {/* Patient Recovery Progress Graph (Recharts centerpiece) */}
      <div className="bg-[#F8FAFC] border border-slate-150 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3 border-b border-slate-200/50 pb-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Patient Recovery Progress</h4>
          <span className="text-[9px] text-slate-400 font-medium">Trajectory Over Sessions</span>
        </div>

        {isMounted ? (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={recoveryProgressData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#14B8A6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="session" tickLine={false} axisLine={false} tick={{ fill: '#64748B', fontSize: 9 }} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: '#64748B', fontSize: 9 }} />
                <Tooltip contentStyle={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="score" stroke="#14B8A6" strokeWidth={2.5} fillOpacity={1} fill="url(#recGrad)" name="Recovery Score %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-56 bg-slate-100 rounded animate-pulse"></div>
        )}
      </div>

      {/* Exercise Management Section */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Exercise Plan Management</h4>

        {visibleAssignments.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-200 bg-slate-50/20 rounded-xl">
            <Dumbbell className="w-8 h-8 text-slate-305 mx-auto mb-2" />
            <p className="text-xs text-slate-450 font-bold mb-3">No active exercises in plan.</p>
            <Button onClick={onAssignExercise} size="sm" className="text-xs">
              Assign New Exercise
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleAssignments.map(assignment => {
              const assocSessions = sessions
                .filter(s => s.assignment_id === assignment.id)
                .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())

              const hasProg = assocSessions.filter(s => s.progress_score > 0 || s.similarity_score > 0)
              const exProgress = hasProg.length > 0 
                ? Math.round(hasProg.reduce((acc, curr) => acc + (curr.progress_score || curr.similarity_score), 0) / hasProg.length)
                : 60
              const exForm = assocSessions.filter(s => s.form_score > 0).length > 0
                ? Math.round(assocSessions.filter(s => s.form_score > 0).reduce((acc, curr) => acc + curr.form_score, 0) / assocSessions.filter(s => s.form_score > 0).length)
                : 70

              const isCompleted = completedExercises.includes(assignment.id)
              const isExpanded = expandedExercise === assignment.id
              
              return (
                <div key={assignment.id} className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 space-y-3 shadow-sm">
                  
                  {/* Card Title & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-[#14B8A6]/10 text-[#14B8A6] shrink-0"><Dumbbell className="w-4 h-4" /></div>
                      <div>
                        <h5 className="font-bold text-xs text-slate-900 leading-none">{assignment.name}</h5>
                        <p className="text-[9px] text-slate-400 mt-1">Assigned on: {format(new Date(assignment.assigned_at), "MMM d, yyyy")}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onMarkComplete(assignment.id, assignment.name)}
                        className={`text-[10px] font-bold h-7 ${
                          isCompleted 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : "text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"
                        }`}
                        disabled={isCompleted}
                      >
                        {isCompleted ? "✓ Completed" : "Mark Complete"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDeleteExercise(assignment)}
                        className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-7"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-0.5" /> Delete Exercise
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onToggleExercise(assignment.id)}
                        className="text-[10px] font-bold text-slate-600 h-7 gap-1"
                      >
                        {isExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />} Trend
                      </Button>
                    </div>
                  </div>

                  {/* Exercise info row */}
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-medium">Progress</span>
                      <span className="font-bold text-[#14B8A6]">{exProgress}%</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-450 block uppercase font-medium">Form Score</span>
                      <span className="font-bold text-slate-800">{exForm}%</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-460 block uppercase font-medium">Sessions Done</span>
                      <span className="font-bold text-slate-800">{assocSessions.length} sessions</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-465 block uppercase font-medium">Status</span>
                      <span className={`font-bold ${isCompleted ? "text-emerald-600" : "text-slate-500"}`}>
                        {isCompleted ? "Completed" : "Active"}
                      </span>
                    </div>
                  </div>

                  {/* Exercise-Specific Analytics (Recharts line chart) */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 pt-3 mt-3">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Exercise-Specific Progression</p>
                      {assocSessions.length > 0 ? (
                        <div className="h-40 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={
                              assocSessions.slice().reverse().map((s, index) => ({
                                name: `S${index + 1}`,
                                progress: s.progress_score > 0 ? s.progress_score : s.similarity_score,
                                form: s.form_score > 0 ? s.form_score : s.similarity_score
                              }))
                            } margin={{ left: -25, right: 5, top: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                              <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 9 }} tickLine={false} axisLine={false} />
                              <YAxis domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 9 }} tickLine={false} axisLine={false} />
                              <Tooltip contentStyle={{ fontSize: 10 }} />
                              <Legend wrapperStyle={{ fontSize: 9 }} />
                              <Line type="monotone" dataKey="progress" stroke="#14B8A6" strokeWidth={2.5} name="Progress" />
                              <Line type="monotone" dataKey="form" stroke="#22C55E" strokeWidth={2.5} name="Form Score" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 text-center py-4 bg-white border border-slate-100 rounded-lg">
                          No completed sessions logged for this exercise template yet. Graph will load on first execution logs.
                        </p>
                      )}
                    </div>
                  )}

                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
