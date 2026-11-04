import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { grade8Club } from "../scenarios/index.ts"
import { EduPc } from "../ui/EduPc.tsx"
import "./demo.css"

const rootEl = document.getElementById("root")
if (!rootEl) throw new Error("Немає #root")
const params = new URLSearchParams(location.search)
const light = params.has("light")
// ?debug puts the scene on window for automated browser tests
const onSceneReady = params.has("debug") ? (scene: unknown) => Object.assign(window, { eduPcScene: scene }) : undefined
createRoot(rootEl).render(
  <StrictMode>
    <EduPc scenario={grade8Club} lightGraphics={light} onSceneReady={onSceneReady} />
  </StrictMode>
)
