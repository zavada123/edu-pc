// src/core/messages.ts
/** General messages for the student. A step can replace the mistake ones with its own (StepMessages). */
var MESSAGES = {
	wrongKind: (part, slot) => `«${part}» не підходить до місця «${slot}». Подивись на форму роз'єму.`,
	wrongSlot: (part, slot) => `«${part}» вставляється в «${slot}», але зараз потрібне інше місце. Перечитай пояснення кроку.`,
	wrongTurn: (part) => `«${part}» повернуто не тим боком. Поверни деталь і спробуй ще раз.`,
	notReady: (control) => `Спершу підготуй: «${control}».`,
	wrongAnswer: "Ще ні. Перечитай пояснення кроку й спробуй іншу відповідь.",
	slotTaken: (slot) => `На місці «${slot}» уже є деталь.`,
	notNow: (step) => `Зараз інший крок: «${step}».`,
	answerFirst: "Спершу дай відповідь на запитання.",
	noQuestion: "Зараз немає запитання.",
	finished: "Усе вже зібрано.",
	unknownPart: "Такої деталі тут немає.",
	wrongStop: (stop, after) => after === void 0 ? `Дані ще не можуть потрапити в «${stop}». Подумай, звідки вони приходять у комп'ютер.` : `Після «${after}» дані йдуть не в «${stop}». Перечитай пояснення кроку.`,
	alreadyOnPath: (stop) => `«${stop}» уже є на шляху.`,
	overBudget: (budget) => `Це дорожче, ніж є грошей: бюджет ${budget}. Прибери одну картку.`,
	sameGroup: "Обидві картки замінюють одну деталь. Вибери одну з них.",
	tooSlow: (task, time, target) => `${task}: ${time}, а треба не довше ${target}.`
};
// src/core/upgrade.ts
/** Work in a video montage, in «gigahertz-core minutes»: what one core at 1 GHz would need. */
var MONTAGE_WORK = 60;
/** Extra cores help less and less: part of the work cannot be shared. */
var CORE_POWER = .85;
var MAX_USEFUL_CORES = 8;
/** A bigger cache keeps more data next to the cores. */
var CACHE_GAIN_PER_MB = 1 / 40;
/** With too little RAM the computer swaps to the disk. */
var RAM_ENOUGH_GB = 8;
var SWAP_SLOWDOWN = 1.6;
/** Loading the footage and writing the result: the disk's own part. */
var DISK_MINUTES = {
	hdd: 6,
	ssd: 1
};
/**
* How long a video montage takes on this computer, in minutes. A teaching model, not a benchmark:
* more cores and a higher frequency speed up the processor's part, a bigger cache a little, too little
* RAM slows everything down, and a hard disk adds time for loading and saving.
*/
var montageMinutes = (pc) => {
	const cpu = pc.ghz * Math.min(pc.cores, MAX_USEFUL_CORES) ** CORE_POWER * (1 + pc.cacheMb * CACHE_GAIN_PER_MB);
	const swap = pc.ramGb < RAM_ENOUGH_GB ? SWAP_SLOWDOWN : 1;
	return MONTAGE_WORK / cpu * swap + DISK_MINUTES[pc.disk];
};
/** The computer after the chosen cards. */
var upgraded = (base, chosen) => chosen.reduce((pc, option) => ({
	...pc,
	...option.change
}), base);
/** Rounds minutes the way the student sees them: «14,6 хв». */
var formatMinutes = (minutes) => `${Number.isInteger(minutes) ? minutes : minutes.toFixed(1).replace(".", ",")} хв`;
/** Checks a choice of cards on an upgrade step: the budget, one card per part, and the time. */
var judgeUpgrade = (step, ids) => {
	const chosen = step.options.filter((o) => ids.includes(o.id));
	const minutes = montageMinutes(upgraded(step.base, chosen));
	if (chosen.reduce((sum, o) => sum + o.cost, 0) > step.budget) return {
		ok: false,
		reason: "overBudget",
		minutes
	};
	const groups = chosen.flatMap((o) => o.group ? [o.group] : []);
	if (new Set(groups).size < groups.length) return {
		ok: false,
		reason: "sameGroup",
		minutes
	};
	if (minutes > step.target) {
		const why = chosen.find((o) => o.why !== void 0)?.why;
		return why === void 0 ? {
			ok: false,
			reason: "tooSlow",
			minutes
		} : {
			ok: false,
			reason: "tooSlow",
			minutes,
			why
		};
	}
	return {
		ok: true,
		minutes
	};
};
/** The cheapest choice that passes, for the solution and for checking a scenario can be done. */
var cheapestUpgrade = (step) => {
	const n = step.options.length;
	let best;
	for (let mask = 0; mask < 1 << n; mask++) {
		const picked = step.options.filter((_, i) => mask >> i & 1);
		const ids = picked.map((o) => o.id);
		const cost = picked.reduce((sum, o) => sum + o.cost, 0);
		if (judgeUpgrade(step, ids).ok && (!best || cost < best.cost)) best = {
			ids,
			cost
		};
	}
	return best?.ids;
};
// src/core/machine.ts
/** The state at the start of a scenario: start parts placed, controls at their start values. */
var startState = (scenario) => {
	const controls = {};
	for (const control of scenario.controls) controls[control.id] = scenario.start?.controls?.[control.id] ?? control.values[0] ?? "";
	const placed = {};
	for (const [slotId, partId] of Object.entries(scenario.start?.placed ?? {})) placed[slotId] = {
		part: partId,
		turn: scenario.slots.find((s) => s.id === slotId)?.turn ?? 0
	};
	return {
		step: 0,
		placed,
		controls,
		inspected: [],
		answered: [],
		picked: [],
		sorted: {},
		upgrades: {},
		mistakes: 0,
		stepMistakes: {}
	};
};
var currentStep = (scenario, state) => scenario.steps[state.step];
var isDone = (scenario, state) => state.step >= scenario.steps.length;
/** The slot that holds this part, if it is placed. */
var slotOf = (state, partId) => Object.entries(state.placed).find(([, placed]) => placed.part === partId)?.[0];
var partName = (scenario, id) => scenario.parts.find((p) => p.id === id)?.name ?? id;
var slotById = (scenario, id) => scenario.slots.find((s) => s.id === id);
var controlLabel = (scenario, id) => scenario.controls.find((c) => c.id === id)?.label ?? id;
var ok = (state, advanced) => ({
	result: "ok",
	state,
	advanced
});
var ignored = (state, message) => ({
	result: "ignored",
	state,
	message
});
var mistake = (step, state, reason, message) => ({
	result: "mistake",
	reason,
	message,
	state: {
		...state,
		mistakes: state.mistakes + 1,
		stepMistakes: {
			...state.stepMistakes,
			[step.id]: (state.stepMistakes[step.id] ?? 0) + 1
		}
	}
});
/** Moves to the next step when the current one is complete. */
var advanceIfComplete = (scenario, state) => {
	const step = currentStep(scenario, state);
	if (step && stepComplete(step, state)) return ok({
		...state,
		step: state.step + 1,
		picked: []
	}, true);
	return ok(state, false);
};
/** True when everything the step asks for is done in this state, its question included. */
var stepComplete = (step, state) => {
	if (step.question && !state.answered.includes(step.id)) return false;
	switch (step.kind) {
		case "inspect": return step.parts.every((p) => state.inspected.includes(p));
		case "place": return Object.entries(step.targets).every(([part, slots]) => {
			const at = slotOf(state, part);
			return at !== void 0 && slots.includes(at);
		});
		case "set": return state.controls[step.control] === step.value;
		case "sequence": return state.picked.length >= step.order.length;
		case "upgrade": return state.upgrades[step.id] !== void 0;
		case "sort": return step.items.every((item) => state.sorted[item.id] === item.memory);
	}
};
var unmetRequirement = (step, state) => Object.entries(step.requires ?? {}).find(([control, value]) => state.controls[control] !== value)?.[0];
var place = (scenario, step, state, action) => {
	if (step.kind !== "place") return ignored(state, MESSAGES.notNow(step.title));
	const allowed = step.targets[action.part];
	if (!allowed) return ignored(state, MESSAGES.notNow(step.title));
	const slot = slotById(scenario, action.slot);
	const part = scenario.parts.find((p) => p.id === action.part);
	if (!slot || !part) return ignored(state, MESSAGES.notNow(step.title));
	const name = partName(scenario, action.part);
	const occupant = state.placed[slot.id];
	if (occupant && occupant.part !== action.part) return ignored(state, MESSAGES.slotTaken(slot.label));
	if (!slot.accepts.includes(part.kind)) return mistake(step, state, "wrongKind", MESSAGES.wrongKind(name, slot.label));
	if (!allowed.includes(slot.id)) return mistake(step, state, "wrongSlot", step.messages?.wrongSlot ?? MESSAGES.wrongSlot(name, slot.label));
	const unmet = unmetRequirement(step, state);
	if (unmet !== void 0) return mistake(step, state, "notReady", step.messages?.notReady ?? MESSAGES.notReady(controlLabel(scenario, unmet)));
	if (slot.turn !== void 0 && slot.turn !== action.turn) return mistake(step, state, "wrongTurn", step.messages?.wrongTurn ?? MESSAGES.wrongTurn(name));
	const placed = {};
	for (const [id, p] of Object.entries(state.placed)) if (p.part !== action.part) placed[id] = p;
	placed[slot.id] = {
		part: action.part,
		turn: action.turn
	};
	return advanceIfComplete(scenario, {
		...state,
		placed
	});
};
var set = (scenario, step, state, action) => {
	const target = step.kind === "set" ? step : void 0;
	const other = target?.otherControls?.[action.control];
	if (other !== void 0) return mistake(step, state, "wrongControl", other);
	if (!target || target.control !== action.control || target.value !== action.value) return ignored(state, MESSAGES.notNow(step.title));
	return advanceIfComplete(scenario, {
		...state,
		controls: {
			...state.controls,
			[action.control]: action.value
		}
	});
};
var pick = (scenario, step, state, stopId) => {
	const stop = step.stops.find((s) => s.id === stopId);
	if (!stop) return ignored(state, MESSAGES.notNow(step.title));
	if (step.order[state.picked.length] === stopId) return advanceIfComplete(scenario, {
		...state,
		picked: [...state.picked, stopId]
	});
	if (state.picked.includes(stopId)) return ignored(state, MESSAGES.alreadyOnPath(stop.label));
	const last = step.stops.find((s) => s.id === state.picked.at(-1))?.label;
	return mistake(step, state, "wrongStop", stop.why ?? MESSAGES.wrongStop(stop.label, last));
};
var upgrade = (scenario, step, state, choose) => {
	const verdict = judgeUpgrade(step, choose);
	if (verdict.ok) return advanceIfComplete(scenario, {
		...state,
		upgrades: {
			...state.upgrades,
			[step.id]: [...choose]
		}
	});
	const time = formatMinutes(verdict.minutes);
	if (verdict.reason === "overBudget") return mistake(step, state, "overBudget", MESSAGES.overBudget(step.budget));
	if (verdict.reason === "sameGroup") return mistake(step, state, "sameGroup", MESSAGES.sameGroup);
	return mistake(step, state, "tooSlow", `${MESSAGES.tooSlow(step.task, time, formatMinutes(step.target))}${verdict.why ? ` ${verdict.why}` : ""}`);
};
var sort = (scenario, step, state, itemId, memory) => {
	const item = step.items.find((i) => i.id === itemId);
	if (!item) return ignored(state, MESSAGES.notNow(step.title));
	if (item.memory !== memory) return mistake(step, state, "wrongMemory", item.why);
	return advanceIfComplete(scenario, {
		...state,
		sorted: {
			...state.sorted,
			[itemId]: memory
		}
	});
};
var answer = (scenario, step, state, given) => {
	if (!step.question || state.answered.includes(step.id)) return ignored(state, MESSAGES.noQuestion);
	if (given !== step.question.right) return mistake(step, state, "wrongAnswer", MESSAGES.wrongAnswer);
	return advanceIfComplete(scenario, {
		...state,
		answered: [...state.answered, step.id]
	});
};
var inspect = (scenario, state, partId) => {
	if (!scenario.parts.some((p) => p.id === partId)) return ignored(state, MESSAGES.unknownPart);
	if (state.inspected.includes(partId)) return ok(state, false);
	return advanceIfComplete(scenario, {
		...state,
		inspected: [...state.inspected, partId]
	});
};
/** Applies one student action to the state. Parts can be inspected at any time, also between steps. */
var apply = (scenario, state, action) => {
	const step = currentStep(scenario, state);
	if (action.type === "inspect") return inspect(scenario, state, action.part);
	if (!step) return ignored(state, MESSAGES.finished);
	if (action.type === "answer") return answer(scenario, step, state, action.answer);
	if (step.question && !state.answered.includes(step.id)) return {
		result: "question",
		state,
		message: MESSAGES.answerFirst
	};
	switch (action.type) {
		case "place": return place(scenario, step, state, action);
		case "set": return set(scenario, step, state, action);
		case "pick": return step.kind === "sequence" ? pick(scenario, step, state, action.stop) : ignored(state, MESSAGES.notNow(step.title));
		case "upgrade": return step.kind === "upgrade" ? upgrade(scenario, step, state, action.choose) : ignored(state, MESSAGES.notNow(step.title));
		case "sort": return step.kind === "sort" ? sort(scenario, step, state, action.item, action.memory) : ignored(state, MESSAGES.notNow(step.title));
	}
};
/** Applies actions one after another, as a log replay (a teacher's check, or a saved session). */
var replay = (scenario, actions, from = startState(scenario)) => actions.reduce((state, action) => apply(scenario, state, action).state, from);
// src/core/parts.ts
var TURNS = 4;
/** Turns a part one quarter clockwise (`+1`) or counterclockwise (`-1`). */
var turn = (current, by) => {
	return ((current + by) % TURNS + TURNS) % TURNS;
};
/** Index of parts by id. Throws on a duplicate id: a scenario with two parts of one id is an authoring error. */
var indexParts = (parts) => {
	const map = /* @__PURE__ */ new Map();
	for (const part of parts) {
		if (map.has(part.id)) throw new Error(`Деталь «${part.id}» описана двічі`);
		map.set(part.id, part);
	}
	return map;
};
// src/core/progress.ts
var NO_HINT = {
	parts: [],
	slots: [],
	question: false
};
var remainingTargets = (step, state) => Object.entries(step.targets).filter(([part, slots]) => {
	const at = slotOf(state, part);
	return at === void 0 || !slots.includes(at);
});
var hintFor = (scenario, state) => {
	const step = currentStep(scenario, state);
	if (!step) return NO_HINT;
	const question = step.question !== void 0 && !state.answered.includes(step.id);
	switch (step.kind) {
		case "inspect": return {
			...NO_HINT,
			question,
			parts: step.parts.filter((p) => !state.inspected.includes(p))
		};
		case "set": return {
			...NO_HINT,
			question,
			control: {
				id: step.control,
				value: step.value
			}
		};
		case "place": {
			const left = remainingTargets(step, state);
			const slots = [...new Set(left.flatMap(([, s]) => s))].filter((s) => state.placed[s] === void 0);
			return {
				question,
				parts: left.map(([part]) => part),
				slots
			};
		}
		case "sequence": {
			const next = step.order[state.picked.length];
			return next === void 0 ? {
				...NO_HINT,
				question
			} : {
				...NO_HINT,
				question,
				stop: next
			};
		}
		case "upgrade":
		case "sort": return {
			...NO_HINT,
			question
		};
	}
};
var report = (scenario, state) => {
	const byGoal = {};
	for (const step of scenario.steps) if (step.goal) byGoal[step.goal] = (byGoal[step.goal] ?? 0) + (state.stepMistakes[step.id] ?? 0);
	return {
		done: isDone(scenario, state),
		stepsDone: Math.min(state.step, scenario.steps.length),
		stepsTotal: scenario.steps.length,
		mistakes: state.mistakes,
		byGoal,
		steps: scenario.steps.map((step, i) => ({
			id: step.id,
			title: step.title,
			mistakes: state.stepMistakes[step.id] ?? 0,
			done: i < state.step
		}))
	};
};
/**
* A correct way through the scenario, made from its data. Tests replay it to prove every scenario
* can be finished without mistakes; the demo uses it for a «show me» button.
*/
var solution = (scenario) => {
	const actions = [];
	const taken = new Set(Object.keys(scenario.start?.placed ?? {}));
	for (const step of scenario.steps) {
		if (step.question) actions.push({
			type: "answer",
			answer: step.question.right
		});
		if (step.kind === "inspect") for (const part of step.parts) actions.push({
			type: "inspect",
			part
		});
		if (step.kind === "set") actions.push({
			type: "set",
			control: step.control,
			value: step.value
		});
		if (step.kind === "sequence") for (const stop of step.order) actions.push({
			type: "pick",
			stop
		});
		if (step.kind === "upgrade") actions.push({
			type: "upgrade",
			choose: cheapestUpgrade(step) ?? []
		});
		if (step.kind === "sort") for (const item of step.items) actions.push({
			type: "sort",
			item: item.id,
			memory: item.memory
		});
		if (step.kind === "place") for (const [part, slots] of Object.entries(step.targets)) {
			const slotId = slots.find((s) => !taken.has(s));
			if (slotId === void 0) continue;
			taken.add(slotId);
			const turn = scenario.slots.find((s) => s.id === slotId)?.turn ?? 0;
			actions.push({
				type: "place",
				part,
				slot: slotId,
				turn
			});
		}
	}
	return actions;
};
// src/core/scenario.ts
/** Names of the kinds of exercises on the task cards. */
var TOPIC_NAMES = {
	build: "Збирання",
	connect: "Підключення",
	explore: "Дослідження",
	fault: "Несправність"
};
// src/core/catalog.ts
/** Exercises grouped by grade, grades ascending; `solved` gives the count of each group. */
var gradeGroups = (scenarios, solved) => [...new Set(scenarios.map((s) => s.grade))].sort((a, b) => a - b).map((grade) => {
	const items = scenarios.filter((s) => s.grade === grade);
	return {
		grade,
		items,
		done: items.filter((s) => solved.includes(s.id)).length
	};
});
var topicOf = (scenario) => scenario.topic ?? "build";
/** Text of the task card: the summary, or the first line of the story. */
var summaryOf = (scenario) => scenario.summary ?? scenario.story[0] ?? "";
/**
* The exercise to open after `current`: the next one not done in library order, starting after `current` and
* going round to the start; `undefined` when every other exercise is done.
*/
var nextScenario = (scenarios, solved, current) => {
	const at = scenarios.findIndex((s) => s.id === current);
	return [...scenarios.slice(at + 1), ...scenarios.slice(0, Math.max(at, 0))].find((s) => s.id !== current && !solved.includes(s.id));
};
export { MESSAGES as C, upgraded as S, stepComplete as _, TOPIC_NAMES as a, judgeUpgrade as b, solution as c, apply as d, currentStep as f, startState as g, slotOf as h, topicOf as i, indexParts as l, replay as m, nextScenario as n, hintFor as o, isDone as p, summaryOf as r, report as s, gradeGroups as t, turn as u, cheapestUpgrade as v, montageMinutes as x, formatMinutes as y };
