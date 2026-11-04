# edu-pc

**«Збери комп'ютер»: a PC-building trainer for computer science lessons in grades 3–9.**

Students look at the parts of a computer, put them in the right places step by step, answer a short question before key steps and get an explanation for every mistake: a CPU turned the wrong way, RAM in the wrong slots, the cooler cable on the wrong header. The student-facing text is in Ukrainian. It is built for [EduProstir](https://eduprostir.com).

> Status: stage 5 of the [plan](#roadmap). Grade 8 builds the motherboard on the desk and then the whole computer in the case, then follows a photo's path through it, upgrades it for video editing and sees what a power cut erases; grades 3–4 unbox a new computer, sort its devices and plug it in. All of it works on a computer and a phone. Troubleshooting comes next.

## Component

```tsx
import { EduPc } from "edu-pc/react"
import { grade8Club } from "edu-pc/core"
import "edu-pc/style.css"

<EduPc scenario={grade8Club} onComplete={(report) => save(report)} />
```

- A 3D bench (three.js, loaded on first use as a separate chunk): a motherboard of our own design on the desk, an open case lying on its side, or a desk with the finished system unit, boxes and sorting baskets; every part modelled in code, realistic materials, shadows.
- Take a part from the tray (or from its basket or open box on the desk), turn it with ⟲ ⟳ (or Q / E), tap the place for it. Click the socket lever or a power button to switch them. Click a part or a box to read what it does. Cables run from the power supply, or from the devices on the desk, to the plugs you connect.
- Once the computer is on, its fans spin and the monitor on the desk lights up.
- The next target glows (the «Підказки» switch turns it off), the camera glides to it, and every mistake is explained.
- Props: `hints`, `lightGraphics` (fewer pixels for old computers), `onAction` (every action, for a replay log), `onComplete` (the report), `layout` (your own 3D layout for a scenario).
- Demo: `npm run dev`; `?s=grade8-club-case` opens the case scenario, `?s=grade8-club-lab` the data path, upgrade and power-off tasks, `?s=grade3-new-box` the grade 3–4 one, `?light` turns on light graphics.

## Core

`edu-pc/core` has no React and no 3D, so a lesson page, a server or a test can use it.

```ts
import { apply, grade8Club, hintFor, report, startState } from "edu-pc/core"

let state = startState(grade8Club)
const outcome = apply(grade8Club, state, { type: "set", control: "socketLever", value: "up" })
// outcome.result: "ok" | "mistake" | "question" | "ignored", with a message for the student
state = outcome.state

hintFor(grade8Club, state) // which parts and slots to light up
report(grade8Club, state)  // steps done, mistakes, mistakes by lesson goal (A, B, C)
```

- **Scenario** — plain data: parts, slots (with the one turn a part fits), controls (socket lever, side panel, power) and steps.
- **Steps** — `sequence` (tap markers in the order data goes: USB → RAM → processor → graphics card → monitor), `upgrade` (buy cards within a budget until a task is fast enough; `montageMinutes` is the speed model), `sort` (what is lost at power off and what is kept), `inspect` (read about the parts), `place` (one or several parts into allowed slots, e.g. two RAM modules into A2 and B2; a part placed earlier can be moved), `set` (switch a control; `otherControls` explains a likely wrong button, such as the monitor's instead of the computer's). Any step can ask a question first; an `inspect` step with no parts is a question on its own.
- **State** is never changed in place; every action returns a new state, so a session can be saved as an action log and replayed (`replay`).
- `validateScenario` lists authoring errors in Ukrainian; `solution` builds a correct run, and the tests replay it for every scenario.

## Scenarios

| id | Grade | Topic |
|---|---|---|
| `grade8-club-desk` | 8 | «ПК і його складові»: what is inside, building the motherboard on the desk |
| `grade8-club-case` | 8 | «ПК і його складові»: the power supply, board, graphics card and disk into the case, cables, monitor, keyboard and mouse, power on |
| `grade8-club-lab` | 8 | «ПК і його складові»: the photo's path from a smartphone to the screen, saving to disk, upgrading for video editing (cores against frequency), what disappears at power off |
| `grade3-new-box` | 3–4 | «Нова коробка»: unbox the devices, sort them into «передає в комп'ютер», «показує результат» and «зберігає на потім», set up the desk, plug in HDMI and USB, power on the system unit and then the monitor, advise a laptop for the dacha |

## Roadmap

1. Core and the grade 8 desk scenario ✓
2. 3D scene (three.js, parts modelled in code): pick up, turn, place, highlights ✓
3. Building into the case, grade 8 ✓
4. Grade 3–4 scenario: unboxing, sorting input and output devices, plugging in ✓
5. Data path, upgrade and «power off» tasks ✓
6. Troubleshooting mode
7. Lessons on EduProstir

## Development

```sh
npm ci
npm run dev       # demo page
npm test          # vitest
npm run typecheck
npm run build     # demo in dist/
npm run build:lib # lib/: core.js, react.js, the scene chunk, style.css and types
```

## License

[MIT](LICENSE)
