import { Euler, Matrix4, Quaternion, Vector3 } from "three";
// src/scene/ports.ts
var PLUGS = {
	atx24: {
		size: [
			5.36,
			.98,
			1.5
		],
		lead: 1.3,
		cable: {
			r: .34,
			color: "#141518"
		}
	},
	eps8: {
		size: [
			1.82,
			.9,
			1.4
		],
		lead: 1.1,
		cable: {
			r: .2,
			color: "#141518"
		}
	},
	pcie8: {
		size: [
			1.44,
			.72,
			1.3
		],
		lead: 1.1,
		cable: {
			r: .2,
			color: "#141518"
		}
	},
	fan4: {
		size: [
			1,
			.56,
			.7
		],
		lead: .6,
		cable: {
			r: .08,
			color: "#141518"
		}
	},
	fPanel: {
		size: [
			2.6,
			.62,
			.85
		],
		lead: .8,
		cable: {
			r: .11,
			color: "#2b2d31"
		}
	},
	hdAudio: {
		size: [
			1.32,
			.62,
			.85
		],
		lead: .8,
		cable: {
			r: .11,
			color: "#141518"
		}
	},
	usb3Header: {
		size: [
			2.42,
			1,
			1.1
		],
		lead: .7,
		cable: {
			r: .18,
			color: "#1d3f8f"
		}
	},
	sataData: {
		size: [
			1.3,
			.62,
			.95
		],
		lead: .6,
		cable: {
			r: .09,
			color: "#c0392b"
		}
	},
	sataPower: {
		size: [
			3.9,
			.62,
			1.05
		],
		lead: .7,
		cable: {
			r: .14,
			color: "#141518"
		}
	},
	psu8: {
		size: [
			2.1,
			1,
			1.5
		],
		lead: 1,
		cable: {
			r: .2,
			color: "#141518"
		}
	},
	psu6: {
		size: [
			1.6,
			1,
			1.5
		],
		lead: 1,
		cable: {
			r: .14,
			color: "#141518"
		}
	},
	usbA: {
		size: [
			1.6,
			.8,
			2.2
		],
		lead: 1,
		cable: {
			r: .2,
			color: "#3e434a"
		}
	},
	hdmi: {
		size: [
			1.9,
			1,
			2.4
		],
		lead: 1,
		cable: {
			r: .3,
			color: "#1b1d21"
		}
	}
};
var DOWN = [
	0,
	-1,
	0
];
/** A header whose plug goes in from above, its long side along x. */
var topHeader = (kind, name, at, housing, along = [
	1,
	0,
	0
]) => ({
	kind,
	name,
	at,
	insert: DOWN,
	along,
	housing
});
/** A SATA port on the board's right edge: a pair of them stacked in each block, facing out of the edge (+x). */
var SATA_FACE_X = 12.185;
var SATA_Y = [.6, 1.42];
var SATA_Z = [
	7.59,
	9.22,
	10.87
];
var sataPort = (block, level) => ({
	kind: "sataData",
	name: `Роз'єм SATA ${block * 2 + level + 1} на платі`,
	at: [
		SATA_FACE_X,
		SATA_Y[level] ?? 0,
		SATA_Z[block] ?? 0
	],
	insert: [
		-1,
		0,
		0
	],
	along: [
		0,
		0,
		1
	],
	housing: [
		1.45,
		.75,
		1.69
	]
});
/** A port in the board's rear panel: the plug goes in towards +x, its long side along the panel (z). */
var rearPort$1 = (kind, name, faceX, y, z, housing) => ({
	kind,
	name,
	at: [
		faceX,
		y,
		z
	],
	insert: [
		1,
		0,
		0
	],
	along: [
		0,
		0,
		1
	],
	housing
});
var BOARD_PORTS = {
	atx24: topHeader("atx24", "Роз'єм живлення плати ATX (24 контакти)", [
		11.48,
		1.844,
		-5.01
	], [
		5.3,
		.93,
		1.84
	], [
		0,
		0,
		-1
	]),
	eps8: topHeader("eps8", "Роз'єм живлення процесора CPU (8 контактів)", [
		-6.446,
		1.769,
		-14.658
	], [
		1.78,
		.87,
		1.77
	], [
		-1,
		0,
		0
	]),
	cpuFan: topHeader("fan4", "Роз'єм вентилятора процесора CPU_FAN", [
		5.18,
		.43,
		-13.68
	], [
		.95,
		.54,
		.6
	]),
	cpuOpt: topHeader("fan4", "Роз'єм CPU_OPT", [
		5.18,
		.43,
		-12.77
	], [
		.95,
		.54,
		.6
	]),
	chaFan1: topHeader("fan4", "Роз'єм вентилятора корпусу CHA_FAN1", [
		-6.217,
		.43,
		-1.64
	], [
		.95,
		.54,
		.6
	]),
	chaFan2: topHeader("fan4", "Роз'єм вентилятора корпусу CHA_FAN2", [
		-6.217,
		.43,
		-.41
	], [
		.95,
		.54,
		.6
	]),
	fPanel: topHeader("fPanel", "Роз'єм кнопок корпусу F_PANEL", [
		10.605,
		.33,
		14.57
	], [
		2.55,
		.6,
		.6
	]),
	hdAudio: topHeader("hdAudio", "Роз'єм аудіо передньої панелі HD_AUDIO", [
		-7.435,
		.33,
		14.74
	], [
		1.3,
		.6,
		.6
	]),
	usb3Header: {
		kind: "usb3Header",
		name: "Роз'єм USB 3.0 для корпусу",
		at: [
			12.14,
			.53,
			5.34
		],
		insert: [
			-1,
			0,
			0
		],
		along: [
			0,
			0,
			1
		],
		housing: [
			2.39,
			.67,
			.98
		]
	},
	sata1: sataPort(0, 0),
	sata2: sataPort(0, 1),
	sata3: sataPort(1, 0),
	sata4: sataPort(1, 1),
	sata5: sataPort(2, 0),
	sata6: sataPort(2, 1),
	usb2Low: rearPort$1("usbA", "Роз'єм USB 2.0", -12.09, .536, -5.46, [
		1.22,
		.57,
		1.26
	]),
	usb2High: rearPort$1("usbA", "Роз'єм USB 2.0", -12.09, 1.349, -5.46, [
		1.22,
		.57,
		1.26
	]),
	usb3Low: rearPort$1("usbA", "Роз'єм USB 3.0", -12.109, .524, -3.539, [
		1.22,
		.57,
		1.26
	]),
	usb3High: rearPort$1("usbA", "Роз'єм USB 3.0", -12.109, 1.366, -3.539, [
		1.22,
		.57,
		1.26
	]),
	hdmi: rearPort$1("hdmi", "Роз'єм HDMI на платі", -12.054, .62, -7.37, [
		1.65,
		.69,
		1.31
	])
};
/** Its three 8-pin power sockets on the top edge, from the bracket end; the first one is used. */
var GPU_POWER_Z = [
	-11.66,
	-13.24,
	-14.85
];
var GPU_PORTS = {
	power1: {
		kind: "pcie8",
		name: "Роз'єм живлення відеокарти (8 контактів)",
		at: [
			.215,
			10.56,
			GPU_POWER_Z[0]
		],
		insert: DOWN,
		along: [
			0,
			0,
			1
		],
		housing: [
			1.4,
			.67,
			.76
		]
	},
	power2: {
		kind: "pcie8",
		name: "Роз'єм живлення відеокарти (8 контактів)",
		at: [
			.215,
			10.56,
			GPU_POWER_Z[1]
		],
		insert: DOWN,
		along: [
			0,
			0,
			1
		],
		housing: [
			1.4,
			.67,
			.76
		]
	},
	hdmi: {
		kind: "hdmi",
		name: "Роз'єм HDMI на відеокарті",
		at: [
			.195,
			4.64,
			9.11
		],
		insert: [
			0,
			0,
			-1
		],
		along: [
			0,
			1,
			0
		],
		housing: [
			1.02,
			.41,
			.3
		]
	}
};
/** The ports on the card's bracket, top to bottom, in its own coordinates (y of each middle). */
var GPU_BRACKET_PORTS_Y = [
	7.74,
	6.21,
	4.64,
	3.11
];
var HDD_PORTS = {
	power: {
		kind: "sataPower",
		name: "Роз'єм живлення SATA на диску",
		at: [
			-2.415,
			.35,
			7.39
		],
		insert: [
			0,
			0,
			-1
		],
		along: [
			1,
			0,
			0
		],
		housing: [
			3.85,
			.56,
			.6
		]
	},
	data: {
		kind: "sataData",
		name: "Роз'єм даних SATA на диску",
		at: [
			.335,
			.35,
			7.39
		],
		insert: [
			0,
			0,
			-1
		],
		along: [
			1,
			0,
			0
		],
		housing: [
			1.33,
			.56,
			.6
		]
	}
};
/**
* The face of the power supply with the sockets for removable cables (-z, towards the inside of the case),
* and the hole the built-in cables (board and processor) come out of. Our own panel of sockets goes on that face
* (see `psuPanel` in devices.ts): two HDD/SATA sockets above, two PCI-E sockets below.
*/
var PSU_FACE_Z = -7.75;
var PSU_HOLE = [
	-.72,
	2.4,
	PSU_FACE_Z
];
var PSU_SOCKET_X = [-1.4, 1.4];
var PSU_SOCKET_Y = {
	sata: 12.4,
	pcie: 8.9
};
var psuSocket = (kind, name, x, y) => ({
	kind,
	name,
	at: [
		x,
		y,
		PSU_FACE_Z
	],
	insert: [
		0,
		0,
		1
	],
	along: [
		0,
		1,
		0
	],
	housing: kind === "psu8" ? [
		2.1,
		1,
		1
	] : [
		1.6,
		1,
		1
	]
});
var PSU_PORTS = {
	pcie1: psuSocket("psu8", "Роз'єм PCI-E на блоці живлення", PSU_SOCKET_X[1], PSU_SOCKET_Y.pcie),
	pcie2: psuSocket("psu8", "Роз'єм PCI-E на блоці живлення", PSU_SOCKET_X[0], PSU_SOCKET_Y.pcie),
	sata1: psuSocket("psu6", "Роз'єм HDD/SATA на блоці живлення", PSU_SOCKET_X[0], PSU_SOCKET_Y.sata),
	sata2: psuSocket("psu6", "Роз'єм HDD/SATA на блоці живлення", PSU_SOCKET_X[1], PSU_SOCKET_Y.sata)
};
/** The frame of a part placed the way `posed` places it: at `at`, turned by quarter turns, yaw, pitch and roll. */
var frameOf = (at, turn = 0, yaw = 0, pitch = 0, roll = 0) => {
	const q = new Quaternion().setFromEuler(new Euler(pitch, -turn * Math.PI / 2 + yaw, roll, "YXZ"));
	return { matrix: new Matrix4().compose(new Vector3(...at), q, new Vector3(1, 1, 1)) };
};
var IDENTITY = { matrix: new Matrix4() };
var snap = (v) => {
	for (const k of [
		"x",
		"y",
		"z"
	]) if (Math.abs(v[k]) < 1e-9) v[k] = 0;
	return v;
};
var portPose = (port, frame) => {
	const at = new Vector3(...port.at).applyMatrix4(frame.matrix);
	const insert = snap(new Vector3(...port.insert).transformDirection(frame.matrix));
	const along = snap(new Vector3(...port.along).transformDirection(frame.matrix));
	const up = insert.clone().negate();
	const side = new Vector3().crossVectors(along, up);
	const basis = new Matrix4().makeBasis(along, up, side);
	return {
		at,
		insert,
		along,
		orient: new Quaternion().setFromRotationMatrix(basis)
	};
};
/** The box round a port and its plug, in the frame's axes: what the student clicks and what lights up. */
var portZone = (port, pose) => {
	const plug = PLUGS[port.kind];
	const across = new Vector3().crossVectors(pose.along, pose.insert.clone().negate());
	const depth = port.housing[2] * .5 + plug.size[2];
	const centre = pose.at.clone().addScaledVector(pose.insert, -(plug.size[2] - port.housing[2] * .5) / 2);
	const long = Math.max(port.housing[0], plug.size[0]) + .5;
	const wide = Math.max(port.housing[1], plug.size[1]) + .5;
	const size = new Vector3();
	for (const [dir, length] of [
		[pose.along, long],
		[across, wide],
		[pose.insert, depth + .4]
	]) {
		size.x += Math.abs(dir.x) * length;
		size.y += Math.abs(dir.y) * length;
		size.z += Math.abs(dir.z) * length;
	}
	return {
		centre,
		size
	};
};
// src/scene/routes.ts
/** The tray's face under the board, and its underside. */
var TRAY_Y = 1.6;
/** The slope in front of the board, from its foot at the board's edge to its top at the step. */
var SLOPE = {
	footZ: -1.54,
	footY: 1.5,
	topZ: -4.71,
	topY: 3.04
};
var GROMMETS = [
	{
		id: "front1",
		x: [-11.8, -2.15],
		z: [SLOPE.topZ, SLOPE.footZ],
		modelHasIt: true
	},
	{
		id: "front2",
		x: [-2.08, 7.57],
		z: [SLOPE.topZ, SLOPE.footZ],
		modelHasIt: true
	},
	{
		id: "top",
		x: [-20.5, -19.9],
		z: [14.4, 17.6],
		modelHasIt: false
	}
];
/** The rear case fan, inside the back wall: its middle, its size, and where its cable leaves the frame. */
var REAR_FAN = {
	at: [
		-10.6,
		12.1,
		21
	],
	size: 8.4,
	cableOut: [
		-6.7,
		8.2,
		20.4
	]
};
/**
* The heights cables run at behind the tray. Low enough to pass under the disk in the open bay (its bottom is
* at y 1); the thin front panel wires run higher where they cross the others.
*/
var BEHIND_Y = .63;
var HIGH_Y = 1.15;
/** Where the front panel's wires (buttons, audio, USB) come from: behind the tray at the front top corner, side by side. */
var FRONT_IO = {
	panel: [
		-19.2,
		BEHIND_Y,
		-13.8
	],
	audio: [
		-18.8,
		HIGH_Y,
		-13.8
	],
	usb3: [
		-18.3,
		1.2,
		-13.8
	]
};
/**
* Behind the slope the power cables run along x side by side, each in its own lane: the one nearest the board
* turns off first in the bay, so none crosses another.
*/
var FRONT_LANE_Z = {
	atx: -3.2,
	sata: -4.21,
	pcie: -4.95,
	usb3: -2.6
};
/** Runs a route from `from`, filling `"end"` with the coordinate of `end`. Returns the corners, `from` not included. */
var runRoute = (from, steps, end) => {
	const points = [];
	const at = from.clone();
	for (const [axis, to] of steps) {
		at[axis] = to === "end" ? end[axis] : to;
		points.push(at.clone());
	}
	return points;
};
/** In the open bay in front of the power supply: where its built-in cables rise to its hole. */
var PSU_RISE_Z = 5.4;
/** Past the tray's end: the front panel's wires go down into the bay there and back under the tray. */
var BAY_X = {
	audio: 11.5,
	panel: 11.75
};
var BAY_Z = {
	audio: .1,
	panel: .8
};
/**
* The cable routes inside the case, by the slot of the plug the cable is drawn from. Each starts at that plug's
* lead (the plug's straight way out) and ends at the other end's lead or at the point the cable comes from.
*/
var ROUTES = {
	atxPort: [
		["z", FRONT_LANE_Z.atx],
		["y", BEHIND_Y],
		["x", "end"],
		["z", PSU_RISE_Z],
		["y", "end"],
		["z", "end"]
	],
	cpuPowerPort: [
		["x", -20.2],
		["y", BEHIND_Y],
		["x", "end"],
		["z", PSU_RISE_Z],
		["y", "end"],
		["z", "end"]
	],
	gpuPowerPort: [
		["z", -4.35],
		["y", BEHIND_Y],
		["z", FRONT_LANE_Z.pcie],
		["x", "end"],
		["z", "end"],
		["y", "end"]
	],
	hddPowerPort: [
		["z", 3.3],
		["x", "end"],
		["y", "end"],
		["z", "end"]
	],
	sataPort: [
		["y", BEHIND_Y],
		["x", "end"],
		["z", 2.6],
		["y", "end"],
		["z", "end"]
	],
	fPanel: [
		["z", BAY_Z.panel],
		["x", BAY_X.panel],
		["y", BEHIND_Y],
		["x", "end"],
		["z", "end"]
	],
	hdAudio: [
		["x", BAY_X.audio],
		["y", HIGH_Y],
		["z", BAY_Z.audio],
		["x", "end"],
		["z", "end"]
	],
	usb3Header: [
		["y", 1.2],
		["z", FRONT_LANE_Z.usb3],
		["x", "end"],
		["z", "end"]
	],
	chaFan: [
		["y", "end"],
		["z", "end"],
		["x", "end"]
	]
};
/** The cooler's fan wire on the desk board, in board coordinates: from the CPU_FAN header up the cooler's side. */
var COOLER_FAN_CABLE = [
	4.7,
	5.4,
	-10.9
];
var COOLER_ROUTE = [
	["z", "end"],
	["y", "end"],
	["x", "end"]
];
// src/scene/layout.ts
/** The middle of a slot's click area: given for a port, otherwise standing on the slot's point. */
var zoneCentre = (pose) => pose.areaAt ?? [
	pose.at[0],
	pose.at[1] + pose.area[1] / 2 - .3,
	pose.at[2]
];
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
* and y above the board, from the port map. As on a real board, a port's long side points away from the board (along y).
*/
var rear = (port) => [port.at[2], port.at[1] - BOARD_TOP];
var REAR_FACE_X = BOARD_PORTS.usb2Low.at[0];
var REAR_PORTS = {
	usb1: rear(BOARD_PORTS.usb2Low),
	usb2: rear(BOARD_PORTS.usb2High),
	hdmi: rear(BOARD_PORTS.hdmi),
	lan: [-1.3, 2.6],
	usb3: rear(BOARD_PORTS.usb3Low),
	usb4: rear(BOARD_PORTS.usb3High)
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
var round = (v) => Math.round(v * 1e4) / 1e4;
/**
* The slot of a port from the port map, wherever its device stands: the plug's place and turn, the click area
* round socket and plug, and a look at it from the side the plug comes from.
*/
var portSlot = (port, frame, extra = {}) => {
	const pose = portPose(port, frame);
	const zone = portZone(port, pose);
	const up = pose.insert.clone().negate();
	const q = pose.orient;
	return {
		at: [
			round(pose.at.x),
			round(pose.at.y),
			round(pose.at.z)
		],
		orient: [
			q.x,
			q.y,
			q.z,
			q.w
		],
		connector: port.kind,
		area: [
			round(zone.size.x),
			round(zone.size.y),
			round(zone.size.z)
		],
		areaAt: [
			round(zone.centre.x),
			round(zone.centre.y),
			round(zone.centre.z)
		],
		view: [
			round(up.x + .15),
			round(up.y + .9),
			round(up.z + .35)
		],
		...extra
	};
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
		cpuFan: portSlot(BOARD_PORTS.cpuFan, IDENTITY, {
			route: COOLER_ROUTE,
			cableFrom: COOLER_FAN_CABLE,
			view: [
				.3,
				1,
				.5
			]
		}),
		sysFan: portSlot(BOARD_PORTS.chaFan1, IDENTITY, {
			cableFrom: COOLER_FAN_CABLE,
			view: [
				.3,
				1,
				.5
			]
		}),
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
/**
* Where our board's centre lands in the case, and its quarter turn there (3: the rear panel faces the back).
* Its ports reach into the I/O shield in the case's back wall, as on a real build, and its graphics card's
* bracket comes up to the slot covers.
*/
/**
* How far the board sits towards the back past where its graphics card's bracket would put it: the realistic
* board's rear ports then come out flush with the outside of the case's back wall (z 22.06) instead of sinking
* 3 mm behind it. The card keeps its place at the slot covers (see GPU_AT).
*/
var IO_REACH = .3;
var BOARD_IN_CASE = [
	-4.25,
	2.2,
	9.950000000000001
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
	16.2,
	1,
	-8
];
/** The slot for the graphics card: card fingers sit 0.8 cm deep in the PCIe slot. */
var pcie = (at) => onBoard(at[0], 1.26 - .8, at[1]);
var GPU_AT = ((p) => [
	p[0],
	p[1],
	p[2] - IO_REACH
])(pcie(BOARD_CONNECTORS.pcieX16));
/** Where each device stands in the case: its ports go with it (see ports.ts). */
var CASE_FRAMES = {
	board: frameOf(BOARD_IN_CASE, 3),
	psu: frameOf(PSU_AT),
	hdd: frameOf(HDD_AT),
	gpu: frameOf(GPU_AT)
};
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
/** The point inside the power supply's hole that its built-in cables come out of, in case coordinates. */
var PSU_CABLES = add(PSU_AT, PSU_HOLE);
PSU_AT[2] + PSU_FACE_Z;
/** A port of the board in the case, with its route (see routes.ts) when it has one. */
var inCase = (port, frame, slot, extra = {}) => {
	const route = ROUTES[slot];
	return portSlot(port, frame, {
		...route ? { route } : {},
		...extra
	});
};
/** A socket on the power supply: a plug in it on its own hangs its cable down in front of the supply. */
var psuSocketSlot = (port, slot) => {
	const pose = portSlot(port, CASE_FRAMES.psu, { view: [
		.4,
		.6,
		-1
	] });
	return inCase(port, CASE_FRAMES.psu, slot, {
		view: [
			.4,
			.6,
			-1
		],
		cableFrom: [
			pose.at[0],
			1.4,
			pose.at[2] - 3.5
		]
	});
};
var rearPort = (port) => {
	const slot = portSlot(port, CASE_FRAMES.board, { view: BACK });
	return {
		...slot,
		cableFrom: toDesk(slot.at)
	};
};
var grade8CaseLayout = {
	bench: "case",
	benchPart: "case",
	holdHeight: CASE_SIZE[1] + 4,
	overview: 100,
	power: {
		control: "power",
		on: "on",
		requires: { psuSwitch: "on" }
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
		atxPort: inCase(BOARD_PORTS.atx24, CASE_FRAMES.board, "atxPort", { cableFrom: add(PSU_CABLES, [
			-.3,
			0,
			0
		]) }),
		cpuPowerPort: inCase(BOARD_PORTS.eps8, CASE_FRAMES.board, "cpuPowerPort", { cableFrom: add(PSU_CABLES, [
			.32,
			0,
			0
		]) }),
		gpuPowerPort: inCase(GPU_PORTS.power1, CASE_FRAMES.gpu, "gpuPowerPort", { cableFrom: add(PSU_AT, [
			-1.4,
			8.9,
			PSU_FACE_Z - 3
		]) }),
		hddPowerPort: inCase(HDD_PORTS.power, CASE_FRAMES.hdd, "hddPowerPort", { cableFrom: add(PSU_AT, [
			-1.4,
			12.4,
			PSU_FACE_Z - 3
		]) }),
		sataPort: inCase(BOARD_PORTS.sata1, CASE_FRAMES.board, "sataPort", { cableFrom: add(HDD_AT, [
			.3,
			.4,
			10
		]) }),
		hddDataPort: inCase(HDD_PORTS.data, CASE_FRAMES.hdd, "hddDataPort", {
			view: [
				.2,
				.8,
				1
			],
			cableFrom: add(HDD_AT, [
				.3,
				.4,
				10
			])
		}),
		psuPcie1: psuSocketSlot(PSU_PORTS.pcie1, "psuPcie1"),
		psuPcie2: psuSocketSlot(PSU_PORTS.pcie2, "psuPcie2"),
		psuSata1: psuSocketSlot(PSU_PORTS.sata1, "psuSata1"),
		psuSata2: psuSocketSlot(PSU_PORTS.sata2, "psuSata2"),
		fPanel: inCase(BOARD_PORTS.fPanel, CASE_FRAMES.board, "fPanel", { cableFrom: FRONT_IO.panel }),
		hdAudio: inCase(BOARD_PORTS.hdAudio, CASE_FRAMES.board, "hdAudio", { cableFrom: FRONT_IO.audio }),
		usb3Header: inCase(BOARD_PORTS.usb3Header, CASE_FRAMES.board, "usb3Header", { cableFrom: FRONT_IO.usb3 }),
		chaFan: inCase(BOARD_PORTS.chaFan1, CASE_FRAMES.board, "chaFan", { cableFrom: REAR_FAN.cableOut }),
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
		gpuHdmi: (() => {
			const slot = portSlot(GPU_PORTS.hdmi, CASE_FRAMES.gpu, { view: BACK });
			return {
				...slot,
				cableFrom: toDesk(slot.at)
			};
		})(),
		boardHdmi: rearPort(BOARD_PORTS.hdmi),
		usb1: rearPort(BOARD_PORTS.usb2Low),
		usb2: rearPort(BOARD_PORTS.usb2High),
		usb3: rearPort(BOARD_PORTS.usb3Low),
		usb4: rearPort(BOARD_PORTS.usb3High)
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
	}, {
		control: "psuSwitch",
		at: [
			14.6,
			6.2,
			22.4
		],
		normal: [
			0,
			0,
			1
		],
		size: .7
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
/** How `standing` turns the case: x → -y, y → -x, z → -z. */
var STANDING_TURN = new Quaternion().setFromRotationMatrix(new Matrix4().set(0, -1, 0, 0, -1, 0, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1));
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
var towerPort = (slot) => {
	const inCasePose = grade8CaseLayout.slots[slot];
	const turned = inCasePose?.orient && inCasePose.connector ? STANDING_TURN.clone().multiply(new Quaternion(...inCasePose.orient)) : null;
	return {
		at: standing(inCasePose?.at ?? [
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
		...turned && inCasePose?.connector ? {
			orient: [
				turned.x,
				turned.y,
				turned.z,
				turned.w
			],
			connector: inCasePose.connector
		} : { yaw: TOWER_YAW }
	};
};
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
		requires: { psuSwitch: "on" },
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
	const xs = poses.flatMap((p) => [zoneCentre(p)[0] - p.area[0] / 2, zoneCentre(p)[0] + p.area[0] / 2]);
	const zs = poses.flatMap((p) => [zoneCentre(p)[2] - p.area[2] / 2, zoneCentre(p)[2] + p.area[2] / 2]);
	const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
	const centre = [
		(Math.max(...xs) + Math.min(...xs)) / 2,
		poses[0]?.at[1] ?? 0,
		(Math.max(...zs) + Math.min(...zs)) / 2
	];
	const bounds = boundsOf(poses.map((p) => ({
		at: zoneCentre(p),
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
export { PSU_FACE_Z as A, runRoute as C, HDD_PORTS as D, GPU_PORTS as E, PSU_PORTS as M, portPose as N, IDENTITY as O, TRAY_Y as S, GPU_BRACKET_PORTS_Y as T, layouts as _, BOARD_HOLES as a, GROMMETS as b, CASE_SIZE as c, GRADE8_BOARD as d, REAR_FACE_X as f, grade8DeskLayout as g, grade8CaseLayout as h, BOARD_CONNECTORS as i, PSU_HOLE as j, PLUGS as k, DIMM_KEY as l, TOWER_AT as m, focusPoint as n, BOARD_IN_CASE as o, REAR_PORTS as p, focusStops as r, BOARD_TOP as s, FRONT_VIEW as t, DIMM_LENGTH as u, onBoard as v, BOARD_PORTS as w, REAR_FAN as x, zoneCentre as y };
