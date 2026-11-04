# edu-pc

**«Збери комп'ютер»: a PC-building trainer for computer science lessons in grades 3–9.**

Students look at the parts of a computer, put them in the right places step by step, answer a short question before key steps and get an explanation for every mistake: a CPU turned the wrong way, RAM in the wrong slots, the cooler cable on the wrong header. The student-facing text is in Ukrainian. It is built for [EduProstir](https://eduprostir.com).

> Status: stage 2 of the [plan](#roadmap). The core and the 3D bench for the grade 8 desk scenario work on a computer and a phone; building into the case and the grade 3–4 scenario come next.

## Component

```tsx
import { EduPc } from "edu-pc/react"
import { grade8Club } from "edu-pc/core"
import "edu-pc/style.css"

<EduPc scenario={grade8Club} onComplete={(report) => save(report)} />
```

- A 3D bench (three.js, loaded on first use as a separate chunk): a motherboard of our own design, every part modelled in code, realistic materials.
- Take a part from the tray, turn it with ⟲ ⟳ (or Q / E), tap the place for it. Click the socket lever to lift or lower it. Click a part to read what it does.
- The next target glows (the «Підказки» switch turns it off), the camera glides to it, and every mistake is explained.
- Props: `hints`, `lightGraphics` (fewer pixels for old computers), `onAction` (every action, for a replay log), `onComplete` (the report), `layout` (your own 3D layout for a scenario).
- Demo: `npm run dev`; `?light` turns on light graphics.

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
- **Steps** — `inspect` (read about the parts), `place` (one or several parts into allowed slots, e.g. two RAM modules into A2 and B2), `set` (switch a control). Any step can ask a question first.
- **State** is never changed in place; every action returns a new state, so a session can be saved as an action log and replayed (`replay`).
- `validateScenario` lists authoring errors in Ukrainian; `solution` builds a correct run, and the tests replay it for every scenario.

## Scenarios

| id | Grade | Topic |
|---|---|---|
| `grade8-club-desk` | 8 | «ПК і його складові»: what is inside, building the motherboard on the desk |

## Roadmap

1. Core and the grade 8 desk scenario ✓
2. 3D scene (three.js, parts modelled in code): pick up, turn, place, highlights ✓
3. Building into the case, grade 8
4. Grade 3–4 scenario: unboxing, sorting input and output devices, plugging in
5. Data path, upgrade and «power off» tasks
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
