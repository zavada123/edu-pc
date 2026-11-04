import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three"
import { seeded } from "./kit.ts"
import type { BoardFace } from "./layout.ts"

export const BOARD_W = 30.5
export const BOARD_D = 24.4
const PX = 48 // canvas pixels per centimetre on the board

const canvasTexture = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): CanvasTexture => {
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const g = canvas.getContext("2d")
  if (g) draw(g)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

const toPx = (x: number, z: number): [number, number] => [(x + BOARD_W / 2) * PX, (z + BOARD_D / 2) * PX]

/** Copper traces: bundles of parallel lines that run straight and turn at 45°, like a real board. */
const drawTraces = (g: CanvasRenderingContext2D): void => {
  const rnd = seeded(11)
  g.lineCap = "round"
  for (let bundle = 0; bundle < 70; bundle++) {
    const lines = 2 + Math.floor(rnd() * 6)
    let x = rnd() * g.canvas.width
    let y = rnd() * g.canvas.height
    const path: Array<[number, number]> = [[x, y]]
    for (let leg = 0; leg < 3; leg++) {
      const len = 60 + rnd() * 320
      const dir = Math.floor(rnd() * 8)
      const angle = (dir * Math.PI) / 4
      x += Math.cos(angle) * len
      y += Math.sin(angle) * len
      path.push([x, y])
    }
    g.strokeStyle = `rgba(110, 125, 135, ${0.16 + rnd() * 0.12})`
    g.lineWidth = 2
    for (let l = 0; l < lines; l++) {
      const off = l * 7
      g.beginPath()
      path.forEach(([px, py], i) => (i === 0 ? g.moveTo(px + off, py + off) : g.lineTo(px + off, py + off)))
      g.stroke()
    }
  }
  // vias
  g.fillStyle = "rgba(170, 160, 120, 0.45)"
  for (let i = 0; i < 700; i++) {
    g.beginPath()
    g.arc(rnd() * g.canvas.width, rnd() * g.canvas.height, 2.2, 0, Math.PI * 2)
    g.fill()
  }
}

/** The board's top: solder mask, traces, vias, silkscreen labels and outlines, the socket's triangle. */
export const boardTexture = (layout: BoardFace): CanvasTexture =>
  canvasTexture(BOARD_W * PX, BOARD_D * PX, (g) => {
    const grad = g.createLinearGradient(0, 0, g.canvas.width, g.canvas.height)
    grad.addColorStop(0, "#2b3036")
    grad.addColorStop(1, "#23272c")
    g.fillStyle = grad
    g.fillRect(0, 0, g.canvas.width, g.canvas.height)
    drawTraces(g)
    g.fillStyle = "#e9ecef"
    g.strokeStyle = "rgba(233, 236, 239, 0.75)"
    g.textAlign = "center"
    g.textBaseline = "middle"
    for (const label of layout.labels) {
      const [px, py] = toPx(label.at[0], label.at[1])
      g.font = `600 ${(label.size ?? 0.62) * PX}px system-ui, sans-serif`
      g.fillText(label.text, px, py)
    }
    // the socket's outline and the triangle in its front-left corner
    const [sx, sz] = layout.socket
    const [ox, oy] = toPx(sx - 2.45, sz - 2.45)
    g.lineWidth = 3
    g.strokeRect(ox, oy, 4.9 * PX, 4.9 * PX)
    const [tx, ty] = toPx(sx - 2.95, sz + 2.95)
    g.beginPath()
    g.moveTo(tx, ty)
    g.lineTo(tx + 0.85 * PX, ty)
    g.lineTo(tx, ty - 0.85 * PX)
    g.closePath()
    g.fill()
  })

/** The socket's top: a dense grid of contact holes and a printed triangle in the front-left corner. */
export const socketTexture = (): CanvasTexture =>
  canvasTexture(512, 512, (g) => {
    g.fillStyle = "#efe9da"
    g.fillRect(0, 0, 512, 512)
    g.fillStyle = "#b9b09b"
    for (let r = 0; r < 38; r++) {
      for (let c = 0; c < 38; c++) {
        if (r > 14 && r < 23 && c > 14 && c < 23) continue
        g.beginPath()
        g.arc(28 + c * 12.2, 28 + r * 12.2, 2.6, 0, Math.PI * 2)
        g.fill()
      }
    }
    g.fillStyle = "#8b8170"
    g.beginPath()
    g.moveTo(6, 506)
    g.lineTo(64, 506)
    g.lineTo(6, 448)
    g.closePath()
    g.fill()
  })

/** The CPU's metal lid: model name, specs, and the gold triangle that must meet the socket's triangle. */
export const cpuLidTexture = (): CanvasTexture =>
  canvasTexture(512, 512, (g) => {
    const grad = g.createLinearGradient(0, 0, 512, 512)
    grad.addColorStop(0, "#e3e6e9")
    grad.addColorStop(0.5, "#c3c8cd")
    grad.addColorStop(1, "#d6dadd")
    g.fillStyle = grad
    g.fillRect(0, 0, 512, 512)
    // fine brushed lines
    g.strokeStyle = "rgba(255,255,255,0.18)"
    for (let i = 0; i < 512; i += 3) {
      g.beginPath()
      g.moveTo(0, i)
      g.lineTo(512, i + 30)
      g.stroke()
    }
    g.fillStyle = "#4a5056"
    g.textAlign = "center"
    g.font = "700 70px system-ui, sans-serif"
    g.fillText("EDU 6600", 256, 215)
    g.font = "500 36px system-ui, sans-serif"
    g.fillText("6 ядер · 12 потоків", 256, 285)
    g.fillText("3,9 ГГц · 16 МБ кеш", 256, 335)
    g.fillStyle = "#c9a227"
    g.beginPath()
    g.moveTo(22, 490)
    g.lineTo(104, 490)
    g.lineTo(22, 408)
    g.closePath()
    g.fill()
  })

/** Gold contact fingers on an edge: stripes with gaps. `count` stripes across the width. */
export const fingersTexture = (count: number): CanvasTexture => {
  const t = canvasTexture(1024, 32, (g) => {
    g.fillStyle = "#1d6b3f"
    g.fillRect(0, 0, 1024, 32)
    g.fillStyle = "#e0bd55"
    const step = 1024 / count
    for (let i = 0; i < count; i++) g.fillRect(i * step + step * 0.15, 0, step * 0.7, 32)
  })
  return t
}

/** A paper sticker with a few lines of text. */
export const stickerTexture = (lines: ReadonlyArray<string>, bg = "#f4f5f6", ink = "#1f2328"): CanvasTexture =>
  canvasTexture(512, 192, (g) => {
    g.fillStyle = bg
    g.fillRect(0, 0, 512, 192)
    g.fillStyle = ink
    g.textAlign = "left"
    lines.forEach((line, i) => {
      g.font = i === 0 ? "700 52px system-ui, sans-serif" : "500 30px system-ui, sans-serif"
      g.fillText(line, 24, 64 + i * 46)
    })
    // a barcode
    for (let x = 360; x < 490; x += 4) {
      if ((x * 7) % 11 > 4) g.fillRect(x, 120, 2, 50)
    }
  })

/** Chip marking: a dot and a line of grey text on black. */
export const chipTexture = (text: string): CanvasTexture =>
  canvasTexture(256, 256, (g) => {
    g.fillStyle = "#141518"
    g.fillRect(0, 0, 256, 256)
    g.fillStyle = "#6b7078"
    g.font = "600 34px system-ui, sans-serif"
    g.textAlign = "center"
    g.fillText(text, 128, 140)
    g.beginPath()
    g.arc(30, 30, 10, 0, Math.PI * 2)
    g.fill()
  })

/** Rows of square pin holes, for power connectors. */
export const pinGridTexture = (cols: number, rows: number): CanvasTexture =>
  canvasTexture(cols * 32, rows * 32, (g) => {
    g.fillStyle = "#ece8de"
    g.fillRect(0, 0, cols * 32, rows * 32)
    g.fillStyle = "#3a3a3a"
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) g.fillRect(c * 32 + 7, r * 32 + 7, 18, 18)
  })

/** Parallel grooves for heatsink tops. */
export const groovesTexture = (): CanvasTexture => {
  const t = canvasTexture(256, 256, (g) => {
    g.fillStyle = "#4b5159"
    g.fillRect(0, 0, 256, 256)
    g.fillStyle = "#2f343a"
    for (let y = 0; y < 256; y += 16) g.fillRect(0, y, 256, 6)
  })
  t.wrapS = RepeatWrapping
  t.wrapT = RepeatWrapping
  return t
}

/** The round sticker in the middle of a fan: a ring and a short name. */
export const hubTexture = (): CanvasTexture =>
  canvasTexture(256, 256, (g) => {
    g.fillStyle = "#1b1d21"
    g.fillRect(0, 0, 256, 256)
    g.strokeStyle = "#1fa7a0"
    g.lineWidth = 10
    g.beginPath()
    g.arc(128, 128, 104, 0, Math.PI * 2)
    g.stroke()
    g.fillStyle = "#e9ecef"
    g.font = "800 58px system-ui, sans-serif"
    g.textAlign = "center"
    g.textBaseline = "middle"
    g.fillText("EDU", 128, 112)
    g.font = "600 26px system-ui, sans-serif"
    g.fillText("COOL 120", 128, 160)
  })

/** Honeycomb vent holes, for the back of the power supply and the case's vents. */
export const honeycombTexture = (bg = "#202226"): CanvasTexture =>
  canvasTexture(512, 512, (g) => {
    g.fillStyle = bg
    g.fillRect(0, 0, 512, 512)
    g.fillStyle = "#050607"
    const r = 13
    const w = r * Math.sqrt(3)
    for (let row = 0; row * r * 1.5 < 540; row++) {
      for (let col = 0; col * w < 540; col++) {
        const cx = col * w + (row % 2 ? w / 2 : 0)
        const cy = row * r * 1.5
        g.beginPath()
        for (let k = 0; k < 6; k++) {
          const a = Math.PI / 6 + (k * Math.PI) / 3
          const px = cx + Math.cos(a) * (r - 3)
          const py = cy + Math.sin(a) * (r - 3)
          if (k === 0) g.moveTo(px, py)
          else g.lineTo(px, py)
        }
        g.closePath()
        g.fill()
      }
    }
  })

/** A round wire fan guard over dark slots. */
export const fanGrilleTexture = (): CanvasTexture =>
  canvasTexture(512, 512, (g) => {
    g.fillStyle = "#1b1d21"
    g.fillRect(0, 0, 512, 512)
    g.fillStyle = "#060708"
    g.beginPath()
    g.arc(256, 256, 236, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = "#5b6169"
    g.lineWidth = 7
    for (let r = 40; r < 240; r += 32) {
      g.beginPath()
      g.arc(256, 256, r, 0, Math.PI * 2)
      g.stroke()
    }
    for (let k = 0; k < 4; k++) {
      g.beginPath()
      g.moveTo(256, 256)
      g.lineTo(256 + Math.cos((k * Math.PI) / 2 + 0.6) * 240, 256 + Math.sin((k * Math.PI) / 2 + 0.6) * 240)
      g.stroke()
    }
  })

/** A short printed tag on a cable plug: «CPU», «PCIe». */
export const tagTexture = (text: string, bg = "#e9ecef", ink = "#1f2328"): CanvasTexture =>
  canvasTexture(256, 96, (g) => {
    g.fillStyle = bg
    g.fillRect(0, 0, 256, 96)
    g.fillStyle = ink
    g.font = "800 60px system-ui, sans-serif"
    g.textAlign = "center"
    g.textBaseline = "middle"
    g.fillText(text, 128, 50)
  })

/** What the monitor shows once the computer is on: a calm desktop with a greeting. */
export const desktopTexture = (): CanvasTexture =>
  canvasTexture(1024, 600, (g) => {
    const grad = g.createLinearGradient(0, 0, 1024, 600)
    grad.addColorStop(0, "#1f6f8b")
    grad.addColorStop(1, "#1fa7a0")
    g.fillStyle = grad
    g.fillRect(0, 0, 1024, 600)
    g.fillStyle = "rgba(255,255,255,0.12)"
    g.beginPath()
    g.arc(820, 120, 260, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = "#ffffff"
    g.textAlign = "center"
    g.font = "800 72px system-ui, sans-serif"
    g.fillText("Привіт!", 512, 270)
    g.font = "500 38px system-ui, sans-serif"
    g.fillText("Комп'ютер зібрано й увімкнено", 512, 340)
    g.fillStyle = "rgba(10, 20, 30, 0.55)"
    g.fillRect(0, 548, 1024, 52)
    for (let i = 0; i < 6; i++) {
      g.fillStyle = ["#ffc94d", "#e9ecef", "#7bbf3a", "#e87ab0", "#2563eb", "#c0392b"][i] ?? "#fff"
      g.fillRect(24 + i * 64, 558, 40, 32)
    }
  })

/** A sign with one or two lines of large text that shrink to fit: basket labels, box labels. */
export const signTexture = (lines: ReadonlyArray<string>, bg: string, ink: string): CanvasTexture =>
  canvasTexture(1024, 256, (g) => {
    g.fillStyle = bg
    g.fillRect(0, 0, 1024, 256)
    g.fillStyle = ink
    g.textAlign = "center"
    g.textBaseline = "middle"
    const lineH = 256 / lines.length
    lines.forEach((line, i) => {
      let size = Math.min(110, lineH * 0.7)
      g.font = `800 ${size}px system-ui, sans-serif`
      while (g.measureText(line).width > 960 && size > 20) {
        size -= 4
        g.font = `800 ${size}px system-ui, sans-serif`
      }
      g.fillText(line, 512, lineH * (i + 0.5))
    })
  })
