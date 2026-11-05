// src/scene/focus.ts
var BENCH_CENTRE = [
	0,
	0,
	0
];
/** Where the camera looks from, as a direction from the target, when a slot does not say. */
var FRONT_VIEW = [
	0,
	.78,
	.62
];
/** The box round points, each grown by its own half size. */
var boundsOf = (items) => {
	const lo = (k) => Math.min(...items.map((i) => i.at[k] - i.half[k]));
	const hi = (k) => Math.max(...items.map((i) => i.at[k] + i.half[k]));
	return [[
		lo(0),
		lo(1),
		lo(2)
	], [
		hi(0),
		hi(1),
		hi(2)
	]];
};
var centreOf = (b) => [
	(b[0][0] + b[1][0]) / 2,
	(b[0][1] + b[1][1]) / 2,
	(b[0][2] + b[1][2]) / 2
];
/**
* Where the camera should look for the current step, and from how far: the free target slots
* (far enough to see all of them), the lever or a button, or the whole bench.
*/
var focusPoint = (layout, slots, control, also = []) => {
	if (control && layout.lever?.control === control) return [
		layout.lever.pivot,
		20,
		FRONT_VIEW
	];
	const button = control ? layout.buttons?.find((b) => b.control === control) : void 0;
	const others = (layout.buttons ?? []).filter((b) => also.includes(b.control));
	if (button && others.length > 0) {
		const all = [button, ...others];
		const xs = all.map((b) => b.at[0]);
		const ys = all.map((b) => b.at[1]);
		const zs = all.map((b) => b.at[2]);
		const mid = (v) => (Math.max(...v) + Math.min(...v)) / 2;
		const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), Math.max(...zs) - Math.min(...zs));
		return [
			[
				mid(xs),
				mid(ys),
				mid(zs)
			],
			30 + span * 1.4,
			FRONT_VIEW
		];
	}
	if (button) return [
		button.at,
		30,
		[
			button.normal[0],
			button.normal[1] + .75,
			button.normal[2] + .35
		]
	];
	const poses = slots.map((s) => layout.slots[s]).filter((p) => p !== void 0);
	if (poses.length === 0) return wholeDesk(layout);
	const xs = poses.flatMap((p) => [p.at[0] - p.area[0] / 2, p.at[0] + p.area[0] / 2]);
	const zs = poses.flatMap((p) => [p.at[2] - p.area[2] / 2, p.at[2] + p.area[2] / 2]);
	const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
	const centre = [
		(Math.max(...xs) + Math.min(...xs)) / 2,
		poses[0]?.at[1] ?? 0,
		(Math.max(...zs) + Math.min(...zs)) / 2
	];
	const bounds = boundsOf(poses.map((p) => ({
		at: p.at,
		half: [
			p.area[0] / 2,
			p.area[1] / 2,
			p.area[2] / 2
		]
	})));
	return [
		centre,
		Math.min(Math.max(45, layout.overview ?? 0), Math.max(20, 14 + span * 1.8)),
		poses[0]?.view ?? FRONT_VIEW,
		bounds
	];
};
/** A look at the whole bench and at everything standing round it: parts, boxes, baskets, the monitor. */
var wholeDesk = (layout) => {
	const overview = layout.overview ?? 40;
	const standing = (at, half) => ({
		at: [
			at[0],
			at[1] + half[1],
			at[2]
		],
		half
	});
	const around = [
		...(layout.loose ?? []).map((l) => standing(l.at, LOOSE_HALF)),
		...(layout.boxes ?? []).map((b) => standing(b.at, BOX_HALF)),
		...(layout.crates ?? []).map((c) => standing(c.at, CRATE_HALF)),
		...(layout.props ?? []).map((p) => standing(p.at, PROP_HALF))
	];
	if (around.length === 0) return [
		BENCH_CENTRE,
		overview,
		FRONT_VIEW
	];
	const reach = overview * BENCH_REACH;
	const bounds = boundsOf([{
		at: BENCH_CENTRE,
		half: [
			reach,
			reach / 2,
			reach
		]
	}, ...around]);
	const centre = centreOf(bounds);
	return [
		[
			centre[0],
			0,
			centre[2]
		],
		WHOLE_DESK_MIN,
		FRONT_VIEW,
		bounds
	];
};
var BENCH_REACH = .25;
/** Rough half sizes of what stands on the desk, enough to keep each in the picture. */
var LOOSE_HALF = [
	12,
	4,
	12
];
var BOX_HALF = [
	9,
	7,
	8
];
var CRATE_HALF = [
	20,
	6,
	13
];
var PROP_HALF = [
	8,
	6,
	8
];
var WHOLE_DESK_MIN = 40;
/** Looks at every marker of a data path at once: from the USB port at the back to the monitor in front. */
var focusStops = (layout, ids) => {
	const points = ids.flatMap((id) => {
		const at = layout.stops?.[id];
		return at ? [at] : [];
	});
	if (points.length === 0) return [
		BENCH_CENTRE,
		layout.overview ?? 40,
		FRONT_VIEW
	];
	const range = (k) => {
		const v = points.map((p) => p[k]);
		return [Math.min(...v), Math.max(...v)];
	};
	const [x, y, z] = [
		range(0),
		range(1),
		range(2)
	];
	const span = Math.max(x[1] - x[0], z[1] - z[0], y[1] - y[0]);
	const bounds = boundsOf(points.map((at) => ({
		at,
		half: [
			3,
			3,
			3
		]
	})));
	return [
		[
			(x[0] + x[1]) / 2,
			(y[0] + y[1]) / 2,
			(z[0] + z[1]) / 2
		],
		Math.max(45, 20 + span * 1.5),
		FRONT_VIEW,
		bounds
	];
};
// src/scene/layout.ts
var BOARD_TOP = .16;
/** Height of the bare desk top beside the mat, in bench coordinates: the mat lies a little higher. */
var DESK_TOP = -.05;
var SOCKET = [.66, -6.71];
var DIMM_X = [
	6.2,
	7.15,
	8.1,
	9.05
];
var DIMM_Z = -6.7;
/** Middle of the M.2 slot, from the connector to the screw. */
var M2 = [-.91, .89];
var DIMM_LENGTH = 13.3;
/** Where the key in a RAM slot sits, along the slot from its centre. A module fits only with its notch here. */
var DIMM_KEY = 1.3;
/** Our board in its own coordinates: where its connectors are, x and z. */
var BOARD_CONNECTORS = {
	atx24: [11.5, -5.1],
	eps8: [-6.5, -14.8],
	sata: [11.4, 7.5],
	pcieX16: [-3.3, 2.9],
	pcieX1: [-6.6, 5]
};
/** The board's mounting holes, x and z: the case has a brass standoff under each. */
var BOARD_HOLES = [
	[-10.8, -13.8],
	[10.8, -13.8],
	[-10.8, 13.8],
	[10.8, 13.8],
	[-10.8, 3.5],
	[10.8, 3.5],
	[0, -13.8]
];
/**
* The outer face of the rear panel on the board, along x, and the middle of each port: z along the panel
* and y above the board. As on a real board, a port's long side points away from the board (along y).
*/
var REAR_FACE_X = -12.75;
var REAR_PORTS = {
	usb1: [-5.6, .6],
	usb2: [-5.6, 1.35],
	hdmi: [-7.5, .5],
	lan: [-1.3, 2.6],
	usb3: [-3.6, .6],
	usb4: [-3.6, 1.35]
};
var GRADE8_BOARD = {
	socket: SOCKET,
	labels: [
		{
			text: "CPU_FAN",
			at: [5.2, -12]
		},
		{
			text: "SYS_FAN",
			at: [-6.2, -.5]
		},
		{
			text: "A1",
			at: [DIMM_X[0], -14.1],
			size: .55
		},
		{
			text: "A2",
			at: [DIMM_X[1], -14.1],
			size: .55
		},
		{
			text: "B1",
			at: [DIMM_X[2], -14.1],
			size: .55
		},
		{
			text: "B2",
			at: [DIMM_X[3], -14.1],
			size: .55
		},
		{
			text: "M.2",
			at: [-.9, 2.4]
		},
		{
			text: "CPU",
			at: [.66, -3.4]
		},
		{
			text: "SATA",
			at: [9.8, 9.2],
			size: .5
		},
		{
			text: "Z370-E",
			at: [5, 13],
			size: .9
		}
	]
};
var dimm = (x) => ({
	at: [
		x,
		.59,
		DIMM_Z
	],
	area: [
		.8,
		1.4,
		13.600000000000001
	]
});
/** Layout of the grade 8 desk scenario: the bare board on the mat. */
var grade8DeskLayout = {
	bench: "board",
	benchPart: "board",
	slots: {
		cpuSocket: {
			at: [
				SOCKET[0],
				.33,
				SOCKET[1]
			],
			area: [
				4.6,
				1.2,
				4.6
			]
		},
		cpuTop: {
			at: [
				SOCKET[0],
				.76,
				SOCKET[1]
			],
			area: [
				4.2,
				1.2,
				4.2
			]
		},
		coolerMount: {
			at: [
				SOCKET[0],
				.78,
				SOCKET[1]
			],
			area: [
				8.4,
				2,
				8.4
			]
		},
		cpuFan: {
			at: [
				5.2,
				BOARD_TOP,
				-13.4
			],
			area: [
				2.2,
				1.4,
				1.6
			]
		},
		sysFan: {
			at: [
				-6.2,
				BOARD_TOP,
				-1.7
			],
			area: [
				2.2,
				1.4,
				1.6
			]
		},
		dimmA1: dimm(DIMM_X[0]),
		dimmA2: dimm(DIMM_X[1]),
		dimmB1: dimm(DIMM_X[2]),
		dimmB2: dimm(DIMM_X[3]),
		m2Slot: {
			at: [
				M2[0],
				.66,
				M2[1]
			],
			area: [
				9,
				1,
				2.8
			],
			yaw: Math.PI
		}
	},
	lever: {
		control: "socketLever",
		pivot: [
			SOCKET[0] + 3.25,
			.45999999999999996,
			SOCKET[1] + 3.5
		],
		length: 6.2,
		upValue: "up"
	},
	overview: 64,
	loose: [
		{
			part: "cooler",
			at: [
				-21,
				0,
				-6
			]
		},
		{
			part: "cpu",
			at: [
				-21,
				0,
				6
			]
		},
		{
			part: "paste",
			at: [
				-21,
				0,
				14
			],
			yaw: .3
		},
		{
			part: "ram1",
			at: [
				19.5,
				0,
				-1
			],
			flat: true
		},
		{
			part: "ram2",
			at: [
				23.5,
				0,
				-1
			],
			flat: true
		},
		{
			part: "ssd",
			at: [
				-3,
				0,
				18.5
			]
		},
		{
			part: "coolerCable",
			at: [
				8,
				0,
				18.5
			],
			yaw: .5
		}
	]
};
/**
* The case lies on its side with the open side up, its back towards the student, so the ports on
* the back are in view. Case coordinates: x from the case's top (-x) to its bottom (+x), z from the
* front (-z) to the back (+z), y up from the desk. The inside of the side wall the board stands on is at y = CASE_FLOOR.
*/
var CASE_SIZE = [
	43,
	21,
	45
];
/** Where our board's centre lands in the case, and its quarter turn there (3: the rear panel faces the back). */
var BOARD_IN_CASE = [
	-4.25,
	1.6,
	8.9
];
/** A point on our board (board coordinates) in case coordinates, once the board is in the case. */
var onBoard = (x, y, z) => [
	BOARD_IN_CASE[0] + z,
	BOARD_IN_CASE[1] + y,
	BOARD_IN_CASE[2] - x
];
var PSU_AT = [
	16.2,
	1,
	14.4
];
var HDD_AT = [
	15,
	1,
	-8
];
/** The slot for the graphics card: card fingers sit 0.8 cm deep in the PCIe slot. */
var pcie = (at) => onBoard(at[0], 1.26 - .8, at[1]);
var GPU_AT = pcie(BOARD_CONNECTORS.pcieX16);
/** Where the graphics card's own connectors end up: power on its top edge, HDMI on its bracket. */
var GPU_POWER_LOCAL = [
	1.9,
	11.6,
	-7
];
var GPU_HDMI_LOCAL = [
	1.75,
	2,
	9.05
];
/** The disk's connectors on its back end: data and power. */
var HDD_DATA_LOCAL = [
	-2.6,
	1.3,
	7.4
];
var HDD_POWER_LOCAL = [
	1,
	1.3,
	7.4
];
/** Where the power supply's cables come out: the middle of its side that faces the inside of the case. */
var PSU_CABLES = [
	PSU_AT[0] - 4.6,
	5,
	PSU_AT[2] - 4
];
var add = (a, b) => [
	a[0] + b[0],
	a[1] + b[1],
	a[2] + b[2]
];
var BACK = [
	0,
	.45,
	1
];
/** Cables of the desk devices run from the back of the case down to the desk. */
var toDesk = (at) => [
	at[0],
	.3,
	at[2] + 10
];
var UPRIGHT = Math.PI / 2;
var rearPort = (port) => {
	const at = onBoard(REAR_FACE_X, BOARD_TOP + port[1], port[0]);
	return {
		at,
		area: [
			1.1,
			1.6,
			1.4
		],
		view: BACK,
		cableFrom: toDesk(at),
		roll: UPRIGHT
	};
};
var grade8CaseLayout = {
	bench: "case",
	benchPart: "case",
	holdHeight: CASE_SIZE[1] + 4,
	overview: 100,
	power: {
		control: "power",
		on: "on"
	},
	slots: {
		psuBay: {
			at: PSU_AT,
			area: [
				8.8,
				15,
				14.2
			]
		},
		boardTray: {
			at: BOARD_IN_CASE,
			area: [
				30.7,
				3,
				24.6
			],
			cover: true
		},
		pcieX16: {
			at: GPU_AT,
			area: [
				1.6,
				3,
				9.4
			],
			view: [
				.55,
				.8,
				.45
			]
		},
		pcieX1: {
			at: pcie(BOARD_CONNECTORS.pcieX1),
			area: [
				1.4,
				2.4,
				5.4
			],
			view: [
				.55,
				.8,
				.45
			]
		},
		hddBay: {
			at: HDD_AT,
			area: [
				10.6,
				3.4,
				15
			]
		},
		atxPort: {
			at: onBoard(BOARD_CONNECTORS.atx24[0], 1.76, BOARD_CONNECTORS.atx24[1]),
			area: [
				5.8,
				2.4,
				1.6
			],
			cableFrom: PSU_CABLES
		},
		cpuPowerPort: {
			at: onBoard(BOARD_CONNECTORS.eps8[0], 1.3599999999999999, BOARD_CONNECTORS.eps8[1]),
			area: [
				2.4,
				2.2,
				2.4
			],
			cableFrom: PSU_CABLES
		},
		gpuPowerPort: {
			at: add(GPU_AT, GPU_POWER_LOCAL),
			area: [
				2.4,
				2.2,
				2.4
			],
			cableFrom: PSU_CABLES,
			view: [
				.3,
				1,
				.5
			]
		},
		hddPowerPort: {
			at: add(HDD_AT, HDD_POWER_LOCAL),
			area: [
				2.6,
				1.8,
				1.8
			],
			cableFrom: PSU_CABLES
		},
		sataPort: {
			at: onBoard(BOARD_CONNECTORS.sata[0], 1.06, BOARD_CONNECTORS.sata[1]),
			area: [
				1.8,
				1.8,
				1.8
			],
			cableFrom: add(HDD_AT, HDD_DATA_LOCAL)
		},
		caseSide: {
			at: [
				0,
				CASE_SIZE[1],
				0
			],
			area: [
				CASE_SIZE[0],
				1.2,
				CASE_SIZE[2]
			],
			cover: true
		},
		gpuHdmi: {
			at: add(GPU_AT, GPU_HDMI_LOCAL),
			area: [
				1.1,
				1.8,
				1.4
			],
			view: BACK,
			cableFrom: toDesk(add(GPU_AT, GPU_HDMI_LOCAL)),
			roll: UPRIGHT
		},
		boardHdmi: rearPort(REAR_PORTS.hdmi),
		usb1: rearPort(REAR_PORTS.usb1),
		usb2: rearPort(REAR_PORTS.usb2),
		usb3: rearPort(REAR_PORTS.usb3),
		usb4: rearPort(REAR_PORTS.usb4)
	},
	finale: {
		at: [
			0,
			16,
			-24
		],
		distance: 110,
		view: [
			.25,
			.55,
			1
		]
	},
	buttons: [{
		control: "power",
		at: [
			-CASE_SIZE[0] / 2 - .05,
			10.5,
			-12
		],
		normal: [
			-1,
			0,
			0
		]
	}],
	props: [
		{
			kind: "monitor",
			at: [
				0,
				0,
				-46
			]
		},
		{
			kind: "keyboard",
			at: [
				0,
				0,
				-31
			]
		},
		{
			kind: "mouse",
			at: [
				29,
				0,
				-31
			]
		}
	],
	loose: [
		{
			part: "board",
			at: [
				-38,
				DESK_TOP,
				36
			]
		},
		{
			part: "psu",
			at: [
				-8,
				DESK_TOP,
				38
			],
			flat: true
		},
		{
			part: "gpu",
			at: [
				17,
				DESK_TOP,
				40
			],
			flat: true,
			yaw: Math.PI / 2
		},
		{
			part: "hdd",
			at: [
				43,
				DESK_TOP,
				38
			]
		}
	]
};
var above = (v, dy, dz = 0) => [
	v[0],
	v[1] + dy,
	v[2] + dz
];
/** The case scenario's computer, built and switched on, with markers for the data path and a smartphone on the desk. */
var grade8LabLayout = {
	...grade8CaseLayout,
	loose: [],
	props: [...grade8CaseLayout.props ?? [], {
		kind: "smartphone",
		at: [
			24,
			0,
			34
		],
		yaw: .4
	}],
	finale: {
		at: [
			0,
			18,
			-30
		],
		distance: 105,
		view: [
			.25,
			.55,
			1
		]
	},
	stops: {
		usb: above(grade8CaseLayout.slots.usb3?.at ?? [
			0,
			0,
			0
		], 3, 3),
		ram: onBoard((DIMM_X[1] + DIMM_X[3]) / 2, 12.16, DIMM_Z),
		cpu: onBoard(SOCKET[0], 10.16, SOCKET[1]),
		gpu: add(GPU_AT, [
			1.9,
			17,
			0
		]),
		monitor: [
			0,
			27,
			-44
		],
		ssd: onBoard(M2[0], 1.66, M2[1]),
		hdd: add(HDD_AT, [
			0,
			5,
			0
		])
	}
};
/**
* The finished computer from the grade 8 case scenario stands upright at the right of the desk, its front
* towards the student, its back (with the ports) towards the wall and its glass side towards the monitor.
* A point in that case's coordinates, once the case stands: its top (-x) goes up, its open side (+y) to the
* left, its front (-z) towards the student.
*/
var TOWER_AT = [
	78,
	0,
	-22.5
];
var standing = (v) => [
	TOWER_AT[0] - v[1],
	CASE_SIZE[0] / 2 - v[0],
	TOWER_AT[2] - v[2]
];
/** The tower is turned half round: its back, with the ports, faces away from the student. */
var TOWER_YAW = Math.PI;
/** The ports are seen from behind the system unit: the camera goes round to its back for the cables. */
var BEHIND = [
	-.35,
	.5,
	-1
];
var DESK_MONITOR = [
	-22,
	0,
	-40
];
var DESK_KEYBOARD = [
	-22,
	0,
	-16
];
var DESK_MOUSE = [
	10,
	0,
	-16
];
var CRATE_Z = 58;
var CRATE_X = {
	in: -60,
	out: 0,
	store: 60
};
/** The grade 3–4 desk is bigger than the usual one: six boxes and three baskets stand on it without touching. */
var GRADE3_DESK = [220, 150];
/** The closed boxes stand in a row with room between them, so every name on them can be read. */
var BOX_Z = 14;
var CRATE_FLOOR = 1;
/** The cables of the desk devices come out of their backs. */
var MONITOR_CABLE = [
	DESK_MONITOR[0] - 4,
	8,
	DESK_MONITOR[2] - 3
];
var KEYBOARD_CABLE = [
	DESK_KEYBOARD[0],
	.6,
	DESK_KEYBOARD[2] - 7.5
];
var MOUSE_CABLE = [
	DESK_MOUSE[0],
	.8,
	DESK_MOUSE[2] - 5.5
];
/** A spot in a basket: `n` spots side by side, this is spot `i`. */
var basket = (x, n, i, group) => {
	const w = 38 / n;
	return {
		at: [
			x - 19 + w * (i + .5),
			CRATE_FLOOR,
			CRATE_Z
		],
		area: [
			w - .5,
			11,
			24
		],
		fit: true,
		group
	};
};
/** A port on the back of the standing tower: a big click area, the cable coming from the device on the desk. */
var towerPort = (slot) => ({
	at: standing(grade8CaseLayout.slots[slot]?.at ?? [
		0,
		0,
		0
	]),
	area: [
		2.2,
		2,
		2.2
	],
	view: BEHIND,
	yaw: TOWER_YAW
});
var usbPort = (slot) => ({
	...towerPort(slot),
	group: "usb",
	cablesFrom: {
		keyboardCable: KEYBOARD_CABLE,
		mouseCable: MOUSE_CABLE
	}
});
var caseButton = grade8CaseLayout.buttons?.[0]?.at ?? [
	0,
	0,
	0
];
var grade3DeskLayout = {
	bench: "tower",
	benchPart: "tower",
	holdHeight: 30,
	overview: 190,
	power: {
		control: "power",
		on: "on",
		screen: {
			control: "monitorPower",
			on: "on"
		}
	},
	slots: {
		in1: basket(CRATE_X.in, 2, 0, "in"),
		in2: basket(CRATE_X.in, 2, 1, "in"),
		out1: basket(CRATE_X.out, 3, 0, "out"),
		out2: basket(CRATE_X.out, 3, 1, "out"),
		out3: basket(CRATE_X.out, 3, 2, "out"),
		store1: basket(CRATE_X.store, 1, 0, "store"),
		deskMonitor: {
			at: DESK_MONITOR,
			area: [
				52,
				8,
				14
			]
		},
		deskKeyboard: {
			at: DESK_KEYBOARD,
			area: [
				44,
				4,
				15
			]
		},
		deskMouse: {
			at: DESK_MOUSE,
			area: [
				9,
				4,
				12
			]
		},
		hdmi: {
			...towerPort("boardHdmi"),
			cableFrom: MONITOR_CABLE
		},
		usb1: usbPort("usb1"),
		usb2: usbPort("usb2"),
		usb3: usbPort("usb3"),
		usb4: usbPort("usb4")
	},
	buttons: [{
		control: "power",
		at: standing(caseButton),
		normal: [
			0,
			1,
			0
		]
	}, {
		control: "monitorPower",
		at: [
			DESK_MONITOR[0] + 22,
			DESK_MONITOR[1] + 12.6,
			DESK_MONITOR[2] + .9
		],
		normal: [
			0,
			0,
			1
		],
		size: .55,
		when: "deskMonitor"
	}],
	crates: [
		{
			at: [
				CRATE_X.in,
				0,
				CRATE_Z
			],
			label: ["Передає", "в комп'ютер"],
			colour: "#2988cc"
		},
		{
			at: [
				CRATE_X.out,
				0,
				CRATE_Z
			],
			label: ["Показує", "результат"],
			colour: "#f5a524"
		},
		{
			at: [
				CRATE_X.store,
				0,
				CRATE_Z
			],
			label: ["Зберігає", "на потім"],
			colour: "#1fa35c"
		}
	],
	boxes: [
		{
			part: "monitor",
			at: [
				-82,
				0,
				BOX_Z
			]
		},
		{
			part: "keyboard",
			at: [
				-28,
				0,
				BOX_Z
			]
		},
		{
			part: "mouse",
			at: [
				3,
				0,
				BOX_Z
			]
		},
		{
			part: "printer",
			at: [
				32,
				0,
				BOX_Z
			]
		},
		{
			part: "speakers",
			at: [
				74,
				0,
				BOX_Z
			]
		},
		{
			part: "flash",
			at: [
				100,
				0,
				BOX_Z
			]
		}
	],
	desk: GRADE3_DESK,
	finale: {
		at: [
			30,
			18,
			-30
		],
		distance: 135,
		view: [
			-.1,
			.5,
			1
		]
	}
};
var STRIP_AT = [
	44,
	0,
	8
];
/** The grade 8 case, built: the picture needs the monitor on the graphics card and power to the processor; the files need the disk's cable. */
var grade8FaultLayout = {
	...grade8CaseLayout,
	loose: [],
	power: {
		control: "power",
		on: "on",
		needs: [
			{
				slot: "cpuPowerPort",
				screen: "dark"
			},
			{
				slot: "gpuHdmi",
				screen: "dark"
			},
			{
				slot: "sataPort",
				screen: "noDisk"
			}
		]
	}
};
/** The grade 3–4 desk, set up, with a power strip: no strip, no power; no monitor cable, no picture. */
var grade3FaultLayout = {
	...grade3DeskLayout,
	boxes: [],
	props: [{
		kind: "powerStrip",
		at: STRIP_AT
	}],
	buttons: [...grade3DeskLayout.buttons ?? [], {
		control: "strip",
		at: [
			STRIP_AT[0] + 12,
			3.7,
			STRIP_AT[2]
		],
		normal: [
			0,
			1,
			0
		],
		size: .9
	}],
	power: {
		control: "power",
		on: "on",
		screen: {
			control: "monitorPower",
			on: "on"
		},
		requires: { strip: "on" },
		needs: [{
			slot: "hdmi",
			screen: "dark"
		}]
	},
	finale: {
		at: [
			26,
			12,
			-18
		],
		distance: 140,
		view: [
			-.1,
			.6,
			1
		]
	}
};
/** Layouts by scenario id. */
var layouts = {
	"grade8-club-desk": grade8DeskLayout,
	"grade8-club-case": grade8CaseLayout,
	"grade8-club-lab": grade8LabLayout,
	"grade3-new-box": grade3DeskLayout,
	"grade8-fault-cpu-power": grade8FaultLayout,
	"grade8-fault-hdmi": grade8FaultLayout,
	"grade8-fault-disk": grade8FaultLayout,
	"grade3-fault-monitor": grade3FaultLayout,
	"grade3-fault-strip": grade3FaultLayout
};
export { focusStops as S, grade8DeskLayout as _, CASE_SIZE as a, FRONT_VIEW as b, GPU_HDMI_LOCAL as c, HDD_DATA_LOCAL as d, HDD_POWER_LOCAL as f, grade8CaseLayout as g, TOWER_AT as h, BOARD_TOP as i, GPU_POWER_LOCAL as l, REAR_PORTS as m, BOARD_HOLES as n, DIMM_KEY as o, REAR_FACE_X as p, BOARD_IN_CASE as r, DIMM_LENGTH as s, BOARD_CONNECTORS as t, GRADE8_BOARD as u, layouts as v, focusPoint as x, onBoard as y };
