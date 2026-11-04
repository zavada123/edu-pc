import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { grade8Club, scenarios } from "../scenarios/index.ts"
import { EduPc } from "../ui/EduPc.tsx"
import "./demo.css"

const rootEl = document.getElementById("root")
if (!rootEl) throw new Error("Немає #root")
const params = new URLSearchParams(location.search)
const light = params.has("light")
// ?s=<scenario id> picks the exercise, for example ?s=grade8-club-case
const scenario = scenarios[params.get("s") ?? ""] ?? grade8Club
// ?debug puts the scene on window for automated browser tests
const onSceneReady = params.has("debug") ? (scene: unknown) => Object.assign(window, { eduPcScene: scene }) : undefined
createRoot(rootEl).render(
  <StrictMode>
    <EduPc scenario={scenario} lightGraphics={light} onSceneReady={onSceneReady} />
  </StrictMode>
)
