"use client"

import { useEffect, useMemo, useRef, useState, Suspense } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Float, Sparkles as ThreeSparkles, useTexture } from "@react-three/drei"
import * as THREE from "three"
import {
  AnimatePresence,
  motion,
  useScroll,
  useTransform,
  type Variants,
} from "framer-motion"
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ClipboardList,
  HeartPulse,
  LineChart,
  Menu,
  Quote,
  ShieldCheck,
  Stethoscope,
  Video,
  X,
  Dumbbell,
  Users,
  Award,
  Brain,
  Play,
  Check,
  Shield,
  Camera
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { supabase } from "@/utils/supabase/client"

// ── Navigation Items ──────────────────────────────────────────────
const navItems = [
  { label: "Platform", href: "#platform" },
  { label: "Workflow", href: "#workflow" },
  { label: "Features", href: "#features" },
  { label: "Results", href: "#results" },
]

// ── Trust Badges ──────────────────────────────────────────────────
const trustBadges = [
  "AI Motion Analysis",
  "Real-Time Tracking",
  "Personalized Recovery Plans",
  "Recovery Analytics",
]

// ── Showcases (Platform Overview) ──────────────────────────────────
const showcases = [
  {
    title: "Doctor Dashboard",
    description: "Review assigned exercises, patient risk, adherence, and recovery signals from one clinical workspace.",
    icon: Stethoscope,
    metrics: ["18 Active Patients", "7 Review Alerts", "92% Adherence Rate"],
  },
  {
    title: "Patient Dashboard",
    description: "A calm guided interface for home exercise routines, movement feedback, and daily progress.",
    icon: HeartPulse,
    metrics: ["Today: Knee Extension", "Form Score: 88%", "Next Review: Friday"],
  },
  {
    title: "AI Analysis Platform",
    description: "Advanced computer vision models that compare joint trajectories and log deviations in real-time.",
    icon: BrainCircuit,
    metrics: ["Pose Tracking: 30 FPS", "98% Accuracy Index", "Knee Extension Calibrated"],
  },
]

// ── Workflow Steps ─────────────────────────────────────────────────
const workflowSteps = [
  {
    title: "Doctor Assigns Exercise",
    description: "Clinical specialists select shoulder or knee extension protocols tailored to target rehabilitation.",
    icon: ClipboardList
  },
  {
    title: "AI Learns Motion",
    description: "The platform analyzes anatomical joint locations to compile target range-of-motion envelopes.",
    icon: BrainCircuit
  },
  {
    title: "Patient Performs Exercise",
    description: "Real-time webcam tracking provides patient guidance indicators during rehabilitation reps.",
    icon: Video
  },
  {
    title: "AI Evaluates Form",
    description: "The system measures deviation angles against ideal templates to log accuracy rates.",
    icon: LineChart
  },
  {
    title: "Recovery Progress Updated",
    description: "Detailed range metrics feed dashboard analytics, letting providers monitor remote recovery.",
    icon: CheckCircle2
  }
]

// ── Statistics ────────────────────────────────────────────────────
const stats = [
  { label: "Patients Guided", value: 500, suffix: "+" },
  { label: "Sessions Analysed", value: 1200, suffix: "+" },
  { label: "Success Rate", value: 98, suffix: "%" },
  { label: "Therapists Linked", value: 50, suffix: "+" },
]

// ── Testimonials ──────────────────────────────────────────────────
const testimonials = [
  {
    quote: "PhysioGuide feels like a clinical operating system for remote rehabilitation. It gives remote recovery the structure it desperately needs.",
    name: "Dr. Ayesha Khan",
    role: "Consultant Physiotherapist",
  },
  {
    quote: "The movement analytics and patient risk indicators make remote supervision feel structured, supervised, and measurable.",
    name: "Hamza Rehman",
    role: "Rehabilitation Coordinator",
  },
  {
    quote: "This system demonstrates the depth, polish, and execution of a funded clinical technology startup.",
    name: "Prof. Sara Malik",
    role: "Clinical Innovation Lead",
  },
]

// ── Variants ──────────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
}

const stagger: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
}

// ── Custom Hooks ──────────────────────────────────────────────────
function useActiveSection() {
  const [activeSection, setActiveSection] = useState("#platform")
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const updateState = () => {
      setIsScrolled(window.scrollY > 20)

      const current = navItems.findLast((item) => {
        const section = document.querySelector(item.href)
        if (!section) return false
        return section.getBoundingClientRect().top <= 200
      })

      if (current) setActiveSection(current.href)
    }

    updateState()
    window.addEventListener("scroll", updateState, { passive: true })
    return () => window.removeEventListener("scroll", updateState)
  }, [])

  return { activeSection, isScrolled }
}

function handleSmoothScroll(
  event: React.MouseEvent<HTMLAnchorElement>,
  href: string,
  onDone?: () => void
) {
  event.preventDefault()
  document.querySelector(href)?.scrollIntoView({ behavior: "smooth", block: "start" })
  onDone?.()
}

// ── 3D Scene Components ───────────────────────────────────────────

function AnatomyMesh() {
  const texture = useTexture("/images/hero.png")
  const meshRef = useRef<THREE.Mesh>(null)
  const { mouse } = useThree()

  useFrame((state) => {
    if (!meshRef.current) return
    const time = state.clock.getElapsedTime()
    
    // Slow rotation on Y
    meshRef.current.rotation.y = time * 0.12

    // Parallax reaction to mouse coords
    const targetX = mouse.x * 0.4
    const targetY = mouse.y * 0.3
    
    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, 0.08)
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.08)
    
    meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, -targetY * 0.25, 0.08)
    meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, -targetX * 0.12, 0.08)
  })

  return (
    <mesh ref={meshRef} castShadow receiveShadow scale={[2.3, 2.8, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial 
        map={texture} 
        transparent 
        alphaTest={0.4} 
        side={THREE.DoubleSide}
        roughness={0.15}
        metalness={0.8}
      />
    </mesh>
  )
}

function ScanBeam() {
  const beamRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!beamRef.current) return
    const time = state.clock.getElapsedTime()
    // Moves up and down between y = -1.4 and y = 1.4
    beamRef.current.position.y = Math.sin(time * 1.8) * 1.4
  })

  return (
    <mesh ref={beamRef} position={[0, 0, 0.05]}>
      <planeGeometry args={[2.5, 0.035]} />
      <meshBasicMaterial 
        color="#14B8A6" 
        transparent 
        opacity={0.65} 
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

function PulseWave({ delay }: { delay: number }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!meshRef.current) return
    const elapsed = state.clock.getElapsedTime()
    const t = (elapsed + delay) % 4
    const scale = t * 0.85
    const opacity = (1 - t / 4) * 0.35
    
    meshRef.current.scale.set(scale, scale, 1)
    if (meshRef.current.material) {
      (meshRef.current.material as THREE.Material).opacity = opacity
    }
  })

  return (
    <mesh ref={meshRef}>
      <ringGeometry args={[0.98, 1.02, 32]} />
      <meshBasicMaterial color="#14B8A6" transparent opacity={0.35} side={THREE.DoubleSide} />
    </mesh>
  )
}

function ScanningPlatform() {
  const ring1Ref = useRef<THREE.Mesh>(null)
  const ring2Ref = useRef<THREE.Mesh>(null)
  const ring3Ref = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    if (ring1Ref.current) ring1Ref.current.rotation.z = time * 0.35
    if (ring2Ref.current) ring2Ref.current.rotation.z = -time * 0.55
    if (ring3Ref.current) ring3Ref.current.rotation.z = time * 0.2
  })

  return (
    <group position={[0, -1.65, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Platform center circular glow */}
      <mesh>
        <circleGeometry args={[0.85, 32]} />
        <meshBasicMaterial color="#14B8A6" transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>

      {/* Rotating Floor Ring 1 */}
      <mesh ref={ring1Ref} position={[0, 0, 0.01]}>
        <ringGeometry args={[0.9, 0.98, 64]} />
        <meshBasicMaterial color="#14B8A6" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* Rotating Floor Ring 2 */}
      <mesh ref={ring2Ref} position={[0, 0, 0.02]}>
        <ringGeometry args={[1.2, 1.25, 8]} />
        <meshBasicMaterial color="#14B8A6" transparent opacity={0.25} wireframe side={THREE.DoubleSide} />
      </mesh>

      {/* Rotating Floor Ring 3 */}
      <mesh ref={ring3Ref} position={[0, 0, -0.01]}>
        <ringGeometry args={[1.5, 1.52, 32]} />
        <meshBasicMaterial color="#14B8A6" transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>

      {/* Pulse Scan Wave Rings */}
      <PulseWave delay={0} />
      <PulseWave delay={2} />
    </group>
  )
}

function R3FScene() {
  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={[0, 8, 2]} intensity={2} color="#14B8A6" />
      <pointLight position={[5, 5, 5]} intensity={1.2} color="#14B8A6" />
      <Float speed={1.8} rotationIntensity={0.15} floatIntensity={0.6}>
        <group>
          {/* Glowing 3D Particles */}
          <ThreeSparkles count={45} scale={[4.2, 2.8, 2.5]} size={1.8} speed={0.25} color="#14B8A6" opacity={0.4} />
          
          {/* Anatomy Mesh and Lasers */}
          <AnatomyMesh />
          <ScanBeam />
        </group>
      </Float>
      
      {/* Interactive Platform Base */}
      <ScanningPlatform />
    </>
  )
}

// ── General Page Subcomponents ─────────────────────────────────────

function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return

        const start = performance.now()
        const duration = 1400

        const tick = (time: number) => {
          const progress = Math.min((time - start) / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          setDisplayValue(Math.round(value * eased))
          if (progress < 1) requestAnimationFrame(tick)
        }

        requestAnimationFrame(tick)
        observer.disconnect()
      },
      { threshold: 0.35 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [value])

  return (
    <span ref={ref}>
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  )
}

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      className="mx-auto mb-16 max-w-3xl text-center"
    >
      <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-[#14B8A6]/10 px-4 py-2 text-xs font-black text-[#14B8A6] uppercase tracking-wider shadow-inner backdrop-blur-xl">
        <span className="size-1.5 rounded-full bg-[#14B8A6] animate-pulse" />
        {eyebrow}
      </div>
      <h2 className="text-balance text-3xl font-bold tracking-tight text-white md:text-5xl">
        {title}
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-pretty text-sm md:text-base leading-relaxed text-slate-400">
        {description}
      </p>
    </motion.div>
  )
}

function DashboardMockup({ item, index }: { item: (typeof showcases)[number]; index: number }) {
  const Icon = item.icon

  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -8, scale: 1.015 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="group rounded-[1.8rem] border border-slate-800 bg-[#0F172A]/40 p-3 shadow-lg backdrop-blur-xl hover:border-[#14B8A6]/30 transition-colors"
    >
      <div className="rounded-[1.4rem] border border-slate-800 bg-slate-950 p-2">
        
        {/* Browser Top Window Bar */}
        <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2.5">
          <span className="size-2 rounded-full bg-rose-500/60" />
          <span className="size-2 rounded-full bg-amber-500/60" />
          <span className="size-2 rounded-full bg-emerald-500/60" />
          <span className="ml-auto text-[10px] text-slate-600 font-bold uppercase tracking-wider">PhysioGuide OS</span>
        </div>

        {/* Browser Internal Workspace View */}
        <div className="rounded-b-[1rem] bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.06),transparent_38%),linear-gradient(180deg,#0f172a,#020817)] p-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Platform Workspace</p>
              <h3 className="mt-1 text-lg font-black tracking-tight text-white">{item.title}</h3>
            </div>
            <span className="grid size-10 place-items-center rounded-xl border border-white/10 bg-[#14B8A6]/10 text-[#14B8A6]">
              <Icon className="size-5" />
            </span>
          </div>

          <p className="mt-4 min-h-16 text-xs leading-relaxed text-slate-400">{item.description}</p>
          
          {/* Mock Interactive Metrics */}
          <div className="mt-6 grid gap-2.5">
            {item.metrics.map((metric, metricIndex) => (
              <div key={metric} className="rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-3 text-[11px] font-bold">
                  <span className="text-slate-350">{metric}</span>
                  <span className="h-1.5 rounded-full bg-[#14B8A6] shadow-[0_0_8px_rgba(20,184,166,0.5)]" style={{ width: `${40 + metricIndex * 15}%` }} />
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </motion.div>
  )
}

// ── Main Home Redesign ──────────────────────────────────────────────

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)
  
  const [isMounted, setIsMounted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [demoOpen, setDemoOpen] = useState(false)
  
  const { activeSection, isScrolled } = useActiveSection()
  const containerRef = useRef<HTMLDivElement>(null)

  // Scroll tracking for Apple-style shrink
  const { scrollYProgress } = useScroll()
  const heroScale = useTransform(scrollYProgress, [0, 0.35], [1, 0.86])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0.5])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single()

      const userRole = data?.role ?? null
      setRole(userRole)
      setLoading(false)

      if (userRole === "patient") {
        router.replace("/patient")
      } else if (userRole === "doctor") {
        router.replace("/doctor")
      }
    }

    checkSession()
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020817] text-slate-200 font-sans">
        <div className="flex items-center gap-3 rounded-full border border-slate-800 bg-[#0F172A]/80 px-5 py-3 text-sm shadow-sm backdrop-blur-xl">
          <span className="size-2.5 animate-pulse rounded-full bg-[#14B8A6]" />
          Loading workspace...
        </div>
      </div>
    )
  }

  if (role) return null

  return (
    <div ref={containerRef} className="min-h-screen bg-[#020817] text-white antialiased font-sans scroll-smooth relative">
      
      {/* ── Global keyframe style injection ── */}
      <style jsx global>{`
        @keyframes grid-move {
          0% { background-position: 0 0; }
          100% { background-position: 50px 50px; }
        }
      `}</style>

      {/* ── STICKY NAVBAR ────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed inset-x-0 top-4 z-50 px-4"
      >
        <nav
          className={`mx-auto flex max-w-6xl items-center justify-between rounded-full border px-4 py-3.5 backdrop-blur-2xl transition-all duration-300 md:px-6 ${
            isScrolled
              ? "border-slate-800/80 bg-slate-950/75 shadow-[0_20px_50px_rgba(2,8,23,0.7)]"
              : "border-white/5 bg-transparent"
          }`}
        >
          {/* Pulse logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-r from-[#14B8A6] to-cyan-500 text-white shadow-lg">
              <Activity className="size-4 text-white" />
            </span>
            <span className="text-base font-black tracking-tight text-white">PhysioGuide</span>
          </Link>

          {/* Nav items */}
          <div className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={(event) => handleSmoothScroll(event, item.href)}
                className="group relative rounded-full px-4 py-2 text-xs font-bold text-slate-400 transition hover:text-white"
              >
                <span>{item.label}</span>
                <motion.span
                  className="absolute inset-x-3 bottom-1.5 h-0.5 rounded-full bg-[#14B8A6]"
                  initial={false}
                  animate={{ opacity: activeSection === item.href ? 1 : 0, scaleX: activeSection === item.href ? 1 : 0.2 }}
                  transition={{ duration: 0.25 }}
                />
              </Link>
            ))}
          </div>

          {/* CTA triggers */}
          <div className="hidden items-center gap-3.5 md:flex">
            <Link href="/login" className="text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer">
              Login
            </Link>
            <Link href="/signup">
              <Button size="sm" className="rounded-full bg-[#14B8A6] hover:bg-[#14b8a6]/95 text-white font-bold h-8.5 px-4 cursor-pointer text-xs transition-all shadow-[0_0_15px_rgba(20,184,166,0.3)]">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="grid size-9 place-items-center rounded-xl border border-slate-800 bg-slate-950/60 text-slate-300 md:hidden cursor-pointer"
          >
            <Menu className="size-4" />
          </button>
        </nav>
      </motion.header>

      {/* ── PREMIUM FULLSCREEN MOBILE MENU ────────────────────────── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-[#020817]/95 p-4 backdrop-blur-2xl md:hidden flex flex-col justify-between"
          >
            <div className="flex items-center justify-between py-2">
              <Link href="/" className="flex items-center gap-2.5" onClick={() => setMenuOpen(false)}>
                <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-r from-[#14B8A6] to-cyan-500 text-white">
                  <Activity className="size-4" />
                </span>
                <span className="font-extrabold text-white text-base tracking-tight">PhysioGuide</span>
              </Link>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="grid size-9 place-items-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300"
              >
                <X className="size-4" />
              </button>
            </div>

            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="grid gap-4 my-auto py-12"
            >
              {navItems.map((item, index) => (
                <motion.div key={item.href} variants={fadeUp}>
                  <Link
                    href={item.href}
                    onClick={(event) => handleSmoothScroll(event, item.href, () => setMenuOpen(false))}
                    className="block rounded-2xl border border-slate-800/80 bg-slate-900/40 px-6 py-4 text-xl font-bold tracking-tight text-white hover:border-[#14B8A6]/30 transition-all"
                  >
                    <span className="text-xs font-bold text-[#14B8A6] tracking-wider block mb-1">0{index + 1}</span>
                    {item.label}
                  </Link>
                </motion.div>
              ))}
            </motion.div>

            <div className="grid grid-cols-2 gap-4 pb-4">
              <Link href="/login" onClick={() => setMenuOpen(false)}>
                <Button variant="outline" className="w-full h-11 rounded-xl border-slate-800 text-white bg-slate-950/60 font-bold">
                  Login
                </Button>
              </Link>
              <Link href="/signup" onClick={() => setMenuOpen(false)}>
                <Button className="w-full h-11 rounded-xl bg-[#14B8A6] hover:bg-[#14b8a6]/95 text-white font-bold">
                  Signup
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HERO SECTION (Center Focus, Dark Glowing Ambient) ─────── */}
      <section className="relative min-h-screen px-4 pb-20 pt-36 md:pt-40 lg:px-8 flex flex-col items-center justify-between overflow-hidden">
        
        {/* Deep navy backlights & depth fog blobs */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#020817] via-[#020817] to-[#0F172A]" />
        
        {/* Glow blur filters */}
        <div className="absolute top-[28%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] sm:w-[480px] h-[280px] sm:h-[480px] rounded-full bg-[#14B8A6]/6 blur-[80px] sm:blur-[130px] pointer-events-none z-0" />
        <div className="absolute top-[40%] left-[10%] w-[350px] h-[350px] rounded-full bg-[#14B8A6]/2 blur-[100px] pointer-events-none z-0" />
        <div className="absolute top-[50%] right-[10%] w-[350px] h-[350px] rounded-full bg-slate-500/3 blur-[100px] pointer-events-none z-0" />
        
        {/* Animated grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(20,184,166,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(20,184,166,0.02)_1px,transparent_1px)] bg-[size:45px_45px] opacity-80 pointer-events-none z-0" style={{ animation: 'grid-move 25s linear infinite' }} />

        {/* Subtle holographic rotating lines */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[750px] rounded-full border border-dashed border-[#14B8A6]/10 animate-[spin_120s_linear_infinite] pointer-events-none z-0" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full border border-dotted border-[#14B8A6]/5 animate-[spin_80s_linear_infinite_reverse] pointer-events-none z-0" />

        <div className="relative max-w-5xl w-full mx-auto text-center z-10 flex flex-col items-center flex-1 justify-center">
          
          {/* Startup badge */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-teal-500/20 bg-[#14B8A6]/10 px-4 py-2 text-xs font-black text-[#14B8A6] uppercase tracking-widest shadow-[0_0_15px_rgba(20,184,166,0.1)] backdrop-blur-xl"
          >
            <span className="size-1.5 rounded-full bg-[#14B8A6] animate-pulse" />
            Healthcare AI Clinical Stage Platform
          </motion.div>

          {/* Premium Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-balance text-4xl font-extrabold tracking-tight text-white md:text-7xl lg:text-8xl max-w-4xl leading-[1.05]"
          >
            Transform Rehabilitation Into <span className="bg-gradient-to-r from-[#14B8A6] via-[#2dd4bf] to-cyan-400 bg-clip-text text-transparent">Measurable Recovery</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-pretty text-sm leading-relaxed text-slate-400 md:text-base"
          >
            AI-powered physiotherapy guidance with real-time motion analysis, personalized exercise programs, and intelligent recovery insights.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-8 flex flex-wrap gap-4 justify-center"
          >
            <Link href="/signup">
              <Button size="lg" className="h-12.5 rounded-full bg-[#14B8A6] hover:bg-[#14b8a6]/95 text-white font-bold px-8 text-xs cursor-pointer shadow-[0_0_25px_rgba(20,184,166,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2">
                Get Started
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Button
              onClick={() => setDemoOpen(true)}
              size="lg"
              variant="outline"
              className="h-12.5 rounded-full border-slate-700 hover:border-slate-500 bg-slate-950/40 text-slate-300 font-bold px-8 text-xs cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
            >
              <Play className="size-3 text-[#14B8A6] fill-current" />
              Watch Demo
            </Button>
          </motion.div>

          {/* ── FAKE 3D STAGE & FLOATING CARDS WRAPPER ── */}
          <motion.div
            style={{ scale: heroScale, opacity: heroOpacity }}
            className="relative w-full max-w-3xl mt-12 aspect-[4/3] flex items-center justify-center pointer-events-none"
          >
            
            {/* Real WebGL Canvas carrying transparent anatomy figure */}
            <div className="absolute inset-0 z-10 w-full h-full pointer-events-auto">
              {isMounted ? (
                <Canvas camera={{ position: [0, 0, 4.2], fov: 42 }}>
                  <Suspense fallback={null}>
                    <R3FScene />
                  </Suspense>
                </Canvas>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full border-2 border-[#14B8A6]/20 border-t-[#14B8A6] animate-spin" />
                </div>
              )}
            </div>

            {/* Desktop floating metric cards around canvas */}
            <div className="hidden md:block absolute inset-0 z-20 pointer-events-none">
              
              {/* Top Left: 98% Recovery Accuracy */}
              <motion.div 
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                className="absolute top-[12%] left-[4%] w-44 rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-xl backdrop-blur-md pointer-events-auto hover:border-[#14B8A6]/30 hover:scale-[1.03] transition-all"
              >
                <div className="p-1.5 w-fit rounded-lg bg-[#14B8A6]/20 text-[#14B8A6] border border-[#14B8A6]/30 mb-2">
                  <Award className="w-4 h-4" />
                </div>
                <p className="text-xl font-black text-white leading-none">98%</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1">Recovery Accuracy</p>
              </motion.div>

              {/* Top Right: Live Motion Tracking */}
              <motion.div 
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 5.5, ease: "easeInOut", delay: 1 }}
                className="absolute top-[16%] right-[4%] w-44 rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-xl backdrop-blur-md pointer-events-auto hover:border-[#14B8A6]/30 hover:scale-[1.03] transition-all"
              >
                <div className="p-1.5 w-fit rounded-lg bg-teal-500/20 text-[#14B8A6] border border-teal-500/30 mb-2">
                  <Video className="w-4 h-4" />
                </div>
                <p className="text-xl font-black text-white leading-none">Live</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1">Motion Tracking</p>
              </motion.div>

              {/* Bottom Left: 500+ Patients Guided */}
              <motion.div 
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 0.5 }}
                className="absolute bottom-[22%] left-[2%] w-44 rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-xl backdrop-blur-md pointer-events-auto hover:border-[#14B8A6]/30 hover:scale-[1.03] transition-all"
              >
                <div className="p-1.5 w-fit rounded-lg bg-teal-500/20 text-[#14B8A6] border border-teal-500/30 mb-2">
                  <Users className="w-4 h-4" />
                </div>
                <p className="text-xl font-black text-white leading-none">500+</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1">Patients Guided</p>
              </motion.div>

              {/* Bottom Right: AI Recovery Analysis */}
              <motion.div 
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 6.5, ease: "easeInOut", delay: 1.5 }}
                className="absolute bottom-[18%] right-[2%] w-44 rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-xl backdrop-blur-md pointer-events-auto hover:border-[#14B8A6]/30 hover:scale-[1.03] transition-all"
              >
                <div className="p-1.5 w-fit rounded-lg bg-[#14B8A6]/20 text-[#14B8A6] border border-[#14B8A6]/30 mb-2">
                  <Brain className="w-4 h-4" />
                </div>
                <p className="text-xl font-black text-white leading-none">AI</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1">Recovery Analysis</p>
              </motion.div>

            </div>

          </motion.div>

          {/* Mobile responsive layout for metric cards */}
          <div className="grid grid-cols-2 gap-3 w-full max-w-md mt-6 md:hidden">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-left">
              <p className="text-lg font-black text-white">98%</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Recovery Accuracy</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-left">
              <p className="text-lg font-black text-white">Live</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Motion Tracking</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-left">
              <p className="text-lg font-black text-white">500+</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Patients Guided</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-left">
              <p className="text-lg font-black text-white">AI</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Recovery Analysis</p>
            </div>
          </div>

          {/* Trust badges footer */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="mx-auto mt-12 flex max-w-4xl flex-wrap justify-center gap-2.5 z-10"
          >
            {trustBadges.map((badge) => (
              <motion.span key={badge} variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-slate-800/80 bg-slate-950/60 px-4 py-2 text-[10px] sm:text-xs font-bold text-slate-400 backdrop-blur-xl">
                <ShieldCheck className="size-4 text-[#14B8A6]" />
                {badge}
              </motion.span>
            ))}
          </motion.div>

        </div>
      </section>

      {/* ── VIDEO DEMO MODAL ────────────────────────────────────────── */}
      <AnimatePresence>
        {demoOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-4xl aspect-video rounded-3xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl flex flex-col"
            >
              <button
                onClick={() => setDemoOpen(false)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Demo player content */}
              <div className="flex-1 w-full h-full relative bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.12),transparent_60%)] flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#14B8A6]/20 border border-[#14B8A6]/30 flex items-center justify-center text-[#14B8A6] animate-pulse">
                  <Play className="w-7 h-7 fill-current" />
                </div>
                <div className="space-y-1.5 max-w-md">
                  <h3 className="text-lg font-black text-white">PhysioGuide Live Demo</h3>
                  <p className="text-xs text-slate-400 leading-normal">
                    This interactive demonstration highlights joint angle calibrations, AI tracking verification indices, and patient compliance statistics.
                  </p>
                </div>
                <div className="w-full max-w-lg border border-slate-800 rounded-2xl bg-slate-900/60 p-4 font-mono text-[10px] text-slate-400 text-left">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-2 font-bold text-[#14B8A6]">
                    <span className="size-2 rounded-full bg-[#14B8A6] animate-ping" />
                    <span>VERIFICATION CONSOLE</span>
                  </div>
                  <p>&gt; initializing video stream... OK</p>
                  <p>&gt; load calibration matrix (DPT-Shoulder)... OK</p>
                  <p>&gt; tracking coordinates: 30 FPS [Accuracy Index: 98.4%]</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SECTION 1: PLATFORM OVERVIEW ─────────────────────────── */}
      <section id="platform" className="relative px-4 py-28 lg:px-8 border-t border-slate-900 bg-slate-950/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(20,184,166,0.05),transparent_40%)]" />
        <div className="relative mx-auto max-w-7xl">
          <SectionIntro
            eyebrow="Inside PhysioGuide"
            title="Commercial-grade workspace for rehabilitation."
            description="Our doctor, patient, and AI workspaces operate as one coordinated clinical feedback loop, maintaining quiet confidence and visual clarity."
          />
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            className="grid gap-6 lg:grid-cols-3"
          >
            {showcases.map((item, index) => (
              <DashboardMockup key={item.title} item={item} index={index} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 2: RECOVERY WORKFLOW ─────────────────────────── */}
      <section id="workflow" className="relative px-4 py-28 lg:px-8 border-t border-slate-900 bg-[#020817]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-[#14B8A6]/2.5 blur-[100px] pointer-events-none" />
        
        <div className="relative mx-auto max-w-7xl">
          <SectionIntro
            eyebrow="How it works"
            title="Clinician expertise matched with AI validation."
            description="A clear, responsive workflow translates physician criteria into structured daily target exercises at home."
          />
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="mx-auto max-w-4xl"
          >
            <div className="relative grid gap-6">
              
              {/* Connecting vertical timeline track */}
              <div className="absolute left-6 top-6 hidden h-[calc(100%-4rem)] w-0.5 bg-gradient-to-b from-[#14B8A6]/20 via-[#14B8A6]/40 to-[#14B8A6]/10 md:block" />
              
              {workflowSteps.map((step, index) => {
                const Icon = step.icon
                return (
                  <motion.div 
                    key={step.title} 
                    variants={fadeUp} 
                    className="relative grid gap-4 md:grid-cols-[3.5rem_1fr] group"
                  >
                    {/* Glowing index node */}
                    <div className="relative z-10 grid size-12 place-items-center rounded-xl border border-slate-800 bg-slate-950 text-xs font-bold text-white shadow-xl group-hover:border-[#14B8A6]/45 transition-colors">
                      <span className="text-slate-400 group-hover:text-[#14B8A6]">{index + 1}</span>
                    </div>

                    {/* Timeline card details */}
                    <motion.div
                      whileHover={{ x: 6, y: -2 }}
                      className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-6 shadow-md backdrop-blur-xl hover:border-slate-700/60 transition-all"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-wider text-[#14B8A6]">Step 0{index + 1}</p>
                          <h3 className="text-xl font-bold tracking-tight text-white">{step.title}</h3>
                          <p className="text-xs text-slate-400 leading-relaxed max-w-2xl mt-1">{step.description}</p>
                        </div>
                        <div className="p-2 w-fit rounded-lg bg-[#14B8A6]/10 text-[#14B8A6] shrink-0 border border-[#14B8A6]/20">
                          <Icon className="w-5 h-5" />
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )
              })}

            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 3: FEATURE SHOWCASE (Alternating Layouts) ────── */}
      <section id="features" className="relative px-4 py-28 lg:px-8 border-t border-slate-900 bg-slate-950/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(20,184,166,0.03),transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl">
          
          <SectionIntro
            eyebrow="Key capabilities"
            title="Sophisticated modules tailored for remote orthopedics."
            description="Built to meet strict clinical safety and accuracy parameters while maintaining an accessible patient design."
          />

          <div className="space-y-24 mt-16 font-sans">
            
            {/* Grid 1: Image Left, Content Right */}
            <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7 }}
                className="relative aspect-[4/3] rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden group shadow-xl"
              >
                <Image
                  src="/images/service1.jpg"
                  alt="Real-time Pose detection telemetry"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest text-[#14B8A6] bg-[#14B8A6]/10 border border-[#14B8A6]/20 uppercase">
                    AI Vision Core
                  </span>
                  <p className="text-white font-bold text-sm mt-1.5">Edge Joint Mapping</p>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7 }}
                className="space-y-5"
              >
                <div className="w-10 h-10 rounded-xl bg-[#14B8A6]/10 text-[#14B8A6] border border-[#14B8A6]/20 flex items-center justify-center">
                  <Camera className="w-5 h-5" />
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">Real-Time Joint Telemetry</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Our embedded computer vision pipeline runs safely inside standard patient webcams to trace coordinates without physical wearables.
                </p>
                <ul className="space-y-2.5 font-medium text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#14B8A6]" />
                    30 FPS real-time feedback coordinate matching
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#14B8A6]" />
                    Detects angle deviations during extensions and flexions
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#14B8A6]" />
                    Zero server-side storage of live video streams
                  </li>
                </ul>
              </motion.div>
            </div>

            {/* Grid 2: Content Left, Image Right */}
            <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7 }}
                className="space-y-5 md:order-1"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-[#14B8A6] border border-teal-500/20 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">Intelligent Clinical Supervision</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Enable orthopedic teams to assign, adjust, and evaluate remote exercise protocols directly from a unified interface.
                </p>
                <ul className="space-y-2.5 font-medium text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#14B8A6]" />
                    Prioritizes review alerts for lagging patients
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#14B8A6]" />
                    Logs detailed compliance metrics and range tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#14B8A6]" />
                    Easy clinician code assignment protocol
                  </li>
                </ul>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7 }}
                className="relative aspect-[4/3] rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden group shadow-xl md:order-2"
              >
                <Image
                  src="/images/service2.jpg"
                  alt="Clinician monitoring workspace preview"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest text-[#14B8A6] bg-[#14B8A6]/10 border border-[#14B8A6]/20 uppercase">
                    Supervisor Hub
                  </span>
                  <p className="text-white font-bold text-sm mt-1.5">Supervised Rehabilitation</p>
                </div>
              </motion.div>
            </div>

            {/* Grid 3: Image Left, Content Right */}
            <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7 }}
                className="relative aspect-[4/3] rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden group shadow-xl"
              >
                <Image
                  src="/images/service3.jpg"
                  alt="Patient performing exercises at home"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest text-[#14B8A6] bg-[#14B8A6]/10 border border-[#14B8A6]/20 uppercase">
                    Patient Portal
                  </span>
                  <p className="text-white font-bold text-sm mt-1.5">Interactive Home Exercises</p>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7 }}
                className="space-y-5"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-[#14B8A6] border border-teal-500/20 flex items-center justify-center">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">Structured Patient Routines</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Support remote recovery with clear timelines, active target trackers, and performance logs matching therapist specifications.
                </p>
                <ul className="space-y-2.5 font-medium text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#14B8A6]" />
                    Integrated layout matching Doctor Dashboard standards
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#14B8A6]" />
                    Detailed calendar planner tracking session logs
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#14B8A6]" />
                    Interactive guidance scores and recovery status indicators
                  </li>
                </ul>
              </motion.div>
            </div>

          </div>

        </div>
      </section>

      {/* ── SECTION 4: STATISTICS (Glassmorphic Panels) ─────────── */}
      <section id="results" className="px-4 py-24 lg:px-8 border-t border-slate-900 bg-[#020817]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] rounded-full bg-[#14B8A6]/2 blur-[120px] pointer-events-none" />
        
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          className="mx-auto grid max-w-6xl gap-5 grid-cols-2 md:grid-cols-4 relative z-10"
        >
          {stats.map((stat) => (
            <motion.div 
              key={stat.label} 
              variants={fadeUp} 
              className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6 sm:p-8 text-center shadow-lg backdrop-blur-xl hover:border-[#14B8A6]/20 transition-colors relative overflow-hidden"
            >
              <div className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#14B8A6]/40 to-transparent" />
              <p className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                <CountUp value={stat.value} suffix={stat.suffix} />
              </p>
              <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-500">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── SECTION 5: TESTIMONIALS (Frosted Glass Cards) ────────── */}
      <section className="bg-slate-950/20 px-4 py-28 lg:px-8 border-t border-slate-900">
        <div className="relative mx-auto max-w-7xl">
          <SectionIntro
            eyebrow="Clinical validation"
            title="Trusted before a single session is verified."
            description="Professional orthopedics and active diagnostics make remote rehabilitation supervised, reliable, and secure."
          />
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            className="grid gap-6 lg:grid-cols-3"
          >
            {testimonials.map((testimonial) => (
              <motion.div 
                key={testimonial.name} 
                variants={fadeUp} 
                whileHover={{ y: -6 }} 
                className="rounded-2xl border border-slate-800 bg-slate-900/30 p-8 shadow-md backdrop-blur-md hover:border-[#14B8A6]/20 transition-all flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <Quote className="size-8 text-[#14B8A6]" />
                  <p className="text-sm leading-relaxed text-slate-300 italic">"{testimonial.quote}"</p>
                </div>
                <div className="mt-8 border-t border-slate-800/80 pt-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-[#14B8A6] uppercase shrink-0">
                    {testimonial.name.charAt(4)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white leading-none">{testimonial.name}</p>
                    <p className="mt-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER & CTAS ─────────────────────────────────────────── */}
      <section className="px-4 pb-28 lg:px-8 border-t border-slate-900">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6 }}
          className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-b from-[#0F172A] to-[#020817] p-8 text-white shadow-2xl border border-slate-800 md:p-14"
        >
          <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-[#14B8A6]/8 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-[#0ea5e9]/5 blur-3xl" />
          
          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-[#14B8A6]/10 px-3.5 py-1.5 text-[10px] font-black text-[#14B8A6] tracking-wider uppercase backdrop-blur-xl">
                <Shield className="size-3.5" />
                Intelligent Diagnostics Workspace
              </div>
              <h2 className="max-w-3xl text-balance text-3xl font-extrabold tracking-tight md:text-5xl leading-tight">
                Give home rehabilitation the workspace it deserves.
              </h2>
              <p className="max-w-2xl text-xs sm:text-sm leading-relaxed text-slate-400">
                Help doctors guide patients, track range of motion coordinates, and verify remote physiotherapy templates.
              </p>
            </div>
            
            <Link href="/signup">
              <Button size="lg" className="h-12 rounded-full bg-[#14B8A6] hover:bg-[#14b8a6]/95 text-white font-bold px-8 text-xs cursor-pointer shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all">
                Get Started
                <ArrowRight className="size-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER MARKUP ── */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-4 py-12 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-r from-[#14B8A6] to-cyan-500 text-white">
              <Activity className="size-4 text-white" />
            </span>
            <span className="text-sm font-black tracking-tight text-white">PhysioGuide</span>
          </Link>
          <div className="flex flex-wrap gap-x-6 gap-y-2.5 text-xs font-bold text-slate-500">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-white transition">
                {item.label}
              </Link>
            ))}
            <Link href="/login" className="hover:text-white transition">Login</Link>
            <Link href="/signup" className="hover:text-white transition">Signup</Link>
          </div>
          <p className="text-[11px] text-slate-650 font-medium">© 2026 PhysioGuide. All rights reserved.</p>
        </div>
      </footer>

    </div>
  )
}
