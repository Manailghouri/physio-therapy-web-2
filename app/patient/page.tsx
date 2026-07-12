"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { supabase } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { getExerciseConfig } from "@/lib/exercise-config"
import { formatDistanceToNow, format } from "date-fns"
import { 
  Dumbbell, 
  Play, 
  Loader2, 
  Activity, 
  TrendingUp, 
  Calendar as CalendarIcon, 
  LogOut, 
  ShieldAlert, 
  Menu, 
  X, 
  Sparkles,
  ArrowUpRight,
  CheckCircle2
} from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts"
import { motion, AnimatePresence } from "framer-motion"

// ── Types ──────────────────────────────────────────────────────

interface Assignment {
  id: string
  name: string
  exercise_type: string
  assigned_at: string
}

interface SessionSummary {
  assignment_id: string
  count: number
  avg_score: number
  last_completed: string
}

// ── Main Patient Dashboard ──────────────────────────────────────

export default function PatientPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [doctorName, setDoctorName] = useState<string | null>(null)
  const [hasDoctor, setHasDoctor] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Tabs: "overview" | "exercises" | "calendar"
  const [activeTab, setActiveTab] = useState<string>("overview")

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [sessionSummaries, setSessionSummaries] = useState<Map<string, SessionSummary>>(new Map())
  const [sessions, setSessions] = useState<any[]>([])
  const [schedule, setSchedule] = useState<any[]>([])
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("")

  const [codeInput, setCodeInput] = useState("")
  const [linkError, setLinkError] = useState("")
  const [linking, setLinking] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    async function loadPatient() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace("/login")
        return
      }
      setEmail(session.user.email ?? null)

      // Fetch patient's doctor_id
      const { data: patient } = await supabase
        .from("patients")
        .select("*")
        .eq("id", session.user.id)
        .single()

      if (patient?.doctor_id) {
        const { data: doctorUser } = await supabase
          .from("users")
          .select("first_name, last_name")
          .eq("id", patient.doctor_id)
          .single()

        const name = doctorUser
          ? [doctorUser.first_name, doctorUser.last_name].filter(Boolean).join(" ")
          : ""
        setDoctorName(name || "Your Doctor")
        setHasDoctor(true)

        const { data: exerciseRows } = await supabase
          .from("exercise_assignments")
          .select("id, name, exercise_type, assigned_at")
          .eq("patient_id", session.user.id)
          .order("assigned_at", { ascending: false })
          console.log("Logged in User:", session.user.id)

const { data: scheduleRows, error: scheduleError } = await supabase
  .from("exercise_schedule")
  .select("*")
  .eq("patient_id", session.user.id)

console.log("Schedule Rows:", scheduleRows)
console.log("Schedule Error:", scheduleError)

if (scheduleRows) {
  setSchedule(scheduleRows)
  console.log("Schedule:", scheduleRows)
}

       if (exerciseRows && exerciseRows.length > 0) {
  setAssignments(exerciseRows)

  // Default selected exercise
  setSelectedAssignmentId(exerciseRows[0].id)
          console.log("Assignments:", exerciseRows)

          const { data: sessionRows } = await supabase
            .from("exercise_sessions")
            .select("assignment_id, similarity_score, completed_at")
            .eq("patient_id", session.user.id)
            .order("completed_at", { ascending: false })

          if (sessionRows) {
            setSessions(sessionRows)
            const summaryMap = new Map<string, SessionSummary>()
            for (const s of sessionRows) {
              const existing = summaryMap.get(s.assignment_id)
              if (existing) {
                existing.count++
                existing.avg_score =
                  (existing.avg_score * (existing.count - 1) + s.similarity_score) / existing.count
              } else {
                summaryMap.set(s.assignment_id, {
                  assignment_id: s.assignment_id,
                  count: 1,
                  avg_score: s.similarity_score,
                  last_completed: s.completed_at,
                })
              }
            }
            setSessionSummaries(summaryMap)
          }
        }
      }

      setLoading(false)
    }
    loadPatient()
  }, [router])

  const handleLinkDoctor = async (e: React.FormEvent) => {
    e.preventDefault()
    setLinkError("")
    setLinking(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setLinkError("Session expired. Please log in again.")
      setLinking(false)
      return
    }

    const res = await fetch("/api/patient/link-doctor", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ doctor_code: codeInput }),
    })

    const data = await res.json()
    setLinking(false)

    if (!res.ok) {
      setLinkError(data.error || "Failed to link doctor")
      return
    }

    setDoctorName(data.doctor_name ?? "your doctor")
    setHasDoctor(true)
    setCodeInput("")
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  // ── Calculated Metrics ──────────────────────────────────────────

  const totalSessions = sessions.length
  
  const avgRecoveryScore = totalSessions > 0
    ? Math.round(sessions.reduce((acc, s) => acc + s.similarity_score, 0) / totalSessions)
    : 0

  let recoveryStatus = "Needs Attention"
  let recoveryStatusColor = "text-slate-500 bg-slate-50 border-slate-200"

  if (totalSessions > 0) {
    if (avgRecoveryScore >= 80) {
      recoveryStatus = "Excellent Progress"
      recoveryStatusColor = "text-teal-700 bg-teal-50 border-teal-100"
    } else if (avgRecoveryScore >= 60) {
      recoveryStatus = "Good Progress"
      recoveryStatusColor = "text-slate-600 bg-slate-50 border-slate-200"
    }
  } else if (assignments.length > 0) {
    recoveryStatus = "Get Started"
    recoveryStatusColor = "text-slate-500 bg-slate-50 border-slate-200"
  } else {
    recoveryStatus = "Awaiting Setup"
    recoveryStatusColor = "text-slate-400 bg-slate-50 border-slate-200"
  }

  // Trend data for Recharts Graph (Trajectory over sessions)
  const trendData = [...sessions]
    .reverse()
    .map((s, index) => ({
      session: `Ses ${index + 1}`,
      score: Math.round(s.similarity_score),
      date: format(new Date(s.completed_at), "MMM d")
    }))

  // ── Today's Agenda ──────────────────────────────────────────────
  const todayName = isMounted ? format(new Date(), "EEEE") : ""
  const todayDateStr = isMounted ? format(new Date(), "yyyy-MM-dd") : ""
  const todaySchedule = schedule.filter(
    (s) => s.day_of_week === todayName && !s.is_rest_day
  )
  const todayExercises = todaySchedule
    .map((s) => {
      const assignment = assignments.find((a) => a.id === s.assignment_id)
      if (!assignment) return null
      const completedToday = sessions.some(
        (ses) =>
          ses.assignment_id === assignment.id &&
          format(new Date(ses.completed_at), "yyyy-MM-dd") === todayDateStr
      )
      return { assignment, completedToday }
    })
    .filter(Boolean) as { assignment: Assignment; completedToday: boolean }[]
  const allDoneToday = todayExercises.length > 0 && todayExercises.every((e) => e.completedToday)
  const isRestDay = isMounted && todaySchedule.length === 0 && todayName !== ""

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
            <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase block -mt-0.5">Patient Dashboard</span>
          </div>
        </div>

        {/* Sidebar Nav (Overview, My Exercises, Calendar) */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          <SidebarLink active={activeTab === "overview"} onClick={() => setActiveTab("overview")} icon={<Activity className="w-4 h-4" />} label="Overview" />
          <SidebarLink active={activeTab === "exercises"} onClick={() => setActiveTab("exercises")} icon={<Dumbbell className="w-4 h-4" />} label="My Exercises" />
          <SidebarLink active={activeTab === "calendar"} onClick={() => setActiveTab("calendar")} icon={<CalendarIcon className="w-4 h-4" />} label="Calendar" />
        </nav>

        {/* User profile */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
              {email ? email.substring(0, 2) : "PT"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{email}</p>
              <p className="text-[10px] text-slate-400">Patient User</p>
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
                    <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase block -mt-0.5">Patient Dashboard</span>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 px-4 py-6 space-y-1">
                <SidebarLink active={activeTab === "overview"} onClick={() => { setActiveTab("overview"); setSidebarOpen(false) }} icon={<Activity className="w-4 h-4" />} label="Overview" />
                <SidebarLink active={activeTab === "exercises"} onClick={() => { setActiveTab("exercises"); setSidebarOpen(false) }} icon={<Dumbbell className="w-4 h-4" />} label="My Exercises" />
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
                <h1 className="text-base font-black text-slate-900 tracking-tight leading-none animate-fade-in">
                  Patient Dashboard
                </h1>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  Track your rehabilitation journey and complete your assigned recovery exercises.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {doctorName && hasDoctor && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
                  <span className="text-[9px] text-slate-400 uppercase">Therapist:</span>
                  <span className="font-bold text-slate-800">{doctorName}</span>
                </div>
              )}

              <div className="w-8 h-8 rounded-full bg-[#14B8A6]/10 text-[#14B8A6] flex items-center justify-center font-bold text-xs border border-[#14B8A6]/20 uppercase shrink-0">
                {email ? email.charAt(0) : "P"}
              </div>
            </div>

          </div>
        </header>

        {/* Main Content Body */}
        <main className="flex-1 p-6 space-y-6">
          {hasDoctor ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >

                {/* ── 1. OVERVIEW TAB ────────────────────────────────────── */}
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    
                    {/* Top KPI Cards Grid */}
                    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <KpiCard
                        title="Assigned Exercises"
                        value={assignments.length}
                        trend="Active rehab plans"
                        trendUp={true}
                        icon={<Dumbbell className="w-4 h-4 text-slate-700" />}
                      />
                      <KpiCard
                        title="Sessions Completed"
                        value={totalSessions}
                        trend="Fidelity logs verified"
                        trendUp={true}
                        icon={<Activity className="w-4 h-4 text-[#14B8A6]" />}
                      />
                      <KpiCard
                        title="Average Recovery Score"
                        value={`${avgRecoveryScore}%`}
                        trend="Compliance target > 70%"
                        trendUp={avgRecoveryScore >= 70}
                        icon={<TrendingUp className="w-4 h-4 text-slate-700" />}
                      />
                      <KpiCard
                        title="Recovery Progress"
                        value={recoveryStatus}
                        trend="Trajectory level status"
                        trendUp={true}
                        icon={<Sparkles className="w-4 h-4 text-[#14B8A6]" />}
                      />
                    </section>

                    {/* ── Today's Agenda ─────────────────────────────────── */}
                    {isMounted && (
                      <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div>
                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                              Your Agenda for {isMounted ? format(new Date(), "EEEE") : ""}
                            </h3>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {isMounted ? format(new Date(), "MMMM d, yyyy") : ""}
                            </p>
                          </div>
                          {allDoneToday && (
                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Done for today!
                            </span>
                          )}
                        </div>

                        {isRestDay ? (
                          <div className="flex flex-col items-center justify-center py-10 text-center">
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                              <Sparkles className="w-6 h-6 text-slate-400" />
                            </div>
                            <p className="text-sm font-bold text-slate-700">Rest Day</p>
                            <p className="text-xs text-slate-400 mt-1">No exercises scheduled for today. Focus on recovery.</p>
                          </div>
                        ) : todayExercises.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 text-center">
                            <Dumbbell className="w-8 h-8 text-slate-300 mb-2" />
                            <p className="text-xs font-bold text-slate-700">No exercises assigned yet</p>
                            <p className="text-[10px] text-slate-400 mt-1">Your physiotherapist will set up your schedule soon.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {todayExercises.map(({ assignment, completedToday }) => {
                              const config = getExerciseConfig(assignment.exercise_type)
                              return (
                                <div
                                  key={assignment.id}
                                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                                    completedToday
                                      ? "bg-emerald-50/50 border-emerald-200"
                                      : "bg-slate-50/50 border-slate-200 hover:border-slate-300"
                                  }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className={`p-2 rounded-lg shrink-0 ${
                                      completedToday
                                        ? "bg-emerald-100 text-emerald-600"
                                        : "bg-[#14B8A6]/10 text-[#14B8A6]"
                                    }`}>
                                      {completedToday
                                        ? <CheckCircle2 className="w-4 h-4" />
                                        : <Dumbbell className="w-4 h-4" />
                                      }
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="text-xs font-bold text-slate-900 truncate">{assignment.name}</h4>
                                      <p className="text-[10px] text-slate-400 font-medium">{config?.name ?? assignment.exercise_type}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0">
                                    {completedToday ? (
                                      <span className="text-[10px] font-bold text-emerald-600">Completed</span>
                                    ) : (
                                      <Link href={`/patient/compare/${assignment.id}`}>
                                        <Button className="bg-[#14B8A6] hover:bg-[#14b8a6]/95 text-white font-bold h-8 text-[10px] rounded-lg flex items-center gap-1 cursor-pointer">
                                          <Play className="w-3 h-3 fill-current" /> Start
                                        </Button>
                                      </Link>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </section>
                    )}

                    {/* Split Row: Recovery Progress Graph & Sidebar Summaries */}
                    <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Left: Recharts centerpiece (70%) */}
                      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Patient Recovery Progress</h3>
                          <span className="text-[9px] text-slate-400 font-medium">Trajectory Over Sessions</span>
                        </div>

                        {totalSessions === 0 ? (
                          <div className="h-72 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                            <TrendingUp className="w-8 h-8 text-slate-300 mb-2" />
                            <p className="text-xs font-bold text-slate-700">No session metrics loaded</p>
                            <p className="text-[10px] text-slate-400 max-w-xs mt-1">
                              Complete your first assigned recovery exercise to populate accuracy progress charts.
                            </p>
                          </div>
                        ) : (
                          <div className="h-72 w-full">
                            {isMounted ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
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
                                  <Area type="monotone" dataKey="score" stroke="#14B8A6" strokeWidth={2.5} fillOpacity={1} fill="url(#recGrad)" name="Accuracy Score %" />
                                </AreaChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="h-72 bg-slate-100 rounded-xl animate-pulse" />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right: Telemetry Sidebars (30%) */}
                      <div className="space-y-6">
                        
                        {/* Recovery Summary Card */}
                        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                          <div className="border-b border-slate-100 pb-3">
                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Recovery Summary</h3>
                            <p className="text-[10px] text-slate-400 mt-1">Rehabilitation telemetry status</p>
                          </div>
                          
                          <div className="space-y-3.5 font-medium">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500 font-semibold">Current Score</span>
                              <span className="font-extrabold text-slate-800">{avgRecoveryScore}%</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500 font-semibold">Completed Sessions</span>
                              <span className="font-extrabold text-slate-800">{totalSessions} Logs</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500 font-semibold">Latest Activity</span>
                              <span className="font-extrabold text-slate-800 truncate block max-w-[140px] text-right">
                                {sessions.length > 0 && isMounted
                                  ? formatDistanceToNow(new Date(sessions[0].completed_at), { addSuffix: true })
                                  : "Never"}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-3">
                              <span className="text-slate-500 font-semibold">Recovery Status</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${recoveryStatusColor}`}>
                                {recoveryStatus}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Connected Doctor Card */}
                        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                          <div className="border-b border-slate-100 pb-3">
                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Your Physiotherapist</h3>
                            <p className="text-[10px] text-slate-400 mt-1">Primary care supervisor</p>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600 border border-slate-200 uppercase shrink-0">
                              {doctorName?.charAt(0)?.toUpperCase() || "D"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-slate-950 truncate leading-none">{doctorName}</p>
                              <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-teal-50 text-teal-700 border border-teal-150">
                                Connected
                              </span>
                            </div>
                          </div>

                          <div className="p-3 bg-slate-50 border border-slate-150 rounded-lg flex justify-between items-center text-[10px] font-bold text-slate-500">
                            <span>Exercises Assigned</span>
                            <span className="text-slate-800">{assignments.length} protocol{assignments.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>

                      </div>

                    </section>

                  </div>
                )}

                {/* ── 2. MY EXERCISES TAB ────────────────────────────────── */}
                {activeTab === "exercises" && (
                  <div className="space-y-6">
                    <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
                      <h2 className="text-sm font-bold text-slate-900 tracking-tight">Active Treatment Protocols</h2>
                      <p className="text-xs text-slate-450 mt-0.5">Perform these exercises as prescribed by your practitioner to record compliance logs.</p>
                    </div>

                    {assignments.length === 0 ? (
                      <Card className="border-slate-200 shadow-sm">
                        <CardContent className="py-16 text-center">
                          <Dumbbell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-900 font-bold mb-1 text-sm">No exercises assigned yet</p>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            Your physiotherapist will configure and assign your targeted exercises shortly.
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {assignments.map(assignment => {
                          const config = getExerciseConfig(assignment.exercise_type)
                          const summary = sessionSummaries.get(assignment.id)
                          const score = summary ? Math.round(summary.avg_score) : 0

                          return (
                            <div key={assignment.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between h-56 transition-all hover:shadow-md">
                              <div className="space-y-3.5">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="space-y-1 min-w-0">
                                    <h3 className="font-bold text-sm text-slate-900 truncate leading-none">{assignment.name}</h3>
                                    <span className="inline-block text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                      {config?.name ?? assignment.exercise_type}
                                    </span>
                                  </div>
                                  <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100 shrink-0">
                                    <Dumbbell className="w-4 h-4 text-slate-600" />
                                  </div>
                                </div>

                                <div className="space-y-2 text-[11px] font-medium text-slate-500">
                                  <div className="flex justify-between items-center">
                                    <span>Assigned Date</span>
                                    <span className="text-slate-800">{format(new Date(assignment.assigned_at), "MMM d, yyyy")}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span>Session Count</span>
                                    <span className="text-slate-800">{summary?.count || 0} session{summary?.count !== 1 ? 's' : ''}</span>
                                  </div>
                                  <div className="space-y-1 pt-1">
                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                      <span>Average Score</span>
                                      <span className="text-slate-800">{score}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-[#14B8A6] rounded-full transition-all duration-300"
                                        style={{ width: `${score}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="pt-3 border-t border-slate-100">
                                <Link href={`/patient/compare/${assignment.id}`} className="block">
                                  <Button className="w-full bg-[#14B8A6] hover:bg-[#14b8a6]/95 text-white font-bold h-9 text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer">
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    Start Exercise
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── 3. CALENDAR TAB ────────────────────────────────────── */}
                {activeTab === "calendar" && (
                  <div className="space-y-6">
                    
                    <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
<div className="flex items-center justify-between">

  <div>
    <h2 className="text-sm font-bold">
     Exercise Scheduling
    </h2>

    <p className="text-xs text-slate-500">
      Track your rehabilitation schedule.
    </p>
  </div>

    <select
    value={selectedAssignmentId}
    onChange={(e) => setSelectedAssignmentId(e.target.value)}
   className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-[#14B8A6] bg-slate-50/50 outline-none w-48 font-medium font-sans"
  >
    {assignments.map((a) => (
      <option key={a.id} value={a.id}>
        {a.name}
      </option>
    ))}
  </select>
</div>                     

 <p className="text-xs text-slate-450 mt-0.5">Highlighting daily routine treatments, completed log counts, and rest schedules.</p>
                    </div>

                    {/* Week-based agenda grid matching Doctor Dashboard style */}
                   <WeeklyCalendarGrid
    assignments={assignments}
    sessions={sessions}
    schedule={schedule}
    selectedAssignmentId={selectedAssignmentId}
    isMounted={isMounted}
/>

                    {assignments.length > 0 && (
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400 mb-4">Assigned Protocols</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {assignments.map(a => {
                            const config = getExerciseConfig(a.exercise_type)
                            const days = schedule
                              .filter(s => s.assignment_id === a.id && !s.is_rest_day)
                              .map(s => s.day_of_week.slice(0, 3))
                              .join(", ")
                            return (
                              <div key={a.id} className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl space-y-1">
                                <div className="flex items-center justify-between font-bold text-slate-900 text-xs">
                                  <span>{a.name}</span>
                                  <span className="text-[9.5px] font-bold text-[#14B8A6] bg-[#14B8A6]/10 px-2 py-0.5 rounded-full">{days || "Not set"}</span>
                                </div>
                                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">{config?.name ?? a.exercise_type}</p>
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
          ) : (
            /* Link Your Doctor Card matching Doctor Dashboard styling closely */
            <div className="max-w-md mx-auto py-16">
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm text-center space-y-6 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#14B8A6]" />
                
                <div className="w-12 h-12 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-[#14B8A6] mx-auto shadow-inner">
                  <ShieldAlert className="w-6 h-6" />
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">Link Your Physiotherapist</h2>
                  <p className="text-xs text-slate-400 font-medium">
                    Enter the clinician code provided by your therapist to active your guidance agenda.
                  </p>
                </div>

                <form onSubmit={handleLinkDoctor} className="space-y-4 text-left">
                  <div className="space-y-1">
                    <label htmlFor="doctorCode" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Doctor Code</label>
                    <Input
                      id="doctorCode"
                      placeholder="e.g. DR-A7X3"
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value)}
                      required
                      className="border-slate-200 focus-visible:ring-[#14B8A6] h-10 text-xs font-medium placeholder:text-slate-300 font-mono tracking-wide"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={linking}
                    className="w-full bg-[#14B8A6] hover:bg-[#14b8a6]/95 text-white font-bold h-10 rounded-lg shadow-sm active:scale-[0.98] transition-all gap-1 text-xs cursor-pointer"
                  >
                    {linking ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Linking Account...
                      </>
                    ) : (
                      "Confirm Referral Code"
                    )}
                  </Button>
                </form>

                {linkError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg border border-rose-100 bg-rose-50 text-rose-600 text-xs font-semibold"
                  >
                    {linkError}
                  </motion.div>
                )}

                <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
                  Need assistance? Contact your care clinic to request your referral code.
                </div>
              </motion.div>
            </div>
          )}
        </main>

      </div>

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
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
        active
          ? "bg-[#14B8A6] text-white shadow-sm font-bold"
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
      
      <span className={`text-[10px] font-semibold ${trendUp ? "text-emerald-600 font-bold" : "text-slate-500"}`}>
        {trend}
      </span>
    </div>
  )
}

// ── WeeklyCalendarGrid ──────────────────────────────────────────
function WeeklyCalendarGrid({
  assignments,
  sessions,
  schedule,
  selectedAssignmentId,
  isMounted,
}: {
  assignments: Assignment[]
  sessions: any[]
  schedule: any[]
  selectedAssignmentId: string
  isMounted: boolean
}) {
  const today = new Date()
  const startOfWeek = new Date(today)
  const dayOfWeek = today.getDay()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  startOfWeek.setDate(today.getDate() + diff)

  const weekdays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return {
      day: format(d, "EEEE"),
      date: format(d, "MMM d"),
      dateStr: format(d, "yyyy-MM-dd"),
    }
  })

  const selectedSchedule = schedule.filter(
    (s) => s.assignment_id === selectedAssignmentId
  )
  const currentDayName = format(today, "EEEE")
  const todayStr = format(today, "yyyy-MM-dd")

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-4">
      {weekdays.map((item) => {
        const isToday = isMounted && item.day === currentDayName
        const daySchedule = selectedSchedule.find(
          (s) => s.day_of_week === item.day
        )
        const isRest = daySchedule?.is_rest_day ?? false
        const isCompleted = sessions.some(
          (s) =>
            s.assignment_id === selectedAssignmentId &&
            format(new Date(s.completed_at), "yyyy-MM-dd") === item.dateStr
        )

        let routineName = "No Exercise Assigned"
        let subText = "No treatment scheduled"

        if (daySchedule) {
          if (isRest) {
            routineName = "Rest Day"
            subText = "Recovery & regeneration"
          } else {
            const assignment = assignments.find(
              (a) => a.id === daySchedule.assignment_id
            )
            if (assignment) {
              routineName = assignment.name
              const config = getExerciseConfig(assignment.exercise_type)
              subText = config ? config.name : "Treatment plan"
            }
          }
        }

        return (
          <div key={item.day} className={`p-4 rounded-xl border flex flex-col justify-between h-44 shadow-sm transition-all ${
            isToday
              ? "border-[#14B8A6] ring-1 ring-[#14B8A6] bg-[#14B8A6]/5"
              : isCompleted
                ? "bg-emerald-50/50 border-emerald-200"
                : isRest
                  ? "bg-slate-50 border-slate-200 text-slate-400"
                  : "bg-white border-slate-200"
          }`}>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-bold ${isRest ? "text-slate-400" : "text-slate-800"}`}>
                  {item.day.slice(0, 3)}
                </span>
                {isToday && (
                  <span className="text-[7px] font-bold text-[#14B8A6] bg-[#14B8A6]/10 px-1.5 py-0.5 rounded-full">
                    TODAY
                  </span>
                )}
              </div>
              <p className={`text-[9px] font-medium mb-2 ${isRest ? "text-slate-300" : "text-slate-400"}`}>
                {item.date}
              </p>
              <h4 className={`text-[11px] font-black truncate leading-tight ${isRest ? "text-slate-400" : "text-slate-900"}`}>
                {routineName}
              </h4>
              <p className="text-[9px] text-slate-400 leading-snug mt-1 line-clamp-2">
                {subText}
              </p>
            </div>

            <div className="border-t border-slate-100 pt-2 text-[9px] font-bold text-slate-400 flex items-center justify-between">
              {isCompleted ? (
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Completed
                </span>
              ) : isRest ? (
                "Rest Day"
              ) : daySchedule ? (
                "Scheduled"
              ) : (
                "No plan"
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── ProtocolItem ───────────────────────────────────────────────

function ProtocolItem({ name, focus, template }: { name: string; focus: string; template: string }) {
  return (
    <div className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl space-y-1">
      <div className="flex items-center justify-between font-bold text-slate-900 text-xs">
        <span>{name}</span>
        <span className="text-[9.5px] font-bold text-[#14B8A6] bg-[#14B8A6]/10 px-2 py-0.5 rounded-full">{template}</span>
      </div>
      <p className="text-[10px] text-slate-500 leading-relaxed font-medium">{focus}</p>
    </div>
  )
}
