import { CanvasTexture, SRGBColorSpace } from "three"
import type { SceneLayout } from "./layout.ts"

export const BOARD_W = 30.5
export const BOARD_D = 24.4
const PX = 40 // canvas pixels per centimetre

const canvasTexture = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): CanvasTexture => {
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const g = canvas.getContext("2d")
  if (g) draw(g)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

/** A tiny repeatable random generator, so the board looks the same on every load. */
const seeded = (seed: number): (() => number) => {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const toPx = (x: number, z: number): [number, number] => [(x + BOARD_W / 2) * PX, (z + BOARD_D / 2) * PX]

/** The board's top: dark solder mask, copper traces, white silkscreen labels and the socket's triangle mark. */
export const boardTexture = (layout: SceneLayout): CanvasTexture =>
  canvasTexture(BOARD_W * PX, BOARD_D * PX, (g) => {
    g.fillStyle = "#1f2a26"
    g.fillRect(0, 0, g.canvas.width, g.canvas.height)
    // traces: thin copper lines that run straight and turn at right angles
    const rnd = seeded(7)
    g.strokeStyle = "rgba(140, 170, 150, 0.12)"
    g.lineWidth = 2
    for (let i = 0; i < 90; i++) {
      let x = Math.round(rnd() * g.canvas.width)
      let y = Math.round(rnd() * g.canvas.height)
      g.beginPath()
      g.moveTo(x, y)
      for (let turn = 0; turn < 3; turn++) {
        const len = 40 + rnd() * 220
        if (turn % 2 === 0) x += rnd() > 0.5 ? len : -len
        else y += rnd() > 0.5 ? len : -len
        g.lineTo(x, y)
      }
      g.stroke()
    }
    // mounting holes
    g.fillStyle = "#b8a77a"
    for (const [x, z] of [[-13.8, -10.8], [13.8, -10.8], [-13.8, 10.8], [13.8, 10.8], [3.5, -10.8], [3.5, 10.8]] as const) {
      const [px, py] = toPx(x, z)
      g.beginPath()
      g.arc(px, py, 0.45 * PX, 0, Math.PI * 2)
      g.fill()
    }
    // silkscreen
    g.fillStyle = "#e9ecef"
    g.textAlign = "center"
    g.textBaseline = "middle"
    for (const label of layout.labels) {
      const [px, py] = toPx(label.at[0], label.at[1])
      g.font = `600 ${(label.size ?? 0.7) * PX}px system-ui, sans-serif`
      g.fillText(label.text, px, py)
    }
    // socket outline and the triangle in its front-left corner
    const socket = layout.socket
    const [sx, sy] = toPx(socket[0] - 2.4, socket[1] - 2.4)
    g.strokeStyle = "#e9ecef"
    g.lineWidth = 4
    g.strokeRect(sx, sy, 4.8 * PX, 4.8 * PX)
    const [tx, ty] = toPx(socket[0] - 2.9, socket[1] + 2.9)
    g.beginPath()
    g.moveTo(tx, ty)
    g.lineTo(tx + 0.9 * PX, ty)
    g.lineTo(tx, ty - 0.9 * PX)
    g.closePath()
    g.fill()
  })

/** The CPU's metal lid: a name, and the gold triangle in the corner that must meet the board's triangle. */
export const cpuLidTexture = (): CanvasTexture =>
  canvasTexture(512, 512, (g) => {
    const grad = g.createLinearGradient(0, 0, 512, 512)
    grad.addColorStop(0, "#d9dde1")
    grad.addColorStop(1, "#a9afb5")
    g.fillStyle = grad
    g.fillRect(0, 0, 512, 512)
    g.fillStyle = "#3a3f44"
    g.textAlign = "center"
    g.font = "700 64px system-ui, sans-serif"
    g.fillText("EDU", 256, 220)
    g.font = "500 40px system-ui, sans-serif"
    g.fillText("6 ядер · 3,9 ГГц", 256, 300)
    g.fillStyle = "#c9a227"
    g.beginPath()
    g.moveTo(24, 488)
    g.lineTo(120, 488)
    g.lineTo(24, 392)
    g.closePath()
    g.fill()
  })

/** A RAM module side: green board, black chips, a sticker. */
export const ramTexture = (): CanvasTexture =>
  canvasTexture(1024, 256, (g) => {
    g.fillStyle = "#1f5e3a"
    g.fillRect(0, 0, 1024, 256)
    g.fillStyle = "#15171a"
    for (let i = 0; i < 8; i++) g.fillRect(40 + i * 120, 60, 92, 110)
    g.fillStyle = "#f1f3f5"
    g.fillRect(380, 8, 280, 40)
    g.fillStyle = "#222"
    g.font = "600 28px system-ui, sans-serif"
    g.textAlign = "center"
    g.fillText("DDR4 8 ГБ", 520, 38)
    g.fillStyle = "#d4af37"
    for (let i = 0; i < 64; i++) g.fillRect(12 + i * 15.6, 210, 10, 46)
  })

/** The SSD's top: black board with a label. */
export const ssdTexture = (): CanvasTexture =>
  canvasTexture(1024, 280, (g) => {
    g.fillStyle = "#16181b"
    g.fillRect(0, 0, 1024, 280)
    g.fillStyle = "#2b6cb0"
    g.fillRect(120, 30, 760, 220)
    g.fillStyle = "#fff"
    g.font = "700 64px system-ui, sans-serif"
    g.textAlign = "center"
    g.fillText("SSD 512 ГБ", 500, 160)
    g.fillStyle = "#d4af37"
    // contacts on the left end, the end that goes into the M.2 slot
    for (let i = 0; i < 28; i++) g.fillRect(0, 14 + i * 9, 34, 5)
  })
