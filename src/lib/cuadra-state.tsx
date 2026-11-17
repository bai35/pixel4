import { createContext, useContext, useEffect, useMemo, useReducer, useState } from "react";

import type { Availability, Course, Preferences, WeekDay } from "@/lib/cuadra-schedule";

export type CuadraView =
  | "welcome"
  | "availability"
  | "courses"
  | "preferences"
  | "proposals"
  | "schedule"
  | "plan-b"
  | "help";

export type CuadraState = {
  view: CuadraView;
  returnView: CuadraView;
  registered: boolean;
  availability: Availability;
  courses: Course[];
  preferences: Preferences;
  proposalIndex: number;
  selectedCourseIds: string[];
  saved: boolean;
};

export const DEMO_COURSES: Course[] = [
  {
    id: "programacion",
    name: "Programación",
    section: "A1",
    days: ["Lun", "Mié"],
    startTime: "18:00",
    endTime: "20:00",
    credits: 3,
    mandatory: true,
  },
  {
    id: "base-datos",
    name: "Base de Datos",
    section: "B2",
    days: ["Mar", "Jue"],
    startTime: "19:00",
    endTime: "21:00",
    credits: 3,
    mandatory: true,
  },
  {
    id: "redes",
    name: "Redes Informáticas",
    section: "C1",
    days: ["Vie", "Jue"],
    startTime: "19:00",
    endTime: "21:00",
    credits: 3,
    mandatory: false,
  },
  {
    id: "matematica-demo",
    name: "Matemática Discreta",
    section: "D1",
    days: ["Sáb"],
    startTime: "10:00",
    endTime: "12:00",
    credits: 3,
    mandatory: false,
    demo: true,
  },
  {
    id: "proyecto-demo",
    name: "Proyecto Digital",
    section: "E1",
    days: ["Dom"],
    startTime: "10:00",
    endTime: "12:00",
    credits: 3,
    mandatory: false,
    demo: true,
  },
];

export const INITIAL_CUADRA_STATE: CuadraState = {
  view: "welcome",
  returnView: "welcome",
  registered: false,
  availability: {
    type: "fijo",
    days: ["Lun", "Mar", "Mié", "Jue", "Vie"],
    startTime: "08:00",
    endTime: "17:00",
    commute: 30,
  },
  courses: DEMO_COURSES,
  preferences: {
    courseCount: 3,
    avoidNights: true,
    freeDays: ["Sáb", "Dom"],
    minimumRest: 2,
  },
  proposalIndex: 0,
  selectedCourseIds: DEMO_COURSES.slice(0, 3).map((course) => course.id),
  saved: false,
};

type Action = { type: "patch"; value: Partial<CuadraState> } | { type: "restore"; value: Partial<CuadraState> };

function reducer(state: CuadraState, action: Action): CuadraState {
  if (action.type === "restore") {
    return {
      ...INITIAL_CUADRA_STATE,
      ...action.value,
      availability: { ...INITIAL_CUADRA_STATE.availability, ...action.value.availability },
      preferences: { ...INITIAL_CUADRA_STATE.preferences, ...action.value.preferences },
    };
  }
  return { ...state, ...action.value };
}

type ContextValue = { state: CuadraState; update: (value: Partial<CuadraState>) => void };
const CuadraContext = createContext<ContextValue | null>(null);

export function CuadraProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_CUADRA_STATE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("cuadra-planner-v1");
      if (saved) dispatch({ type: "restore", value: JSON.parse(saved) as Partial<CuadraState> });
    } catch {
      window.localStorage.removeItem("cuadra-planner-v1");
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem("cuadra-planner-v1", JSON.stringify(state));
  }, [ready, state]);

  const value = useMemo(
    () => ({ state, update: (patch: Partial<CuadraState>) => dispatch({ type: "patch", value: patch }) }),
    [state],
  );
  return <CuadraContext.Provider value={value}>{children}</CuadraContext.Provider>;
}

export function useCuadra() {
  const context = useContext(CuadraContext);
  if (!context) throw new Error("useCuadra debe usarse dentro de CuadraProvider");
  return context;
}

export function toggleDay(days: WeekDay[], day: WeekDay): WeekDay[] {
  return days.includes(day) ? days.filter((item) => item !== day) : [...days, day];
}