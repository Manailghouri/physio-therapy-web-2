import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(req: Request) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Server missing Supabase config" }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Get the session from the Authorization header
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: userError } = await createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ).auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

     const body = await req.json()
const {
  patient_id,
  name,
  exercise_type,
  video_path,
  video_url,
  template,
  notes,
  allow_progression,
  reps,
  sets,
  selected_days,
} = body

const ALL_DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]

const selectedDays: string[] = Array.isArray(selected_days)
  ? selected_days.filter((d: string) => ALL_DAYS.includes(d))
  : []

if (
  !patient_id ||
  !name ||
  !exercise_type ||
  !video_path ||
  !video_url ||
  !template ||
  !reps ||
  !sets ||
  selectedDays.length === 0
) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

const dayCount = selectedDays.length
const frequency =
  dayCount === 7 ? "daily" :
  dayCount === 5 ? "5_times_week" :
  dayCount === 3 ? "3_times_week" :
  dayCount === 1 ? "weekly" :
  "custom"

    // Verify caller is a doctor
    const { data: doctor, error: doctorErr } = await supabaseAdmin
      .from("doctors")
      .select("id")
      .eq("id", user.id)
      .single()

    if (doctorErr || !doctor) {
      return NextResponse.json({ error: "Only doctors can assign exercises" }, { status: 403 })
    }

    // Verify patient belongs to this doctor
    const { data: patient, error: patientErr } = await supabaseAdmin
      .from("patients")
      .select("id")
      .eq("id", patient_id)
      .eq("doctor_id", user.id)
      .single()

    if (patientErr || !patient) {
      return NextResponse.json({ error: "Patient not found or not linked to you" }, { status: 403 })
    }

    // Insert the exercise assignment
    const { data: assignment, error: insertErr } = await supabaseAdmin
      .from("exercise_assignments")
      .insert({
  doctor_id: user.id,
  patient_id,
  name,
  exercise_type,
  video_path,
  video_url,
  template,
  notes: notes || null,
  allow_progression: allow_progression ?? true,

  reps,
  sets,
  frequency,
})
      .select("id")
      .single()

    if (insertErr || !assignment) {
      console.error("[assign] Failed to insert exercise assignment:", insertErr?.message)
      return NextResponse.json({ error: "Failed to assign exercise" }, { status: 500 })
    }

const schedule = ALL_DAYS.map(day => ({
  assignment_id: assignment.id,
  patient_id,
  day_of_week: day,
  is_rest_day: !selectedDays.includes(day),
}))

const { error: scheduleError } = await supabaseAdmin
  .from("exercise_schedule")
  .insert(schedule)

if (scheduleError) {
  console.error("[schedule] Failed:", scheduleError.message)
  return NextResponse.json(
    { error: "Exercise assigned but calendar schedule could not be created." },
    { status: 500 }
  )
}

    return NextResponse.json({ id: assignment.id })
    
  } catch (err: any) {
    console.error("[assign] Unexpected error:", err)
    return NextResponse.json({ error: `Unexpected error: ${err?.message || String(err)}` }, { status: 500 })
  }
}
