import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Headphones,
  LockKeyhole,
  Mail,
  Plus,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  evaluateSchedule,
  findCourseOverlaps,
  generateProposals,
  hasWorkConflict,
  toMinutes,
  WEEK_DAYS,
  type Course,
  type WeekDay,
} from "@/lib/cuadra-schedule";
import { INITIAL_CUADRA_STATE, toggleDay, useCuadra, type CuadraView } from "@/lib/cuadra-state";
import studentArtwork from "@/assets/cuadra-estudiante.jpg";

const STEPS: { view: CuadraView; title: string }[] = [
  { view: "availability", title: "Disponibilidad" },
  { view: "courses", title: "Cursos" },
  { view: "preferences", title: "Preferencias" },
  { view: "proposals", title: "Propuestas" },
];

function formatTime(value: string) {
  const [rawHours, minutes] = value.split(":").map(Number);
  const hours = rawHours ?? 0;
  const suffix = hours < 12 ? "a. m." : "p. m.";
  const clock = hours % 12 || 12;
  return `${String(clock).padStart(2, "0")}:${String(minutes ?? 0).padStart(2, "0")} ${suffix}`;
}

function timeOptions() {
  return Array.from({ length: 33 }, (_, index) => {
    const total = 6 * 60 + index * 30;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  });
}

function Brand() {
  return (
    <span className="inline-flex items-center gap-2.5 text-primary">
      <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
        <GraduationCap className="size-5" aria-hidden="true" />
      </span>
      <span className="text-[15px] font-bold tracking-[0.14em]">CUADRA</span>
    </span>
  );
}

function DayButtons({
  selected,
  onToggle,
  label,
}: {
  selected: WeekDay[];
  onToggle: (day: WeekDay) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" aria-label={label}>
      {WEEK_DAYS.map((day) => (
        <Button
          key={day}
          type="button"
          variant={selected.includes(day) ? "default" : "outline"}
          size="sm"
          aria-pressed={selected.includes(day)}
          onClick={() => onToggle(day)}
          className="min-w-12"
        >
          {day}
        </Button>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-foreground">
      {label}
      {children}
    </label>
  );
}

function TimePicker({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={ariaLabel} className="h-11 bg-background">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {timeOptions().map((time) => (
          <SelectItem value={time} key={time}>
            {formatTime(time)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function TopBar() {
  const { state, update } = useCuadra();
  // El logo e "Inicio" siempre llevan a la portada, aunque ya estés registrado.
  const goHome = () => update({ view: "welcome" });
  const goMySpace = () => update({ view: state.saved ? "schedule" : "availability" });
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 sm:flex sm:justify-between sm:px-8">
        <Button variant="ghost" className="h-auto justify-start px-0 hover:bg-transparent" onClick={goHome} aria-label="CUADRA, ir al inicio">
          <Brand />
        </Button>
        <nav aria-label="Navegación principal" className="flex items-center gap-1 sm:gap-3">
          <Button variant="ghost" size="sm" onClick={goHome} className="px-2 sm:px-3">
            Inicio
          </Button>
          <Button variant="ghost" size="sm" onClick={() => update({ returnView: state.view, view: "help" })} className="px-2 sm:px-3">
            Ayuda
          </Button>
          {state.registered && (
            <Button variant="ghost" size="sm" onClick={goMySpace} className="hidden gap-1.5 border-l border-border pl-3 text-xs font-medium text-muted-foreground sm:inline-flex">
              <CheckCircle2 className="size-4 text-success" /> Mi espacio
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}

function Progress({ view }: { view: CuadraView }) {
  const current = view === "schedule" || view === "plan-b" ? 4 : Math.max(0, STEPS.findIndex((step) => step.view === view) + 1);
  const isComplete = view === "schedule";
  return (
    <nav aria-label="Progreso del horario" className="mx-auto mb-9 w-full max-w-3xl px-2">
      <ol className="grid grid-cols-4">
        {STEPS.map((step, index) => {
          const complete = isComplete || index + 1 < current;
          const active = !isComplete && index + 1 === current;
          return (
            <li key={step.view} className="relative flex flex-col items-center gap-2 text-center">
              {index > 0 && (
                <span className={`absolute right-1/2 top-[15px] h-px w-full ${complete || active ? "bg-primary" : "bg-border"}`} />
              )}
              <span className={`relative z-10 grid size-[30px] place-items-center rounded-full border text-xs font-bold ${complete || active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"}`}>
                {complete ? <Check className="size-4" /> : index + 1}
              </span>
              <span className={`text-[11px] font-medium sm:text-xs ${active || complete ? "text-foreground" : "text-muted-foreground"}`}>
                {step.title}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Welcome() {
  const { state, update } = useCuadra();
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const start = () => update({ registered: true, view: "availability" });
  const logout = () => {
    if (window.confirm("Se cerrará tu sesión y se borrarán los datos guardados en este dispositivo. ¿Continuar?")) {
      update({ ...INITIAL_CUADRA_STATE });
    }
  };
  const submitEmail = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || password.length < 6) return;
    setEmailOpen(false);
    start();
  };

  return (
    <>
      <section className="mx-auto grid min-h-[calc(100svh-64px)] max-w-6xl items-center gap-8 px-4 py-8 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:py-10">
        <div className="relative mx-auto w-full max-w-xl overflow-hidden rounded-lg bg-class-soft">
          <img
            src={studentArtwork}
            alt="Estudiante organizando sus clases junto a un calendario y un reloj"
            width={1280}
            height={1024}
            fetchPriority="high"
            className="aspect-[1.25/1] w-full object-cover"
          />
          <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-md bg-background/90 px-3 py-2 text-xs font-semibold text-primary shadow-panel sm:bottom-6 sm:left-6 sm:text-sm">
            <CalendarDays className="size-4" /> Tus semanas, mejor organizadas
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-md flex-col items-center text-center lg:items-start lg:text-left">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-class-soft px-3 py-1.5 text-xs font-semibold text-primary">
            <CalendarDays className="size-4" /> Tu tiempo también cuenta
          </span>
          <h1 className="text-balance text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            Cuadra tu estudio con tu trabajo
          </h1>
          <p className="mt-4 max-w-sm text-base leading-7 text-muted-foreground">
            Organiza tus horarios y encuentra la mejor combinación.
          </p>
          <div className="mt-7 grid w-full gap-3">
            {state.registered ? (
              <>
                <Button className="h-12 w-full" onClick={() => update({ view: state.saved ? "schedule" : "availability" })}>
                  {state.saved ? "Ver mi horario" : "Continuar con mi horario"} <ArrowRight />
                </Button>
                <Button variant="outline" className="h-12 w-full" onClick={logout}>
                  Cerrar sesión
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="google-signin h-12 w-full justify-center gap-3" onClick={start}>
                  <GoogleMark /> Continuar con Google
                </Button>
                <Button className="h-12 w-full" onClick={() => setEmailOpen(true)}>
                  <Mail className="size-4" /> Registrarme con correo
                </Button>
              </>
            )}
          </div>
          <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
            <LockKeyhole className="size-3.5" /> Tus datos laborales son solo tuyos
          </p>
        </div>
      </section>
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear tu cuenta de Cuadra</DialogTitle>
            <DialogDescription>Usa tu correo para empezar a armar tu horario.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitEmail} className="grid gap-4">
            <Field label="Correo electrónico">
              <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@correo.com" />
            </Field>
            <Field label="Contraseña (mínimo 6 caracteres)">
              <Input type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} />
            </Field>
            <DialogFooter>
              <Button type="submit" className="w-full sm:w-auto">Crear cuenta</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
    </svg>
  );
}

function PageFrame({ children, view, eyebrow, title, description }: {
  children: React.ReactNode;
  view: CuadraView;
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <main className="mx-auto min-h-[calc(100svh-64px)] max-w-5xl px-4 py-8 sm:px-8 sm:py-10">
      {view !== "welcome" && view !== "help" && <Progress view={view} />}
      <div className="mx-auto max-w-3xl">
        <div className="mb-7">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-primary">{eyebrow}</p>
          <h1 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
        </div>
        {children}
      </div>
    </main>
  );
}

function AvailabilityStep() {
  const { state, update } = useCuadra();
  const work = state.availability;
  const updateWork = (patch: Partial<typeof work>) => update({ availability: { ...work, ...patch }, saved: false });
  return (
    <PageFrame view="availability" eyebrow="Paso 1 de 4" title="¿Cuál es tu horario de trabajo?" description="Cuéntanos cuándo trabajas para evitar cruces con tus clases.">
      <div className="grid gap-6 rounded-lg border border-border bg-card p-5 shadow-panel sm:p-7">
        <div className="grid gap-2">
          <h2 className="text-sm font-semibold">Tipo de horario</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {([
              ["fijo", "Horario fijo", CalendarDays],
              ["rotativo", "Rotativo", Clock3],
              ["variable", "Variable", ShieldCheck],
            ] as const).map(([value, label, Icon]) => (
              <Button
                key={value}
                type="button"
                variant={work.type === value ? "default" : "outline"}
                onClick={() => updateWork({ type: value })}
                aria-pressed={work.type === value}
                className="h-auto min-h-14 justify-start gap-3 py-3 sm:justify-center"
              >
                <Icon className="size-4" /> {label}
              </Button>
            ))}
          </div>
        </div>
        <div className="grid gap-2">
          <h2 className="text-sm font-semibold">Días que trabajas</h2>
          <DayButtons selected={work.days} label="Días de trabajo" onToggle={(day) => updateWork({ days: toggleDay(work.days, day) })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Hora de entrada">
            <TimePicker value={work.startTime} ariaLabel="Hora de entrada" onChange={(startTime) => updateWork({ startTime })} />
          </Field>
          <Field label="Hora de salida">
            <TimePicker value={work.endTime} ariaLabel="Hora de salida" onChange={(endTime) => updateWork({ endTime })} />
          </Field>
        </div>
        <Field label="Tiempo de traslado (opcional)">
          <Select value={String(work.commute)} onValueChange={(value) => updateWork({ commute: Number(value) })}>
            <SelectTrigger aria-label="Tiempo de traslado" className="h-11 bg-background sm:max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[15, 30, 45, 60].map((minutes) => <SelectItem key={minutes} value={String(minutes)}>{minutes} min</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <div className="flex justify-end border-t border-border pt-5">
          <Button onClick={() => update({ view: "courses" })}>Continuar <ArrowRight /></Button>
        </div>
      </div>
    </PageFrame>
  );
}

function CourseCard({ course, onRemove }: { course: Course; onRemove: () => void }) {
  return (
    <article className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-md border border-border border-l-4 border-l-class bg-card p-4 shadow-sm">
      <div className="min-w-0">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
          <h2 className="truncate font-semibold text-foreground">{course.name}</h2>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${course.mandatory ? "bg-class-soft text-primary" : "bg-muted text-muted-foreground"}`}>
            {course.mandatory ? "Obligatorio" : "Opcional"}
          </span>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Sección: {course.section} <span aria-hidden="true">|</span> {course.days.join(" · ")}
          <br />{formatTime(course.startTime)} – {formatTime(course.endTime)} <span aria-hidden="true">·</span> {course.credits} créditos
        </p>
        {course.demo && <p className="mt-2 text-[11px] font-medium text-muted-foreground">Materia adicional de ejemplo</p>}
      </div>
      <Button variant="ghost" size="icon" aria-label={`Eliminar ${course.name}`} title={`Eliminar ${course.name}`} onClick={onRemove} className="text-muted-foreground hover:text-destructive">
        <Trash2 className="size-4" />
      </Button>
    </article>
  );
}

function CourseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { state, update } = useCuadra();
  const [name, setName] = useState("");
  const [section, setSection] = useState("");
  const [days, setDays] = useState<WeekDay[]>([]);
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");
  const [credits, setCredits] = useState("3");
  const [mandatory, setMandatory] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !section.trim() || days.length === 0 || toMinutes(endTime) <= toMinutes(startTime)) return;
    const course: Course = {
      id: `curso-${crypto.randomUUID()}`,
      name: name.trim(), section: section.trim(), days, startTime, endTime, credits: Number(credits), mandatory,
    };
    update({ courses: [...state.courses, course], saved: false });
    setName(""); setSection(""); setDays([]); setMandatory(false); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar curso</DialogTitle>
          <DialogDescription>Agrega los días y la sección de tu curso.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Nombre del curso"><Input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Álgebra" /></Field>
          <Field label="Sección"><Input required value={section} onChange={(event) => setSection(event.target.value)} placeholder="Ej. A1" /></Field>
          <Field label="Días"><DayButtons selected={days} label="Días del curso" onToggle={(day) => setDays((current) => toggleDay(current, day))} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hora de inicio"><TimePicker value={startTime} ariaLabel="Hora de inicio del curso" onChange={setStartTime} /></Field>
            <Field label="Hora de fin"><TimePicker value={endTime} ariaLabel="Hora de fin del curso" onChange={setEndTime} /></Field>
          </div>
          <Field label="Créditos">
            <Select value={credits} onValueChange={setCredits}><SelectTrigger aria-label="Créditos"><SelectValue /></SelectTrigger><SelectContent>{[1, 2, 3, 4, 5, 6].map((value) => <SelectItem key={value} value={String(value)}>{value} créditos</SelectItem>)}</SelectContent></Select>
          </Field>
          <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
            <Checkbox checked={mandatory} onCheckedChange={(checked) => setMandatory(checked === true)} /> Curso obligatorio
          </label>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">Agregar curso</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CoursesStep() {
  const { state, update } = useCuadra();
  const [open, setOpen] = useState(false);
  const removeCourse = (id: string) => {
    update({ courses: state.courses.filter((course) => course.id !== id), saved: false });
  };
  return (
    <PageFrame view="courses" eyebrow="Paso 2 de 4" title="¿Cuáles son tus cursos?" description="Agrega los cursos que quieres considerar para tu horario.">
      <div className="grid gap-3">
        {state.courses.map((course) => <CourseCard key={course.id} course={course} onRemove={() => removeCourse(course.id)} />)}
        {state.courses.length === 0 && <div className="rounded-lg border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">Todavía no has agregado cursos.</div>}
        <div className="flex flex-col-reverse justify-between gap-3 border-t border-border pt-5 sm:flex-row">
          <Button variant="outline" onClick={() => setOpen(true)}><Plus /> Agregar curso</Button>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => update({ view: "availability" })}><ArrowLeft /> Atrás</Button>
            <Button onClick={() => update({ view: "preferences" })}>Continuar <ArrowRight /></Button>
          </div>
        </div>
      </div>
      <CourseDialog open={open} onOpenChange={setOpen} />
    </PageFrame>
  );
}

function PreferencesStep() {
  const { state, update } = useCuadra();
  const preferences = state.preferences;
  const updatePreferences = (patch: Partial<typeof preferences>) => update({ preferences: { ...preferences, ...patch }, saved: false });
  return (
    <PageFrame view="preferences" eyebrow="Paso 3 de 4" title="Tus preferencias" description="Cuéntanos qué hace que un horario funcione mejor para ti.">
      <div className="grid gap-6 rounded-lg border border-border bg-card p-5 shadow-panel sm:p-7">
        <Field label="¿Cuántos cursos deseas llevar?">
          <Select value={String(preferences.courseCount)} onValueChange={(value) => updatePreferences({ courseCount: Number(value) })}>
            <SelectTrigger aria-label="Cantidad de cursos" className="h-11 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>{Array.from({ length: 8 }, (_, index) => index + 1).map((count) => <SelectItem key={count} value={String(count)}>{count} {count === 1 ? "curso" : "cursos"}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-4 text-sm">
          <Checkbox checked={preferences.avoidNights} onCheckedChange={(checked) => updatePreferences({ avoidNights: checked === true })} className="mt-0.5" />
          <span><span className="block font-semibold">Evitar clases nocturnas</span><span className="mt-1 block text-xs text-muted-foreground">Después de las 9 p. m.</span></span>
        </label>
        <div className="grid gap-2">
          <h2 className="text-sm font-semibold">¿Tienes días libres?</h2>
          <p className="text-xs text-muted-foreground">Marca los días que prefieres dejar sin clases.</p>
          <DayButtons selected={preferences.freeDays} label="Días libres preferidos" onToggle={(day) => updatePreferences({ freeDays: toggleDay(preferences.freeDays, day) })} />
        </div>
        <Field label="Descanso mínimo entre trabajo y clase">
          <Select value={String(preferences.minimumRest)} onValueChange={(value) => updatePreferences({ minimumRest: Number(value) })}>
            <SelectTrigger aria-label="Descanso mínimo" className="h-11 bg-background sm:max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{[0, 1, 2, 3, 4].map((hours) => <SelectItem key={hours} value={String(hours)}>{hours} {hours === 1 ? "hora" : "horas"}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <div className="flex flex-col-reverse justify-between gap-3 border-t border-border pt-5 sm:flex-row">
          <Button variant="outline" onClick={() => update({ view: "courses" })}><ArrowLeft /> Atrás</Button>
          <Button onClick={() => update({ view: "proposals", proposalIndex: 0 })}>Ver propuestas <ArrowRight /></Button>
        </div>
      </div>
    </PageFrame>
  );
}

const CALENDAR_SLOTS = [
  { label: "8–10 a. m.", start: 8 * 60, end: 10 * 60 },
  { label: "10–12 m.", start: 10 * 60, end: 12 * 60 },
  { label: "12–2 p. m.", start: 12 * 60, end: 14 * 60 },
  { label: "2–5 p. m.", start: 14 * 60, end: 17 * 60 },
  { label: "6–8 p. m.", start: 18 * 60, end: 20 * 60 },
  { label: "8–10 p. m.", start: 20 * 60, end: 22 * 60 },
];

function getCell(day: WeekDay, slotStart: number, slotEnd: number, courses: Course[], state: ReturnType<typeof useCuadra>["state"]) {
  const classesInSlot = courses.filter((course) => course.days.includes(day) && toMinutes(course.startTime) < slotEnd && toMinutes(course.endTime) > slotStart);
  const classInSlot = classesInSlot[0];
  if (classesInSlot.length > 1 && findCourseOverlaps(classesInSlot).some((item) => item.day === day)) {
    return { label: classesInSlot.map((course) => course.name).join(" + "), kind: "conflict" };
  }
  if (classInSlot) {
    const conflict = state.availability.days.includes(day) && Boolean(evaluateSchedule([classInSlot], state.availability, state.preferences).conflicts.some((item) => item.day === day));
    return { label: classInSlot.name, kind: conflict ? "conflict" : "class" };
  }
  const workStart = toMinutes(state.availability.startTime);
  const workEnd = toMinutes(state.availability.endTime);
  if (state.availability.days.includes(day) && workStart < slotEnd && workEnd > slotStart) {
    return { label: "Trabajo", kind: "work" };
  }
  return { label: "Libre", kind: "free" };
}

function CalendarGrid({ courses }: { courses: Course[] }) {
  const { state } = useCuadra();
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-card">
      <table className="w-full min-w-[760px] table-fixed border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/60">
            <th className="w-24 px-3 py-3 font-semibold text-muted-foreground">Hora</th>
            {WEEK_DAYS.map((day) => <th key={day} className="px-2 py-3 text-center font-semibold text-foreground">{day}</th>)}
          </tr>
        </thead>
        <tbody>
          {CALENDAR_SLOTS.map((slot) => (
            <tr key={slot.label} className="border-b border-border last:border-0">
              <th className="px-3 py-2.5 font-medium text-muted-foreground">{slot.label}</th>
              {WEEK_DAYS.map((day) => {
                const cell = getCell(day, slot.start, slot.end, courses, state);
                const colors = cell.kind === "conflict" ? "bg-conflict-soft text-conflict" : cell.kind === "class" ? "bg-class-soft text-primary" : cell.kind === "work" ? "bg-work-soft text-foreground" : "bg-free-soft text-success";
                return <td key={day} className="p-1"><div className={`flex min-h-10 items-center justify-center rounded-sm px-1.5 text-center text-[10px] font-semibold leading-4 sm:text-[11px] ${colors}`} title={cell.label}>{cell.label}</div></td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CalendarLegend() {
  const legend = [
    ["bg-class", "Clases"], ["bg-work", "Trabajo"], ["bg-free", "Libre"], ["bg-conflict", "Conflicto"],
  ];
  return <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">{legend.map(([color, label]) => <span key={label} className="inline-flex items-center gap-2"><i className={`size-2.5 rounded-full ${color}`} /><span>{label}</span></span>)}</div>;
}

function ProposalCard({
  index,
  proposal,
  active,
  onChoose,
}: {
  index: number;
  proposal: ReturnType<typeof generateProposals>[number];
  active: boolean;
  onChoose: () => void;
}) {
  const hasWarnings = proposal.conflicts.length > 0 || proposal.overlaps.length > 0 || proposal.nightClasses.length > 0 || proposal.freeDayClasses.length > 0;
  return (
    <article className={`grid gap-3 rounded-md border p-4 ${active ? "border-primary bg-class-soft/50 ring-1 ring-primary" : "border-border bg-card"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary">Propuesta {index + 1}</p>
          <h3 className="mt-1 font-semibold text-foreground">{proposal.courses.length} cursos · {proposal.score}% compatible</h3>
        </div>
        {hasWarnings ? <TriangleAlert className="size-5 shrink-0 text-conflict" aria-label="Tiene alertas" /> : <CheckCircle2 className="size-5 shrink-0 text-success" aria-label="Compatible" />}
      </div>
      <ul className="grid gap-1.5 text-xs text-muted-foreground">
        {proposal.courses.map((course) => <li key={course.id} className="flex items-start gap-2"><span className="mt-1 size-1.5 shrink-0 rounded-full bg-class" /> <span className="min-w-0">{course.name} <span className="text-muted-foreground/80">· {course.days.join(" / ")} · {formatTime(course.startTime)}</span></span></li>)}
      </ul>
      <p className={`text-xs font-medium ${hasWarnings ? "text-conflict" : "text-success"}`}>
        {proposal.conflicts.length ? `${proposal.conflicts.length} cruce${proposal.conflicts.length === 1 ? "" : "s"} con trabajo o descanso` : "Sin cruces con el trabajo"}
        {proposal.overlaps.length > 0 && ` · ${proposal.overlaps.length} cruce${proposal.overlaps.length === 1 ? "" : "s"} entre cursos`}
        {proposal.freeDayClasses.length > 0 && ` · ${proposal.freeDayClasses.length} clase${proposal.freeDayClasses.length === 1 ? "" : "s"} en día libre`}
      </p>
      <Button variant={active ? "default" : "outline"} onClick={onChoose} className="w-full">
        {active ? <><Check /> Seleccionada</> : "Elegir esta opción"}
      </Button>
    </article>
  );
}

function ProposalsStep() {
  const { state, update } = useCuadra();
  const [compare, setCompare] = useState(false);
  const proposals = useMemo(() => generateProposals(state.courses, state.availability, state.preferences), [state.courses, state.availability, state.preferences]);
  const active = proposals[state.proposalIndex] ?? proposals[0];
  const evaluation = active ?? { courses: [], score: 0, conflicts: [], overlaps: [], nightClasses: [], freeDayClasses: [] };
  const selectSchedule = () => {
    update({ view: "schedule", selectedCourseIds: evaluation.courses.map((course) => course.id), proposalIndex: active ? Math.max(0, proposals.indexOf(active)) : 0, saved: true });
  };
  const incompatible = evaluation.conflicts.length > 0 || evaluation.overlaps.length > 0;
  const cardsClass = compare ? "md:grid-cols-3" : "md:grid-cols-[repeat(auto-fit,minmax(250px,1fr))]";
  return (
    <PageFrame view="proposals" eyebrow="Paso 4 de 4" title="Tus propuestas de horario" description="Comparamos tus cursos con tus turnos, el traslado y el descanso que necesitas.">
      {proposals.length === 0 ? (
        <div className="grid gap-4 rounded-lg border border-border bg-card p-6 text-center shadow-panel">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-work-soft text-foreground"><CalendarDays className="size-6" /></div>
          <h2 className="font-semibold">Aún no hay una combinación disponible</h2>
          <p className="mx-auto max-w-md text-sm leading-6 text-muted-foreground">Revisa que la cantidad de cursos incluya tus materias obligatorias y que tengas suficientes cursos agregados.</p>
          <Button variant="outline" className="mx-auto" onClick={() => update({ view: "courses" })}><ArrowLeft /> Revisar mis cursos</Button>
        </div>
      ) : (
        <div className="grid gap-5">
          <div className={`flex flex-col gap-3 rounded-md border px-4 py-4 sm:flex-row sm:items-center sm:justify-between ${incompatible ? "border-conflict/25 bg-conflict-soft" : "border-success/20 bg-success-soft"}`}>
            <div className="flex items-start gap-3">
              {incompatible ? <TriangleAlert className="mt-0.5 size-5 shrink-0 text-conflict" /> : <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />}
              <div>
                <h2 className={`font-semibold ${incompatible ? "text-conflict" : "text-success"}`}>
                  {evaluation.overlaps.length > 0 ? "Hay cursos que se cruzan entre sí" : incompatible ? "Encontramos algunos cruces con tu trabajo" : "Este horario es compatible con tu trabajo"}
                </h2>
              <p className="mt-1 text-xs text-foreground/75">
                  Compatibilidad: {evaluation.score}% <span aria-hidden="true">|</span> Conflictos: {evaluation.conflicts.length}
                  {evaluation.overlaps.length > 0 && ` · Cruces entre cursos: ${evaluation.overlaps.length}`}
                  {evaluation.nightClasses.length > 0 && ` · Clases después de las 9 p. m.: ${evaluation.nightClasses.length}`}
                {evaluation.freeDayClasses.length > 0 && ` · Clases en días libres: ${evaluation.freeDayClasses.length}`}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setCompare((value) => !value)} aria-pressed={compare} className="shrink-0">
              {compare ? <X /> : <CalendarDays />}{compare ? "Cerrar comparación" : "Comparar"}
            </Button>
          </div>
          <CalendarGrid courses={evaluation.courses} />
          <CalendarLegend />
          <div className={`grid gap-3 ${cardsClass}`}>
            {proposals.map((proposal, index) => (
              <ProposalCard key={proposal.courses.map((course) => course.id).join("-")} index={index} proposal={proposal} active={proposals[state.proposalIndex] === proposal} onChoose={() => update({ proposalIndex: index })} />
            ))}
          </div>
          <div className="flex flex-col-reverse justify-between gap-3 border-t border-border pt-5 sm:flex-row">
            <Button variant="outline" onClick={() => update({ view: "preferences" })}><ArrowLeft /> Ajustar preferencias</Button>
            <Button onClick={selectSchedule} disabled={!active}>Elegir horario <ArrowRight /></Button>
          </div>
        </div>
      )}
    </PageFrame>
  );
}

function ScheduleView() {
  const { state, update } = useCuadra();
  const courses = state.courses.filter((course) => state.selectedCourseIds.includes(course.id));
  const evaluation = evaluateSchedule(courses, state.availability, state.preferences);
  const courseName = (id: string) => state.courses.find((course) => course.id === id)?.name ?? id;
  return (
    <PageFrame view="schedule" eyebrow="Horario guardado" title="Mi horario" description="Tu semana organizada en un solo lugar.">
      <div className="grid gap-5">
        {state.saved && (
          <div className="flex items-center gap-3 rounded-md border border-success/20 bg-success-soft px-4 py-3 text-sm font-semibold text-success">
            <CheckCircle2 className="size-5 shrink-0" /> Tu horario ha sido guardado
          </div>
        )}
        {evaluation.conflicts.length > 0 && (
          <div className="flex items-start gap-3 rounded-md border border-conflict/20 bg-conflict-soft px-4 py-3 text-sm text-conflict">
            <TriangleAlert className="mt-0.5 size-5 shrink-0" />
            <span>Este horario todavía tiene {evaluation.conflicts.length} cruce{evaluation.conflicts.length === 1 ? "" : "s"} con tu jornada, traslado o descanso. Puedes cambiar tu turno para revisar otras opciones.</span>
          </div>
        )}
        {evaluation.overlaps.length > 0 && (
          <div className="flex items-start gap-3 rounded-md border border-conflict/20 bg-conflict-soft px-4 py-3 text-sm text-conflict">
            <TriangleAlert className="mt-0.5 size-5 shrink-0" />
            <span>
              Hay cursos que se cruzan entre sí:{" "}
              {evaluation.overlaps.map((item) => `${courseName(item.courseIds[0])} y ${courseName(item.courseIds[1])} (${item.day})`).join("; ")}.
              Puedes volver a las propuestas para elegir otra combinación.
            </span>
          </div>
        )}
        <CalendarGrid courses={courses} />
        <CalendarLegend />
        <div className="flex flex-col-reverse justify-between gap-3 border-t border-border pt-5 sm:flex-row">
          <Button variant="outline" onClick={() => update({ view: "proposals" })}><ArrowLeft /> Volver a las propuestas</Button>
          <Button onClick={() => update({ view: "plan-b", returnView: "schedule" })}>Cambió mi turno <ArrowRight /></Button>
        </div>
      </div>
    </PageFrame>
  );
}

type PlanBOption = { day: WeekDay; title: string; startTime: string; endTime: string; issues: string[] };

function PlanB() {
  const { state, update } = useCuadra();
  const affected =
    state.courses.find((course) => state.selectedCourseIds.includes(course.id) && course.days.includes("Jue")) ??
    state.courses.find((course) => course.id === "base-datos");

  const options = useMemo<PlanBOption[]>(() => {
    if (!affected) return [];
    const others = state.courses.filter((course) => course.id !== affected.id && state.selectedCourseIds.includes(course.id));
    const candidates: { day: WeekDay; title: string; startTime: string; endTime: string }[] = [
      { day: "Vie", title: "Mover a viernes", startTime: affected.startTime, endTime: affected.endTime },
      { day: "Mié", title: "Mover a miércoles", startTime: "18:00", endTime: "20:00" },
    ];
    return candidates
      .filter((option) => !affected.days.includes(option.day))
      .map((option) => {
        const moved: Course = {
          ...affected,
          days: [...new Set<WeekDay>([...affected.days.filter((day) => day !== "Jue"), option.day])],
          startTime: option.startTime,
          endTime: option.endTime,
        };
        const issues: string[] = [];
        for (const overlap of findCourseOverlaps([...others, moved])) {
          if (overlap.day !== option.day || !overlap.courseIds.includes(affected.id)) continue;
          const otherId = overlap.courseIds.find((id) => id !== affected.id);
          const other = others.find((course) => course.id === otherId);
          if (other) issues.push(`Se cruza con ${other.name}`);
        }
        if (state.availability.days.includes(option.day) && hasWorkConflict(moved, state.availability, state.preferences)) {
          issues.push("Choca con tu trabajo, traslado o descanso");
        }
        return { ...option, issues };
      });
  }, [affected, state.courses, state.selectedCourseIds, state.availability, state.preferences]);

  const [choice, setChoice] = useState<WeekDay | null>(null);
  const selected = options.find((option) => option.day === choice) ?? options.find((option) => option.issues.length === 0) ?? options[0];

  const apply = () => {
    if (!affected || !selected) {
      update({ view: "schedule" });
      return;
    }
    const courses = state.courses.map((course) => course.id !== affected.id ? course : {
      ...course,
      days: [...new Set<WeekDay>([...course.days.filter((day) => day !== "Jue"), selected.day])],
      startTime: selected.startTime,
      endTime: selected.endTime,
    });
    const selectedCourseIds = state.selectedCourseIds.includes(affected.id) ? state.selectedCourseIds : [...state.selectedCourseIds, affected.id];
    update({ courses, selectedCourseIds, view: "schedule", saved: true });
  };

  return (
    <PageFrame view="plan-b" eyebrow="Plan B" title="Un cambio en tu turno no detiene tu semana" description="Revisa las alternativas para la clase que coincide con el cambio.">
      <div className="grid gap-5 rounded-lg border border-border bg-card p-5 shadow-panel sm:p-7">
        {!affected || options.length === 0 ? (
          <p className="text-sm text-muted-foreground">No encontramos una clase afectada con alternativas disponibles. Revisa tus cursos o vuelve a tu horario.</p>
        ) : (
          <>
            <div className="flex items-start gap-3 rounded-md border border-conflict/20 bg-conflict-soft p-4 text-conflict">
              <TriangleAlert className="mt-0.5 size-5 shrink-0" />
              <div><h2 className="font-semibold">Tu turno del jueves cambió.</h2><p className="mt-1 text-sm">Estas son tus opciones:</p></div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Clase afectada</p>
              <h2 className="mt-1 font-semibold">{affected.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">Jue · {formatTime(affected.startTime)} – {formatTime(affected.endTime)}</p>
            </div>
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm font-semibold">Elige una alternativa</legend>
              {options.map((option) => (
                <label key={option.day} className={`grid cursor-pointer grid-cols-[20px_minmax(0,1fr)] items-start gap-3 rounded-md border p-4 ${selected?.day === option.day ? "border-primary bg-class-soft" : "border-border bg-background"}`}>
                  <input type="radio" name="plan-b" value={option.day} checked={selected?.day === option.day} onChange={() => setChoice(option.day)} className="mt-1 accent-primary" />
                  <span>
                    <span className="block text-sm font-semibold">{option.title}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">({formatTime(option.startTime)} – {formatTime(option.endTime)})</span>
                    {option.issues.length === 0 ? (
                      <span className="mt-2 flex items-center gap-1.5 text-xs font-medium text-success"><CheckCircle2 className="size-3.5" /> Sin cruces</span>
                    ) : (
                      option.issues.map((issue) => (
                        <span key={issue} className="mt-2 flex items-center gap-1.5 text-xs font-medium text-conflict"><TriangleAlert className="size-3.5" /> {issue}</span>
                      ))
                    )}
                  </span>
                </label>
              ))}
            </fieldset>
          </>
        )}
        <div className="flex flex-col-reverse justify-between gap-3 border-t border-border pt-5 sm:flex-row">
          <Button variant="outline" onClick={() => update({ view: "schedule" })}><ArrowLeft /> Volver a mi horario</Button>
          {affected && options.length > 0 && <Button onClick={apply}>Elegir opción <ArrowRight /></Button>}
        </div>
      </div>
    </PageFrame>
  );
}

function HelpPage() {
  const { state, update } = useCuadra();
  const back = state.returnView === "help" ? (state.registered ? "schedule" : "welcome") : state.returnView;
  return (
    <main className="mx-auto min-h-[calc(100svh-64px)] max-w-3xl px-4 py-10 sm:px-8 sm:py-14">
      <div className="mb-7 flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-md bg-class-soft text-primary"><Headphones className="size-6" /></span>
        <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Centro de ayuda</p><h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">¿Necesitas ayuda?</h1><p className="mt-2 text-sm text-muted-foreground">Encuentra respuestas a tus dudas.</p></div>
      </div>
      <Accordion type="single" collapsible className="border-t border-border">
        <AccordionItem value="generar"><AccordionTrigger>¿Cómo generar mi horario?</AccordionTrigger><AccordionContent>Indica tus días y horas de trabajo, agrega tus cursos y elige tus preferencias. Cuadra compara los horarios y te muestra las opciones que mejor se ajustan.</AccordionContent></AccordionItem>
        <AccordionItem value="turno"><AccordionTrigger>¿Qué pasa si mi turno cambia?</AccordionTrigger><AccordionContent>Desde “Mi horario”, selecciona “Cambió mi turno” para revisar alternativas y elegir una nueva opción para la clase afectada.</AccordionContent></AccordionItem>
        <AccordionItem value="modificar"><AccordionTrigger>¿Puedo modificar mi horario?</AccordionTrigger><AccordionContent>Sí. Puedes regresar a tus propuestas, cambiar tus preferencias o actualizar los cursos y generar nuevas opciones.</AccordionContent></AccordionItem>
      </Accordion>
      <div className="mt-7 rounded-md bg-class-soft p-5 sm:p-6">
        <div className="flex items-center gap-3"><Headphones className="size-5 text-primary" /><h2 className="font-semibold text-foreground">¿Aún tienes dudas?</h2></div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Estamos aquí para ayudarte con tu horario.</p>
        <Button variant="outline" className="mt-4 bg-background" asChild><a href="mailto:ayuda@cuadra.app"><Headphones /> Hablar con una persona</a></Button>
      </div>
      <Button variant="ghost" className="mt-6" onClick={() => update({ view: back })}><ArrowLeft /> Volver</Button>
    </main>
  );
}

export default function CuadraApp() {
  const { state } = useCuadra();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      {state.view === "welcome" && <Welcome />}
      {state.view === "availability" && <AvailabilityStep />}
      {state.view === "courses" && <CoursesStep />}
      {state.view === "preferences" && <PreferencesStep />}
      {state.view === "proposals" && <ProposalsStep />}
      {state.view === "schedule" && <ScheduleView />}
      {state.view === "plan-b" && <PlanB />}
      {state.view === "help" && <HelpPage />}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 text-xs text-muted-foreground sm:px-8">
          <span className="inline-flex items-center gap-2"><GraduationCap className="size-4 text-primary" /> CUADRA</span>
          <span className="inline-flex items-center gap-1.5"><LockKeyhole className="size-3.5" /> Tu horario se guarda en este dispositivo</span>
        </div>
      </footer>
    </div>
  );
}