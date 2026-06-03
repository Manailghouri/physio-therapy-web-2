"use client"

import { useState } from "react"
import { supabase } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { Eye, EyeOff, Activity, Dumbbell, Award, Shield ,Loader2} from "lucide-react"
import { motion } from "framer-motion"

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [forgotMsg, setForgotMsg] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
      
    })

    setLoading(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    router.push("/")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-800 antialiased font-sans">
      
      {/* ===== LEFT SIDE: BRANDING PANEL (Desktop only) ===== */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0F172A] relative overflow-hidden flex-col justify-between p-12">
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
          
          {/* Subtle glow behind hero */}
          <div className="absolute w-72 h-72 rounded-full bg-[#14B8A6]/5 blur-3xl -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          
          <motion.div 
            animate={{ y: [0, -12, 0] }}
            transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
            className="w-80 h-auto opacity-90 drop-shadow-2xl mb-8 relative z-10"
          >
            <img 
              src="/images/hero.png" 
              alt="PhysioGuide Hero Guidance" 
              className="w-full h-auto object-contain rounded-2xl"
            />
          </motion.div>

          {/* Floating cards */}
          <div className="absolute inset-0 w-full h-full pointer-events-none z-20">
            {/* Card 1: Accuracy */}
            <motion.div 
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.2 }}
              className="absolute top-12 left-0 bg-white/5 backdrop-blur-md border border-white/10 p-3.5 rounded-xl shadow-xl flex items-center gap-2.5 pointer-events-auto"
            >
              <div className="p-1.5 rounded-lg bg-[#14B8A6]/20 text-[#14B8A6] border border-[#14B8A6]/30">
                <Award className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">Accuracy Rate</p>
                <p className="text-xs font-black text-white mt-1">98% Recovery compliant</p>
              </div>
            </motion.div>

            {/* Card 2: Completed Sessions */}
            <motion.div 
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 1.5 }}
              className="absolute bottom-16 right-0 bg-white/5 backdrop-blur-md border border-white/10 p-3.5 rounded-xl shadow-xl flex items-center gap-2.5 pointer-events-auto"
            >
              <div className="p-1.5 rounded-lg bg-white/10 text-white border border-white/20">
                <Dumbbell className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">Activity Count</p>
                <p className="text-xs font-black text-white mt-1">500+ Sessions Analysed</p>
              </div>
            </motion.div>

            {/* Card 3: Real-Time Motion Tracking */}
            <motion.div 
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 0.8 }}
              className="absolute bottom-8 left-4 bg-white/5 backdrop-blur-md border border-white/10 p-3.5 rounded-xl shadow-xl flex items-center gap-2.5 pointer-events-auto"
            >
              <div className="p-1.5 rounded-lg bg-[#14B8A6]/20 text-[#14B8A6] border border-[#14B8A6]/30">
                <Activity className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">Motion Engine</p>
                <p className="text-xs font-black text-white mt-1">Real-Time Pose telemetry</p>
              </div>
            </motion.div>
          </div>

        </div>

        {/* Bottom panel descriptors */}
        <div className="space-y-2 relative z-10">
          <h2 className="text-xl font-bold text-white tracking-tight leading-tight">
            AI-Powered Physiotherapy Guidance System
          </h2>
          <p className="text-slate-450 text-xs leading-relaxed max-w-md font-medium">
            Monitor recovery compliance, execute prescribed templates, and verify angle deviations with real-time pose analytics.
          </p>
        </div>

      </div>

      {/* ===== RIGHT SIDE: LOGIN CONTAINER ===== */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
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

          <div className="text-center lg:text-left space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              Welcome Back
            </h1>
            <p className="text-xs text-slate-400 font-semibold mt-1">
              Continue your rehabilitation journey.
            </p>
          </div>

          {/* Login Card */}
          <Card className="border border-slate-200/80 rounded-2xl shadow-sm bg-white overflow-hidden">
            <CardContent className="p-6 md:p-8 space-y-5">
              
              <form onSubmit={handleLogin} className="space-y-4">
                
                {/* Email Address */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@clinic.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-slate-250 focus-visible:ring-[#14B8A6] h-10 text-xs font-semibold placeholder:text-slate-300"
                  />
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label htmlFor="password" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setForgotMsg(true)}
                      className="text-[10px] font-bold text-[#14B8A6] hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10 border-slate-250 focus-visible:ring-[#14B8A6] h-10 text-xs font-semibold placeholder:text-slate-350"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-450 hover:text-slate-650 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Error messages */}
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg border border-rose-100 bg-rose-50 text-rose-600 text-xs font-semibold text-center"
                  >
                    {error}
                  </motion.div>
                )}

                {forgotMsg && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg border border-slate-100 bg-slate-50 text-slate-600 text-[10px] font-medium text-center"
                  >
                    Please contact your clinic administrator to reset your referral credentials.
                  </motion.div>
                )}

                {/* Submit button */}
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-[#14B8A6] hover:bg-[#14b8a6]/95 text-white font-bold h-10 text-xs rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer mt-2"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Authenticating...
                    </div>
                  ) : (
                    "Log In"
                  )}
                </Button>

              </form>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-center text-xs font-medium">
                <span className="text-slate-400">New to PhysioGuide?</span>
                <Link href="/signup" className="text-[#14B8A6] hover:underline font-bold ml-1.5 cursor-pointer">
                  Sign up instead
                </Link>
              </div>

            </CardContent>
          </Card>

          <div className="flex justify-center items-center gap-1 text-[10px] text-slate-400 font-semibold justify-items-center">
            <Shield className="w-3 h-3 text-[#14B8A6]" />
            <span>Secure Clinical Authentication Gate</span>
          </div>

        </motion.div>
      </div>

    </div>
  )
}