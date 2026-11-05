import { C as MESSAGES, S as upgraded, _ as stepComplete, a as TOPIC_NAMES, b as judgeUpgrade, c as solution, d as apply, f as currentStep, g as startState, h as slotOf, i as topicOf, l as indexParts, m as replay, n as nextScenario, o as hintFor, p as isDone, r as summaryOf, s as report, t as gradeGroups, u as turn, v as cheapestUpgrade, x as montageMinutes, y as formatMinutes } from "./catalog-OqEjKmlI.js";
import { n as grade8Case, t as grade8Club } from "./grade8-club-BW0_1xPV.js";
// src/core/validate.ts
var duplicates = (ids) => [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
/**
* Authoring errors in a scenario, in Ukrainian so a teacher writing one can read them.
* An empty list means every id is unique and every step points to parts, slots and controls that exist
* and fit together.
*/
var validateScenario = (scenario) => {
	const errors = [];
	const parts = new Map(scenario.parts.map((p) => [p.id, p]));
	const slots = new Map(scenario.slots.map((s) => [s.id, s]));
	const controls = new Map(scenario.controls.map((c) => [c.id, c]));
	for (const id of duplicates(scenario.parts.map((p) => p.id))) errors.push(`Деталь «${id}» описана двічі`);
	for (const id of duplicates(scenario.slots.map((s) => s.id))) errors.push(`Місце «${id}» описане двічі`);
	for (const id of duplicates(scenario.controls.map((c) => c.id))) errors.push(`Перемикач «${id}» описаний двічі`);
	for (const id of duplicates(scenario.steps.map((s) => s.id))) errors.push(`Крок «${id}» описаний двічі`);
	const controlValue = (where, control, value) => {
		const c = controls.get(control);
		if (!c) errors.push(`${where}: немає перемикача «${control}»`);
		else if (!c.values.includes(value)) errors.push(`${where}: перемикач «${control}» не має значення «${value}»`);
	};
	for (const [slotId, partId] of Object.entries(scenario.start?.placed ?? {})) {
		if (!slots.has(slotId)) errors.push(`Початок: немає місця «${slotId}»`);
		if (!parts.has(partId)) errors.push(`Початок: немає деталі «${partId}»`);
	}
	for (const [control, value] of Object.entries(scenario.start?.controls ?? {})) controlValue("Початок", control, value);
	for (const step of scenario.steps) {
		const where = `Крок «${step.id}»`;
		if (step.question && step.question.wrong.includes(step.question.right)) errors.push(`${where}: правильна відповідь є серед неправильних`);
		if (step.kind === "inspect") {
			for (const p of step.parts) if (!parts.has(p)) errors.push(`${where}: немає деталі «${p}»`);
		}
		if (step.kind === "set") {
			controlValue(where, step.control, step.value);
			for (const control of Object.keys(step.otherControls ?? {})) {
				if (!controls.has(control)) errors.push(`${where}: немає перемикача «${control}»`);
				if (control === step.control) errors.push(`${where}: «${control}» і є потрібний перемикач`);
			}
		}
		if (step.kind === "sequence") {
			const stops = new Set(step.stops.map((s) => s.id));
			if (step.order.length === 0) errors.push(`${where}: шлях порожній`);
			for (const id of step.order) if (!stops.has(id)) errors.push(`${where}: немає зупинки «${id}»`);
			for (const id of duplicates(step.stops.map((s) => s.id))) errors.push(`${where}: зупинка «${id}» описана двічі`);
		}
		if (step.kind === "upgrade" && cheapestUpgrade(step) === void 0) errors.push(`${where}: жоден вибір карток не вкладається в бюджет і час`);
		if (step.kind === "sort" && step.items.length === 0) errors.push(`${where}: нема чого сортувати`);
		if (step.kind === "place") {
			if (Object.keys(step.targets).length === 0) errors.push(`${where}: не вказано жодної деталі`);
			for (const [control, value] of Object.entries(step.requires ?? {})) controlValue(where, control, value);
			for (const [partId, slotIds] of Object.entries(step.targets)) {
				const part = parts.get(partId);
				if (!part) errors.push(`${where}: немає деталі «${partId}»`);
				if (slotIds.length === 0) errors.push(`${where}: для «${partId}» не вказано місць`);
				for (const slotId of slotIds) {
					const slot = slots.get(slotId);
					if (!slot) errors.push(`${where}: немає місця «${slotId}»`);
					else if (part && !slot.accepts.includes(part.kind)) errors.push(`${where}: «${partId}» (${part.kind}) не вставляється в «${slotId}»`);
				}
			}
		}
	}
	return errors;
};
// src/scenarios/grade3-box.ts
var DEVICES = [
	"monitor",
	"keyboard",
	"mouse",
	"speakers",
	"printer",
	"flashDrive"
];
var IN = "Кошик «Передає в комп'ютер»";
var OUT = "Кошик «Показує результат»";
var STORE = "Кошик «Зберігає на потім»";
var basket = (id, label) => ({
	id,
	label,
	accepts: DEVICES
});
var usb = (id) => ({
	id,
	label: "Гніздо USB",
	accepts: ["keyboardCable", "mouseCable"]
});
var IN_SLOTS = ["in1", "in2"];
var OUT_SLOTS = [
	"out1",
	"out2",
	"out3"
];
/**
* 3–4 клас, «Нова коробка». Комп'ютер привезли в коробках: розпакувати, розкласти пристрої за тим,
* що вони роблять, поставити на стіл, підключити кабелі й увімкнути. Без поворотів деталей, великі цілі.
* Цілі: A — пристрої введення й виведення, B — підключення, C — хто в комп'ютері «думає».
*/
var grade3Box = {
	id: "grade3-new-box",
	grade: 3,
	title: "Нова коробка",
	topic: "connect",
	summary: "Розпакуй пристрої, розклади їх по кошиках, постав на стіл, підключи кабелі й увімкни комп'ютер.",
	goals: {
		A: "пристрої введення й виведення",
		B: "підключення пристроїв",
		C: "що робить системний блок"
	},
	story: ["До класу привезли новий комп'ютер. Він приїхав у коробках!", "Розпакуй пристрої, розберися, що робить кожен, і підключи комп'ютер."],
	parts: [
		{
			id: "tower",
			kind: "case",
			name: "Системний блок",
			role: "Головна частина комп'ютера. Усередині процесор: він «думає», рахує і керує всіма іншими пристроями."
		},
		{
			id: "monitor",
			kind: "monitor",
			name: "Монітор",
			role: "Показує картинку: те, що зробив комп'ютер. Це пристрій виведення."
		},
		{
			id: "keyboard",
			kind: "keyboard",
			name: "Клавіатура",
			role: "Нею ми вводимо в комп'ютер літери й цифри. Це пристрій введення."
		},
		{
			id: "mouse",
			kind: "mouse",
			name: "Миша",
			role: "Рухає стрілку на екрані й натискає кнопки. Це пристрій введення."
		},
		{
			id: "speakers",
			kind: "speakers",
			name: "Колонки",
			role: "Відтворюють звук: музику, голос, звуки ігор. Це пристрій виведення."
		},
		{
			id: "printer",
			kind: "printer",
			name: "Принтер",
			role: "Друкує на папері те, що є в комп'ютері. Це пристрій виведення."
		},
		{
			id: "flash",
			kind: "flashDrive",
			name: "Флешка",
			role: "Зберігає файли, навіть коли її витягли з комп'ютера. На ній можна перенести малюнок чи текст на інший комп'ютер."
		},
		{
			id: "monitorCable",
			kind: "monitorCable",
			name: "Кабель монітора (HDMI)",
			role: "Несе картинку від системного блока до монітора."
		},
		{
			id: "keyboardCable",
			kind: "keyboardCable",
			name: "Кабель клавіатури (USB)",
			role: "Несе в системний блок те, що ти набираєш."
		},
		{
			id: "mouseCable",
			kind: "mouseCable",
			name: "Кабель миші (USB)",
			role: "Несе в системний блок, куди ти рухаєш мишу і що натискаєш."
		}
	],
	slots: [
		basket("in1", IN),
		basket("in2", IN),
		basket("out1", OUT),
		basket("out2", OUT),
		basket("out3", OUT),
		basket("store1", STORE),
		{
			id: "deskMonitor",
			label: "Місце для монітора",
			accepts: ["monitor"]
		},
		{
			id: "deskKeyboard",
			label: "Місце для клавіатури",
			accepts: ["keyboard"]
		},
		{
			id: "deskMouse",
			label: "Місце для миші",
			accepts: ["mouse"]
		},
		{
			id: "hdmi",
			label: "Гніздо HDMI",
			accepts: ["monitorCable"]
		},
		usb("usb1"),
		usb("usb2"),
		usb("usb3"),
		usb("usb4")
	],
	controls: [{
		id: "power",
		label: "Кнопка живлення системного блока",
		values: ["off", "on"]
	}, {
		id: "monitorPower",
		label: "Кнопка монітора",
		values: ["off", "on"]
	}],
	steps: [
		{
			id: "unbox",
			kind: "inspect",
			title: "Розпакуй коробки",
			explain: "Натискай на коробки, щоб відкрити їх і прочитати, що всередині. Системний блок уже стоїть на столі праворуч: натисни й на нього.",
			parts: [
				"tower",
				"monitor",
				"keyboard",
				"mouse",
				"speakers",
				"printer",
				"flash"
			]
		},
		{
			id: "sort",
			kind: "place",
			title: "Розклади пристрої по кошиках",
			goal: "A",
			explain: "Одні пристрої передають у комп'ютер те, що робиш ти. Інші показують результат: картинкою, звуком або на папері. А деякі зберігають файли на потім.",
			question: {
				text: "У який кошик покласти принтер?",
				right: "«Показує результат»",
				wrong: ["«Передає в комп'ютер»", "«Зберігає на потім»"]
			},
			targets: {
				keyboard: IN_SLOTS,
				mouse: IN_SLOTS,
				monitor: OUT_SLOTS,
				speakers: OUT_SLOTS,
				printer: OUT_SLOTS,
				flash: ["store1"]
			},
			messages: { wrongSlot: "Подумай, що робить цей пристрій: передає щось у комп'ютер, показує результат чи зберігає файли на потім?" }
		},
		{
			id: "desk",
			kind: "place",
			title: "Постав монітор, клавіатуру й мишу",
			explain: "Візьми їх із кошиків. Монітор стоїть далі, клавіатура перед ним, а миша праворуч від клавіатури.",
			targets: {
				monitor: ["deskMonitor"],
				keyboard: ["deskKeyboard"],
				mouse: ["deskMouse"]
			}
		},
		{
			id: "cables",
			kind: "place",
			title: "Підключи кабелі",
			goal: "B",
			explain: "Гнізда для кабелів ззаду на системному блоці. Кожен кабель має свою форму: кабель монітора йде в широке гніздо HDMI, клавіатура й миша — у прямокутні гнізда USB.",
			question: {
				text: "Чому кабель монітора не влазить у гніздо USB?",
				right: "У них різна форма",
				wrong: ["Кабель зламаний", "Треба натиснути сильніше"]
			},
			targets: {
				monitorCable: ["hdmi"],
				keyboardCable: [
					"usb1",
					"usb2",
					"usb3",
					"usb4"
				],
				mouseCable: [
					"usb1",
					"usb2",
					"usb3",
					"usb4"
				]
			}
		},
		{
			id: "power",
			kind: "set",
			title: "Увімкни комп'ютер",
			goal: "C",
			explain: "Комп'ютер «думає» в системному блоці. Знайди на ньому кнопку живлення: вона зверху.",
			question: {
				text: "Де комп'ютер «думає»?",
				right: "У системному блоці",
				wrong: ["У моніторі", "У клавіатурі"]
			},
			control: "power",
			value: "on",
			otherControls: { monitorPower: "Монітор лише показує картинку, а думає системний блок. Спершу увімкни системний блок." }
		},
		{
			id: "screen",
			kind: "set",
			title: "Увімкни монітор",
			explain: "Системний блок працює: чути, як крутяться вентилятори. Тепер натисни кнопку на моніторі, щоб побачити картинку.",
			control: "monitorPower",
			value: "on"
		},
		{
			id: "advice",
			kind: "inspect",
			title: "Порадь бабусі",
			goal: "A",
			explain: "Буває комп'ютер, у якому все в одному корпусі: екран, клавіатура, тачпад замість миші і батарея. Це ноутбук, його можна взяти з собою.",
			question: {
				text: "Бабусі потрібен комп'ютер на дачу, і вона хоче возити його з собою. Що їй порадити?",
				right: "Ноутбук",
				wrong: ["Такий самий системний блок і монітор", "Лише монітор і клавіатуру"]
			},
			parts: []
		}
	]
};
// src/scenarios/faults.ts
/** Slot id → part id, as a scenario's own solution leaves the computer. */
var builtBy = (scenario) => Object.fromEntries(Object.entries(replay(scenario, solution(scenario)).placed).map(([slot, p]) => [slot, p.part]));
var GOALS = { A: "пошук несправності" };
/**
* A troubleshooting exercise on a built computer with one fault: switch it on and see the symptom,
* answer what to check and switch it off, fix it, switch it on again. Cables are fixed with the power off.
*/
var faultScenario = (base, grade, fault, controls) => {
	const steps = [
		{
			id: "on",
			kind: "set",
			title: "Увімкни комп'ютер",
			explain: "Натисни кнопку живлення і подивись, що буде.",
			control: "power",
			value: "on"
		},
		{
			id: "check",
			kind: "set",
			title: "Знайди причину",
			goal: "A",
			look: "result",
			explain: `${fault.symptom} Перед ремонтом вимкни живлення: кабелі під'єднують лише на вимкненому комп'ютері.`,
			question: fault.diagnosis,
			control: "power",
			value: "off"
		},
		{
			id: "fix",
			kind: "place",
			title: fault.fix.title,
			explain: fault.fix.explain,
			targets: { [fault.fix.part]: [fault.fix.slot] }
		},
		{
			id: "again",
			kind: "set",
			title: "Перевір роботу",
			explain: "Увімкни комп'ютер ще раз. Якщо причину знайдено правильно, на екрані з'явиться робочий стіл.",
			control: "power",
			value: "on"
		}
	];
	return {
		id: fault.id,
		grade,
		title: fault.title,
		topic: "fault",
		summary: `${firstSentence(fault.symptom)} Знайди причину й виправ.`,
		goals: GOALS,
		story: fault.story,
		parts: base.parts,
		slots: base.slots,
		controls: base.controls,
		start: {
			placed: withFault(base, fault.change),
			controls
		},
		steps
	};
};
var firstSentence = (text) => text.split(/(?<=\.)\s/)[0] ?? text;
/** The built computer with some slots changed: a part moved elsewhere, or a slot left empty (""). */
var withFault = (base, change) => {
	const placed = { ...builtBy(base) };
	for (const [slot, part] of Object.entries(change)) {
		for (const [s, p] of Object.entries(placed)) if (p === part) delete placed[s];
		if (part === "") delete placed[slot];
		else placed[slot] = part;
	}
	return placed;
};
var GRADE8_STORY = "Комп'ютер гуртка хтось розбирав і зібрав знову. Щось пішло не так: знайди й виправ.";
var grade8FaultCpuPower = faultScenario(grade8Case, 8, {
	id: "grade8-fault-cpu-power",
	title: "Несправність: темний екран",
	story: [GRADE8_STORY],
	symptom: "Вентилятори крутяться, але на екрані нічого немає.",
	diagnosis: {
		text: "Вентилятори крутяться, а зображення немає. Що перевірити першим?",
		right: "Чи під'єднано живлення процесора (CPU)",
		wrong: ["Чи не зламався монітор", "Чи вистачає місця на диску"]
	},
	fix: {
		part: "eps",
		slot: "cpuPowerPort",
		title: "Під'єднай живлення процесора",
		explain: "Без окремого живлення процесор не запускається, хоча вентилятори вже крутяться. Роз'єм CPU у верхньому куті плати."
	},
	change: { cpuPowerPort: "" }
}, {
	power: "off",
	psuSwitch: "on"
});
var grade8FaultHdmi = faultScenario(grade8Case, 8, {
	id: "grade8-fault-hdmi",
	title: "Несправність: немає картинки",
	story: [GRADE8_STORY],
	symptom: "Комп'ютер працює, монітор увімкнений, а картинки немає. Подивись, куди під'єднано кабель монітора.",
	diagnosis: {
		text: "Монітор під'єднано до гнізда HDMI на платі, а у комп'ютері стоїть відеокарта. Чому немає картинки?",
		right: "Зображення створює відеокарта, тож монітор треба під'єднати до неї",
		wrong: ["Кабель HDMI зламався", "Монітору бракує живлення"]
	},
	fix: {
		part: "monitor",
		slot: "gpuHdmi",
		title: "Під'єднай монітор до відеокарти",
		explain: "Візьми кабель монітора з гнізда на платі й під'єднай до гнізда HDMI на відеокарті, нижче."
	},
	change: { boardHdmi: "monitor" }
}, {
	power: "off",
	psuSwitch: "on"
});
var grade8FaultDisk = faultScenario(grade8Case, 8, {
	id: "grade8-fault-disk",
	title: "Несправність: зник диск",
	story: [GRADE8_STORY, "Мирослава шукає свої відео на диску D:, а його немає."],
	symptom: "Комп'ютер запускається, але пише, що диска D: (HDD) немає.",
	diagnosis: {
		text: "Комп'ютер працює, а жорсткого диска не бачить. Що перевірити?",
		right: "Кабель даних SATA від диска до плати",
		wrong: ["Кабель монітора", "Кулер процесора"]
	},
	fix: {
		part: "sataData",
		slot: "sataPort",
		title: "Під'єднай кабель даних диска",
		explain: "Живлення диск отримує, але без кабелю даних плата його не бачить. Під'єднай червоний кабель SATA до роз'єму на платі."
	},
	change: { sataPort: "" }
}, {
	power: "off",
	psuSwitch: "on"
});
/** The grade 3–4 computer also has a power strip; it is on unless the fault is the strip. */
var grade3Base = {
	...grade3Box,
	controls: [...grade3Box.controls, {
		id: "strip",
		label: "Вимикач подовжувача",
		values: ["off", "on"]
	}]
};
var GRADE3_STORY = "Комп'ютер у класі перестав працювати. Ти — майстер: знайди, що сталося.";
var faultScenarios = [
	grade8FaultCpuPower,
	grade8FaultHdmi,
	grade8FaultDisk,
	faultScenario(grade3Base, 3, {
		id: "grade3-fault-monitor",
		title: "Несправність: темний монітор",
		story: [GRADE3_STORY],
		symptom: "Системний блок гуде, монітор увімкнений, а картинки немає.",
		diagnosis: {
			text: "Системний блок працює, монітор увімкнений, а картинки немає. Що перевірити?",
			right: "Чи підключено кабель монітора",
			wrong: ["Чи підключено мишу", "Чи є папір у принтері"]
		},
		fix: {
			part: "monitorCable",
			slot: "hdmi",
			title: "Підключи кабель монітора",
			explain: "Кабель монітора випав. Встав його в широке гніздо HDMI ззаду на системному блоці."
		},
		change: { hdmi: "" }
	}, {
		power: "off",
		monitorPower: "on",
		strip: "on"
	}),
	{
		id: "grade3-fault-strip",
		grade: 3,
		title: "Несправність: нічого не вмикається",
		topic: "fault",
		summary: "Кнопку живлення натискають, а комп'ютер не вмикається зовсім. Знайди причину й виправ.",
		goals: GOALS,
		story: [GRADE3_STORY],
		parts: grade3Base.parts,
		slots: grade3Base.slots,
		controls: grade3Base.controls,
		start: {
			placed: withFault(grade3Base, {}),
			controls: {
				power: "off",
				monitorPower: "on",
				strip: "off"
			}
		},
		steps: [{
			id: "on",
			kind: "set",
			title: "Увімкни комп'ютер",
			explain: "Натисни кнопку живлення на системному блоці і подивись, що буде.",
			control: "power",
			value: "on"
		}, {
			id: "strip",
			kind: "set",
			title: "Знайди причину",
			goal: "A",
			look: "result",
			explain: "Нічого не сталося: ні звуку, ні світла. Комп'ютер отримує живлення від розетки через подовжувач на столі.",
			question: {
				text: "Натискаєш кнопку, а нічого не відбувається. Що перевірити?",
				right: "Чи увімкнено подовжувач",
				wrong: ["Чи підключено мишу", "Чи є картинка на моніторі"]
			},
			control: "strip",
			value: "on"
		}]
	}
];
// src/scenarios/grade8-lab.ts
/** The computer as the case scenario leaves it: every part in place. */
var built = Object.fromEntries(Object.entries(replay(grade8Case, solution(grade8Case)).placed).map(([slot, placed]) => [slot, placed.part]));
/**
* 8 клас, «ПК і його складові» (паспорт inf8-06). Частини 4–6 на зібраному й увімкненому комп'ютері гуртка:
* шлях даних (ціль A), апгрейд під монтаж відео (ціль B), вимкнення живлення (ціль C).
*/
var grade8Lab = {
	id: "grade8-club-lab",
	grade: 8,
	title: "Старий комп'ютер гуртка: як він працює",
	topic: "explore",
	summary: "Простеж шлях фото до екрана, пришвидш комп'ютер для монтажу й розберись, що зникає після вимкнення.",
	goals: {
		A: "шлях даних",
		B: "швидкодія",
		C: "види пам'яті"
	},
	story: ["Комп'ютер гуртка зібрано, він працює. Тепер розберімося, що відбувається всередині.", "Мирослава хоче перенести відео зі смартфона й змонтувати ролик для блогу."],
	parts: grade8Case.parts,
	slots: grade8Case.slots,
	controls: grade8Case.controls,
	start: {
		placed: built,
		controls: {
			power: "on",
			psuSwitch: "on"
		}
	},
	steps: [
		{
			id: "path",
			kind: "sequence",
			title: "Простеж шлях фото",
			goal: "A",
			explain: "Смартфон під'єднали кабелем до гнізда USB. Звідти фото йде в оперативну пам'ять, бо процесор бере дані лише з неї. Процесор обробляє фото, відеокарта робить із нього зображення, а монітор показує. Натискай позначки по черзі.",
			stops: [
				{
					id: "usb",
					label: "USB"
				},
				{
					id: "ram",
					label: "ОЗП"
				},
				{
					id: "cpu",
					label: "Процесор",
					why: "Процесор не бере дані просто з USB: спершу вони потрапляють в оперативну пам'ять."
				},
				{
					id: "gpu",
					label: "Відеокарта"
				},
				{
					id: "monitor",
					label: "Монітор",
					why: "Монітор лише показує готове зображення. Його створює відеокарта з того, що обробив процесор."
				},
				{
					id: "ssd",
					label: "SSD",
					why: "Диск потрібен, щоб зберегти фото надовго. Щоб показати фото на екрані, його не обов'язково записувати на диск."
				},
				{
					id: "hdd",
					label: "HDD",
					why: "Диск потрібен, щоб зберегти фото надовго. Щоб показати фото на екрані, його не обов'язково записувати на диск."
				}
			],
			order: [
				"usb",
				"ram",
				"cpu",
				"gpu",
				"monitor"
			]
		},
		{
			id: "save",
			kind: "inspect",
			title: "Збережи ролик",
			goal: "C",
			explain: "Поки Мирослава монтує ролик, він живе в оперативній пам'яті: вона швидка, але все забуває, щойно зникає живлення. Щоб ролик лишився, його записують на диск: SSD або HDD.",
			question: {
				text: "Ролик змонтовано. Куди його записати, щоб він не зник після вимкнення комп'ютера?",
				right: "На SSD або HDD",
				wrong: ["Лишити в оперативній пам'яті", "У процесор"]
			},
			parts: []
		},
		{
			id: "upgrade",
			kind: "upgrade",
			title: "Пришвидш монтаж відео",
			goal: "B",
			explain: "Монтаж на цьому комп'ютері триває понад 20 хвилин. Гурток має 5 тисяч гривень. На швидкість впливають кількість ядер і частота процесора, його кеш, обсяг оперативної пам'яті і швидкість диска.",
			task: "Монтаж відео",
			base: {
				cores: 2,
				ghz: 2.8,
				cacheMb: 3,
				ramGb: 4,
				disk: "hdd"
			},
			budget: 5,
			target: 10,
			options: [
				{
					id: "cpu2",
					label: "Процесор: 2 ядра, 3,6 ГГц, кеш 3 МБ",
					cost: 2,
					group: "cpu",
					change: {
						cores: 2,
						ghz: 3.6,
						cacheMb: 3
					},
					why: "Частота така сама, як у 6-ядерного, але ядер лише 2. Монтаж ділиться між ядрами, тож швидкість — це не лише частота."
				},
				{
					id: "cpu6",
					label: "Процесор: 6 ядер, 3,6 ГГц, кеш 12 МБ",
					cost: 3,
					group: "cpu",
					change: {
						cores: 6,
						ghz: 3.6,
						cacheMb: 12
					}
				},
				{
					id: "ram16",
					label: "Оперативна пам'ять: 16 ГБ замість 4 ГБ",
					cost: 2,
					change: { ramGb: 16 }
				},
				{
					id: "ssd",
					label: "SSD замість HDD для відео",
					cost: 2,
					change: { disk: "ssd" }
				}
			]
		},
		{
			id: "sort",
			kind: "sort",
			title: "Що зникне без живлення?",
			goal: "C",
			explain: "Зараз комп'ютер вимкнуть. Розклади: що зникне з оперативної пам'яті, а що лишиться на диску.",
			items: [
				{
					id: "text",
					label: "Текст до ролика, який ще не зберегли",
					memory: "volatile",
					why: "Незбережений текст є лише в оперативній пам'яті. Без живлення вона все забуває."
				},
				{
					id: "tabs",
					label: "Відкриті вкладки браузера",
					memory: "volatile",
					why: "Відкриті вкладки програма тримає в оперативній пам'яті. Вони зникнуть разом із живленням."
				},
				{
					id: "video",
					label: "Ролик, збережений на SSD",
					memory: "persistent",
					why: "Збережене на диску лишається й без живлення: для цього диск і потрібен."
				},
				{
					id: "photos",
					label: "Фото, скопійовані зі смартфона на HDD",
					memory: "persistent",
					why: "Фото записані на диск, тож вони нікуди не зникнуть."
				},
				{
					id: "editor",
					label: "Встановлена програма для монтажу",
					memory: "persistent",
					why: "Встановлені програми зберігаються на диску. Після ввімкнення їх знову можна запустити."
				}
			]
		},
		{
			id: "off",
			kind: "set",
			title: "Вимкни живлення",
			goal: "C",
			explain: "Натисни кнопку живлення на корпусі і подивись, що станеться з монітором.",
			control: "power",
			value: "off"
		},
		{
			id: "after",
			kind: "inspect",
			title: "Що лишилося?",
			goal: "C",
			explain: "Після вимкнення оперативна пам'ять порожня, а на SSD і HDD усе на місці. Тому важливе зберігають на диск заздалегідь.",
			question: {
				text: "Мирослава не зберегла текст до ролика, і живлення зникло. Що з текстом?",
				right: "Зник: він був лише в оперативній пам'яті",
				wrong: ["Лишився в процесорі", "Сам записався на диск"]
			},
			parts: []
		}
	]
};
// src/scenarios/index.ts
/** All scenarios by id. */
var scenarios = {
	[grade3Box.id]: grade3Box,
	[grade8Club.id]: grade8Club,
	[grade8Case.id]: grade8Case,
	[grade8Lab.id]: grade8Lab,
	...Object.fromEntries(faultScenarios.map((s) => [s.id, s]))
};
export { MESSAGES, TOPIC_NAMES, apply, cheapestUpgrade, currentStep, formatMinutes, grade8Club, gradeGroups, hintFor, indexParts, isDone, judgeUpgrade, montageMinutes, nextScenario, replay, report, scenarios, slotOf, solution, startState, stepComplete, summaryOf, topicOf, turn, upgraded, validateScenario };
