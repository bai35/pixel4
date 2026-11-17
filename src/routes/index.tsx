import { createFileRoute } from "@tanstack/react-router";

import CuadraApp from "@/components/cuadra/CuadraApp";
import { CuadraProvider } from "@/lib/cuadra-state";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CUADRA | Horarios de estudio y trabajo" },
      { name: "description", content: "Organiza tus cursos con un horario compatible con tu trabajo, descanso y traslado." },
      { property: "og:title", content: "CUADRA | Horarios de estudio y trabajo" },
      { property: "og:description", content: "Organiza tus cursos con un horario compatible con tu trabajo, descanso y traslado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <CuadraProvider><CuadraApp /></CuadraProvider>;
}
