"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { 
  Activity, 
  Dumbbell, 
  Award, 
  Shield, 
  Loader2, 
  User, 
  BookOpen, 
  Briefcase, 
  Clock, 
  ChevronRight 
} from "lucide-react"
import { motion } from "framer-motion"

export default function Onboarding() {
  const [role, setRole] = useState("")
  const [form, setForm] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setHasMounted(true)
  }, [])

  // ✅ Get role (Original Logic)
  useEffect(() => {
    const getRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single()

      if (error) console.error(error)

      setRole(data?.role || "")
    }

    getRole()
  }, [])

  // ✅ Submit (Original Logic)
  const handleSubmit = async () => {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    const { error: userError } = await supabase
      .from("users")
      .update({
        first_name: form.first_name,
        last_name: form.last_name,
      })
      .eq("id", user.id)

    if (userError) console.error(userError)

    if (role === "doctor") {
      await supabase
        .from("doctors")
        .upsert({
          id: user.id,
          education: form.education,
          specialization: form.specialization,
          experience: Number(form.experience),
        })
    } else if (role === "patient") {
      await supabase
        .from("patients")
        .upsert({
          id: user.id,
          age: Number(form.age),
          disease: form.disease,
          gender: form.gender,
        })
    }

    setLoading(false)
    router.push("/")
  }

  // ── SKELETON LOADERS (While role is loading / before mount) ────────────────────
  if (!role || !hasMounted) {
    return (
      <div className="flex min-h-screen bg-[#F8FAFC] text-slate-800 antialiased font-sans">
        
        {/* Left branding panel skeleton */}
        <div className="hidden lg:flex lg:w-[45%] bg-[#0F172A] p-12 flex-col justify-between relative overflow-hidden">
          <div className="w-24 h-6 bg-slate-800/80 rounded animate-pulse" />
          <div className="w-64 h-64 bg-slate-800/60 rounded-2xl animate-pulse mx-auto" />
          <div className="space-y-3">
            <div className="w-48 h-6 bg-slate-800/80 rounded animate-pulse" />
            <div className="w-full h-12 bg-slate-800/60 rounded animate-pulse" />
          </div>
        </div>
        
        {/* Right onboarding card skeleton */}
        <div className="w-full lg:w-[55%] flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 space-y-6 animate-pulse">
            <div className="flex justify-between items-center">
              <div className="w-20 h-4 bg-slate-100 rounded" />
              <div className="w-16 h-6 bg-slate-100 rounded-full" />
            </div>
            <div className="space-y-2">
              <div className="w-48 h-6 bg-slate-100 rounded animate-pulse" />
              <div className="w-full h-4 bg-slate-100 rounded" />
            </div>
            <div className="space-y-4">
              <div className="w-full h-10 bg-slate-100 rounded-xl" />
              <div className="w-full h-10 bg-slate-100 rounded-xl" />
              <div className="w-full h-10 bg-slate-100 rounded-xl" />
            </div>
            <div className="w-full h-11 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-800 antialiased font-sans">
      
      {/* ===== LEFT SIDE: BRANDING PANEL (Desktop 45%) ===== */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#0F172A] relative overflow-hidden flex-col justify-between p-12">
        {/* Subtle grid background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        
        {/* Top brand header */}
        <div className="flex items-center gap-2.5 relative z-10">
          <div className="w-8 h-8 rounded-lg bg-[#14B8A6]/20 flex items-center justify-center border border-[#14B8A6]/30">
            <Activity className="w-4 h-4 text-[#14B8A6] animate-pulse" />
          </div>
          <span className="font-extrabold text-white text-lg tracking-tight">PhysioGuide</span>
        </div>

        {/* Center content: Hero image + Floating stats */}
        <div className="relative my-auto flex flex-col items-center justify-center py-12">
          
          <div className="absolute w-72 h-72 rounded-full bg-[#14B8A6]/5 blur-3xl -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          
          <motion.div 
            animate={{ 
              y: [0, -12, 0],
              rotate: [0, 0.5, -0.5, 0]
            }}
            transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
            className="w-72 h-auto opacity-90 drop-shadow-2xl mb-8 relative z-10"
          >
            <img 
              src="/images/hero.png" 
              alt="PhysioGuide Setup" 
              className="w-full h-auto object-contain rounded-2xl"
            />
          </motion.div>

          {/* Floating cards */}
          <div className="absolute inset-0 w-full h-full pointer-events-none z-20">
            
            {/* Card 1: Recovery Tracking */}
            <motion.div 
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.2 }}
              className="absolute top-8 left-0 bg-white/5 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-xl flex items-center gap-2 pointer-events-auto"
            >
              <div className="p-1 rounded bg-[#14B8A6]/20 text-[#14B8A6] border border-[#14B8A6]/30">
                <Award className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-white leading-none">Recovery Tracking</p>
              </div>
            </motion.div>

            {/* Card 2: AI Movement Analysis */}
            <motion.div 
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 1.5 }}
              className="absolute bottom-16 right-0 bg-white/5 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-xl flex items-center gap-2 pointer-events-auto"
            >
              <div className="p-1 rounded bg-white/10 text-white border border-white/20">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-white leading-none">AI Movement Analysis</p>
              </div>
            </motion.div>

            {/* Card 3: Personalized Exercise Plans */}
            <motion.div 
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 0.8 }}
              className="absolute bottom-6 left-4 bg-white/5 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-xl flex items-center gap-2 pointer-events-auto"
            >
              <div className="p-1 rounded bg-[#14B8A6]/20 text-[#14B8A6] border border-[#14B8A6]/30">
                <Dumbbell className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-white leading-none">Personalized Exercise Plans</p>
              </div>
            </motion.div>

            {/* Card 4: Doctor Guided Programs */}
            <motion.div 
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 5.5, ease: "easeInOut", delay: 1.2 }}
              className="absolute top-16 right-4 bg-white/5 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-xl flex items-center gap-2 pointer-events-auto"
            >
              <div className="p-1 rounded bg-white/10 text-white border border-white/20">
                <Shield className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-white leading-none">Doctor Guided Programs</p>
              </div>
            </motion.div>
          </div>

        </div>

        {/* Bottom panel descriptors */}
        <div className="space-y-2 relative z-10">
          <span className="px-2 py-0.5 rounded-full text-[8.5px] font-extrabold text-[#14B8A6] bg-[#14B8A6]/10 border border-[#14B8A6]/25 tracking-widest uppercase">
            PHYSIOGUIDE SETUP
          </span>
          <h2 className="text-xl font-bold text-white tracking-tight leading-tight pt-1">
            Let's Personalize Your Recovery Experience
          </h2>
          <p className="text-slate-450 text-xs leading-relaxed max-w-sm font-medium">
            Complete your clinical profile so PhysioGuide can provide personalized rehabilitation guidance and recovery analytics.
          </p>
        </div>

      </div>

      {/* ===== RIGHT SIDE: PROFILE FORM CONTAINER (55%) ===== */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-6 md:p-12">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md space-y-6"
        >
          {/* Mobile brand header (shown only on mobile) */}
          <div className="flex items-center gap-2 lg:hidden justify-center mb-6">
            <div className="w-8 h-8 rounded-lg bg-[#14B8A6]/10 flex items-center justify-center border border-[#14B8A6]/20">
              <Activity className="w-4 h-4 text-[#14B8A6]" />
            </div>
            <span className="font-extrabold text-slate-900 text-lg tracking-tight">PhysioGuide</span>
          </div>

          {/* Onboarding step indicator headers */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step Indicator</p>
              <h4 className="text-xs font-black text-[#14B8A6] uppercase tracking-wide mt-0.5">STEP 2 OF 2 • Profile Setup</h4>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-teal-50 text-[#14B8A6] border border-teal-150 relative shrink-0">
              {role === "doctor" ? "Doctor" : "Patient"}
            </span>
          </div>

          {/* Progress bar (100% complete step) */}
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-[#14B8A6]" 
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 0.6 }}
            />
          </div>

          {/* Profile Card */}
          <Card className="border border-slate-200/80 rounded-2xl shadow-sm bg-white overflow-hidden">
            <CardContent className="p-6 md:p-8 space-y-5">
              
              <div className="text-left space-y-1 pb-4 border-b border-slate-100">
                <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                  Complete Your Profile
                </h1>
                <p className="text-xs text-slate-400 font-semibold mt-1">
                  Tell us a little about yourself.
                </p>
              </div>

              <div className="space-y-4">
                
                {/* General Information sub-card wrapper */}
                <div className="space-y-3.5">
                  <p className="text-[9px] font-extrabold tracking-wider text-slate-400 uppercase">General Information</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">First Name</label>
                      <div className="relative">
                        <Input
                          placeholder="First name"
                          required
                          value={form.first_name || ""}
                          onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                          className="pl-9 border-slate-250 focus-visible:ring-[#14B8A6] h-10 text-xs font-semibold placeholder:text-slate-300"
                        />
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last Name</label>
                      <div className="relative">
                        <Input
                          placeholder="Last name"
                          required
                          value={form.last_name || ""}
                          onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                          className="pl-9 border-slate-250 focus-visible:ring-[#14B8A6] h-10 text-xs font-semibold placeholder:text-slate-300"
                        />
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* DOCTOR SPECIFIC EXPERIENCES */}
                {role === "doctor" && (
                  <div className="space-y-4 pt-4 border-t border-slate-100 animate-fade-in">
                    <p className="text-[9px] font-extrabold tracking-wider text-slate-400 uppercase">Professional Information</p>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Education Details</label>
                      <div className="relative">
                        <Input
                          placeholder="e.g. DPT, Harvard Medical"
                          required
                          value={form.education || ""}
                          onChange={(e) => setForm({ ...form, education: e.target.value })}
                          className="pl-9 border-slate-250 focus-visible:ring-[#14B8A6] h-10 text-xs font-semibold placeholder:text-slate-300"
                        />
                        <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Clinical Specialization</label>
                      <div className="relative">
                        <Input
                          placeholder="e.g. Orthopedic Sports Medicine"
                          required
                          value={form.specialization || ""}
                          onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                          className="pl-9 border-slate-250 focus-visible:ring-[#14B8A6] h-10 text-xs font-semibold placeholder:text-slate-300"
                        />
                        <Award className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Years of Experience</label>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="e.g. 8"
                          required
                          value={form.experience || ""}
                          onChange={(e) => setForm({ ...form, experience: e.target.value })}
                          className="pl-9 border-slate-250 focus-visible:ring-[#14B8A6] h-10 text-xs font-semibold placeholder:text-slate-300"
                        />
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      </div>
                    </div>

                  </div>
                )}

                {/* PATIENT SPECIFIC EXPERIENCES */}
                {role === "patient" && (
                  <div className="space-y-4 pt-4 border-t border-slate-100 animate-fade-in">
                    <p className="text-[9px] font-extrabold tracking-wider text-slate-400 uppercase">Patient Information</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Age</label>
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="e.g. 34"
                            required
                            value={form.age || ""}
                            onChange={(e) => setForm({ ...form, age: e.target.value })}
                            className="pl-9 border-slate-250 focus-visible:ring-[#14B8A6] h-10 text-xs font-semibold placeholder:text-slate-300"
                          />
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gender</label>
                        <div className="relative">
                          <select
                            value={form.gender || ""}
                            onChange={(e) => setForm({ ...form, gender: e.target.value })}
                            className="w-full rounded-xl border border-slate-250 bg-white pl-9 pr-3 py-2 text-xs font-semibold text-slate-700 focus-visible:ring-[#14B8A6] outline-none focus-visible:ring-2 focus-visible:border-transparent transition-all h-10"
                          >
                            <option value="">Select</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Medical Condition / Diagnosis</label>
                      <div className="relative">
                        <Input
                          placeholder="e.g. Chronic shoulder stiffness"
                          required
                          value={form.disease || ""}
                          onChange={(e) => setForm({ ...form, disease: e.target.value })}
                          className="pl-9 border-slate-250 focus-visible:ring-[#14B8A6] h-10 text-xs font-semibold placeholder:text-slate-300"
                        />
                        <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      </div>
                    </div>

                  </div>
                )}

              </div>

              {/* Submit Action Button */}
              <Button
                onClick={handleSubmit}
                disabled={loading || !form.first_name || !form.last_name}
                className="w-full bg-[#14B8A6] hover:bg-[#14b8a6]/95 text-white font-bold h-10 text-xs rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer mt-6 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving Profile...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>

            </CardContent>
          </Card>

        </motion.div>
      </div>

    </div>
  )
}