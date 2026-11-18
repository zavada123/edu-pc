import { S as upgraded, a as TOPIC_NAMES, d as apply, f as currentStep, g as startState, h as slotOf, i as topicOf, n as summaryOf, o as hintFor, p as isDone, r as topicGroups, s as report, u as turn, x as montageMinutes, y as formatMinutes } from "./catalog-Bf_S7iTU.js";
import { _ as layouts, n as focusPoint, r as focusStops } from "./focus-BN-CX5K5.js";
import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Fragment as Fragment$1, jsx, jsxs } from "react/jsx-runtime";
// src/ui/rich-text.ts
/**
* Markup for task and hint texts. The same file is in every eduprostir trainer (edu-* repositories and
* mriya-study). Keep the copies the same; the convention is in mriya-study docs/trainer-text-markup.md.
*
*   **Створити**        name of a button, menu, field, tab or window: bold, in the accent color
*   [k]Ctrl+C[/k]       keys: each key is a keyboard key, «+» between them
*   `=SUM(A1:A3)`       text to type exactly: formula, code, name
*   [red]червоний[/red] a term in its color: red, green, blue, yellow, orange, purple
*   «Тварини»           name of a folder, file, sheet, site or other object: highlighted, the quotes stay
*
* The parser makes plain parts. It never makes HTML from the text, so a text cannot add tags or scripts.
* Markup does not nest. A mark without its end stays as plain text.
*/
var RichColors = {
	Red: "red",
	Green: "green",
	Blue: "blue",
	Yellow: "yellow",
	Orange: "orange",
	Purple: "purple"
};
var MARK = /\*\*(.+?)\*\*|\[k\](.+?)\[\/k\]|`([^`]+)`|\[(red|green|blue|yellow|orange|purple)\](.+?)\[\/\4\]|«([^«»\n]+)»/g;
var isRichColor = (value) => Object.values(RichColors).some((c) => c === value);
/** «Ctrl+Shift+S» → ["Ctrl", "Shift", "S"]; «Ctrl++» → ["Ctrl", "+"]. */
var splitKeys = (keys) => keys.split(/(?<=\S)\s*\+\s*(?=\S)/).map((k) => k.trim()).filter((k) => k !== "");
var markPart = (m) => {
	const [, ui, keys, code, color, colored, name] = m;
	if (ui !== void 0) return {
		kind: "ui",
		text: ui
	};
	if (keys !== void 0) return {
		kind: "keys",
		keys: splitKeys(keys)
	};
	if (code !== void 0) return {
		kind: "code",
		text: code
	};
	if (color !== void 0 && colored !== void 0 && isRichColor(color)) return {
		kind: "color",
		color,
		text: colored
	};
	if (name !== void 0) return {
		kind: "name",
		text: name
	};
	return {
		kind: "text",
		text: m[0]
	};
};
/** Splits a text with markup into parts. Text without markup gives one "text" part. */
var parseRich = (source) => {
	const parts = [];
	let last = 0;
	for (const m of source.matchAll(MARK)) {
		const at = m.index;
		if (at > last) parts.push({
			kind: "text",
			text: source.slice(last, at)
		});
		parts.push(markPart(m));
		last = at + m[0].length;
	}
	if (last < source.length) parts.push({
		kind: "text",
		text: source.slice(last)
	});
	return parts;
};
// src/ui/RichText.tsx
/** One part of a marked text. Class names start with `rt-`; rich-text.css gives the look. */
var Part = ({ part }) => {
	switch (part.kind) {
		case "text": return /* @__PURE__ */ jsx(Fragment$1, { children: part.text });
		case "ui": return /* @__PURE__ */ jsx("strong", {
			className: "rt-ui",
			children: part.text
		});
		case "code": return /* @__PURE__ */ jsx("code", {
			className: "rt-code",
			children: part.text
		});
		case "name": return /* @__PURE__ */ jsxs(Fragment$1, { children: [
			"«",
			/* @__PURE__ */ jsx("span", {
				className: "rt-name",
				children: part.text
			}),
			"»"
		] });
		case "color": return /* @__PURE__ */ jsx("span", {
			className: `rt-color rt-${part.color}`,
			children: part.text
		});
		case "keys": return /* @__PURE__ */ jsx("span", {
			className: "rt-keys",
			children: part.keys.map((key, i) => /* @__PURE__ */ jsxs(Fragment, { children: [i > 0 && /* @__PURE__ */ jsx("span", {
				className: "rt-plus",
				children: "+"
			}), /* @__PURE__ */ jsx("kbd", {
				className: "rt-key",
				children: key
			})] }, i))
		});
	}
};
/** Shows a task or hint text with its markup (see rich-text.ts). Never sets HTML. */
var RichText = ({ text }) => /* @__PURE__ */ jsx(Fragment$1, { children: parseRich(text).map((part, i) => /* @__PURE__ */ jsx(Part, { part }, i)) });
// src/ui/panels.tsx
/** The steps down the side: done, current, still ahead, with mistakes per step. */
var StepList = ({ scenario, state }) => /* @__PURE__ */ jsx("ol", {
	className: "edu-pc-steps",
	"aria-label": "Кроки",
	children: scenario.steps.map((step, i) => {
		const mistakes = state.stepMistakes[step.id] ?? 0;
		const status = i < state.step ? "done" : i === state.step ? "current" : "ahead";
		return /* @__PURE__ */ jsxs("li", {
			className: `edu-pc-step is-${status}`,
			"aria-current": status === "current" ? "step" : void 0,
			children: [
				/* @__PURE__ */ jsx("span", {
					className: "edu-pc-step-mark",
					"aria-hidden": "true",
					children: status === "done" ? "✓" : i + 1
				}),
				/* @__PURE__ */ jsx("span", {
					className: "edu-pc-step-title",
					children: step.title
				}),
				mistakes > 0 && /* @__PURE__ */ jsx("span", {
					className: "edu-pc-step-mistakes",
					title: "Помилки на цьому кроці",
					children: mistakes
				})
			]
		}, step.id);
	})
});
var StepCard = ({ step, index, total, look }) => /* @__PURE__ */ jsxs("section", {
	className: "edu-pc-card",
	"aria-live": "polite",
	children: [
		/* @__PURE__ */ jsxs("p", {
			className: "edu-pc-card-count",
			children: [
				"Крок ",
				index + 1,
				" з ",
				total
			]
		}),
		/* @__PURE__ */ jsx("h2", {
			className: "edu-pc-card-title",
			children: step.title
		}),
		/* @__PURE__ */ jsx("p", {
			className: "edu-pc-card-text",
			children: /* @__PURE__ */ jsx(RichText, { text: step.explain })
		}),
		look.length > 0 && /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsxs("p", {
			className: "edu-pc-look-count",
			children: [
				"Переглянуто ",
				look.filter((item) => item.done).length,
				" з ",
				look.length
			]
		}), /* @__PURE__ */ jsx("ul", {
			className: "edu-pc-look",
			children: look.map((item) => /* @__PURE__ */ jsxs("li", {
				className: item.done ? "is-done" : void 0,
				children: [
					/* @__PURE__ */ jsx("span", {
						className: "edu-pc-look-mark",
						"aria-hidden": "true",
						children: item.done ? "✓" : ""
					}),
					item.name,
					item.done && /* @__PURE__ */ jsx("span", {
						className: "edu-pc-sr",
						children: " — переглянуто"
					})
				]
			}, item.id))
		})] })
	]
});
/** Order the answers the same way every time for a step, but not always with the right one first. */
var ordered = (stepId, q) => {
	const all = [q.right, ...q.wrong];
	let seed = [...stepId].reduce((h, c) => h * 31 + c.charCodeAt(0) >>> 0, 7);
	const out = [...all];
	for (let i = out.length - 1; i > 0; i--) {
		seed = seed * 1103515245 + 12345 >>> 0;
		const j = seed % (i + 1);
		const a = out[i];
		const b = out[j];
		if (a !== void 0 && b !== void 0) [out[i], out[j]] = [b, a];
	}
	return out;
};
var QuestionCard = ({ step, question, onAnswer }) => {
	const answers = useMemo(() => ordered(step.id, question), [step.id, question]);
	return /* @__PURE__ */ jsx("div", {
		className: "edu-pc-overlay",
		role: "dialog",
		"aria-modal": "true",
		"aria-labelledby": "edu-pc-q",
		children: /* @__PURE__ */ jsxs("div", {
			className: "edu-pc-question",
			children: [
				/* @__PURE__ */ jsx("p", {
					className: "edu-pc-card-count",
					children: "Спершу дай відповідь"
				}),
				/* @__PURE__ */ jsx("h2", {
					id: "edu-pc-q",
					children: /* @__PURE__ */ jsx(RichText, { text: question.text })
				}),
				/* @__PURE__ */ jsx("div", {
					className: "edu-pc-answers",
					children: answers.map((a) => /* @__PURE__ */ jsx("button", {
						type: "button",
						className: "edu-pc-answer",
						onClick: () => onAnswer(a),
						children: /* @__PURE__ */ jsx(RichText, { text: a })
					}, a))
				})
			]
		})
	});
};
/** The parts not yet installed. On an «inspect» step a click reads about the part; otherwise it takes it. */
var Tray = ({ parts, held, highlighted, benchPart, icons, onPick }) => /* @__PURE__ */ jsx("div", {
	className: "edu-pc-tray",
	role: "toolbar",
	"aria-label": "Деталі",
	children: parts.map((part) => {
		const classes = ["edu-pc-part"];
		if (held?.part === part.id) classes.push("is-held");
		if (highlighted.includes(part.id)) classes.push("is-hint");
		return /* @__PURE__ */ jsxs("button", {
			type: "button",
			className: classes.join(" "),
			"aria-pressed": held?.part === part.id,
			onClick: () => onPick(part),
			children: [
				icons[part.kind] ? /* @__PURE__ */ jsx("img", {
					className: "edu-pc-part-pic",
					src: icons[part.kind],
					alt: "",
					width: 44,
					height: 44
				}) : /* @__PURE__ */ jsx("span", {
					className: `edu-pc-part-icon kind-${part.kind}`,
					"aria-hidden": "true"
				}),
				/* @__PURE__ */ jsx("span", { children: part.name }),
				part.id === benchPart && /* @__PURE__ */ jsx("span", {
					className: "edu-pc-part-note",
					children: "на столі"
				})
			]
		}, part.id);
	})
});
var HeldBar = ({ part, onTurn, onPutBack, needsTurn = false }) => /* @__PURE__ */ jsxs("div", {
	className: "edu-pc-held",
	role: "group",
	"aria-label": "Деталь у руці",
	children: [
		/* @__PURE__ */ jsxs("span", {
			className: "edu-pc-held-name",
			children: [
				"У руці: ",
				/* @__PURE__ */ jsx("b", { children: part.name }),
				". Натисни на місце, куди її поставити.",
				needsTurn && /* @__PURE__ */ jsxs("span", {
					className: "edu-pc-held-turn",
					children: [" ", "Стає лише одним боком: повертай її кнопками ⟲ ⟳ справа або клавішами Q і E."]
				})
			]
		}),
		/* @__PURE__ */ jsx("button", {
			type: "button",
			onClick: () => onTurn(-1),
			"aria-label": "Повернути проти годинникової стрілки (Q)",
			children: "⟲"
		}),
		/* @__PURE__ */ jsx("button", {
			type: "button",
			onClick: () => onTurn(1),
			"aria-label": "Повернути за годинниковою стрілкою (E)",
			children: "⟳"
		}),
		/* @__PURE__ */ jsx("button", {
			type: "button",
			onClick: onPutBack,
			children: "Покласти назад"
		})
	]
});
/** What a part is and what it does. It takes the step card's place until it is closed, so only one message is on screen. */
var PartInfo = ({ part, onClose }) => /* @__PURE__ */ jsxs("aside", {
	className: "edu-pc-info",
	"aria-live": "polite",
	"aria-label": `Деталь: ${part.name}`,
	children: [
		/* @__PURE__ */ jsx("p", {
			className: "edu-pc-info-kind",
			children: "Деталь"
		}),
		/* @__PURE__ */ jsx("h3", { children: part.name }),
		/* @__PURE__ */ jsx("p", { children: /* @__PURE__ */ jsx(RichText, { text: part.role }) }),
		/* @__PURE__ */ jsx("button", {
			type: "button",
			className: "edu-pc-info-ok",
			onClick: onClose,
			children: "Зрозуміло"
		})
	]
});
var ToastLine = ({ toast }) => toast ? /* @__PURE__ */ jsx("p", {
	className: `edu-pc-toast tone-${toast.tone}`,
	role: toast.tone === "error" ? "alert" : "status",
	children: /* @__PURE__ */ jsx(RichText, { text: toast.text })
}, toast.key) : null;
var DoneCard = ({ result, goals, onRestart, onNext }) => /* @__PURE__ */ jsx("div", {
	className: "edu-pc-overlay",
	children: /* @__PURE__ */ jsxs("div", {
		className: "edu-pc-question edu-pc-done",
		children: [
			/* @__PURE__ */ jsx("h2", { children: "Готово! Усі кроки виконано." }),
			/* @__PURE__ */ jsx("p", { children: result.mistakes === 0 ? "Жодної помилки, чудово!" : `Помилок: ${result.mistakes}. Перечитай кроки, де вони були.` }),
			Object.entries(result.byGoal).length > 0 && /* @__PURE__ */ jsx("ul", {
				className: "edu-pc-goals",
				children: Object.entries(result.byGoal).sort(([a], [b]) => a.localeCompare(b)).map(([goal, n]) => /* @__PURE__ */ jsxs("li", { children: [
					"Ціль ",
					goal,
					goals[goal] ? ` (${goals[goal]})` : "",
					": ",
					n === 0 ? "без помилок" : `помилок ${n}`
				] }, goal))
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "edu-pc-done-actions",
				children: [onNext && /* @__PURE__ */ jsx("button", {
					type: "button",
					className: "edu-pc-primary",
					onClick: onNext,
					children: "Наступне завдання"
				}), /* @__PURE__ */ jsx("button", {
					type: "button",
					className: "edu-pc-answer",
					onClick: onRestart,
					children: "Пройти ще раз"
				})]
			})
		]
	})
});
/**
* Cards to buy on an upgrade step. The student picks within the budget and checks: the time after the
* upgrade is shown only on a check, so it is a decision, not a slider to play with.
*/
var UpgradeCard = ({ step, note, onCheck }) => {
	const [chosen, setChosen] = useState([]);
	const [tried, setTried] = useState(null);
	const spent = step.options.filter((o) => chosen.includes(o.id)).reduce((sum, o) => sum + o.cost, 0);
	const toggle = (id) => setChosen((c) => c.includes(id) ? c.filter((x) => x !== id) : [...c, id]);
	const check = () => {
		const minutes = montageMinutes(upgraded(step.base, step.options.filter((o) => chosen.includes(o.id))));
		setTried(formatMinutes(minutes));
		onCheck(chosen);
	};
	return /* @__PURE__ */ jsx("div", {
		className: "edu-pc-overlay is-panel",
		role: "dialog",
		"aria-labelledby": "edu-pc-up",
		children: /* @__PURE__ */ jsxs("div", {
			className: "edu-pc-question edu-pc-shop",
			children: [
				/* @__PURE__ */ jsxs("p", {
					className: "edu-pc-card-count",
					children: [
						step.task,
						" зараз: ",
						formatMinutes(montageMinutes(step.base)),
						". Мета: не довше ",
						formatMinutes(step.target),
						"."
					]
				}),
				/* @__PURE__ */ jsxs("h2", {
					id: "edu-pc-up",
					children: [
						"Що замінити? Бюджет: ",
						step.budget,
						" тис. грн"
					]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "edu-pc-answers",
					children: step.options.map((o) => /* @__PURE__ */ jsxs("button", {
						type: "button",
						className: `edu-pc-answer edu-pc-offer${chosen.includes(o.id) ? " is-chosen" : ""}`,
						"aria-pressed": chosen.includes(o.id),
						onClick: () => toggle(o.id),
						children: [/* @__PURE__ */ jsx("span", { children: o.label }), /* @__PURE__ */ jsxs("b", { children: [o.cost, " тис."] })]
					}, o.id))
				}),
				/* @__PURE__ */ jsxs("p", {
					className: `edu-pc-shop-sum${spent > step.budget ? " is-over" : ""}`,
					children: [
						"Вибрано на ",
						spent,
						" тис. грн із ",
						step.budget,
						tried ? ` · остання перевірка: ${tried}` : ""
					]
				}),
				note && /* @__PURE__ */ jsx("p", {
					className: "edu-pc-note",
					children: /* @__PURE__ */ jsx(RichText, { text: note })
				}),
				/* @__PURE__ */ jsx("button", {
					type: "button",
					className: "edu-pc-primary",
					disabled: chosen.length === 0,
					onClick: check,
					children: "Замінити й перевірити"
				})
			]
		})
	});
};
var MEMORY_NAMES = {
	volatile: "Зникне",
	persistent: "Лишиться"
};
/** Things on the computer, each to sort: lost at power off (it is only in RAM) or kept (it is on a disk). */
var SortCard = ({ step, sorted, note, onSort }) => /* @__PURE__ */ jsx("div", {
	className: "edu-pc-overlay is-panel",
	role: "dialog",
	"aria-labelledby": "edu-pc-sort",
	children: /* @__PURE__ */ jsxs("div", {
		className: "edu-pc-question edu-pc-sort",
		children: [
			/* @__PURE__ */ jsx("h2", {
				id: "edu-pc-sort",
				children: "Що буде після вимкнення?"
			}),
			/* @__PURE__ */ jsx("ul", {
				className: "edu-pc-sort-list",
				children: step.items.map((item) => {
					const at = sorted[item.id];
					return /* @__PURE__ */ jsxs("li", {
						className: at ? "is-sorted" : void 0,
						children: [/* @__PURE__ */ jsx("span", { children: item.label }), /* @__PURE__ */ jsx("span", {
							className: "edu-pc-sort-buttons",
							children: ["volatile", "persistent"].map((memory) => /* @__PURE__ */ jsx("button", {
								type: "button",
								className: `edu-pc-sort-btn is-${memory}${at === memory ? " is-chosen" : ""}`,
								disabled: at !== void 0,
								onClick: () => onSort(item.id, memory),
								children: MEMORY_NAMES[memory]
							}, memory))
						})]
					}, item.id);
				})
			}),
			note && /* @__PURE__ */ jsx("p", {
				className: "edu-pc-note",
				children: /* @__PURE__ */ jsx(RichText, { text: note })
			})
		]
	})
});
// src/ui/fullscreen.ts
/** While the trainer covers the page, the page under it does not scroll. */
var PAGE_FULL_CLASS = "edu-pc-page-full";
/**
* Full screen for the trainer. The trainer covers the page (a fixed layer), so it works on an iPhone too, and
* where the browser can, the page goes to the browser's full screen as well. Esc or the button leaves it; an Esc
* the trainer has used already (putting back the part in hand) does not.
*/
var useFullScreen = () => {
	const [full, setFull] = useState(false);
	const leave = useCallback(() => {
		setFull(false);
		if (document.fullscreenElement) document.exitFullscreen().catch(() => void 0);
	}, []);
	const enter = useCallback(() => {
		setFull(true);
		const page = document.documentElement;
		if (typeof page.requestFullscreen === "function" && document.fullscreenEnabled && !document.fullscreenElement) page.requestFullscreen().catch(() => void 0);
	}, []);
	useEffect(() => {
		if (!full) return void 0;
		const page = document.documentElement;
		page.classList.add(PAGE_FULL_CLASS);
		const onChange = () => {
			if (!document.fullscreenElement) setFull(false);
		};
		const onKey = (e) => {
			if (e.key === "Escape" && !e.defaultPrevented) leave();
		};
		document.addEventListener("fullscreenchange", onChange);
		window.addEventListener("keydown", onKey);
		return () => {
			page.classList.remove(PAGE_FULL_CLASS);
			document.removeEventListener("fullscreenchange", onChange);
			window.removeEventListener("keydown", onKey);
		};
	}, [full, leave]);
	const isFull = useRef(full);
	isFull.current = full;
	useEffect(() => () => {
		if (isFull.current && document.fullscreenElement) document.exitFullscreen().catch(() => void 0);
	}, []);
	return {
		full,
		toggle: full ? leave : enter
	};
};
// src/ui/useBuild.ts
/** The trainer's state for React: the build state, the part in hand and the last message. */
var useBuild = (scenario, callbacks, initial) => {
	const [state, setState] = useState(() => initial ?? startState(scenario));
	const [held, setHeld] = useState(null);
	const [toast, setToast] = useState(null);
	const [info, setInfo] = useState(null);
	const say = useCallback((text, tone) => setToast({
		text,
		tone,
		key: Date.now()
	}), []);
	const act = useCallback((action) => {
		const outcome = apply(scenario, state, action);
		setState(outcome.state);
		if (outcome.result === "mistake") say(outcome.message, "error");
		else if (outcome.result !== "ok") say(outcome.message, "info");
		else if (outcome.advanced) say(isDone(scenario, outcome.state) ? "Готово!" : "Правильно!", "ok");
		else setToast((t) => t?.tone === "error" ? null : t);
		if (outcome.result === "ok" || outcome.result === "mistake") {
			callbacks.onAction?.(action, outcome.state);
			if (outcome.result === "ok" && outcome.advanced && isDone(scenario, outcome.state)) callbacks.onComplete?.(report(scenario, outcome.state));
		}
		return outcome;
	}, [
		scenario,
		state,
		say,
		callbacks
	]);
	const inspect = useCallback((part) => {
		setInfo(part);
		act({
			type: "inspect",
			part
		});
	}, [act]);
	const take = useCallback((part) => {
		setInfo(null);
		setHeld((h) => h?.part === part ? null : {
			part,
			turn: 0
		});
	}, []);
	const rotate = useCallback((by) => setHeld((h) => h ? {
		...h,
		turn: turn(h.turn, by)
	} : h), []);
	const putBack = useCallback(() => setHeld(null), []);
	const placeAt = useCallback((slot) => {
		if (!held) return;
		const outcome = act({
			type: "place",
			part: held.part,
			slot,
			turn: held.turn
		});
		if (outcome.result !== "ok") return;
		const next = currentStep(scenario, outcome.state);
		const end = scenario.parts.find((p) => p.end === held.part && next?.kind === "place" && next.targets[p.id] && slotOf(outcome.state, p.id) === void 0);
		setHeld(end ? {
			part: end.id,
			turn: 0
		} : null);
		if (end) say(`Тепер другий кінець: ${end.name}.`, "info");
	}, [
		act,
		held,
		scenario,
		say
	]);
	const restart = useCallback(() => {
		setState(startState(scenario));
		setHeld(null);
		setInfo(null);
		setToast(null);
	}, [scenario]);
	return {
		state,
		step: currentStep(scenario, state),
		hint: useMemo(() => hintFor(scenario, state), [scenario, state]),
		held,
		toast,
		info,
		act,
		inspect,
		take,
		rotate,
		putBack,
		placeAt,
		restart,
		setInfo
	};
};
// src/ui/Select.tsx
var LIST_MAX_HEIGHT_PX = 288;
var LIST_GAP_PX = 6;
var TYPE_AHEAD_RESET_MS = 600;
var listPlace = (rect) => {
	const below = window.innerHeight - rect.bottom;
	return below < LIST_MAX_HEIGHT_PX && rect.top > below ? {
		left: rect.left,
		width: rect.width,
		top: null,
		bottom: window.innerHeight - rect.top + LIST_GAP_PX
	} : {
		left: rect.left,
		width: rect.width,
		top: rect.bottom + LIST_GAP_PX,
		bottom: null
	};
};
/** Next enabled option index from `from` in `direction`; stays inside the list. */
var stepEnabled = (options, from, direction) => {
	for (let i = from + direction; i >= 0 && i < options.length; i += direction) if (options[i]?.disabled !== true) return i;
	return from;
};
function Select(props) {
	const { options } = props;
	const listId = `${useId()}-list`;
	const selectedIndex = options.findIndex((o) => o.value === props.value);
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(0);
	const [place, setPlace] = useState({
		left: 0,
		width: 0,
		top: 0,
		bottom: null
	});
	const rootRef = useRef(null);
	const buttonRef = useRef(null);
	const listRef = useRef(null);
	const typed = useRef({
		text: "",
		at: 0
	});
	const openList = (index) => {
		const rect = buttonRef.current?.getBoundingClientRect();
		if (rect !== void 0) setPlace(listPlace(rect));
		setActive(index < 0 ? stepEnabled(options, -1, 1) : index);
		setOpen(true);
	};
	const pick = (index) => {
		const option = options[index];
		setOpen(false);
		if (option === void 0 || option.disabled === true) return;
		if (option.value !== props.value) props.onChange(option.value);
	};
	useEffect(() => {
		if (!open) return;
		const onPointerDown = (event) => {
			if (event.target instanceof Node && rootRef.current?.contains(event.target) === true) return;
			setOpen(false);
		};
		const onScroll = (event) => {
			if (event.target instanceof Node && listRef.current?.contains(event.target) === true) return;
			setOpen(false);
		};
		const onResize = () => setOpen(false);
		document.addEventListener("pointerdown", onPointerDown);
		window.addEventListener("scroll", onScroll, true);
		window.addEventListener("resize", onResize);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			window.removeEventListener("scroll", onScroll, true);
			window.removeEventListener("resize", onResize);
		};
	}, [open]);
	useEffect(() => {
		if (!open) return;
		listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
	}, [open, active]);
	/** Type-ahead: the next enabled option whose label starts with the typed text. */
	const findTyped = (key, now) => {
		const text = (now - typed.current.at > TYPE_AHEAD_RESET_MS ? key : typed.current.text + key).toLowerCase();
		typed.current = {
			text,
			at: now
		};
		const start = open ? active : Math.max(selectedIndex, 0);
		return [...options.keys()].map((i) => (start + 1 + i) % options.length).find((i) => {
			const option = options[i];
			return option !== void 0 && option.disabled !== true && option.label.toLowerCase().startsWith(text);
		}) ?? -1;
	};
	const onKeyDown = (event) => {
		const { key } = event;
		const printable = key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
		if (!open) {
			if (key === "ArrowDown" || key === "ArrowUp" || key === "Enter" || key === " ") {
				event.preventDefault();
				openList(selectedIndex);
			} else if (key === "Home" || key === "End") {
				event.preventDefault();
				openList(key === "Home" ? stepEnabled(options, -1, 1) : stepEnabled(options, options.length, -1));
			} else if (printable) {
				const found = findTyped(key, event.timeStamp);
				if (found >= 0) openList(found);
			}
			return;
		}
		switch (key) {
			case "ArrowDown":
			case "ArrowUp":
				event.preventDefault();
				if (event.altKey) return pick(active);
				return setActive(stepEnabled(options, active, key === "ArrowDown" ? 1 : -1));
			case "Home":
				event.preventDefault();
				return setActive(stepEnabled(options, -1, 1));
			case "End":
				event.preventDefault();
				return setActive(stepEnabled(options, options.length, -1));
			case "Enter":
			case " ":
				event.preventDefault();
				return pick(active);
			case "Escape":
				event.preventDefault();
				event.stopPropagation();
				return setOpen(false);
			case "Tab": return pick(active);
		}
		if (printable) {
			const found = findTyped(key, event.timeStamp);
			if (found >= 0) setActive(found);
		}
	};
	const shown = options[selectedIndex];
	return /* @__PURE__ */ jsxs("span", {
		ref: rootRef,
		className: ["edu-select", props.className].filter(Boolean).join(" "),
		children: [/* @__PURE__ */ jsxs("button", {
			ref: buttonRef,
			type: "button",
			role: "combobox",
			className: "edu-select-button",
			value: props.value,
			"aria-label": props.ariaLabel,
			"aria-haspopup": "listbox",
			"aria-expanded": open,
			"aria-controls": listId,
			"aria-activedescendant": open ? `${listId}-${active}` : void 0,
			onClick: () => open ? setOpen(false) : openList(selectedIndex),
			onKeyDown,
			children: [/* @__PURE__ */ jsxs("span", {
				className: "edu-select-labels",
				children: [options.map((o) => /* @__PURE__ */ jsx("span", {
					"aria-hidden": true,
					className: "edu-select-sizer",
					children: o.label
				}, o.value)), /* @__PURE__ */ jsx("span", {
					className: "edu-select-value",
					children: shown?.label ?? ""
				})]
			}), /* @__PURE__ */ jsx("svg", {
				className: "edu-select-chevron",
				viewBox: "0 0 24 24",
				"aria-hidden": true,
				children: /* @__PURE__ */ jsx("path", { d: "m6 9 6 6 6-6" })
			})]
		}), /* @__PURE__ */ jsx("ul", {
			ref: listRef,
			id: listId,
			role: "listbox",
			"aria-label": props.ariaLabel,
			className: "edu-select-list",
			hidden: !open,
			style: {
				left: place.left,
				minWidth: place.width,
				top: place.top ?? void 0,
				bottom: place.bottom ?? void 0
			},
			children: options.map((o, i) => /* @__PURE__ */ jsxs("li", {
				id: `${listId}-${i}`,
				"data-index": i,
				"data-value": o.value,
				role: "option",
				"aria-selected": i === selectedIndex,
				"aria-disabled": o.disabled === true || void 0,
				className: ["edu-select-option", i === active ? "is-active" : ""].filter(Boolean).join(" "),
				onPointerDown: (event) => event.preventDefault(),
				onPointerEnter: () => {
					if (o.disabled !== true) setActive(i);
				},
				onClick: (event) => {
					event.preventDefault();
					pick(i);
					buttonRef.current?.focus();
				},
				children: [/* @__PURE__ */ jsx("span", {
					className: "edu-select-text",
					children: o.label
				}), i === selectedIndex && /* @__PURE__ */ jsx("svg", {
					className: "edu-select-check",
					viewBox: "0 0 24 24",
					"aria-hidden": true,
					children: /* @__PURE__ */ jsx("path", { d: "M20 6 9 17l-5-5" })
				})]
			}, o.value))
		})]
	});
}
// src/ui/EduPc.tsx
var DONE_DELAY_MS = 2600;
/** The board and the parts on it: every exercise shows the board, built or not, so their models always load. */
var ON_BOARD = [
	"motherboard",
	"cpu",
	"cooler",
	"ram",
	"m2ssd"
];
/** What a computer in its case shows: the case and the parts inside it. */
var IN_CASE = [
	"case",
	"psu",
	"hdd",
	"gpu"
];
/** The realistic models an exercise shows: the board, its parts, the case when there is one, the devices on the desk. */
var modelsOf = (scenario, layout) => [
	...ON_BOARD,
	...scenario.parts.map((p) => p.kind),
	...layout.bench === "case" || layout.bench === "tower" ? IN_CASE : [],
	...(layout.props ?? []).flatMap((p) => p.kind === "monitor" || p.kind === "keyboard" || p.kind === "mouse" ? [p.kind] : [])
];
/** The names of the quality levels in the switch. */
var QUALITY_NAMES = {
	simple: "Проста",
	normal: "Звичайна",
	high: "Висока"
};
/** Where the student's choice of graphics is kept between visits. */
var QUALITY_KEY = "edu-pc-quality";
var savedQuality = () => {
	try {
		const v = window.localStorage.getItem(QUALITY_KEY);
		return v === "simple" || v === "normal" || v === "high" ? v : null;
	} catch {
		return null;
	}
};
var saveQuality = (q) => {
	try {
		window.localStorage.setItem(QUALITY_KEY, q);
	} catch {}
};
/** The current step still has to put this part somewhere else: it stands elsewhere, or nowhere yet. */
var stillToPlace = (scenario, state, part) => {
	const step = currentStep(scenario, state);
	const allowed = step?.kind === "place" ? step.targets[part] : void 0;
	const at = slotOf(state, part);
	return allowed !== void 0 && (at === void 0 || !allowed.includes(at));
};
/** The PC-building trainer: a 3D bench with the steps, the parts tray and the questions around it. */
var EduPc = ({ scenario, layout, hints = true, lightGraphics = false, quality: initialQuality = "high", modelsUrl, onAction, onComplete, onSceneReady, onNext, initialState }) => {
	const sceneLayout = layout ?? layouts[scenario.id];
	const build = useBuild(scenario, useMemo(() => ({
		onAction,
		onComplete
	}), [onAction, onComplete]), initialState);
	const { state, step, hint, held } = build;
	const [showHints, setShowHints] = useState(hints);
	const [picked, setPicked] = useState(() => savedQuality() ?? initialQuality);
	const quality = !modelsUrl && picked === "high" ? "normal" : picked;
	const qualities = modelsUrl ? [
		"simple",
		"normal",
		"high"
	] : ["simple", "normal"];
	const pickQuality = (q) => {
		setPicked(q);
		saveQuality(q);
	};
	const light = lightGraphics || quality === "simple";
	const [allTags, setAllTags] = useState(false);
	const { full, toggle: toggleFull } = useFullScreen();
	const [sceneError, setSceneError] = useState(null);
	const [sceneReady, setSceneReady] = useState(0);
	const [icons, setIcons] = useState({});
	const hostRef = useRef(null);
	const sceneRef = useRef(null);
	const handlers = useRef(build);
	handlers.current = build;
	const onSceneReadyRef = useRef(onSceneReady);
	onSceneReadyRef.current = onSceneReady;
	useEffect(() => {
		const host = hostRef.current;
		if (!host || !sceneLayout) return;
		let cancelled = false;
		import("./PcScene--GoTPBdw.js").then(async (mod) => {
			await mod.preloadModels(modelsUrl ?? "", modelsOf(scenario, sceneLayout), modelsUrl ? quality : "simple");
			return mod;
		}).then(({ PcScene }) => {
			if (cancelled) return;
			sceneRef.current = new PcScene(host, scenario, sceneLayout, {
				onSlot: (slot) => handlers.current.placeAt(slot),
				onStop: (stop) => handlers.current.act({
					type: "pick",
					stop
				}),
				onInspect: (part) => stillToPlace(scenario, handlers.current.state, part) ? handlers.current.take(part) : handlers.current.inspect(part),
				onControl: (control) => {
					const current = handlers.current.state.controls[control];
					const other = scenario.controls.find((c) => c.id === control)?.values.find((v) => v !== current);
					if (other !== void 0) handlers.current.act({
						type: "set",
						control,
						value: other
					});
				}
			}, light);
			setSceneError(null);
			setSceneReady((n) => n + 1);
			setIcons(sceneRef.current.icons(scenario.parts.map((p) => p.kind)));
			onSceneReadyRef.current?.(sceneRef.current);
		}).catch(() => setSceneError("Не вдалося показати 3D. Онови сторінку або спробуй інший браузер."));
		return () => {
			cancelled = true;
			sceneRef.current?.dispose();
			sceneRef.current = null;
		};
	}, [
		scenario,
		sceneLayout,
		light,
		quality,
		modelsUrl
	]);
	const finished = isDone(scenario, state);
	const [showDone, setShowDone] = useState(false);
	useEffect(() => {
		if (!finished) {
			setShowDone(false);
			return;
		}
		const t = window.setTimeout(() => setShowDone(true), DONE_DELAY_MS);
		return () => window.clearTimeout(t);
	}, [finished]);
	const shownHint = showHints ? hint : null;
	const mistakeNote = build.toast?.tone === "error" ? build.toast.text : void 0;
	const cardStep = (step?.kind === "upgrade" || step?.kind === "sort") && !(step.question && !state.answered.includes(step.id));
	const path = step?.kind === "sequence" ? {
		stops: step.stops,
		picked: state.picked
	} : null;
	useEffect(() => {
		sceneRef.current?.showAllTags(allTags);
		sceneRef.current?.update({
			placed: state.placed,
			controls: state.controls,
			inspected: state.inspected,
			held,
			hint: shownHint,
			path
		});
	});
	useEffect(() => {
		if (!sceneLayout) return;
		const slots = step?.kind === "place" ? [.../* @__PURE__ */ new Set([...Object.values(step.targets).flat(), ...Object.keys(step.targets).flatMap((p) => slotOf(state, p) ?? [])])] : hint.slots;
		const aim = step?.kind === "sequence" ? focusStops(sceneLayout, step.stops.map((s) => s.id)) : (finished || step?.look === "result" && !!step.question && !state.answered.includes(step.id)) && sceneLayout.finale ? [
			sceneLayout.finale.at,
			sceneLayout.finale.distance,
			sceneLayout.finale.view
		] : focusPoint(sceneLayout, slots, hint.control?.id, step?.kind === "set" ? Object.keys(step.otherControls ?? {}) : []);
		const t = window.setTimeout(() => {
			if (build.info && sceneRef.current?.showPart(build.info)) return;
			sceneRef.current?.focus(aim[0], aim[1], aim[2], aim[3], step?.kind === "place" ? Object.keys(step.targets) : []);
		}, 60);
		return () => window.clearTimeout(t);
	}, [
		state.step,
		state.answered.length,
		sceneLayout,
		sceneError,
		sceneReady,
		build.info
	]);
	useEffect(() => {
		const onKey = (e) => {
			if (!handlers.current.held) return;
			if (e.key === "q" || e.key === "Q" || e.key === "й" || e.key === "Й") handlers.current.rotate(-1);
			else if (e.key === "e" || e.key === "E" || e.key === "у" || e.key === "У") handlers.current.rotate(1);
			else if (e.key === "Escape") {
				e.preventDefault();
				handlers.current.putBack();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);
	if (!sceneLayout) return /* @__PURE__ */ jsxs("p", {
		className: "edu-pc-error",
		children: [
			"Для завдання «",
			scenario.title,
			"» немає 3D-розкладки."
		]
	});
	const later = new Set(step?.kind === "inspect" || step?.kind === "place" ? [] : scenario.steps.slice(state.step + 1).flatMap((s) => s.kind === "place" ? Object.keys(s.targets) : []));
	const trayParts = scenario.parts.filter((p) => (slotOf(state, p.id) === void 0 || stillToPlace(scenario, state, p.id)) && !later.has(p.id) && (p.end === void 0 || slotOf(state, p.end) !== void 0));
	const heldPart = held ? scenario.parts.find((p) => p.id === held.part) : void 0;
	const infoPart = build.info ? scenario.parts.find((p) => p.id === build.info) : void 0;
	const question = step?.question && !state.answered.includes(step.id) && !infoPart ? step.question : void 0;
	const look = step?.kind === "inspect" ? step.parts.map((id) => ({
		id,
		name: scenario.parts.find((p) => p.id === id)?.name ?? id,
		done: state.inspected.includes(id)
	})) : [];
	const pick = (part) => {
		if (step?.kind === "inspect" || part.id === sceneLayout.benchPart) build.inspect(part.id);
		else build.take(part.id);
	};
	return /* @__PURE__ */ jsxs("div", {
		className: `edu-pc${full ? " is-full" : ""}`,
		children: [
			/* @__PURE__ */ jsxs("header", {
				className: "edu-pc-head",
				children: [/* @__PURE__ */ jsx("h1", {
					className: "edu-pc-title",
					children: scenario.title
				}), /* @__PURE__ */ jsxs("div", {
					className: "edu-pc-tools",
					children: [
						/* @__PURE__ */ jsxs("span", {
							className: "edu-pc-switch",
							title: "Проста — для старих комп'ютерів, висока — найдетальніші моделі",
							children: ["Графіка", /* @__PURE__ */ jsx(Select, {
								ariaLabel: "Графіка",
								value: quality,
								options: qualities.map((q) => ({
									value: q,
									label: QUALITY_NAMES[q]
								})),
								onChange: pickQuality
							})]
						}),
						/* @__PURE__ */ jsxs("label", {
							className: "edu-pc-switch",
							children: [/* @__PURE__ */ jsx("input", {
								type: "checkbox",
								checked: allTags,
								onChange: (e) => setAllTags(e.target.checked)
							}), "Назви роз'ємів"]
						}),
						/* @__PURE__ */ jsxs("label", {
							className: "edu-pc-switch",
							children: [/* @__PURE__ */ jsx("input", {
								type: "checkbox",
								checked: showHints,
								onChange: (e) => setShowHints(e.target.checked)
							}), "Підказки"]
						}),
						/* @__PURE__ */ jsxs("button", {
							type: "button",
							className: "edu-pc-full",
							"aria-pressed": full,
							"aria-label": full ? "Вийти з повного екрана" : "На весь екран",
							onClick: toggleFull,
							title: full ? "Вийти з повного екрана (Esc)" : "На весь екран",
							children: [/* @__PURE__ */ jsx("svg", {
								viewBox: "0 0 24 24",
								width: "18",
								height: "18",
								"aria-hidden": "true",
								children: /* @__PURE__ */ jsx("path", {
									d: full ? "M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" : "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
									fill: "none",
									stroke: "currentColor",
									strokeWidth: "2",
									strokeLinecap: "round",
									strokeLinejoin: "round"
								})
							}), /* @__PURE__ */ jsx("span", {
								className: "edu-pc-full-text",
								children: full ? "Згорнути" : "На весь екран"
							})]
						})
					]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "edu-pc-body",
				children: [/* @__PURE__ */ jsxs("nav", {
					className: "edu-pc-side",
					children: [state.step === 0 && state.inspected.length === 0 && /* @__PURE__ */ jsx("div", {
						className: "edu-pc-story",
						children: scenario.story.map((line) => /* @__PURE__ */ jsx("p", { children: line }, line))
					}), /* @__PURE__ */ jsx(StepList, {
						scenario,
						state
					})]
				}), /* @__PURE__ */ jsxs("div", {
					className: "edu-pc-stage",
					children: [
						/* @__PURE__ */ jsx("div", {
							className: "edu-pc-view",
							ref: hostRef
						}),
						sceneError && /* @__PURE__ */ jsx("p", {
							className: "edu-pc-error",
							children: sceneError
						}),
						/* @__PURE__ */ jsx("p", {
							className: "edu-pc-keys",
							"aria-hidden": "true",
							children: /* @__PURE__ */ jsx(RichText, { text: "Камера: [k]W[/k] [k]A[/k] [k]S[/k] [k]D[/k] — літати, стрілки — повертати, [k]+[/k] і [k]−[/k] — наближати" })
						}),
						infoPart ? /* @__PURE__ */ jsx(PartInfo, {
							part: infoPart,
							onClose: () => build.setInfo(null)
						}) : step && /* @__PURE__ */ jsx(StepCard, {
							step,
							index: state.step,
							total: scenario.steps.length,
							look
						}),
						/* @__PURE__ */ jsx(ToastLine, { toast: cardStep && mistakeNote || infoPart ? null : build.toast })
					]
				})]
			}),
			/* @__PURE__ */ jsx("footer", {
				className: "edu-pc-foot",
				children: heldPart ? /* @__PURE__ */ jsx(HeldBar, {
					part: heldPart,
					onTurn: build.rotate,
					onPutBack: build.putBack,
					needsTurn: step?.kind === "place" && (step.targets[heldPart.id] ?? []).some((id) => scenario.slots.find((s) => s.id === id)?.turn !== void 0)
				}) : /* @__PURE__ */ jsx(Tray, {
					parts: trayParts,
					held,
					highlighted: shownHint?.parts ?? [],
					benchPart: sceneLayout.benchPart,
					icons,
					onPick: pick
				})
			}),
			!question && step?.kind === "upgrade" && /* @__PURE__ */ jsx(UpgradeCard, {
				step,
				note: mistakeNote,
				onCheck: (choose) => build.act({
					type: "upgrade",
					choose
				})
			}, step.id),
			!question && step?.kind === "sort" && /* @__PURE__ */ jsx(SortCard, {
				step,
				sorted: state.sorted,
				note: mistakeNote,
				onSort: (item, memory) => build.act({
					type: "sort",
					item,
					memory
				})
			}),
			question && step && /* @__PURE__ */ jsx(QuestionCard, {
				step,
				question,
				onAnswer: (answer) => build.act({
					type: "answer",
					answer
				})
			}),
			showDone && /* @__PURE__ */ jsx(DoneCard, {
				result: report(scenario, state),
				goals: scenario.goals ?? {},
				onRestart: build.restart,
				onNext
			})
		]
	});
};
// src/ui/TaskCatalog.tsx
var percent = (done, total) => total === 0 ? 0 : Math.round(done / total * 100);
/** Ukrainian plural of «крок» after a number. */
var steps = (n) => {
	const tens = n % 100;
	const ones = n % 10;
	if (ones === 1 && tens !== 11) return `${n} крок`;
	if (ones >= 2 && ones <= 4 && (tens < 12 || tens > 14)) return `${n} кроки`;
	return `${n} кроків`;
};
/** The exercises as cards, grouped by topic: kind, title, what to do, the number of steps and a check mark when done. */
var TaskCatalog = ({ scenarios, solved, current, onPick, label = "Завдання тренажера «Збери комп'ютер»" }) => {
	const groups = topicGroups(scenarios, solved);
	const done = groups.reduce((n, g) => n + g.done, 0);
	let number = 0;
	return /* @__PURE__ */ jsxs("nav", {
		className: "edu-pc-cat",
		"aria-label": label,
		children: [/* @__PURE__ */ jsxs("div", {
			className: "edu-pc-cat-top",
			children: [/* @__PURE__ */ jsxs("p", {
				className: "edu-pc-cat-count",
				"aria-live": "polite",
				children: [
					"Виконано ",
					/* @__PURE__ */ jsx("b", { children: done }),
					" з ",
					scenarios.length
				]
			}), /* @__PURE__ */ jsx("span", {
				className: "edu-pc-cat-bar",
				"aria-hidden": "true",
				children: /* @__PURE__ */ jsx("span", { style: { width: `${percent(done, scenarios.length)}%` } })
			})]
		}), groups.map((g) => /* @__PURE__ */ jsxs("section", {
			className: "edu-pc-cat-group",
			"aria-labelledby": `edu-pc-cat-topic-${g.topic}`,
			children: [/* @__PURE__ */ jsxs("div", {
				className: "edu-pc-cat-head",
				children: [/* @__PURE__ */ jsx("h3", {
					id: `edu-pc-cat-topic-${g.topic}`,
					children: TOPIC_NAMES[g.topic]
				}), /* @__PURE__ */ jsxs("span", {
					className: "edu-pc-cat-progress",
					children: [
						g.done,
						" з ",
						g.items.length
					]
				})]
			}), /* @__PURE__ */ jsx("div", {
				className: "edu-pc-cat-grid",
				children: g.items.map((s) => {
					number += 1;
					const isDone = solved.includes(s.id);
					const isCurrent = s.id === current;
					const topic = topicOf(s);
					return /* @__PURE__ */ jsxs("button", {
						type: "button",
						className: `edu-pc-cat-card${isCurrent ? " is-current" : ""}${isDone ? " is-done" : ""}`,
						"aria-current": isCurrent ? "step" : void 0,
						onClick: () => onPick(s.id),
						children: [
							/* @__PURE__ */ jsxs("span", {
								className: "edu-pc-cat-meta",
								children: [
									/* @__PURE__ */ jsx("span", {
										className: "edu-pc-cat-num",
										"aria-hidden": "true",
										children: number
									}),
									/* @__PURE__ */ jsx("span", {
										className: `edu-pc-cat-topic is-${topic}`,
										children: TOPIC_NAMES[topic]
									}),
									isDone && /* @__PURE__ */ jsx("span", {
										className: "edu-pc-cat-done",
										role: "img",
										"aria-label": "виконано",
										children: "✓"
									})
								]
							}),
							/* @__PURE__ */ jsx("b", {
								className: "edu-pc-cat-title",
								children: s.title
							}),
							/* @__PURE__ */ jsx("small", {
								className: "edu-pc-cat-summary",
								children: /* @__PURE__ */ jsx(RichText, { text: summaryOf(s) })
							}),
							/* @__PURE__ */ jsx("span", {
								className: "edu-pc-cat-steps",
								children: steps(s.steps.length)
							})
						]
					}, s.id);
				})
			})]
		}, g.topic))]
	});
};
export { EduPc, TaskCatalog, layouts };
