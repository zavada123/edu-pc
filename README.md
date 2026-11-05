# edu-pc

**«Збери комп'ютер»: a PC-building trainer for computer science lessons in grades 3–9.**

Students look at the parts of a computer, put them in the right places step by step, answer a short question before key steps and get an explanation for every mistake: a CPU turned the wrong way, RAM in the wrong slots, the cooler cable on the wrong header. The student-facing text is in Ukrainian. It is built for [EduProstir](https://eduprostir.com).

> Status: stage 6 of the [plan](#roadmap). Grade 8 builds the motherboard on the desk and then the whole computer in the case, then follows a photo's path through it, upgrades it for video editing and sees what a power cut erases; grades 3–4 unbox a new computer, sort its devices and plug it in. All of it works on a computer and a phone. Troubleshooting exercises give a built computer with one fault to find and fix. Lessons on EduProstir come next.

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
- Slot names: when a part is in hand, a tag names every slot it fits («A2», «Гніздо HDMI»); the pointer over a slot outlines it and says what goes there and whether the part in hand fits. The «Назви гнізд» switch tags every free slot.
- «На весь екран» covers the page with the trainer (and asks the browser for full screen where it can); Esc or the button leaves it.
- On the grade 3–4 desk the system unit stands with its front to the student; for the cables the camera goes round to its back. A part in hand never goes inside it.
- Props: `hints`, `lightGraphics`, `onNext` (a «Наступне завдання» button at the end), `initialState` (resume a saved session) (fewer pixels for old computers), `onAction` (every action, for a replay log), `onComplete` (the report), `layout` (your own 3D layout for a scenario), `modelsUrl` (a folder with the realistic part models, see below).
- Realistic models: `public/models/*.glb` are real parts (the ASUS Strix Z370-E board, CPU, RAM, M.2 SSD, cooler, graphics card, power supply, hard disk), under 1 MB together, so they work on phones too. The slots in `src/scene/layout.ts` are measured on that board. The package ships them in `lib/models/` (`edu-pc/lib/models` in node_modules): serve that folder on your site and pass its URL as `modelsUrl`. Only the models the open exercise needs are loaded; the scene opens once they are in, and a part whose model fails to load uses the simpler model built in code. Authors and licences (CC BY 4.0): `public/models/CREDITS.md`.
- `TaskCatalog` shows the exercises as cards by grade (kind, title, what to do, steps, a check mark when done); `nextScenario` from `edu-pc/core` picks the next one not done.
- Every color comes from the EduProstir palette (`src/ui/tokens.css`).
- Demo: `npm run dev`; `?cards` shows the task cards over the trainer, `?step=4` starts at step 4; `?s=grade8-club-case` opens the case scenario, `?s=grade8-club-lab` the data path, upgrade and power-off tasks, `?s=grade3-new-box` the grade 3–4 one, `?light` turns on light graphics.

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
| `grade8-fault-cpu-power`, `grade8-fault-hdmi`, `grade8-fault-disk` | 8 | Troubleshooting: no CPU power (fans spin, dark screen), the monitor on the board's HDMI with a graphics card in, the disk's data cable out («Диск D: не знайдено») |
| `grade3-fault-monitor`, `grade3-fault-strip` | 3–4 | Troubleshooting: the monitor cable fell out, the power strip is switched off |
| `grade3-new-box` | 3–4 | «Нова коробка»: unbox the devices, sort them into «передає в комп'ютер», «показує результат» and «зберігає на потім», set up the desk, plug in HDMI and USB, power on the system unit and then the monitor, advise a laptop for the dacha |

## Roadmap

1. Core and the grade 8 desk scenario ✓
2. 3D scene (three.js, parts modelled in code): pick up, turn, place, highlights ✓
3. Building into the case, grade 8 ✓
4. Grade 3–4 scenario: unboxing, sorting input and output devices, plugging in ✓
5. Data path, upgrade and «power off» tasks ✓
6. Troubleshooting mode ✓
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
