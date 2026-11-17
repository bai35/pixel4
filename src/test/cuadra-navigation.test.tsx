import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import CuadraApp from "@/components/cuadra/CuadraApp";
import { CuadraProvider, INITIAL_CUADRA_STATE } from "@/lib/cuadra-state";

function renderRegistered(view: "availability" | "courses" = "availability") {
  window.localStorage.setItem(
    "cuadra-planner-v1",
    JSON.stringify({ ...INITIAL_CUADRA_STATE, registered: true, view }),
  );
  return render(
    <CuadraProvider>
      <CuadraApp />
    </CuadraProvider>,
  );
}

describe("Navegación a la portada", () => {
  beforeEach(() => window.localStorage.clear());

  it("el logo lleva a la portada aunque el usuario ya esté registrado", async () => {
    renderRegistered("courses");
    expect(await screen.findByText("¿Cuáles son tus cursos?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /CUADRA, ir al inicio/i }));

    expect(await screen.findByText("Cuadra tu estudio con tu trabajo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continuar con mi horario/i })).toBeInTheDocument();
  });

  it("el botón Inicio también lleva a la portada", async () => {
    renderRegistered();
    fireEvent.click(await screen.findByRole("button", { name: "Inicio" }));
    expect(await screen.findByText("Cuadra tu estudio con tu trabajo")).toBeInTheDocument();
  });
});
