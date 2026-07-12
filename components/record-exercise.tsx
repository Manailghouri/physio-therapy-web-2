"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { PoseLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { VideoAnalysisPlayer } from "@/components/video-analysis-player"
import { LearnedTemplateView } from "@/components/learned-template-view"
import { uploadVideoToStorage } from "@/lib/storage"
import { supabase } from "@/utils/supabase/client"
import { analyzeVideoForPose, type PoseAnalysisResult } from "@/lib/pose-analyzer"
import { EXERCISE_CONFIGS, getExerciseConfig } from "@/lib/exercise-config"
import type { PoseV2Template } from "@/lib/template-learner"
import { Switch } from "@/components/ui/switch"
import { formatAngleName } from "@/lib/utils"
import { OneEuroFilter } from "@/lib/filters"
import {
  POSE_CONNECTIONS,
  calculateAllAngles,
  visibilityForAngles,
} from "@/lib/pose-angles"
import { RecordingCoach, type CoachState } from "@/lib/recording-coach"
import { motion, AnimatePresence } from "framer-motion"
import {
  Activity, Clipboard, Camera, Sparkles, Plus, Check,
  AlertTriangle, Play, RefreshCw, Upload, Heart, Dumbbell,
  ShieldCheck, FileText, ChevronRight, CheckCircle2, TrendingUp, Info ,   Loader2 , Target
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────

interface RecordExerciseProps {
  defaultName?: string
  defaultType?: string
  patientId?: string
  onComplete?: () => void
  doneLabel?: string
}

export function RecordExercise({
  defaultName = "",
  defaultType = "knee-extension",
  patientId,
  onComplete,
  doneLabel = "Back to Dashboard",
}: RecordExerciseProps) {
  
  // Steps: "input" (Configure) | "recording" (Record) | "complete" (Analyze & Save)
  const [step, setStep] = useState<"input" | "recording" | "complete">(
    defaultName ? "recording" : "input"
  )

  const [exerciseName, setExerciseName] = useState(defaultName)
  const [exerciseType, setExerciseType] = useState(defaultType)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [allowProgression, setAllowProgression] = useState(true)
  const [reps, setReps] = useState(10)
  const [sets, setSets] = useState(3)
  const ALL_DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
  const [selectedDays, setSelectedDays] = useState<string[]>(["Monday","Tuesday","Wednesday","Thursday","Friday"])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<PoseAnalysisResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Recording Ref handlers
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const [recording, setRecording] = useState(false)
  const [hasVideo, setHasVideo] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  
  // Recording duration in seconds
  const [duration, setDuration] = useState(0)

  // Live MediaPipe overlay + coach references
  const poseRef = useRef<PoseLandmarker | null>(null)
  const rafRef = useRef<number | null>(null)
  const angleFiltersRef = useRef<Map<string, OneEuroFilter>>(new Map())
  const coachRef = useRef<RecordingCoach | null>(null)
  const isRecordingRef = useRef(false)
  const autoStopRef = useRef(false)
  const autoStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const trackedAngles = getExerciseConfig(exerciseType)?.anglesOfInterest ?? []
  const [liveAngles, setLiveAngles] = useState<Record<string, number>>({})
  const [coach, setCoach] = useState<CoachState | null>(null)

  // Timer duration interval
  useEffect(() => {
    let interval: any
    if (recording) {
      setDuration(0)
      interval = setInterval(() => {
        setDuration(prev => prev + 1)
      }, 1000)
    } else {
      clearInterval(interval)
    }
    return () => clearInterval(interval)
  }, [recording])

  const smoothLiveAngles = (
    raw: Record<string, number>,
    timestamp: number,
  ): Record<string, number> => {
    const smoothed: Record<string, number> = {}
    for (const [name, value] of Object.entries(raw)) {
      let filter = angleFiltersRef.current.get(name)
      if (!filter) {
        filter = new OneEuroFilter(1.0, 0.007)
        angleFiltersRef.current.set(name, filter)
      }
      smoothed[name] = filter.filter(value, timestamp)
    }
    return smoothed
  }

  const initPose = async () => {
    if (poseRef.current) return
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm",
    )
    poseRef.current = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputSegmentationMasks: false,
    })
  }

  const startPoseLoop = () => {
    if (!videoRef.current || !canvasRef.current || !poseRef.current) return
    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return
    const drawer = new DrawingUtils(ctx)

    const render = () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      const pose = poseRef.current
      if (!video || !canvas || !pose) return

      if (
        canvas.width !== video.videoWidth ||
        canvas.height !== video.videoHeight
      ) {
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 480
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const ts = performance.now()
      const result = pose.detectForVideo(video, ts)

      if (result.landmarks && result.landmarks.length > 0) {
        const landmarks = result.landmarks[0]
        const smoothed = smoothLiveAngles(calculateAllAngles(landmarks), ts / 1000)
        setLiveAngles(smoothed)

        if (isRecordingRef.current && coachRef.current) {
          const visibility = visibilityForAngles(landmarks, trackedAngles)
          const state = coachRef.current.update(smoothed, visibility, ts / 1000)
          setCoach(state)
          
          if (state.status === "enough" && !autoStopRef.current) {
            autoStopRef.current = true
            clearAutoStopTimer()
            autoStopTimeoutRef.current = setTimeout(() => {
              stopRecording()
            }, 1200)
          }
        }

        drawer.drawConnectors(landmarks, POSE_CONNECTIONS, {
          color: "#14B8A6",
          lineWidth: 5,
        })
        drawer.drawLandmarks(landmarks, {
          radius: 4,
          fillColor: "#14B8A6",
          color: "#0F172A",
          lineWidth: 1.5,
        })
      }

      rafRef.current = requestAnimationFrame(render)
    }

    rafRef.current = requestAnimationFrame(render)
  }

  const stopPoseLoop = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  const clearAutoStopTimer = () => {
    if (autoStopTimeoutRef.current) {
      clearTimeout(autoStopTimeoutRef.current)
      autoStopTimeoutRef.current = null
    }
  }

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
        setHasVideo(true)
        await initPose()
        startPoseLoop()
      }
    } catch (err) {
      console.error("Error accessing webcam:", err)
      alert("Unable to access camera. Please check permissions and try again.")
    }
  }

  const stopWebcam = () => {
    clearAutoStopTimer()
    stopPoseLoop()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    isRecordingRef.current = false
    autoStopRef.current = false
    setRecording(false)
    setHasVideo(false)
    setCoach(null)
    setLiveAngles({})
  }

  const beginCountdownAndRecord = async () => {
    if (!streamRef.current || countdown !== null || recording) return
    for (let n = 3; n >= 1; n--) {
      setCountdown(n)
      await new Promise((r) => setTimeout(r, 1000))
    }
    setCountdown(null)
    startRecording()
  }

  const startRecording = () => {
    if (!streamRef.current) return

    clearAutoStopTimer()
    coachRef.current = new RecordingCoach(
      trackedAngles,
      getExerciseConfig(exerciseType)?.minAmplitudeDegrees ?? 15,
    )
    autoStopRef.current = false
    isRecordingRef.current = false
    setCoach(null)

    chunksRef.current = []
    mediaRecorderRef.current = new MediaRecorder(streamRef.current)

    mediaRecorderRef.current.ondataavailable = (e) => {
      chunksRef.current.push(e.data)
    }

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" })
      handleRecordComplete(blob)
    }

    mediaRecorderRef.current.start()
    isRecordingRef.current = true
    setRecording(true)
  }

  const stopRecording = () => {
    clearAutoStopTimer()
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
      isRecordingRef.current = false
      autoStopRef.current = false
      setRecording(false)
    }
  }

  useEffect(() => {
    return () => {
      clearAutoStopTimer()
      stopPoseLoop()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      if (poseRef.current) {
        poseRef.current.close()
        poseRef.current = null
      }
    }
  }, [])

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith("video/")) {
      setRecordedBlob(file)
      setStep("complete")
    } else {
      alert("Please upload a valid video file")
    }
  }

  const handleRecordComplete = (videoBlob: Blob) => {
    stopWebcam()
    setRecordedBlob(videoBlob)
    setStep("complete")
  }

  const handleSave = async () => {
    if (recordedBlob) {
      setIsAnalyzing(true)

      try {
        const exerciseConfig = getExerciseConfig(exerciseType)
        const anglesOfInterest = exerciseConfig?.anglesOfInterest

        const exerciseInfo = {
          name: exerciseName.trim() || exerciseConfig?.name || "exercise",
          type: exerciseType,
        }

        const result = await analyzeVideoForPose(
          recordedBlob,
          anglesOfInterest,
          exerciseInfo
        )

        const videoName = exerciseName.trim() || exerciseConfig?.name || "exercise"

        if (!patientId) {
          throw new Error("No patient selected. Please select a patient first.")
        }

        const { videoUrl, videoPath } = await uploadVideoToStorage(videoName, recordedBlob, exerciseType)

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error("Session expired. Please log in again.")

        const res = await fetch("/api/exercises/assign", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            patient_id: patientId,
            name: videoName,
            exercise_type: exerciseType,
            video_path: videoPath,
            video_url: videoUrl,
            template: result.learnedTemplate,
            allow_progression: allowProgression,
            reps,
            sets,
            selected_days: selectedDays,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Failed to assign exercise")
        }

        setAnalysisResult(result)

      } catch (error) {
        console.error("Error analyzing video:", error)
        alert(`Error analyzing video: ${error instanceof Error ? error.message : "Unknown error"}`)
      } finally {
        setIsAnalyzing(false)
      }
    }
  }

  // Format timer duration
  const formattedDuration = useMemo(() => {
    const min = Math.floor(duration / 60)
    const sec = duration % 60
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
  }, [duration])

  const stepNumber = step === "input" ? 1 : step === "recording" ? 2 : 3

  return (
    <div className="space-y-6 font-sans text-slate-800 bg-[#F8FAFC] rounded-2xl overflow-hidden p-8">
      
      {/* ── Compact Header ── */}
      <header className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-black text-slate-900 leading-none">Assign Rehabilitation Exercise</h2>
          <p className="text-[11px] text-slate-500 mt-1.5 leading-none">
            Create a rehabilitation exercise and record a reference movement.
          </p>
        </div>
        
        {/* Compact Stepper Indicator */}
        <StepIndicator currentStep={stepNumber} />
      </header>

      {/* ── Content Container ── */}
      <div>
        <AnimatePresence mode="wait">
          
          {/* ── STEP 1: CONFIGURATION (70/30 Split Layout) ──────────── */}
          {step === "input" && (
            <motion.div
              key="step-input"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              
              <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
                
                {/* Left Column (70%): Exercise Configuration Card */}
                <Card className="lg:col-span-7 p-8 border border-slate-100 bg-white shadow-sm rounded-2xl space-y-6">
                  
                  <div className="space-y-4 text-xs font-bold text-slate-500">
                    
                    {/* Exercise Type (Select) */}
                    <div className="space-y-1.5">
                      <label className="uppercase tracking-wider">Exercise Type</label>
                      <select
                        value={exerciseType}
                        onChange={(e) => setExerciseType(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 h-[52px] text-sm focus:ring-1 focus:ring-[#14B8A6] outline-none font-medium text-slate-800 shadow-sm"
                      >
                        {EXERCISE_CONFIGS.map((config) => (
                          <option key={config.id} value={config.id}>
                            {config.name}
                          </option>
                        ))}
                      </select>
                      <div className="text-[10px] text-slate-400 leading-normal bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2 font-medium">
                        {getExerciseConfig(exerciseType)?.description}
                      </div>
                    </div>

                    {/* Exercise Name */}
                    <div className="space-y-1.5">
                      <label className="uppercase tracking-wider">Exercise Name</label>
                      <Input
                        placeholder="e.g., Morning Knee Extension Routine"
                        value={exerciseName}
                        onChange={(e) => setExerciseName(e.target.value)}
                        className="border-slate-200 text-sm focus:ring-1 focus:ring-[#14B8A6] h-[52px] px-4 rounded-xl shadow-sm text-slate-800 font-medium placeholder-slate-400"
                      />
                    </div>

                    {/* Side-by-Side Reps & Sets with Metric Boxes */}
                    <div className="grid grid-cols-2 gap-4">
                      
                      <div className="space-y-1.5">
                        <label className="uppercase tracking-wider">Repetitions</label>
                        <div className="relative flex items-center justify-center border border-slate-200 rounded-xl bg-white shadow-sm focus-within:ring-2 focus-within:ring-[#14B8A6]/20 transition-all h-[52px]">
                          <input
                            type="number"
                            min={1}
                            value={reps}
                            onChange={(e) => setReps(Number(e.target.value))}
                            className="w-full text-center text-lg font-black text-slate-900 focus:outline-none bg-transparent"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="uppercase tracking-wider">Sets</label>
                        <div className="relative flex items-center justify-center border border-slate-200 rounded-xl bg-white shadow-sm focus-within:ring-2 focus-within:ring-[#14B8A6]/20 transition-all h-[52px]">
                          <input
                            type="number"
                            min={1}
                            value={sets}
                            onChange={(e) => setSets(Number(e.target.value))}
                            className="w-full text-center text-lg font-black text-slate-900 focus:outline-none bg-transparent"
                          />
                        </div>
                      </div>

                    </div>

                    {/* Day Picker */}
                    <div className="space-y-1.5">
                      <label className="uppercase tracking-wider">Schedule Days</label>
                      <div className="flex flex-wrap gap-2">
                        {ALL_DAYS.map(day => {
                          const short = day.slice(0, 3)
                          const active = selectedDays.includes(day)
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                setSelectedDays(prev =>
                                  active ? prev.filter(d => d !== day) : [...prev, day]
                                )
                              }}
                              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                                active
                                  ? "bg-[#14B8A6] text-white border-[#14B8A6] shadow-sm"
                                  : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              {short}
                            </button>
                          )
                        })}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {selectedDays.length === 0
                          ? "Select at least one day"
                          : `${selectedDays.length} day${selectedDays.length !== 1 ? "s" : ""} selected`}
                      </p>
                    </div>

                  </div>
                </Card>

                {/* Right Column (30%): Compact Exercise Summary */}
                <div className="lg:col-span-3 flex flex-col justify-between h-full space-y-6">
                  
                  <Card className="p-8 border border-slate-100 bg-white shadow-sm rounded-2xl space-y-6 flex-1">
                    <div className="border-b border-slate-100 pb-2 mb-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-450">Exercise Summary</h3>
                    </div>

                    <div className="space-y-4 text-xs font-semibold text-slate-600">
                      <div className="flex flex-col">
                        <span className="text-slate-400 font-medium">Exercise Type</span>
                        <span className="text-slate-900 font-bold mt-0.5">{getExerciseConfig(exerciseType)?.name || "Knee Extension"}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-400 font-medium">Prescription</span>
                        <span className="text-slate-900 font-bold mt-0.5">{reps} Reps &times; {sets} Sets</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-400 font-medium">Schedule</span>
                        <span className="text-slate-900 font-bold capitalize mt-0.5">
                          {selectedDays.length === 0
                            ? "No days selected"
                            : selectedDays.map(d => d.slice(0, 3)).join(", ")}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-400 font-medium">Progression</span>
                        <span className={`font-bold mt-0.5 ${allowProgression ? "text-[#14B8A6]" : "text-slate-500"}`}>
                          {allowProgression ? "Enabled" : "Strict ROM Lock"}
                        </span>
                      </div>
                    </div>
                  </Card>

                </div>

              </div>

              {/* Compact Progressive Recovery Card (Placed directly below the form split) */}
              <div
                onClick={() => setAllowProgression(!allowProgression)}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 cursor-pointer shadow-sm ${
                  allowProgression 
                    ? "border-[#14B8A6] bg-[#14B8A6]/5" 
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`p-2 rounded-xl shrink-0 ${
                    allowProgression ? "bg-[#14B8A6]/10 text-[#14B8A6]" : "bg-slate-100 text-slate-400"
                  }`}>
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="font-sans">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Progressive Recovery</h4>
                    <p className="text-[10px] text-slate-550 mt-1 leading-snug">
                      Allow patient progression beyond baseline movement.
                    </p>
                  </div>
                </div>

                <Switch
                  id="allow-progression"
                  checked={allowProgression}
                  onCheckedChange={setAllowProgression}
                  className="data-[state=checked]:bg-[#14B8A6] scale-90 shrink-0"
                />
              </div>

              {/* Navigation button positioned below form, full width */}
              <Button
                onClick={() => setStep("recording")}
                className="w-full bg-[#14B8A6] hover:bg-[#14B8A6]/90 text-white font-bold text-xs h-[52px] rounded-xl shadow shadow-[#14B8A6]/10 group"
              >
                Start Recording <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>

            </motion.div>
          )}

          {/* ── STEP 2: RECORD MOVEMENT SECTION ───────────────────── */}
          {step === "recording" && (
            <motion.div
              key="step-recording"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
              className="space-y-6 font-sans"
            >
              
              <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
                
                {/* Left (70%): Camera feed monitor container */}
                <Card className="lg:col-span-7 p-6 border border-slate-100 bg-white shadow-md rounded-2xl space-y-4">
                  <div className="relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    <canvas
                      ref={canvasRef}
                      className="absolute top-0 left-0 w-full h-full pointer-events-none scale-x-[-1]"
                    />

                    {/* Countdown Overlay Screen */}
                    <AnimatePresence>
                      {countdown !== null && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm z-30"
                        >
                          <motion.div
                            key={countdown}
                            initial={{ scale: 0.3, opacity: 0 }}
                            animate={{ scale: [1, 1.2, 1], opacity: 1 }}
                            transition={{ duration: 0.8 }}
                            className="text-[#14B8A6] text-8xl font-black font-mono tracking-tighter"
                          >
                            {countdown}
                          </motion.div>
                          <p className="text-white text-xs font-bold tracking-wider uppercase mt-4">Position camera frame...</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Red Recording Pill */}
                    {recording && (
                      <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-red-500/30 rounded-full px-3 py-1 text-white font-bold font-mono text-[10px]">
                        <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                        <span>REC &middot; {formattedDuration}</span>
                      </div>
                    )}

                    {/* AI tracking status indicator */}
                    {hasVideo && (
                      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-black/60 backdrop-blur-md border border-[#14B8A6]/20 rounded-full px-3 py-1 text-white font-bold text-[9px] tracking-wide uppercase">
                        <Activity className="w-3.5 h-3.5 text-[#14B8A6] animate-pulse" /> Motion analysis active
                      </div>
                    )}

                    {/* Smart hints coaching bar overlay */}
                    {recording && coach && (
                      <div className="absolute bottom-4 left-4 right-4">
                        <div
                          className={`rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-sm ${
                            coach.status === "enough"
                              ? "bg-emerald-600/90"
                              : coach.status === "keep-going" || coach.status === "no-reps"
                                ? "bg-amber-600/90"
                                : "bg-red-600/90"
                          }`}
                        >
                          {coach.message}
                        </div>
                        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/20">
                          <div
                            className="h-full bg-emerald-400 transition-all duration-300"
                            style={{ width: `${Math.round(coach.progress * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Trigger buttons controls */}
                  <div className="flex gap-3">
                    {!hasVideo ? (
                      <Button
                        onClick={startWebcam}
                        className="flex-1 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs h-11 gap-1.5 rounded-xl"
                      >
                        <Camera className="w-4 h-4" /> Start Webcam Stream
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={stopWebcam}
                          variant="outline"
                          disabled={recording || countdown !== null}
                          className="flex-1 border-slate-200 text-slate-700 font-bold text-xs h-11 rounded-xl"
                        >
                          Tear Down Webcam
                        </Button>

                        {!recording ? (
                          <Button
                            onClick={beginCountdownAndRecord}
                            disabled={countdown !== null}
                            className="flex-1 bg-[#14B8A6] hover:bg-[#14B8A6]/90 text-white font-bold text-xs h-11 gap-1.5 rounded-xl"
                          >
                            {countdown !== null ? `Starting...` : "Start Recording"}
                          </Button>
                        ) : (
                          <Button
                            onClick={stopRecording}
                            variant="secondary"
                            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-11 rounded-xl"
                          >
                            Stop Capture
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </Card>

                {/* Right (30%): Live Gauges & Tracked angles */}
                <Card className="lg:col-span-3 p-6 border border-slate-100 bg-white shadow-md rounded-2xl space-y-6 min-h-[300px]">
                  <div className="border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-black text-slate-450 uppercase tracking-wider">Live Analytics Panel</h3>
                  </div>

                  {hasVideo && trackedAngles.length > 0 ? (
                    <div className="space-y-6">
                      
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 p-3 rounded-xl">
                        <span>Pose tracking status:</span>
                        <span className="text-emerald-600 flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Live calibration locked
                        </span>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Recording Coach</p>
                            <span
                              className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                                coach?.status === "enough"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : coach?.status === "keep-going" || coach?.status === "no-reps"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {coach?.status ? coach.status.replace(/-/g, " ") : "waiting"}
                            </span>
                          </div>

                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-[#14B8A6] transition-all duration-300"
                              style={{ width: `${Math.round((coach?.progress ?? 0) * 100)}%` }}
                            />
                          </div>

                          <p className="mt-2 text-[11px] leading-snug text-slate-600">
                            {coach?.message ?? "Start recording and the coach will tell you when the movement looks usable."}
                          </p>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-500">
                            <div className="rounded-lg bg-white p-2">
                              Reps
                              <span className="mt-0.5 block font-black text-slate-900">{coach?.reps ?? 0}</span>
                            </div>
                            <div className="rounded-lg bg-white p-2">
                              Primary
                              <span className="mt-0.5 block font-black text-slate-900">
                                {coach?.primaryAngle ? formatAngleName(coach.primaryAngle) : "—"}
                              </span>
                            </div>
                            <div className="rounded-lg bg-white p-2">
                              Visibility
                              <span className="mt-0.5 block font-black text-slate-900">
                                {coach ? `${Math.round((coach.visibility ?? 0) * 100)}%` : "—"}
                              </span>
                            </div>
                            <div className="rounded-lg bg-white p-2">
                              Auto-stop
                              <span className="mt-0.5 block font-black text-slate-900">
                                {coach?.status === "enough" ? "Ready" : "On"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Tracked Joint Coordinates</p>
                        {trackedAngles.map((angle) => {
                          const rawVal = liveAngles[angle]
                          const hasVal = rawVal !== undefined
                          const val = hasVal ? Math.round(rawVal) : 0

                          return (
                            <div key={angle} className="space-y-2 text-xs font-medium text-slate-600">
                              <div className="flex justify-between">
                                <span>{formatAngleName(angle)}</span>
                                <span className={hasVal ? "font-mono font-black text-[#14B8A6]" : "text-slate-400"}>
                                  {hasVal ? `${val}°` : "waiting..."}
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#14B8A6] rounded-full transition-all duration-75"
                                  style={{ width: `${hasVal ? Math.min(100, (val / 180) * 100) : 0}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>

                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-center space-y-2">
                      <Activity className="w-8 h-8 text-slate-205 animate-pulse" />
                      <p className="text-[10px] text-slate-400 font-semibold max-w-[180px]">
                        Webcam feed calibration will plot coordinate meters inside this panel.
                      </p>
                    </div>
                  )}
                </Card>
              </div>

              {/* Upload clip fallback */}
              <div className="relative my-6 max-w-lg mx-auto">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-black tracking-wider text-slate-455">
                  <span className="bg-[#F8FAFC] px-3 font-sans">Or upload pre-recorded video</span>
                </div>
              </div>

              <div className="space-y-2 max-w-sm mx-auto">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-slate-250 text-slate-700 text-xs h-10 rounded-xl gap-1.5 font-bold"
                >
                  <Upload className="w-4 h-4 text-slate-500" /> Upload video template file
                </Button>
              </div>

            </motion.div>
          )}

          {/* ── STEP 3: ANALYZE AND SAVE VIEW ───────────────────────── */}
          {step === "complete" && recordedBlob && (
            <motion.div
              key="step-complete"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              
              {/* Spinner loader layout */}
              {isAnalyzing && (
                <Card className="p-8 border-slate-100 bg-white shadow-md flex flex-col items-center justify-center text-center space-y-4 min-h-[320px] rounded-2xl">
                  <Loader2 className="w-12 h-12 text-[#14B8A6] animate-spin" />
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm mb-1.5">Analyzing Biomechanical Pattern...</h3>
                    <p className="text-xs text-slate-500 leading-snug max-w-sm mx-auto">
                      Pose detection networks are calculating joint thresholds and modeling target template coordinates.
                    </p>
                  </div>
                </Card>
              )}

              {/* Complete analytics layout */}
              {!isAnalyzing && (
                <div className="space-y-6">
                  
                  {analysisResult ? (
                    <div className="space-y-6 font-sans">
                      
                      {/* Success indicator widgets */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-xs">
                        <SuccessGridCard title="Analysis Complete" desc="Pose mapped successfully" icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} />
                        <SuccessGridCard title="ROM Curve Learned" desc="Reference limits set" icon={<Sparkles className="w-4 h-4 text-[#14B8A6]" />} />
                        <SuccessGridCard title="Angles Mapped" desc={`${trackedAngles.length} targets active`} icon={<Target className="w-4 h-4 text-purple-500" />} />
                        <SuccessGridCard title="Protocol Assigned" desc="Assigned to patient file" icon={<ShieldCheck className="w-4 h-4 text-blue-500" />} />
                      </div>

                      {/* Video Player */}
                      <Card className="p-6 border-slate-100 bg-white shadow-md rounded-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Calibration Video Review</h4>
                          <span className="text-[10px] text-slate-450 font-bold">Keyframe Analysis Tracker</span>
                        </div>

                        <VideoAnalysisPlayer
                          videoBlob={recordedBlob}
                          movements={analysisResult.movements}
                          anglesOfInterest={getExerciseConfig(exerciseType)?.anglesOfInterest}
                          autoPlay
                        />
                      </Card>

                      {analysisResult.learnedTemplate && (
                        <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm space-y-3">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Learned Range parameters</h4>
                          <LearnedTemplateView template={analysisResult.learnedTemplate} />
                        </div>
                      )}

                      {/* Finish button */}
                      <Button
                        onClick={() => onComplete?.()}
                        className="w-full bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs h-12 rounded-xl shadow"
                      >
                        {doneLabel}
                      </Button>

                    </div>
                  ) : (
                    <div className="space-y-4 text-center max-w-sm mx-auto p-8 bg-white border border-slate-150 rounded-2xl shadow-md font-sans">
                      <Heart className="w-10 h-10 text-[#14B8A6] mx-auto mb-3 animate-pulse" />
                      <h3 className="font-bold text-slate-900 text-sm">Webcam capture complete</h3>
                      <p className="text-xs text-slate-500 leading-relaxed mb-6">
                        Rehabilitation video has been captured. Proceed to trigger pose analytics models.
                      </p>
                      
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={handleSave}
                          className="w-full bg-[#14B8A6] hover:bg-[#14B8A6]/90 text-white font-bold text-xs h-11 rounded-xl shadow"
                        >
                          Analyze & Save Exercise
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setRecordedBlob(null)
                            setStep("recording")
                          }}
                          className="w-full border-slate-200 text-slate-700 text-xs h-11 rounded-xl"
                        >
                          Record Again
                        </Button>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  )
}

// ── Minimal StepIndicator ───────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 select-none bg-slate-50 border border-slate-100 px-3.5 py-1.5 rounded-full shrink-0">
      <span className={currentStep === 1 ? "text-[#14B8A6]" : currentStep > 1 ? "text-emerald-500" : ""}>
        ● Configure
      </span>
      <span className="text-slate-300">&rarr;</span>
      <span className={currentStep === 2 ? "text-[#14B8A6]" : currentStep > 2 ? "text-emerald-500" : ""}>
        {currentStep >= 2 ? "●" : "○"} Record
      </span>
      <span className="text-slate-300">&rarr;</span>
      <span className={currentStep === 3 ? "text-[#14B8A6]" : ""}>
        {currentStep === 3 ? "●" : "○"} Analyze
      </span>
    </div>
  )
}

// ── SuccessGridCard ─────────────────────────────────────────────

function SuccessGridCard({
  title, desc, icon
}: {
  title: string
  desc: string
  icon: React.ReactNode
}) {
  return (
    <div className="p-4 rounded-2xl border border-slate-150 bg-white shadow-sm flex flex-col items-center justify-center hover:shadow transition-shadow">
      <div className="p-1 rounded bg-slate-50 border border-slate-100 mb-2 shrink-0">
        {icon}
      </div>
      <h5 className="font-bold text-[11px] text-slate-900 leading-none mb-1">{title}</h5>
      <p className="text-[9px] text-slate-400 font-medium leading-none">{desc}</p>
    </div>
  )
}
