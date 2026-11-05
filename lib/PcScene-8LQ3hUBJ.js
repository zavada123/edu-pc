import { _ as grade8DeskLayout, a as CASE_SIZE, b as FRONT_VIEW, c as GPU_HDMI_LOCAL, d as HDD_DATA_LOCAL, f as HDD_POWER_LOCAL, g as grade8CaseLayout, h as TOWER_AT, i as BOARD_TOP, l as GPU_POWER_LOCAL, m as REAR_PORTS, n as BOARD_HOLES, o as DIMM_KEY, p as REAR_FACE_X, r as BOARD_IN_CASE, s as DIMM_LENGTH, t as BOARD_CONNECTORS, u as GRADE8_BOARD, y as onBoard } from "./layout-BmafVUOY.js";
import { n as grade8Case, t as grade8Club } from "./grade8-club-BW0_1xPV.js";
import { ACESFilmicToneMapping, Box3, BoxGeometry, CanvasTexture, CatmullRomCurve3, Color, ConeGeometry, CylinderGeometry, DirectionalLight, DoubleSide, EdgesGeometry, FloatType, Group, HemisphereLight, InstancedMesh, LineBasicMaterial, LineSegments, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, PCFShadowMap, PMREMGenerator, PerspectiveCamera, Plane, PlaneGeometry, Raycaster, RepeatWrapping, SRGBColorSpace, Scene, Sphere, SphereGeometry, Spherical, Sprite, SpriteMaterial, TextureLoader, TubeGeometry, Vector2, Vector3, WebGLRenderTarget, WebGLRenderer } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
// src/scene/gltf.ts
/**
* Realistic models of real parts (GLB files, see `models/CREDITS.md`). Every file is prepared
* beforehand: in centimetres, turned the way the code-built model of the same part is, so a slot pose
* places either of them the same way. The board and the case keep their own origin (see `PLACED_BY_FILE`);
* every other model is moved onto the footprint of its code-built model.
*/
var MODEL_FILES = {
	motherboard: "motherboard.glb",
	cpu: "cpu.glb",
	ram: "ram.glb",
	m2ssd: "m2ssd.glb",
	cooler: "cooler.glb",
	gpu: "gpu.glb",
	psu: "psu.glb",
	hdd: "hdd.glb",
	case: "case.glb",
	monitor: "monitor.glb",
	keyboard: "keyboard.glb",
	mouse: "mouse.glb"
};
/** Models whose file is already in scene coordinates: the board's origin is our board's, the case's the code-built case's. */
var PLACED_BY_FILE = /* @__PURE__ */ new Set(["motherboard", "case"]);
/** The folder of the files for a quality, inside the models folder. */
var folderOf = (base, quality) => {
	const root = base.endsWith("/") ? base : `${base}/`;
	return quality === "high" ? `${root}hd/` : root;
};
/** Loaded models by file URL, so switching quality back and forth loads each file once. */
var cache = /* @__PURE__ */ new Map();
/** The models the scene uses now: those of the quality loaded last. */
var active = /* @__PURE__ */ new Map();
/**
* three.js reads textures packed in a GLB with fetch() of a blob: URL, which a page's
* Content-Security-Policy often blocks (connect-src), and then every textured part renders white.
* An <img> reads the same blob: URL under img-src, which pages allow far more often.
*/
var imageTextures = (parser) => {
	parser.textureLoader = new TextureLoader(parser.options.manager);
	return { name: "edu-pc-image-textures" };
};
/**
* Loads the realistic models of these kinds from `baseUrl` (the folder with the GLB files) in this
* quality, and makes them the ones the scene uses. `simple` loads nothing: every part is built in code.
* A model that fails to load is left out: its part keeps the model built in code.
*/
var preloadModels = async (baseUrl, kinds, quality = "normal") => {
	const next = /* @__PURE__ */ new Map();
	if (quality !== "simple") {
		const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register(imageTextures);
		const folder = folderOf(baseUrl, quality);
		const wanted = [...new Set(kinds)].filter((k) => MODEL_FILES[k]);
		await Promise.all(wanted.map(async (kind) => {
			const url = folder + MODEL_FILES[kind];
			try {
				const cached = cache.get(url);
				if (cached) {
					next.set(kind, cached);
					return;
				}
				const gltf = await loader.loadAsync(url);
				gltf.scene.traverse((o) => {
					if (o instanceof Mesh) {
						o.castShadow = true;
						o.receiveShadow = true;
					}
				});
				cache.set(url, gltf.scene);
				next.set(kind, gltf.scene);
			} catch {}
		}));
	}
	active = next;
};
/** A copy of the loaded realistic model of this kind, or null when there is none. */
var realModel = (kind) => {
	const model = active.get(kind);
	if (!model) return null;
	const g = new Group();
	g.add(model.clone(true));
	g.userData.real = true;
	return g;
};
/** The realistic model of this kind is loaded and in use. */
var hasRealModel = (kind) => active.has(kind);
// src/scene/kit.ts
/**
* Building blocks for the procedural models: materials and shapes placed by their bottom,
* the way parts sit on a board. Every model in the scene is made from these.
*/
var mat = (color, opts = {}) => new MeshStandardMaterial({
	color,
	metalness: opts.metal ?? 0,
	roughness: opts.rough ?? .6,
	...opts.map ? { map: opts.map } : {}
});
var M = {
	blackPlastic: mat("#18191c", { rough: .5 }),
	satinBlack: mat("#24262a", {
		rough: .35,
		metal: .3
	}),
	whitePlastic: mat("#ece8de", { rough: .5 }),
	socket: mat("#efe9da", { rough: .5 }),
	aluminium: mat("#c9ced3", {
		metal: .9,
		rough: .32
	}),
	brushed: mat("#9aa1a8", {
		metal: .85,
		rough: .42
	}),
	darkMetal: mat("#3e434a", {
		metal: .8,
		rough: .38
	}),
	gunmetal: mat("#5b6169", {
		metal: .85,
		rough: .35
	}),
	copper: mat("#c07a3c", {
		metal: .95,
		rough: .28
	}),
	gold: mat("#d9b54a", {
		metal: 1,
		rough: .28
	}),
	greenPcb: mat("#1d6b3f", { rough: .55 }),
	blackPcb: mat("#16191d", { rough: .55 }),
	chip: mat("#141518", {
		rough: .4,
		metal: .1
	}),
	smdDark: mat("#2b2d31", { rough: .5 }),
	smdTan: mat("#a8895a", { rough: .6 }),
	paste: mat("#a3a9af", {
		rough: .22,
		metal: .25
	}),
	rubber: mat("#2a2d33", { rough: .9 }),
	capTop: mat("#b9bfc5", {
		metal: .9,
		rough: .3
	}),
	accent: mat("#1fa7a0", {
		rough: .35,
		metal: .4
	}),
	blueUsb: mat("#2563eb", { rough: .45 }),
	red: mat("#c0392b", { rough: .5 }),
	yellow: mat("#d4a017", { rough: .5 })
};
/** A box with its bottom at `y`. Pass six materials for different faces: +x, -x, +y, -y, +z, -z. */
var box = (size, material, x = 0, y = 0, z = 0) => {
	const mesh = new Mesh(new BoxGeometry(size[0], size[1], size[2]), material);
	mesh.position.set(x, y + size[1] / 2, z);
	return mesh;
};
/** A box with rounded edges, for lids, housings and anything a hand would touch. */
var rounded = (size, radius, material, x = 0, y = 0, z = 0) => {
	const r = Math.min(radius, size[0] / 2, size[1] / 2, size[2] / 2);
	const mesh = new Mesh(new RoundedBoxGeometry(size[0], size[1], size[2], 2, r), material);
	mesh.position.set(x, y + size[1] / 2, z);
	return mesh;
};
var cylinder = (r, h, material, x = 0, y = 0, z = 0, segments = 24) => {
	const mesh = new Mesh(new CylinderGeometry(r, r, h, segments), material);
	mesh.position.set(x, y + h / 2, z);
	return mesh;
};
var group = (...children) => {
	const g = new Group();
	for (const c of children) g.add(c);
	return g;
};
/**
* Many copies of one small box in one draw call: SMD parts, pins, fins.
* `at` holds bottom-centre positions; `size` may differ per copy via `scale`.
*/
var boxes = (size, material, at, scale) => {
	const mesh = new InstancedMesh(new BoxGeometry(1, 1, 1), material, Math.max(1, at.length));
	const m = new Matrix4();
	at.forEach(([x, y, z], i) => {
		const s = scale?.(i) ?? size;
		m.makeScale(s[0], s[1], s[2]).setPosition(x, y + s[1] / 2, z);
		mesh.setMatrixAt(i, m);
	});
	mesh.count = at.length;
	return mesh;
};
/** A tiny repeatable random generator, so a model looks the same on every load. */
var seeded = (seed) => {
	let s = seed;
	return () => {
		s = (s * 1664525 + 1013904223) % 4294967296;
		return s / 4294967296;
	};
};
/** Every mesh in the group casts and receives shadows. */
var shadowed = (obj) => {
	obj.traverse((o) => {
		o.castShadow = true;
		o.receiveShadow = true;
	});
	return obj;
};
/**
* Joins the meshes of a model that never moves into one mesh per material, so the board
* draws in a few dozen calls instead of hundreds. Meshes with several materials, instanced
* meshes and anything that moves (a fan rotor, marked `spin`) or is changed later (marked `keep`) stay as they are.
*/
var mergeStatic = (root) => {
	root.updateMatrixWorld(true);
	const inverse = new Matrix4().copy(root.matrixWorld).invert();
	const byMaterial = /* @__PURE__ */ new Map();
	const merged = [];
	const moves = (o) => {
		for (let p = o; p && p !== root; p = p.parent) if (p.userData.spin || p.userData.keep) return true;
		return false;
	};
	root.traverse((o) => {
		if (!(o instanceof Mesh) || o instanceof InstancedMesh || Array.isArray(o.material) || moves(o)) return;
		const geometry = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
		geometry.applyMatrix4(new Matrix4().multiplyMatrices(inverse, o.matrixWorld));
		for (const name of Object.keys(geometry.attributes)) if (![
			"position",
			"normal",
			"uv"
		].includes(name)) geometry.deleteAttribute(name);
		geometry.clearGroups();
		const list = byMaterial.get(o.material) ?? [];
		list.push(geometry);
		byMaterial.set(o.material, list);
		merged.push(o);
	});
	for (const mesh of merged) {
		mesh.removeFromParent();
		mesh.geometry.dispose();
	}
	for (const [material, geometries] of byMaterial) {
		const geometry = mergeGeometries(geometries, false);
		for (const g of geometries) g.dispose();
		if (geometry) root.add(new Mesh(geometry, material));
	}
	return root;
};
/**
* The spinning part of a fan: curved blades round a hub, turning around its own y axis.
* Marked `spin`, so the scene turns it once the computer is on.
*/
var fanRotor = (radius, count, blade, hub, y = 0) => {
	const rotor = group();
	const length = radius * .66;
	for (let i = 0; i < count; i++) {
		const b = rounded([
			length,
			.06,
			radius * .36
		], .03, blade, radius * .3 + length / 2, 0, 0);
		b.rotation.x = .5;
		const holder = group(b);
		holder.rotation.y = i / count * Math.PI * 2;
		rotor.add(holder);
	}
	rotor.add(cylinder(radius * .3, .6, hub, 0, -.3));
	rotor.position.y = y;
	rotor.userData.spin = true;
	return rotor;
};
// src/scene/textures.ts
var BOARD_W = 24.4;
var BOARD_D = 30.5;
var PX = 48;
var canvasTexture = (w, h, draw) => {
	const canvas = document.createElement("canvas");
	canvas.width = w;
	canvas.height = h;
	const g = canvas.getContext("2d");
	if (g) draw(g);
	const texture = new CanvasTexture(canvas);
	texture.colorSpace = SRGBColorSpace;
	texture.anisotropy = 8;
	return texture;
};
var toPx = (x, z) => [(x + BOARD_W / 2) * PX, (z + BOARD_D / 2) * PX];
/** Copper traces: bundles of parallel lines that run straight and turn at 45°, like a real board. */
var drawTraces = (g) => {
	const rnd = seeded(11);
	g.lineCap = "round";
	for (let bundle = 0; bundle < 70; bundle++) {
		const lines = 2 + Math.floor(rnd() * 6);
		let x = rnd() * g.canvas.width;
		let y = rnd() * g.canvas.height;
		const path = [[x, y]];
		for (let leg = 0; leg < 3; leg++) {
			const len = 60 + rnd() * 320;
			const angle = Math.floor(rnd() * 8) * Math.PI / 4;
			x += Math.cos(angle) * len;
			y += Math.sin(angle) * len;
			path.push([x, y]);
		}
		g.strokeStyle = `rgba(110, 125, 135, ${.16 + rnd() * .12})`;
		g.lineWidth = 2;
		for (let l = 0; l < lines; l++) {
			const off = l * 7;
			g.beginPath();
			path.forEach(([px, py], i) => i === 0 ? g.moveTo(px + off, py + off) : g.lineTo(px + off, py + off));
			g.stroke();
		}
	}
	g.fillStyle = "rgba(170, 160, 120, 0.45)";
	for (let i = 0; i < 700; i++) {
		g.beginPath();
		g.arc(rnd() * g.canvas.width, rnd() * g.canvas.height, 2.2, 0, Math.PI * 2);
		g.fill();
	}
};
/** The board's top: solder mask, traces, vias, silkscreen labels and outlines, the socket's triangle. */
var boardTexture = (layout) => canvasTexture(BOARD_W * PX, BOARD_D * PX, (g) => {
	const grad = g.createLinearGradient(0, 0, g.canvas.width, g.canvas.height);
	grad.addColorStop(0, "#2b3036");
	grad.addColorStop(1, "#23272c");
	g.fillStyle = grad;
	g.fillRect(0, 0, g.canvas.width, g.canvas.height);
	drawTraces(g);
	g.fillStyle = "#e9ecef";
	g.strokeStyle = "rgba(233, 236, 239, 0.75)";
	g.textAlign = "center";
	g.textBaseline = "middle";
	for (const label of layout.labels) {
		const [px, py] = toPx(label.at[0], label.at[1]);
		g.font = `600 ${(label.size ?? .62) * PX}px system-ui, sans-serif`;
		g.fillText(label.text, px, py);
	}
	const [sx, sz] = layout.socket;
	const [ox, oy] = toPx(sx - 2.45, sz - 2.45);
	g.lineWidth = 3;
	g.strokeRect(ox, oy, 4.9 * PX, 4.9 * PX);
	const [tx, ty] = toPx(sx - 2.95, sz + 2.95);
	g.beginPath();
	g.moveTo(tx, ty);
	g.lineTo(tx + .85 * PX, ty);
	g.lineTo(tx, ty - .85 * PX);
	g.closePath();
	g.fill();
});
/** The socket's top: a dense grid of contact holes and a printed triangle in the front-left corner. */
var socketTexture = () => canvasTexture(512, 512, (g) => {
	g.fillStyle = "#efe9da";
	g.fillRect(0, 0, 512, 512);
	g.fillStyle = "#b9b09b";
	for (let r = 0; r < 38; r++) for (let c = 0; c < 38; c++) {
		if (r > 14 && r < 23 && c > 14 && c < 23) continue;
		g.beginPath();
		g.arc(28 + c * 12.2, 28 + r * 12.2, 2.6, 0, Math.PI * 2);
		g.fill();
	}
	g.fillStyle = "#8b8170";
	g.beginPath();
	g.moveTo(6, 506);
	g.lineTo(64, 506);
	g.lineTo(6, 448);
	g.closePath();
	g.fill();
});
/** The CPU's metal lid: model name, specs, and the gold triangle that must meet the socket's triangle. */
var cpuLidTexture = () => canvasTexture(512, 512, (g) => {
	const grad = g.createLinearGradient(0, 0, 512, 512);
	grad.addColorStop(0, "#e3e6e9");
	grad.addColorStop(.5, "#c3c8cd");
	grad.addColorStop(1, "#d6dadd");
	g.fillStyle = grad;
	g.fillRect(0, 0, 512, 512);
	g.strokeStyle = "rgba(255,255,255,0.18)";
	for (let i = 0; i < 512; i += 3) {
		g.beginPath();
		g.moveTo(0, i);
		g.lineTo(512, i + 30);
		g.stroke();
	}
	g.fillStyle = "#4a5056";
	g.textAlign = "center";
	g.font = "700 70px system-ui, sans-serif";
	g.fillText("EDU 6600", 256, 215);
	g.font = "500 36px system-ui, sans-serif";
	g.fillText("6 ядер · 12 потоків", 256, 285);
	g.fillText("3,9 ГГц · 16 МБ кеш", 256, 335);
	g.fillStyle = "#c9a227";
	g.beginPath();
	g.moveTo(22, 490);
	g.lineTo(104, 490);
	g.lineTo(22, 408);
	g.closePath();
	g.fill();
});
/** Gold contact fingers on an edge: stripes with gaps. `count` stripes across the width. */
var fingersTexture = (count) => {
	return canvasTexture(1024, 32, (g) => {
		g.fillStyle = "#1d6b3f";
		g.fillRect(0, 0, 1024, 32);
		g.fillStyle = "#e0bd55";
		const step = 1024 / count;
		for (let i = 0; i < count; i++) g.fillRect(i * step + step * .15, 0, step * .7, 32);
	});
};
/** A paper sticker with a few lines of text. */
var stickerTexture = (lines, bg = "#f4f5f6", ink = "#1f2328") => canvasTexture(512, 192, (g) => {
	g.fillStyle = bg;
	g.fillRect(0, 0, 512, 192);
	g.fillStyle = ink;
	g.textAlign = "left";
	lines.forEach((line, i) => {
		g.font = i === 0 ? "700 52px system-ui, sans-serif" : "500 30px system-ui, sans-serif";
		g.fillText(line, 24, 64 + i * 46);
	});
	for (let x = 360; x < 490; x += 4) if (x * 7 % 11 > 4) g.fillRect(x, 120, 2, 50);
});
/** Chip marking: a dot and a line of grey text on black. */
var chipTexture = (text) => canvasTexture(256, 256, (g) => {
	g.fillStyle = "#141518";
	g.fillRect(0, 0, 256, 256);
	g.fillStyle = "#6b7078";
	g.font = "600 34px system-ui, sans-serif";
	g.textAlign = "center";
	g.fillText(text, 128, 140);
	g.beginPath();
	g.arc(30, 30, 10, 0, Math.PI * 2);
	g.fill();
});
/** Rows of square pin holes, for power connectors. */
var pinGridTexture = (cols, rows) => canvasTexture(cols * 32, rows * 32, (g) => {
	g.fillStyle = "#ece8de";
	g.fillRect(0, 0, cols * 32, rows * 32);
	g.fillStyle = "#3a3a3a";
	for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) g.fillRect(c * 32 + 7, r * 32 + 7, 18, 18);
});
/** Parallel grooves for heatsink tops. */
var groovesTexture = () => {
	const t = canvasTexture(256, 256, (g) => {
		g.fillStyle = "#4b5159";
		g.fillRect(0, 0, 256, 256);
		g.fillStyle = "#2f343a";
		for (let y = 0; y < 256; y += 16) g.fillRect(0, y, 256, 6);
	});
	t.wrapS = RepeatWrapping;
	t.wrapT = RepeatWrapping;
	return t;
};
/** The round sticker in the middle of a fan: a ring and a short name. */
var hubTexture = () => canvasTexture(256, 256, (g) => {
	g.fillStyle = "#1b1d21";
	g.fillRect(0, 0, 256, 256);
	g.strokeStyle = "#1fa7a0";
	g.lineWidth = 10;
	g.beginPath();
	g.arc(128, 128, 104, 0, Math.PI * 2);
	g.stroke();
	g.fillStyle = "#e9ecef";
	g.font = "800 58px system-ui, sans-serif";
	g.textAlign = "center";
	g.textBaseline = "middle";
	g.fillText("EDU", 128, 112);
	g.font = "600 26px system-ui, sans-serif";
	g.fillText("COOL 120", 128, 160);
});
/** Honeycomb vent holes, for the back of the power supply and the case's vents. */
var honeycombTexture = (bg = "#202226") => canvasTexture(512, 512, (g) => {
	g.fillStyle = bg;
	g.fillRect(0, 0, 512, 512);
	g.fillStyle = "#050607";
	const r = 13;
	const w = r * Math.sqrt(3);
	for (let row = 0; row * r * 1.5 < 540; row++) for (let col = 0; col * w < 540; col++) {
		const cx = col * w + (row % 2 ? w / 2 : 0);
		const cy = row * r * 1.5;
		g.beginPath();
		for (let k = 0; k < 6; k++) {
			const a = Math.PI / 6 + k * Math.PI / 3;
			const px = cx + Math.cos(a) * 10;
			const py = cy + Math.sin(a) * 10;
			if (k === 0) g.moveTo(px, py);
			else g.lineTo(px, py);
		}
		g.closePath();
		g.fill();
	}
});
/** A round wire fan guard over dark slots. */
var fanGrilleTexture = () => canvasTexture(512, 512, (g) => {
	g.fillStyle = "#1b1d21";
	g.fillRect(0, 0, 512, 512);
	g.fillStyle = "#060708";
	g.beginPath();
	g.arc(256, 256, 236, 0, Math.PI * 2);
	g.fill();
	g.strokeStyle = "#5b6169";
	g.lineWidth = 7;
	for (let r = 40; r < 240; r += 32) {
		g.beginPath();
		g.arc(256, 256, r, 0, Math.PI * 2);
		g.stroke();
	}
	for (let k = 0; k < 4; k++) {
		g.beginPath();
		g.moveTo(256, 256);
		g.lineTo(256 + Math.cos(k * Math.PI / 2 + .6) * 240, 256 + Math.sin(k * Math.PI / 2 + .6) * 240);
		g.stroke();
	}
});
/** A short printed tag on a cable plug: «CPU», «PCIe». */
var tagTexture = (text, bg = "#e9ecef", ink = "#1f2328") => canvasTexture(256, 96, (g) => {
	g.fillStyle = bg;
	g.fillRect(0, 0, 256, 96);
	g.fillStyle = ink;
	g.font = "800 60px system-ui, sans-serif";
	g.textAlign = "center";
	g.textBaseline = "middle";
	g.fillText(text, 128, 50);
});
/** What the monitor shows once the computer is on: a calm desktop with a greeting. */
var desktopTexture = () => canvasTexture(1024, 600, (g) => {
	const grad = g.createLinearGradient(0, 0, 1024, 600);
	grad.addColorStop(0, "#1f6f8b");
	grad.addColorStop(1, "#1fa7a0");
	g.fillStyle = grad;
	g.fillRect(0, 0, 1024, 600);
	g.fillStyle = "rgba(255,255,255,0.12)";
	g.beginPath();
	g.arc(820, 120, 260, 0, Math.PI * 2);
	g.fill();
	g.fillStyle = "#ffffff";
	g.textAlign = "center";
	g.font = "800 72px system-ui, sans-serif";
	g.fillText("Привіт!", 512, 270);
	g.font = "500 38px system-ui, sans-serif";
	g.fillText("Комп'ютер зібрано й увімкнено", 512, 340);
	g.fillStyle = "rgba(10, 20, 30, 0.55)";
	g.fillRect(0, 548, 1024, 52);
	for (let i = 0; i < 6; i++) {
		g.fillStyle = [
			"#ffc94d",
			"#e9ecef",
			"#7bbf3a",
			"#e87ab0",
			"#2563eb",
			"#c0392b"
		][i] ?? "#fff";
		g.fillRect(24 + i * 64, 558, 40, 32);
	}
});
/** What the monitor shows when the computer starts but cannot find a disk: a black screen with a message. */
var noDiskTexture = () => canvasTexture(1024, 600, (g) => {
	g.fillStyle = "#05070a";
	g.fillRect(0, 0, 1024, 600);
	g.fillStyle = "#e9ecef";
	g.textAlign = "center";
	g.font = "700 56px ui-monospace, monospace";
	g.fillText("Диск D: не знайдено", 512, 280);
	g.font = "500 34px ui-monospace, monospace";
	g.fillText("Перевір кабелі диска", 512, 350);
});
/** A sign with one or two lines of large text that shrink to fit: basket labels, box labels. */
var signTexture = (lines, bg, ink) => canvasTexture(1024, 256, (g) => {
	g.fillStyle = bg;
	g.fillRect(0, 0, 1024, 256);
	g.fillStyle = ink;
	g.textAlign = "center";
	g.textBaseline = "middle";
	const lineH = 256 / lines.length;
	lines.forEach((line, i) => {
		let size = Math.min(110, lineH * .7);
		g.font = `800 ${size}px system-ui, sans-serif`;
		while (g.measureText(line).width > 960 && size > 20) {
			size -= 4;
			g.font = `800 ${size}px system-ui, sans-serif`;
		}
		g.fillText(line, 512, lineH * (i + .5));
	});
});
// src/scene/board.ts
var top = (face, side) => [
	side,
	side,
	face,
	side,
	side,
	side
];
var socketModel = (x, z) => {
	const g = group(box([
		4,
		.42,
		4
	], top(mat("#ffffff", {
		map: socketTexture(),
		rough: .5
	}), M.socket), x, BOARD_TOP, z));
	const y = BOARD_TOP;
	g.add(rounded([
		8,
		.55,
		.55
	], .12, M.satinBlack, x, y, z - 3.6));
	g.add(rounded([
		8,
		.55,
		.55
	], .12, M.satinBlack, x, y, z + 3.6));
	g.add(rounded([
		.55,
		.55,
		6.7
	], .12, M.satinBlack, x - 3.75, y, z));
	g.add(rounded([
		.55,
		.55,
		6.7
	], .12, M.satinBlack, x + 3.75, y, z));
	for (const [dx, dz] of [
		[-3.75, -3.6],
		[3.75, -3.6],
		[-3.75, 3.6],
		[3.75, 3.6]
	]) g.add(cylinder(.26, .12, M.aluminium, x + dx, y + .55, z + dz, 16));
	return g;
};
var dimmSlot = (x, z) => {
	const y = BOARD_TOP;
	return group(box([
		.7,
		.9,
		DIMM_LENGTH
	], M.blackPlastic, x, y, z), box([
		.24,
		.02,
		DIMM_LENGTH - .3
	], M.chip, x, y + .9, z), box([
		.08,
		.025,
		DIMM_LENGTH - .6
	], M.gold, x, y + .9, z), box([
		.3,
		.035,
		.3
	], M.whitePlastic, x, y + .9, z + DIMM_KEY), rounded([
		.78,
		1.35,
		.55
	], .08, M.whitePlastic, x, y, z - DIMM_LENGTH / 2 - .27), rounded([
		.78,
		1.35,
		.55
	], .08, M.whitePlastic, x, y, z + DIMM_LENGTH / 2 + .27), box([
		.5,
		.2,
		.3
	], M.whitePlastic, x, y + 1.2, z - DIMM_LENGTH / 2 - .05), box([
		.5,
		.2,
		.3
	], M.whitePlastic, x, y + 1.2, z + DIMM_LENGTH / 2 + .05));
};
var fanHeader = (x, z) => {
	const g = group(box([
		1.25,
		.22,
		.62
	], M.whitePlastic, x, BOARD_TOP, z), box([
		1.25,
		.6,
		.08
	], M.whitePlastic, x, BOARD_TOP, z - .3));
	g.add(boxes([
		.07,
		.55,
		.07
	], M.gold, [
		0,
		1,
		2,
		3
	].map((i) => [
		x - .38 + i * .25,
		BOARD_TOP,
		z + .05
	])));
	return g;
};
var m2Connector = (x, z, standoffX) => group(rounded([
	.8,
	.45,
	2.4
], .06, M.blackPlastic, x, BOARD_TOP, z), box([
	.1,
	.03,
	2.1
], M.gold, x - .25, BOARD_TOP + .45, z), cylinder(.3, .32, M.gold, standoffX, BOARD_TOP, z, 16), cylinder(.12, .34, M.chip, standoffX, BOARD_TOP, z, 12));
/** A heatsink of thin fins standing across its length, with a coloured cap at one end. */
var finnedHeatsink = (size, alongX, x, z) => {
	const [w, h, d] = size;
	const base = .45;
	const length = alongX ? w : d;
	const count = Math.floor(length / .32);
	const fins = Array.from({ length: count }, (_, i) => {
		const t = -length / 2 + .16 + i * (length / count);
		return alongX ? [
			x + t,
			BOARD_TOP + base,
			z
		] : [
			x,
			BOARD_TOP + base,
			z + t
		];
	});
	const fin = alongX ? [
		.12,
		h - base,
		d
	] : [
		w,
		h - base,
		.12
	];
	const cap = alongX ? [
		.5,
		h + .05,
		d + .05
	] : [
		w + .05,
		h + .05,
		.5
	];
	const capAt = alongX ? [x + w / 2 - .25, z] : [x, z - d / 2 + .25];
	return group(box([
		w,
		base,
		d
	], M.gunmetal, x, BOARD_TOP, z), boxes(fin, M.gunmetal, fins), box(cap, M.accent, capAt[0] ?? x, BOARD_TOP, capAt[1] ?? z));
};
var pcieSlot = (x, z, length, armoured) => {
	const g = group(box([
		length,
		1.1,
		.85
	], armoured ? M.brushed : M.blackPlastic, x, BOARD_TOP, z), box([
		length - .3,
		.02,
		.3
	], M.chip, x, BOARD_TOP + 1.1, z), box([
		length - .6,
		.025,
		.08
	], M.gold, x, BOARD_TOP + 1.1, z));
	if (armoured) g.add(rounded([
		.7,
		1.3,
		.95
	], .1, M.whitePlastic, x + length / 2 + .3, BOARD_TOP, z));
	return g;
};
var rearPanel = () => {
	const x = REAR_FACE_X + 1.65;
	const z = -4.5;
	const g = group(rounded([
		2.4,
		3.6,
		12
	], .25, M.satinBlack, x, BOARD_TOP, z), box([
		2.45,
		.25,
		9
	], M.accent, x, BOARD_TOP + 3.2, z), box([
		.2,
		3.4,
		11.6
	], M.aluminium, REAR_FACE_X + .4, BOARD_TOP, z));
	const portX = REAR_FACE_X + .25;
	const port = (key, shell, inner, core) => {
		const [pz, py] = REAR_PORTS[key];
		g.add(box(shell, M.aluminium, portX, BOARD_TOP + py - shell[1] / 2, pz), box(inner, core, portX, BOARD_TOP + py - inner[1] / 2, pz));
	};
	for (const key of [
		"usb1",
		"usb2",
		"usb3",
		"usb4"
	]) port(key, [
		.5,
		.7,
		1.3
	], [
		.52,
		.2,
		1
	], M.blueUsb);
	port("hdmi", [
		.5,
		1.5,
		.5
	], [
		.52,
		1.2,
		.28
	], M.chip);
	port("lan", [
		.5,
		1.2,
		1.4
	], [
		.52,
		.9,
		1
	], M.chip);
	const audio = [
		[.4, M.yellow],
		[1.2, mat("#7bbf3a")],
		[2, mat("#e87ab0")]
	];
	for (const [az, material] of audio) g.add(box([
		.5,
		.5,
		.5
	], material, portX, BOARD_TOP + .4, az));
	return g;
};
/** Board areas taken by the parts above, x0, z0, x1, z1: the tiny parts keep off them. */
var OCCUPIED = [
	[
		-3.4,
		-10.7,
		4.8,
		-2.7
	],
	[
		-7,
		-10.7,
		-4.6,
		-1.7
	],
	[
		-5.4,
		-12.7,
		3.9,
		-10.6
	],
	[
		-12.3,
		-11,
		-9.4,
		2
	],
	[
		5.6,
		-14,
		9.6,
		.4
	],
	[
		-8.3,
		2.2,
		2.3,
		3.6
	],
	[
		-9.6,
		4.3,
		-3.6,
		5.7
	],
	[
		1.8,
		4.3,
		6.2,
		8.7
	],
	[
		-5.4,
		-.5,
		3.6,
		2.3
	],
	[
		10.7,
		-7.9,
		12.3,
		-2.3
	],
	[
		10.6,
		6.6,
		12.2,
		8.4
	],
	[
		-7.6,
		-15.4,
		-5.4,
		-14.2
	],
	[
		-7,
		-2.4,
		-5.4,
		-1
	],
	[
		4.2,
		-14,
		6.2,
		-12.8
	],
	[
		8.8,
		9,
		11.2,
		11.2
	],
	[
		-4.3,
		-6.3,
		-3.5,
		1.2
	],
	[
		5,
		-6,
		6.2,
		-.8
	]
];
var free = (x, z) => Math.abs(x) < 24.4 / 2 - .6 && Math.abs(z) < 30.5 / 2 - .6 && !OCCUPIED.some(([x0, z0, x1, z1]) => x > x0 - .2 && x < x1 + .2 && z > z0 - .2 && z < z1 + .2);
/** Tiny parts in short neat rows, the way a pick-and-place machine sets them, not scattered at random. */
var smdParts = () => {
	const rnd = seeded(23);
	const rows = (count, pitch) => {
		const out = [];
		let tries = 0;
		while (out.length < count && tries++ < count * 40) {
			const x0 = (rnd() - .5) * (BOARD_W - 1);
			const z0 = (rnd() - .5) * (BOARD_D - 1);
			const alongX = rnd() < .5;
			const n = 3 + Math.floor(rnd() * 6);
			for (let i = 0; i < n && out.length < count; i++) {
				const x = alongX ? x0 + i * pitch : x0;
				const z = alongX ? z0 : z0 + i * pitch;
				if (Math.abs(x) < 24.4 / 2 - .3 && Math.abs(z) < 30.5 / 2 - .3 && free(x, z)) out.push([
					x,
					BOARD_TOP,
					z
				]);
			}
		}
		return out;
	};
	const resistors = rows(360, .24);
	const caps = rows(140, .3);
	const chips = rows(10, 1.4);
	return group(boxes([
		.16,
		.05,
		.08
	], M.smdDark, resistors), boxes([
		.2,
		.1,
		.11
	], M.smdTan, caps), boxes([
		.7,
		.12,
		.7
	], M.chip, chips, (i) => i % 2 ? [
		.7,
		.12,
		.7
	] : [
		1,
		.12,
		.55
	]));
};
var at = ([x, z]) => [
	x,
	BOARD_TOP,
	z
];
/** Two SATA ports stacked at the board's edge, for disks. */
var sataPorts = () => {
	const [x, z] = BOARD_CONNECTORS.sata;
	return group(rounded([
		1.3,
		.85,
		1.6
	], .06, M.blackPlastic, x, BOARD_TOP, z), box([
		.9,
		.02,
		.35
	], M.chip, x, BOARD_TOP + .85, z - .35), box([
		.9,
		.02,
		.35
	], M.chip, x, BOARD_TOP + .85, z + .35));
};
var decorations = (socket) => {
	const [sx, sz] = socket;
	const g = group(finnedHeatsink([
		2.2,
		2.3,
		8.5
	], false, sx - 6.5, sz + .5), finnedHeatsink([
		8.5,
		2.3,
		1.8
	], true, sx - 1.5, sz - 5), rearPanel(), pcieSlot(BOARD_CONNECTORS.pcieX16[0], BOARD_CONNECTORS.pcieX16[1], 9, true), pcieSlot(BOARD_CONNECTORS.pcieX1[0], BOARD_CONNECTORS.pcieX1[1], 5, false), rounded([
		4,
		.9,
		4
	], .15, M.gunmetal, 4, BOARD_TOP, 6.5), box([
		3.2,
		.02,
		3.2
	], mat("#ffffff", {
		map: groovesTexture(),
		metal: .6,
		rough: .4
	}), 4, BOARD_TOP + .9, 6.5), box([
		1,
		.03,
		1
	], M.accent, 5, BOARD_TOP + .92, 7.5), box([
		1.2,
		1.6,
		5.4
	], top(mat("#ffffff", { map: pinGridTexture(2, 12) }), M.whitePlastic), ...at(BOARD_CONNECTORS.atx24)), box([
		1.9,
		1.2,
		1
	], top(mat("#ffffff", { map: pinGridTexture(4, 2) }), M.blackPlastic), ...at(BOARD_CONNECTORS.eps8)), sataPorts(), cylinder(1.05, .25, M.blackPlastic, 10, BOARD_TOP, 10.1, 32), cylinder(.95, .3, M.capTop, 10, BOARD_TOP + .1, 10.1, 32), smdParts());
	g.add(boxes([
		.75,
		.75,
		.75
	], M.darkMetal, [
		0,
		1,
		2,
		3,
		4,
		5
	].map((i) => [
		sx - 4.5,
		BOARD_TOP,
		sz - 3 + i * 1.2
	])));
	for (let i = 0; i < 4; i++) {
		g.add(cylinder(.32, .85, M.chip, sx + 4.8, BOARD_TOP, sz - 2.4 + i * 1.5, 20));
		g.add(cylinder(.31, .04, M.capTop, sx + 4.8, BOARD_TOP + .85, sz - 2.4 + i * 1.5, 20));
	}
	for (const [hx, hz] of BOARD_HOLES) {
		g.add(cylinder(.48, .02, M.gold, hx, BOARD_TOP, hz, 20));
		g.add(cylinder(.2, .025, M.chip, hx, BOARD_TOP, hz, 16));
	}
	return g;
};
/**
* The motherboard with its sockets and slots: the real board's model once it is loaded, otherwise one
* built from the scenario's slots and where they are on the board.
*/
var buildBoard = (face, slots, poses) => {
	const real = realModel("motherboard");
	if (real) return real;
	const edge = mat("#1c2024");
	const g = group(box([
		BOARD_W,
		BOARD_TOP,
		BOARD_D
	], top(mat("#ffffff", {
		map: boardTexture(face),
		rough: .5
	}), edge)), decorations(face.socket));
	for (const slot of slots) {
		const pose = poses[slot.id];
		if (!pose) continue;
		const [x, , z] = pose.at;
		if (slot.accepts.includes("cpu")) g.add(socketModel(x, z));
		else if (slot.accepts.includes("ram")) g.add(dimmSlot(x, z));
		else if (slot.accepts.includes("fanCable")) g.add(fanHeader(x, z));
		else if (slot.accepts.includes("m2ssd")) g.add(m2Connector(x + 4.2, z, x - 4));
	}
	return shadowed(mergeStatic(g));
};
/** The socket lever: a metal bar along the socket's right side, pivoting at its front end. */
var buildLever = (length) => {
	const metal = mat("#d0d5da", {
		metal: .9,
		rough: .3
	});
	const bar = cylinder(.14, length, metal);
	bar.rotation.x = Math.PI / 2;
	bar.position.set(0, 0, -length / 2);
	return shadowed(group(bar, rounded([
		.75,
		.32,
		.55
	], .1, metal, -.22, -.16, -length), cylinder(.28, .45, mat("#24262a", {
		metal: .3,
		rough: .35
	}), 0, -.22, 0)));
};
/** The desk and the antistatic mat under the board. */
/** The desk top's size, width and depth, when the layout does not ask for a bigger one. */
var DESK_SIZE = [160, 110];
var buildDesk = (size = DESK_SIZE) => {
	const desk = group(box([
		size[0],
		2,
		size[1]
	], mat("#6e5236", { rough: .7 }), 0, -2, 0), box([
		52,
		.05,
		38
	], mat("#2c4766", { rough: .95 }), 0, 0, 0));
	desk.traverse((o) => {
		o.receiveShadow = true;
	});
	return desk;
};
// src/scene/case.ts
var [W, H, D] = CASE_SIZE;
var WALL = 1;
var steel = mat("#1d1f23", {
	metal: .6,
	rough: .45
});
var inside = mat("#2a2d33", {
	metal: .5,
	rough: .55
});
/** A wall in the x–y plane at depth z with rectangular holes, made of the boxes between the holes. */
var wallWithHoles = (outer, holes, z, depth) => {
	const xs = [.../* @__PURE__ */ new Set([
		outer[0],
		outer[2],
		...holes.flatMap((h) => [h[0], h[2]])
	])].sort((a, b) => a - b);
	const ys = [.../* @__PURE__ */ new Set([
		outer[1],
		outer[3],
		...holes.flatMap((h) => [h[1], h[3]])
	])].sort((a, b) => a - b);
	const g = group();
	for (let i = 0; i + 1 < xs.length; i++) for (let j = 0; j + 1 < ys.length; j++) {
		const [x0, x1, y0, y1] = [
			xs[i] ?? 0,
			xs[i + 1] ?? 0,
			ys[j] ?? 0,
			ys[j + 1] ?? 0
		];
		const cx = (x0 + x1) / 2;
		const cy = (y0 + y1) / 2;
		if (holes.some((h) => cx > h[0] && cx < h[2] && cy > h[1] && cy < h[3])) continue;
		g.add(box([
			x1 - x0,
			y1 - y0,
			depth
		], steel, cx, y0, z));
	}
	return g;
};
/** A 12 cm case fan lying in the x–z plane, blowing along y; turn it to face where it should. */
var caseFan = () => {
	const frame = M.satinBlack;
	const s = 12;
	const g = group(box([
		s,
		2.5,
		.8
	], frame, 0, 0, -5.6), box([
		s,
		2.5,
		.8
	], frame, 0, 0, s / 2 - .4), box([
		.8,
		2.5,
		s
	], frame, -5.6, 0, 0), box([
		.8,
		2.5,
		s
	], frame, s / 2 - .4, 0, 0));
	g.add(fanRotor(5.4, 7, mat("#2a2d33", { rough: .4 }), mat("#1b1d21", { rough: .4 }), 1.4));
	return g;
};
/** The holes in the back wall, x and y in case coordinates. */
var IO_HOLE = [
	-15.6,
	1.6,
	-2,
	5.8
];
var SLOTS_HOLE = [
	-3.4,
	1.8,
	9.6,
	15
];
var PSU_HOLE = [
	11.9,
	1,
	W / 2 - WALL,
	16.2
];
var buildCase = () => {
	const x0 = -W / 2;
	const z0 = -D / 2;
	const g = group(box([
		W,
		1,
		D
	], [
		steel,
		steel,
		inside,
		steel,
		steel,
		steel
	], 0, 0, 0), box([
		WALL,
		H - 1,
		D
	], steel, x0 + WALL / 2, 1, 0), box([
		WALL,
		H - 1,
		D
	], steel, -x0 - WALL / 2, 1, 0), box([
		W - 2,
		H - 1,
		WALL
	], steel, 0, 1, z0 + WALL / 2), box([
		W - 6,
		H - 5,
		.1
	], mat("#ffffff", {
		map: honeycombTexture("#24262a"),
		rough: .6
	}), 0, 3, z0 - .05), wallWithHoles([
		x0 + WALL,
		1,
		-x0 - WALL,
		H
	], [
		IO_HOLE,
		SLOTS_HOLE,
		PSU_HOLE
	], -z0 - WALL / 2, WALL), box([
		12,
		12,
		.1
	], mat("#ffffff", {
		map: fanGrilleTexture(),
		rough: .6
	}), -13.5, 7.5, -z0 + .06));
	for (let i = 0; i < 5; i++) g.add(box([
		.9,
		13,
		.2
	], M.aluminium, 4.4 + i * 1.05, 1.9, -z0 - .1));
	g.add(box([
		W,
		.15,
		.6
	], M.gunmetal, 0, H, z0 + .3), box([
		W,
		.15,
		.6
	], M.gunmetal, 0, H, -z0 - .3), box([
		.6,
		.15,
		D
	], M.gunmetal, x0 + .3, H, 0), box([
		.6,
		.15,
		D
	], M.gunmetal, -x0 - .3, H, 0));
	for (const [hx, hz] of BOARD_HOLES) {
		const [sx, , sz] = onBoard(hx, 0, hz);
		g.add(cylinder(.32, BOARD_IN_CASE[1] - 1, M.gold, sx, 1, sz, 12));
	}
	g.add(box([
		.3,
		3.4,
		15.6
	], M.aluminium, 8.6, 1, -13.2), box([
		.3,
		3.4,
		15.6
	], M.aluminium, 19.6, 1, -13.2));
	const rear = caseFan();
	rear.rotation.x = Math.PI / 2;
	rear.position.set(-13.5, 13.5, -z0 - WALL - 2.5);
	const front1 = caseFan();
	front1.rotation.x = -Math.PI / 2;
	front1.position.set(-13.5, 11, z0 + WALL + 2.5);
	const front2 = caseFan();
	front2.rotation.x = -Math.PI / 2;
	front2.position.set(-.5, 11, z0 + WALL + 2.5);
	g.add(rear, front1, front2);
	g.add(rounded([
		.3,
		5,
		9
	], .1, M.blackPlastic, x0 - .15, 8, -16.5));
	g.add(box([
		.1,
		.5,
		1.3
	], M.blueUsb, x0 - .32, 9, -14.2), box([
		.1,
		.5,
		1.3
	], M.blueUsb, x0 - .32, 10.2, -14.2));
	return shadowed(mergeStatic(g));
};
/**
* The power button: a round button with a light ring. Its face points along -x (the case's top);
* the scene places it, makes it glow as a hint and lights the ring once the computer is on.
*/
var powerButton = () => {
	const ring = mat("#1fa7a0", {
		rough: .3,
		metal: .2
	});
	ring.emissive.set("#1fa7a0");
	ring.emissiveIntensity = 0;
	const r = cylinder(1.05, .25, ring, 0, 0, 0, 32);
	r.userData.light = true;
	const g = group(r, cylinder(.85, .4, mat("#c9ced3", {
		metal: .85,
		rough: .3
	}), 0, 0, 0, 32));
	g.rotation.z = Math.PI / 2;
	return shadowed(g);
};
// src/scene/icons.ts
var VIEW = new Vector3(.9, 1.1, 1.25).normalize();
var ICON_PX = 128;
/**
* Pictures of the parts for the tray, drawn from the same 3D models as the scene,
* so a student recognises on the bench what they picked in the tray.
* Uses the scene's own renderer (a second WebGL context slows weak computers down) but draws
* off screen, so the visible canvas is never read back.
* Returns a PNG data URL per kind that `model` gives a model for; other kinds are left out.
*/
var renderIcons = (renderer, environment, kinds, model) => {
	const wanted = [...new Set(kinds)];
	const out = {};
	if (wanted.length === 0) return out;
	const scene = new Scene();
	scene.environment = environment;
	scene.add(new HemisphereLight("#ffffff", "#5a4a3a", .7));
	const sun = new DirectionalLight("#ffffff", 1.5);
	sun.position.set(-10, 20, 12);
	scene.add(sun);
	const camera = new PerspectiveCamera(30, 1, .1, 200);
	const target = new WebGLRenderTarget(ICON_PX, ICON_PX, {
		type: FloatType,
		samples: 4
	});
	const pixels = /* @__PURE__ */ new Float32Array(65536);
	const canvas = document.createElement("canvas");
	canvas.width = ICON_PX;
	canvas.height = ICON_PX;
	const g = canvas.getContext("2d");
	const shadows = renderer.shadowMap.enabled;
	const previous = renderer.getRenderTarget();
	renderer.shadowMap.enabled = false;
	try {
		for (const kind of wanted) {
			const built = model(kind);
			if (!built) continue;
			scene.add(built);
			const bounds = new Box3().setFromObject(built);
			const centre = bounds.getCenter(new Vector3());
			const radius = bounds.getSize(new Vector3()).length() / 2;
			camera.position.copy(centre).addScaledVector(VIEW, .72 * radius / Math.sin(camera.fov * Math.PI / 360));
			camera.lookAt(centre);
			renderer.setRenderTarget(target);
			renderer.setClearColor(0, 0);
			renderer.clear();
			renderer.render(scene, camera);
			renderer.readRenderTargetPixels(target, 0, 0, ICON_PX, ICON_PX, pixels);
			if (g) {
				g.putImageData(toImage(pixels), 0, 0);
				out[kind] = canvas.toDataURL("image/png");
			}
			scene.remove(built);
			built.traverse((o) => {
				if (o instanceof Mesh) o.geometry.dispose();
			});
		}
	} finally {
		renderer.setRenderTarget(previous);
		renderer.setClearColor(0, 1);
		renderer.shadowMap.enabled = shadows;
		target.dispose();
	}
	return out;
};
/** Off-screen pixels are linear light, bottom row first: tone-map like the scene, convert to sRGB and flip. */
var toImage = (pixels) => {
	const image = new ImageData(ICON_PX, ICON_PX);
	const exposure = 1;
	for (let y = 0; y < ICON_PX; y++) for (let x = 0; x < ICON_PX; x++) {
		const from = ((127 - y) * ICON_PX + x) * 4;
		const to = (y * ICON_PX + x) * 4;
		for (let c = 0; c < 3; c++) image.data[to + c] = Math.round(srgb(aces((pixels[from + c] ?? 0) * exposure)) * 255);
		image.data[to + 3] = Math.round(Math.min(1, pixels[from + 3] ?? 0) * 255);
	}
	return image;
};
/** A close fit of the filmic curve the scene's renderer uses. */
var aces = (v) => Math.min(1, Math.max(0, v * (2.51 * v + .03) / (v * (2.43 * v + .59) + .14)));
var srgb = (v) => v <= .0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - .055;
// src/scene/devices.ts
/** Box faces in three.js order: +x, -x, +y, -y, +z, -z. Unset faces get `rest`. */
var faces = (rest, set) => [
	set.px ?? rest,
	set.nx ?? rest,
	set.py ?? rest,
	set.ny ?? rest,
	set.pz ?? rest,
	set.nz ?? rest
];
var printed = (map, rough = .55) => mat("#ffffff", {
	map,
	rough
});
/** A flat picture on a face. `normal` says which way it looks: "y" up, "z" towards +z, "x" towards +x. */
var decal$1 = (w, h, material, normal, x, y, z) => {
	const mesh = new Mesh(new PlaneGeometry(w, h), material);
	if (normal === "y") mesh.rotation.x = -Math.PI / 2;
	if (normal === "x") mesh.rotation.y = Math.PI / 2;
	mesh.position.set(x, y, z);
	return mesh;
};
/** Where a plug's cable leaves it, and which way: the scene draws the cable from there. */
var cableOut = (g, at, dir) => {
	g.userData.cableOut = at;
	g.userData.cableDir = dir;
	return g;
};
/** A power supply: 8.6 × 15 × 14 cm. Its back (+z) has the mains socket and switch; its fan faces +x. */
var powerSupply = () => {
	const g = group(box([
		8.6,
		15,
		14
	], faces(mat("#202226", {
		rough: .45,
		metal: .35
	}), {
		pz: printed(honeycombTexture(), .5),
		px: printed(fanGrilleTexture(), .5)
	}), 0, 0, 0));
	g.add(box([
		2.6,
		1.9,
		.2
	], M.blackPlastic, -1.6, 2.5, 7));
	g.add(box([
		1.8,
		1.1,
		.05
	], M.chip, -1.6, 2.9, 7.2));
	g.add(rounded([
		1.1,
		1.6,
		.4
	], .1, M.blackPlastic, -1.6, 5.2, 7));
	g.add(box([
		.8,
		.6,
		.12
	], M.red, -1.6, 5.7, 7.35));
	g.add(decal$1(8, 5.4, printed(stickerTexture(["EDU POWER 650 Вт", "80 PLUS Bronze · 230 В"])), "y", 0, 15.01, -2.5));
	g.add(box([
		.15,
		6,
		11
	], M.chip, -4.37, 1.2, -.5));
	const sockets = [];
	for (let i = 0; i < 6; i++) sockets.push([
		-4.46,
		2 + i % 2 * 2.4,
		-4.5 + Math.floor(i / 2) * 3.2
	]);
	g.add(boxes([
		.05,
		1.2,
		2.2
	], M.blackPlastic, sockets));
	return g;
};
/**
* A graphics card standing on its edge: the board in the y–z plane, the cooler with two fans on +x,
* the bracket with the ports at +z. Its origin is the bottom of the gold contacts.
*/
var graphicsCard = () => {
	const length = 25.6;
	const centreZ = 8.6 - length / 2;
	const shroud = mat("#26282d", {
		rough: .4,
		metal: .3
	});
	const g = group(box([
		.17,
		.8,
		8.5
	], M.gold, 0, 0, 0), box([
		.16,
		11,
		length
	], M.blackPcb, 0, .8, centreZ), box([
		.12,
		10.4,
		24.8
	], M.darkMetal, -.16, 1.1, -4.400000000000001), rounded([
		3.4,
		10.6,
		25
	], .25, shroud, 1.9, 1, -4.500000000000001), box([
		.08,
		.5,
		23.6
	], M.accent, 3.62, 9.6, -4.500000000000001), decal$1(22.6, 1.6, printed(tagTexture("EDU GRAPHICS", "#26282d", "#e9ecef")), "y", 1.9, 11.61, -5.700000000000001));
	for (const fz of [-10.4, .4]) {
		const fan = group(cylinder(4.5, .3, mat("#18191c", { rough: .4 }), 0, 0, 0, 40), fanRotor(4.2, 11, mat("#30333a", {
			rough: .35,
			metal: .1
		}), mat("#1b1d21", { rough: .4 }), .3));
		fan.rotation.z = -Math.PI / 2;
		fan.position.set(3.55, 6.3, fz);
		g.add(fan);
	}
	const [px, py, pz] = GPU_POWER_LOCAL;
	g.add(box([
		1,
		.8,
		2.1
	], faces(M.blackPlastic, { py: printed(pinGridTexture(2, 4)) }), px, py - .8, pz));
	const [, hy, hz] = GPU_HDMI_LOCAL;
	const bracketZ = hz - .25;
	g.add(box([
		4.4,
		12.2,
		.1
	], M.aluminium, 1.6, 0, bracketZ));
	for (const [i, py2] of [
		hy,
		hy + 2.1,
		hy + 4.2
	].entries()) {
		g.add(box([
			.55,
			1.5,
			.3
		], M.aluminium, GPU_HDMI_LOCAL[0], py2 - .75, bracketZ + .15));
		g.add(box([
			.3,
			1.2,
			.32
		], M.chip, GPU_HDMI_LOCAL[0], py2 - .6, bracketZ + .16));
		if (i === 0) g.add(box([
			.3,
			.3,
			.05
		], M.accent, GPU_HDMI_LOCAL[0] + .7, py2 - .15, bracketZ + .08));
	}
	g.add(box([
		1.4,
		6,
		.05
	], printed(honeycombTexture("#b9bfc5")), 3, 6, bracketZ + .06));
	return g;
};
/** A 3.5-inch hard disk lying flat: 10.2 × 2.6 × 14.7 cm, its connectors on the back end (+z). */
var hardDisk = () => {
	const lid = mat("#b9bfc5", {
		metal: .8,
		rough: .35
	});
	const g = group(rounded([
		10.2,
		2.6,
		14.7
	], .2, M.aluminium), box([
		10,
		.3,
		14.5
	], M.greenPcb, 0, -.01, 0), rounded([
		9.6,
		.1,
		14.1
	], .05, lid, 0, 2.6, 0), decal$1(8, 6.2, printed(stickerTexture(["EDU HDD 2 ТБ", "7200 об/хв · SATA"])), "y", 0, 2.71, -1.6));
	const [dx, dy, dz] = HDD_DATA_LOCAL;
	const [wx, wy, wz] = HDD_POWER_LOCAL;
	g.add(box([
		1.4,
		.6,
		.25
	], M.blackPlastic, dx, dy - .3, dz - .12));
	g.add(box([
		2.6,
		.6,
		.25
	], M.blackPlastic, wx, wy - .3, wz - .12));
	for (const [x, z] of [
		[-4.6, -6],
		[4.6, -6],
		[-4.6, 5],
		[4.6, 5]
	]) g.add(cylinder(.25, .05, M.darkMetal, x, 2.7, z, 12));
	return g;
};
var sleeve = mat("#141518", { rough: .8 });
/** The 24-pin plug for the board: wide, with a latch, going into its socket from above. */
var atxPlug = () => cableOut(group(rounded([
	5.4,
	1.4,
	1.3
], .08, M.blackPlastic), box([
	1.2,
	.5,
	.5
], M.blackPlastic, 0, .6, .85), boxes([
	.14,
	.6,
	.14
], sleeve, Array.from({ length: 12 }, (_, i) => [
	-2.4 + i * .44,
	1.4,
	0
]))), new Vector3(0, 2, 0), new Vector3(0, 1, 0));
/** An 8-pin power plug for the processor or the graphics card. They look alike; only the tag differs. */
var eightPinPlug = (tag) => cableOut(group(rounded([
	1,
	1.2,
	2.1
], .06, M.blackPlastic), box([
	.4,
	.4,
	.6
], M.blackPlastic, .6, .6, 0), decal$1(.9, .34, printed(tagTexture(tag)), "x", .51, .75, 0)), new Vector3(0, 1.8, 0), new Vector3(0, 1, 0));
/** The flat L-shaped SATA power plug: it goes into the back of the disk, horizontally. */
var sataPowerPlug = () => cableOut(group(rounded([
	2.4,
	.6,
	1.1
], .08, M.blackPlastic, 0, -.3, .55)), new Vector3(0, 0, 1.3), new Vector3(0, 0, 1));
/** The small red SATA data plug: it goes into the board's SATA port from above. */
var sataDataPlug = () => cableOut(group(rounded([
	1,
	1.1,
	.5
], .06, M.red), box([
	.8,
	.12,
	.3
], M.chip, 0, 0, 0)), new Vector3(0, 1.3, 0), new Vector3(0, 1, 0));
/**
* The plug of a removable cable at the power supply's end: an 8-pin block going +z into a red socket on the
* supply, its cable leaving towards -z, into the case.
*/
var psuPlug = () => cableOut(group(rounded([
	1,
	2,
	1.4
], .08, M.blackPlastic, 0, -1, -.7), box([
	.3,
	.6,
	.5
], M.blackPlastic, .6, -.3, -.8)), new Vector3(0, 0, -1.6), new Vector3(0, 0, -1));
/** The thin plugs of the case's front panel: they go into the board's headers from above. */
var headerPlug = (kind) => {
	const look = {
		panel: {
			size: [
				1.6,
				.8,
				.55
			],
			body: M.blackPlastic
		},
		audio: {
			size: [
				1.2,
				.8,
				.55
			],
			body: M.blackPlastic
		},
		usb: {
			size: [
				2.2,
				.9,
				.9
			],
			body: M.blueUsb
		}
	}[kind];
	const g = group(rounded(look.size, .06, look.body));
	if (kind === "panel") [
		M.red,
		M.blackPlastic,
		M.yellow,
		M.accent
	].forEach((w, i) => g.add(box([
		.14,
		.4,
		.14
	], w, -.45 + i * .3, .8, 0)));
	return cableOut(g, new Vector3(0, look.size[1] + .3, 0), new Vector3(0, 1, 0));
};
/** An HDMI plug, pointing -z into the socket. */
var hdmiPlug = () => cableOut(group(box([
	1.4,
	.45,
	.8
], M.aluminium, 0, -.22, .4), rounded([
	2,
	1,
	2
], .2, M.blackPlastic, 0, -.5, 1.8)), new Vector3(0, 0, 2.9), new Vector3(0, 0, 1));
/** A USB plug, pointing -z into the socket; grey for the keyboard, black for the mouse. */
var usbPlug = (body) => cableOut(group(box([
	1.2,
	.45,
	.9
], M.aluminium, 0, -.22, .45), rounded([
	1.6,
	.8,
	2.2
], .2, body, 0, -.4, 1.95)), new Vector3(0, 0, 3.1), new Vector3(0, 0, 1));
/** The tempered glass side panel with its dark painted border and four thumbscrews. */
var sidePanel = () => {
	const g = group(box([
		42.6,
		.35,
		44.6
	], new MeshStandardMaterial({
		color: "#3a4450",
		transparent: true,
		opacity: .22,
		roughness: .05,
		metalness: .2,
		depthWrite: false
	})));
	const paint = M.satinBlack;
	g.add(box([
		42.6,
		.36,
		1.4
	], paint, 0, 0, -21.6), box([
		42.6,
		.36,
		1.4
	], paint, 0, 0, 21.6), box([
		1.4,
		.36,
		41.8
	], paint, -20.6, 0, 0), box([
		1.4,
		.36,
		41.8
	], paint, 20.6, 0, 0));
	for (const [x, z] of [
		[-19.6, -20.6],
		[19.6, -20.6],
		[-19.6, 20.6],
		[19.6, 20.6]
	]) g.add(cylinder(.7, .5, M.brushed, x, .36, z, 20));
	return g;
};
/** A monitor facing +z. Its screen is dark until the computer is on; the scene finds it by `screen`. */
var monitor = () => {
	const screen = new MeshStandardMaterial({
		color: "#07090c",
		roughness: .15,
		metalness: .1,
		emissive: "#ffffff",
		emissiveIntensity: 0
	});
	screen.emissiveMap = desktopTexture();
	const face = decal$1(50.4, 28.6, screen, "z", 0, 27.3, .92);
	face.userData.screen = true;
	return group(rounded([
		18,
		.8,
		12
	], .3, M.satinBlack, 0, 0, 0), box([
		3.2,
		14,
		1.6
	], M.satinBlack, 0, .8, -1.2), rounded([
		52,
		31,
		1.6
	], .4, M.blackPlastic, 0, 12, 0), face);
};
/** A keyboard: a dark base with rows of keys. */
var keyboard = () => {
	const keys = [];
	[
		14,
		14,
		13,
		12,
		9
	].forEach((n, r) => {
		for (let c = 0; c < n; c++) keys.push([
			-19.5 + c * 3 + r * .6,
			1.1,
			-5.4 + r * 2.7
		]);
	});
	return group(rounded([
		44,
		1.2,
		14.6
	], .4, M.satinBlack), boxes([
		2.5,
		.8,
		2.3
	], mat("#2b2e34", { rough: .55 }), keys, (i) => i === keys.length - 5 ? [
		14,
		.8,
		2.3
	] : [
		2.5,
		.8,
		2.3
	]));
};
/** A mouse: a rounded body with two buttons and a wheel. */
var mouse = () => group(rounded([
	6,
	3,
	10.5
], 1.4, M.satinBlack), box([
	.08,
	.2,
	4
], M.chip, 0, 2.9, -2.5), rounded([
	.6,
	.6,
	1.3
], .25, M.gunmetal, 0, 2.7, -2.8));
/** A round speaker driver facing +z, its face at depth z. */
var driver = (r, material, x, y, z) => {
	const d = cylinder(r, .3, material, 0, 0, 0, 32);
	d.rotation.x = Math.PI / 2;
	d.position.set(x, y, z);
	return d;
};
/** A pair of desk speakers facing +z, with a woofer and a tweeter each. */
var speakers = () => {
	const cone = mat("#2b2e34", { rough: .8 });
	const one = (x) => group(rounded([
		9,
		16,
		10
	], .6, M.satinBlack, x, 0, 0), driver(3.2, cone, x, 5.5, 5.05), driver(1.2, M.gunmetal, x, 12, 5.05));
	return group(one(-11), one(11));
};
/** An inkjet printer: a light body, a paper tray at the back and a sheet coming out at the front. */
var printer = () => {
	const body = mat("#e3e6e9", { rough: .45 });
	const paper = mat("#fbfbf8", { rough: .9 });
	const g = group(rounded([
		40,
		15,
		28
	], 1.2, body), box([
		36,
		.8,
		4
	], M.satinBlack, 0, 9, 14), box([
		30,
		.2,
		16
	], paper, 0, 6, 20), box([
		26,
		.15,
		22
	], paper, 0, 15, -12), box([
		28,
		8,
		1
	], body, 0, 15, -16), box([
		8,
		.4,
		4
	], M.satinBlack, 13, 15, 8));
	const slope = g.children[4];
	if (slope) slope.rotation.x = -.35;
	g.add(cylinder(.5, .2, M.accent, 15, 15.3, 8, 16));
	return g;
};
/** A USB flash drive: a small blue body with a metal tip. */
var flashDrive = () => group(rounded([
	2,
	.9,
	4.6
], .3, M.blueUsb, 0, 0, 0), box([
	1.2,
	.45,
	1.3
], M.aluminium, 0, .2, -2.9));
/** A smartphone lying on its back, screen up: the photos come from it. */
var smartphone = () => group(rounded([
	7.2,
	.8,
	15
], .6, M.satinBlack, 0, 0, 0), box([
	6.6,
	.05,
	13.8
], mat("#1b3550", {
	rough: .15,
	metal: .1
}), 0, .8, 0));
/** A power strip on the desk with its switch; the computer gets power only when it is on. */
var powerStrip = () => group(rounded([
	30,
	3.6,
	5.5
], .6, mat("#eceff1", { rough: .5 }), 0, 0, 0), boxes([
	3.2,
	.1,
	3.2
], mat("#cfd4d8", { rough: .6 }), [
	-8,
	-2.5,
	3,
	8.5
].map((x) => [
	x,
	3.6,
	0
])));
/** An open crate for sorting devices, with a coloured sign on its front. */
var crate = (label, colour) => {
	const wood = mat(colour, { rough: .7 });
	const [w, h, d] = [
		40,
		12,
		26
	];
	const g = group(box([
		w,
		1,
		d
	], wood, 0, 0, 0), box([
		w,
		h,
		1
	], wood, 0, 0, -d / 2 + .5), box([
		w,
		h,
		1
	], wood, 0, 0, d / 2 - .5), box([
		1,
		h,
		d
	], wood, -w / 2 + .5, 0, 0), box([
		1,
		h,
		d
	], wood, w / 2 - .5, 0, 0));
	const sign = new Mesh(new PlaneGeometry(36, 9), printed(signTexture(label, "#fffdf6", "#1f2328")));
	sign.position.set(0, h / 2 + .3, d / 2 + .05);
	g.add(sign);
	return g;
};
/** A closed cardboard box with the device's name on it. */
var cardboardBox = (name) => {
	return group(box([
		18,
		13,
		15
	], faces(mat("#c49a6c", { rough: .85 }), { pz: printed(signTexture([name.toUpperCase()], "#c49a6c", "#3d2b1a"), .85) }), 0, 0, 0), box([
		18.05,
		.05,
		4
	], mat("#d9c29b", { rough: .6 }), 0, 13, 0));
};
// src/scene/parts.ts
/** A flat picture lying face up at height `y`. A canvas's top edge points to -z. */
var decal = (w, d, map, x = 0, y = 0, z = 0) => {
	const mesh = new Mesh(new PlaneGeometry(w, d), mat("#ffffff", {
		map,
		rough: .55
	}));
	mesh.rotation.x = -Math.PI / 2;
	mesh.position.set(x, y, z);
	return mesh;
};
/** Green substrate with tiny capacitors around a metal lid. The lid's triangle is in the front-left corner. */
var cpu = () => {
	const rnd = seeded(5);
	const caps = [];
	for (let i = 0; i < 26; i++) {
		const along = -1.6 + rnd() * 3.2;
		const side = i % 4;
		const [x, z] = side === 0 ? [along, -1.85] : side === 1 ? [along, 1.85] : side === 2 ? [-1.85, along] : [1.85, along];
		caps.push([
			x,
			.12,
			z
		]);
	}
	return group(rounded([
		4,
		.12,
		4
	], .04, M.greenPcb), boxes([
		.14,
		.06,
		.08
	], M.smdTan, caps, (i) => i % 4 < 2 ? [
		.14,
		.06,
		.08
	] : [
		.08,
		.06,
		.14
	]), box([
		.3,
		.01,
		.3
	], M.gold, -1.8, .12, 1.8), rounded([
		3.4,
		.28,
		3.4
	], .08, M.aluminium, 0, .12), decal(3.3, 3.3, cpuLidTexture(), 0, .405, 0));
};
/** A syringe: white body, grey paste inside, a plunger and a nozzle. */
var pasteSyringe = () => {
	const along = (mesh) => {
		mesh.rotation.z = Math.PI / 2;
		return mesh;
	};
	const body = along(new Mesh(new CylinderGeometry(.36, .36, 2.6, 24), mat("#f2f4f5", { rough: .3 })));
	const fill = along(new Mesh(new CylinderGeometry(.3, .3, 1.8, 20), M.paste));
	fill.position.set(.35, 0, 0);
	const ring = along(new Mesh(new CylinderGeometry(.38, .38, .18, 24), M.accent));
	ring.position.set(-.7, 0, 0);
	const nozzle = along(new Mesh(new CylinderGeometry(.08, .28, .7, 20), mat("#f2f4f5", { rough: .3 })));
	nozzle.position.set(1.65, 0, 0);
	const rod = along(new Mesh(new CylinderGeometry(.1, .1, 1.1, 12), mat("#d9dde1", { rough: .4 })));
	rod.position.set(-1.8, 0, 0);
	const thumb = along(new Mesh(new CylinderGeometry(.42, .42, .1, 24), mat("#d9dde1", { rough: .4 })));
	thumb.position.set(-2.35, 0, 0);
	const g = group(body, fill, ring, nozzle, rod, thumb);
	g.position.y = .42;
	return group(g);
};
/** A pea-sized blob, flattened a little, on the CPU's lid. */
var pasteBlob = () => {
	const blob = new Mesh(new SphereGeometry(.5, 24, 14), M.paste);
	blob.scale.set(1, .32, .9);
	blob.position.y = .06;
	const tip = new Mesh(new SphereGeometry(.16, 12, 8), M.paste);
	tip.position.set(.08, .2, -.05);
	return group(blob, tip);
};
var fan = (y) => {
	const frame = M.satinBlack;
	const g = group(rounded([
		7.4,
		1,
		.4
	], .12, frame, 0, y, -3.5), rounded([
		7.4,
		1,
		.4
	], .12, frame, 0, y, 3.5), rounded([
		.4,
		1,
		7.4
	], .12, frame, -3.5, y, 0), rounded([
		.4,
		1,
		7.4
	], .12, frame, 3.5, y, 0));
	const shroud = new Mesh(new CylinderGeometry(3.4, 3.4, 1, 48, 1, true), mat("#202226", {
		rough: .45,
		metal: .2
	}));
	shroud.material.side = DoubleSide;
	shroud.position.y = y + .5;
	g.add(shroud);
	for (const [cx, cz] of [
		[-3.3, -3.3],
		[3.3, -3.3],
		[-3.3, 3.3],
		[3.3, 3.3]
	]) {
		g.add(rounded([
			1.1,
			1,
			1.1
		], .15, frame, cx, y, cz));
		g.add(cylinder(.22, .02, M.darkMetal, cx, y + 1, cz, 12));
	}
	for (let i = 0; i < 4; i++) {
		const holder = group(box([
			4.4,
			.12,
			.22
		], frame, 2.2, y + .05, 0));
		holder.rotation.y = Math.PI / 4 + i * Math.PI / 2;
		g.add(holder);
	}
	const rotor = fanRotor(3.2, 9, mat("#2a2d33", {
		rough: .4,
		metal: .1
	}), mat("#1b1d21", { rough: .4 }), y + .6);
	g.add(rotor);
	const hub = new Mesh(new CylinderGeometry(.98, .98, .01, 40), [
		M.blackPlastic,
		mat("#ffffff", { map: hubTexture() }),
		M.blackPlastic
	]);
	hub.position.y = .36;
	rotor.add(hub);
	return g;
};
/** Copper base, heat pipes, a stack of thin aluminium fins and a 120 mm fan on top. About 4 cm tall. */
var cooler = () => {
	const fins = [];
	for (let z = -3.35; z <= 3.36; z += .19) fins.push([
		0,
		.55,
		z
	]);
	const g = group(rounded([
		3.6,
		.35,
		3.6
	], .06, M.copper), boxes([
		7,
		2.3,
		.045
	], M.aluminium, fins), rounded([
		8,
		.22,
		.7
	], .06, M.gunmetal, 0, .18, -3.6), rounded([
		8,
		.22,
		.7
	], .06, M.gunmetal, 0, .18, 3.6));
	for (let i = 0; i < 4; i++) {
		const pipe = new Mesh(new CylinderGeometry(.17, .17, 7.3, 16), M.copper);
		pipe.rotation.z = Math.PI / 2;
		pipe.position.set(0, .5, -1.2 + i * .8);
		g.add(pipe);
	}
	for (const [cx, cz] of [
		[-3.75, -3.6],
		[3.75, -3.6],
		[-3.75, 3.6],
		[3.75, 3.6]
	]) {
		g.add(cylinder(.2, .8, M.brushed, cx, -.3, cz, 12));
		g.add(cylinder(.32, .18, M.darkMetal, cx, .4, cz, 6));
	}
	g.add(fan(2.9));
	return g;
};
/** The plug on the end of the fan's cable: a black housing and three twisted wires going up. */
var fanPlug = () => {
	const g = group(rounded([
		1.2,
		.6,
		.55
	], .06, M.blackPlastic), box([
		.9,
		.02,
		.18
	], M.chip, 0, .6, -.12));
	[
		M.blackPlastic,
		M.red,
		M.yellow
	].forEach((wireMat, i) => {
		const dx = -.3 + i * .3;
		const wire = new CatmullRomCurve3([
			new Vector3(dx, .55, 0),
			new Vector3(dx * .6, 1.3, .4),
			new Vector3(dx * .3, 1.8, 1.4),
			new Vector3(dx * .2, 2, 2.6)
		]);
		g.add(new Mesh(new TubeGeometry(wire, 24, .09, 8), wireMat));
	});
	g.userData.cableOut = new Vector3(0, 2, 2.6);
	g.userData.cableDir = new Vector3(0, 0, 1);
	return g;
};
var goldFingers = (length, z) => {
	const face = mat("#ffffff", {
		map: fingersTexture(Math.max(1, Math.round(length * 5.5))),
		metal: .85,
		rough: .3
	});
	return box([
		.15,
		.36,
		length
	], [
		face,
		face,
		M.gold,
		M.gold,
		M.greenPcb,
		M.greenPcb
	], 0, 0, z);
};
/**
* A RAM module stands along z: a green board with memory chips on both sides, a sticker and gold contacts.
* Its notch is off centre, so turned around it no longer fits the slot's key.
*/
var ram = () => {
	const g = group(rounded([
		.14,
		2.75,
		DIMM_LENGTH
	], .03, M.greenPcb, 0, .35));
	const chip = mat("#ffffff", {
		map: chipTexture("D5 16G"),
		rough: .4
	});
	const chipFaces = (side) => side === 1 ? [
		chip,
		M.chip,
		M.chip,
		M.chip,
		M.chip,
		M.chip
	] : [
		M.chip,
		chip,
		M.chip,
		M.chip,
		M.chip,
		M.chip
	];
	for (const side of [1, -1]) {
		for (let i = 0; i < 8; i++) {
			const z = -5.4 + i * 1.45 + (i >= 4 ? .35 : 0);
			g.add(box([
				.09,
				.95,
				1.15
			], chipFaces(side), side * .11, .95, z));
		}
		const smd = [];
		for (let i = 0; i < 30; i++) smd.push([
			side * .09,
			.55,
			-6.2 + i * .43
		]);
		g.add(boxes([
			.04,
			.08,
			.16
		], M.smdDark, smd));
	}
	const sticker = new Mesh(new PlaneGeometry(5, .7), mat("#ffffff", {
		map: stickerTexture(["EDU DDR5 16 ГБ", "4800 МГц · 1,1 В"]),
		rough: .6
	}));
	sticker.rotation.y = Math.PI / 2;
	sticker.position.set(.161, 2.5, 1.2);
	g.add(sticker);
	const gap = .35;
	const frontLen = DIMM_LENGTH / 2 - DIMM_KEY - gap / 2;
	const backLen = DIMM_LENGTH / 2 + DIMM_KEY - gap / 2;
	g.add(goldFingers(frontLen, DIMM_LENGTH / 2 - frontLen / 2), goldFingers(backLen, -DIMM_LENGTH / 2 + backLen / 2));
	return g;
};
/** A black stick along x: contacts at the -x end, a controller, memory chips under a sticker, a screw notch at +x. */
var m2ssd = () => {
	const stripes = fingersTexture(14);
	stripes.center.set(.5, .5);
	stripes.rotation = Math.PI / 2;
	const fingerTop = mat("#ffffff", {
		map: stripes,
		metal: .85,
		rough: .3
	});
	const fingers = (len, z) => box([
		.45,
		.105,
		len
	], [
		M.gold,
		M.gold,
		fingerTop,
		M.gold,
		M.gold,
		M.gold
	], -3.78, 0, z);
	const g = group(rounded([
		7.55,
		.1,
		2.2
	], .03, M.blackPcb, .22, 0, 0), fingers(1.4, .35), fingers(.5, -.8), box([
		1.5,
		.12,
		1.5
	], [
		M.chip,
		M.chip,
		mat("#ffffff", { map: chipTexture("EDU C1") }),
		M.chip,
		M.chip,
		M.chip
	], -2.3, .1, 0), box([
		.9,
		.1,
		.8
	], M.chip, -1, .1, .45), box([
		2,
		.14,
		1.7
	], M.chip, .6, .1, 0), box([
		2,
		.14,
		1.7
	], M.chip, 2.75, .1, 0), decal(4.5, 1.9, stickerTexture(["EDU SSD 1 ТБ", "NVMe · PCIe 4.0"], "#1f2328", "#e9ecef"), 1.65, .255, 0));
	const caps = [];
	for (let i = 0; i < 8; i++) caps.push([
		-3.2 + i % 2 * .25,
		.1,
		-.8 + Math.floor(i / 2) * .4
	]);
	g.add(boxes([
		.14,
		.07,
		.08
	], M.smdTan, caps));
	g.add(cylinder(.32, .105, M.gold, 4, 0, 0, 20), cylinder(.18, .11, M.chip, 4, 0, 0, 16));
	return g;
};
/** A plain box for parts later stages model properly (PSU, GPU, case, peripherals). */
var placeholder = () => group(rounded([
	4,
	2,
	4
], .2, M.darkMetal));
var model = (kind, placed) => {
	switch (kind) {
		case "cpu": return cpu();
		case "thermalPaste": return placed ? pasteBlob() : pasteSyringe();
		case "cooler": return cooler();
		case "fanCable": return fanPlug();
		case "ram": return ram();
		case "m2ssd": return m2ssd();
		default: return placeholder();
	}
};
/** The 3D model of a part. `placed` is the look once installed (thermal paste: the syringe becomes a blob). */
var buildPart = (kind, placed) => shadowed(model(kind, placed));
// src/scene/models.ts
/** The board as the grade 8 students leave the desk: CPU, cooler and its cable, two RAM modules, the SSD. */
var assembledBoard = () => {
	const slots = grade8DeskLayout.slots;
	const g = new Group();
	g.add(buildBoard(GRADE8_BOARD, grade8Club.slots, slots));
	for (const [kind, slot] of [
		["cpu", "cpuSocket"],
		["cooler", "coolerMount"],
		["fanCable", "cpuFan"],
		["ram", "dimmA2"],
		["ram", "dimmB2"],
		["m2ssd", "m2Slot"]
	]) {
		const pose = slots[slot];
		if (!pose) continue;
		const part = buildModel(kind, true);
		part.position.set(...pose.at);
		g.add(part);
	}
	const lever = grade8DeskLayout.lever;
	if (lever) {
		const l = buildLever(lever.length);
		l.position.set(...lever.pivot);
		g.add(l);
	}
	return g;
};
/** Kinds with a model of their own; the rest get a plain box for now. */
var MODELLED = /* @__PURE__ */ new Set([
	"motherboard",
	"cpu",
	"thermalPaste",
	"cooler",
	"fanCable",
	"ram",
	"m2ssd",
	"case",
	"psu",
	"gpu",
	"hdd",
	"atxCable",
	"cpuPowerCable",
	"gpuPowerCable",
	"sataPowerCable",
	"sataDataCable",
	"sidePanel",
	"monitor",
	"keyboard",
	"mouse",
	"speakers",
	"printer",
	"flashDrive",
	"monitorCable",
	"keyboardCable",
	"mouseCable",
	"psuPlug",
	"frontPanelCable",
	"frontAudioCable",
	"frontUsbCable"
]);
/**
* The model of a part in the scene. `placed` is its look once installed. A device's cable
* (monitorCable, keyboardCable, mouseCable) is its plug: that is what the student holds and plugs in.
*/
var buildModel = (kind, placed) => {
	const real = kind === "motherboard" || kind in DEVICES ? null : realModel(kind);
	if (real && PLACED_BY_FILE.has(kind)) return real;
	const code = codeModel(kind, placed);
	return real ? standIn(real, code) : code;
};
/**
* Puts a realistic model where the code-built one stands: the same footprint centre and the same
* bottom, so every slot pose fits it as it is. It keeps the code-built model's data (a plug's cable end).
*/
var standIn = (real, code) => {
	const want = new Box3().setFromObject(code);
	const have = new Box3().setFromObject(real);
	const a = want.getCenter(new Vector3());
	const b = have.getCenter(new Vector3());
	const model = real.children[0];
	model?.position.set(a.x - b.x, want.min.y - have.min.y, a.z - b.z);
	Object.assign(real.userData, code.userData);
	const screen = code.children.find((c) => c.userData.screen);
	if (screen && model) {
		screen.position.set(...REAL_SCREEN.at);
		screen.scale.set(REAL_SCREEN.size[0] / SCREEN_SIZE[0], REAL_SCREEN.size[1] / SCREEN_SIZE[1], 1);
		model.add(screen);
	}
	return real;
};
/** The realistic case is loaded: it is smaller than the code-built one (see REAL_CASE). */
var realCaseActive = () => hasRealModel("case");
/**
* The opening of the realistic case (Fractal Design Meshify C) in case coordinates: from its top (-x) to its
* bottom, the height of its open side, from its front (-z) to its back. Its back is where the code-built case's is.
*/
var REAL_CASE = {
	x: [-21.2, 21.5],
	top: 19.7,
	z: [-15.4, 22.5]
};
/** The side panel sized to the realistic case's open side: the slot pose stands at the code-built case's top. */
var fitToRealCase = (panel) => {
	const [x0, x1] = REAL_CASE.x;
	const [z0, z1] = REAL_CASE.z;
	panel.scale.set((x1 - x0) / CASE_SIZE[0], 1, (z1 - z0) / CASE_SIZE[2]);
	panel.position.set((x0 + x1) / 2, REAL_CASE.top - CASE_SIZE[1], (z0 + z1) / 2);
	const g = new Group();
	g.add(panel);
	return g;
};
/** The code-built monitor's picture, width and height (see `monitor` in devices.ts). */
var SCREEN_SIZE = [50.4, 28.6];
/** Where the glass of the realistic monitor is in its file: its middle and its size. */
var REAL_SCREEN = {
	at: [
		0,
		19.8,
		.42
	],
	size: [50.6, 24.8]
};
var codeModel = (kind, placed) => {
	switch (kind) {
		case "motherboard": return assembledBoard();
		case "case": return buildCase();
		case "psu": return shadowed(powerSupply());
		case "gpu": return shadowed(graphicsCard());
		case "hdd": return shadowed(hardDisk());
		case "atxCable": return shadowed(atxPlug());
		case "cpuPowerCable": return shadowed(eightPinPlug("CPU"));
		case "gpuPowerCable": return shadowed(eightPinPlug("PCIe"));
		case "sataPowerCable": return shadowed(sataPowerPlug());
		case "sataDataCable": return shadowed(sataDataPlug());
		case "sidePanel": return realCaseActive() ? fitToRealCase(sidePanel()) : sidePanel();
		case "psuPlug": return shadowed(psuPlug());
		case "frontPanelCable": return shadowed(headerPlug("panel"));
		case "frontAudioCable": return shadowed(headerPlug("audio"));
		case "frontUsbCable": return shadowed(headerPlug("usb"));
		case "monitorCable": return shadowed(hdmiPlug());
		case "keyboardCable": return shadowed(usbPlug(mat("#5b6169", { rough: .5 })));
		case "mouseCable": return shadowed(usbPlug(M.blackPlastic));
		case "monitor":
		case "keyboard":
		case "mouse":
		case "speakers":
		case "printer":
		case "flashDrive": return deviceModel(kind);
		default: return buildPart(kind, placed);
	}
};
var DEVICES = {
	monitor,
	keyboard,
	mouse,
	speakers,
	printer,
	flashDrive,
	smartphone,
	powerStrip
};
/** The device itself, for desk props, baskets and tray pictures. */
var deviceModel = (kind) => {
	const code = shadowed(DEVICES[kind]());
	const real = kind === "smartphone" || kind === "powerStrip" ? null : realModel(kind);
	return real ? standIn(real, code) : code;
};
/** The device a cable belongs to: its tray picture shows the device, so the student knows whose cable it is. */
var CABLE_OF = {
	monitorCable: "monitor",
	keyboardCable: "keyboard",
	mouseCable: "mouse"
};
/** The picture in the tray: the device for a device's cable, otherwise the part as held. */
var iconModel = (kind) => {
	const device = CABLE_OF[kind];
	return device ? deviceModel(device) : buildModel(kind, false);
};
/** Cable thickness and colour by the kind of plug. */
var CABLES = {
	atxCable: {
		r: .55,
		color: "#141518"
	},
	cpuPowerCable: {
		r: .32,
		color: "#141518"
	},
	gpuPowerCable: {
		r: .32,
		color: "#141518"
	},
	sataPowerCable: {
		r: .22,
		color: "#141518"
	},
	sataDataCable: {
		r: .14,
		color: "#c0392b"
	},
	fanCable: {
		r: .12,
		color: "#141518"
	},
	frontPanelCable: {
		r: .16,
		color: "#2b2d31"
	},
	frontAudioCable: {
		r: .16,
		color: "#141518"
	},
	frontUsbCable: {
		r: .3,
		color: "#1d3f8f"
	},
	monitorCable: {
		r: .3,
		color: "#1b1d21"
	},
	keyboardCable: {
		r: .2,
		color: "#3e434a"
	},
	mouseCable: {
		r: .18,
		color: "#1b1d21"
	}
};
/** How far a cable must go down to count as running to the desk. */
var DROP = 12;
var cableEnd = (plug) => {
	const out = plug.userData.cableOut;
	const dir = plug.userData.cableDir;
	if (!(out instanceof Vector3) || !(dir instanceof Vector3)) return null;
	plug.updateMatrix();
	const start = out.clone().applyMatrix4(plug.matrix);
	return {
		start,
		lead: start.clone().add(dir.clone().transformDirection(plug.matrix).multiplyScalar(2.5))
	};
};
/**
* A cable from a placed plug to where it comes from, sagging a little on the way. With `via` it passes those
* points (the grommets of the board tray); with `other` it ends in the plug on its other end.
*/
var cableTube = (plug, kind, to, via, other) => {
	const look = CABLES[kind];
	const end = cableEnd(plug);
	if (!look || !end) return null;
	const { start, lead } = end;
	const tail = other ? [other.lead, other.start] : [to];
	const target = tail[0] ?? to;
	let points;
	if (via.length > 0) points = [
		start,
		lead,
		...via,
		...tail
	];
	else if (start.y - to.y > DROP && !other) {
		const away = new Vector3(lead.x - start.x, 0, lead.z - start.z);
		if (away.lengthSq() > .01) away.setLength(3);
		const mid = new Vector3(lead.x + away.x, to.y + look.r, lead.z + away.z);
		points = [
			start,
			lead,
			mid,
			new Vector3((mid.x + to.x) / 2, to.y + look.r, (mid.z + to.z) / 2),
			to
		];
	} else points = [
		start,
		lead,
		new Vector3((lead.x + target.x) / 2, Math.max(start.y, target.y) + 2, (lead.z + target.z) / 2),
		...tail
	];
	const tube = new Mesh(new TubeGeometry(new CatmullRomCurve3(points), 96, look.r, 10), mat(look.color, { rough: .7 }));
	tube.castShadow = true;
	return tube;
};
/** Shrinks a model (never grows it) so its footprint fits an area, as a monitor in a sorting basket. */
var fitInto = (model, area) => {
	const size = new Box3().setFromObject(model).getSize(new Vector3());
	const k = Math.min(1, (area[0] - 1) / Math.max(size.x, .01), (area[2] - 1) / Math.max(size.z, .01));
	model.scale.setScalar(k);
};
var posed = (kind, pose, turn) => {
	const model = buildModel(kind, true);
	model.position.set(...pose.at);
	model.rotation.set(pose.pitch ?? 0, -turn * Math.PI / 2 + (pose.yaw ?? 0), pose.roll ?? 0, "YXZ");
	if (pose.fit) fitInto(model, pose.area);
	return model;
};
/** Where the cable leaves a plug standing in a slot: for drawing a cable that ends in it. */
var plugEnd = (kind, pose, turn) => cableEnd(posed(kind, pose, turn));
/**
* A part as it stands in its slot: moved there, turned, rolled, scaled, with its cable when it has one.
* `cable`: "own" draws the cable to where the pose says it comes from; a cable end draws it to the plug on
* the cable's other end; "none" draws no cable (the other end's cable is drawn with that end).
*/
var placedModel = (kind, pose, turn, cable = "own") => {
	const model = posed(kind, pose, turn);
	const g = new Group();
	g.add(model);
	const from = pose.cablesFrom?.[kind] ?? pose.cableFrom;
	if (cable !== "none" && (from || cable !== "own")) {
		const other = cable === "own" ? null : cable;
		const via = (pose.via ?? []).map((v) => new Vector3(...v));
		const tube = cableTube(model, kind, new Vector3(...from ?? [
			0,
			0,
			0
		]), via, other);
		if (tube) g.add(tube);
	}
	return g;
};
/**
* The finished computer from the grade 8 case scenario, without the graphics card, standing upright
* with its front to the student (see `standing`): the system unit of the grade 3–4 desk. The monitor goes into the board's HDMI.
*/
var systemUnit = () => {
	const inside = new Group();
	inside.add(buildModel("case", true));
	const skip = /* @__PURE__ */ new Set([
		"gpu",
		"pcie",
		"pcieEnd",
		"monitor",
		"keyboard",
		"mouse"
	]);
	for (const [slot, part] of Object.entries(SOLVED_CASE)) {
		const kind = grade8Case.parts.find((p) => p.id === part)?.kind;
		const pose = grade8CaseLayout.slots[slot];
		if (!kind || !pose || skip.has(part)) continue;
		const turn = grade8Case.slots.find((s) => s.id === slot)?.turn ?? 0;
		inside.add(placedModel(kind, pose, turn));
	}
	inside.rotation.z = -Math.PI / 2;
	inside.position.set(0, CASE_SIZE[0] / 2, 0);
	const g = new Group();
	g.add(inside);
	g.position.set(TOWER_AT[0], 0, TOWER_AT[2]);
	g.rotation.y = Math.PI;
	return g;
};
/** Where every part of the grade 8 case scenario ends up: the first allowed slot of each target. */
var SOLVED_CASE = Object.fromEntries(grade8Case.steps.flatMap((step) => step.kind === "place" ? Object.entries(step.targets).map(([part, slots]) => [slots[0] ?? "", part]) : []));
// src/scene/PcScene.ts
/** How high a cable hangs loose in the case while its second end is not plugged in yet. */
var CASE_LOOSE_Y = 1.6;
var CLICK_PX = 7;
var NARROW_PX = 700;
/** Camera distances from this far are looks at a wide area, which a narrow screen must fit across. */
var WIDE_SHOT = 60;
var WIDE_ASPECT = 1.3;
var HOLD_HEIGHT = 5;
var SPIN_PER_FRAME = .45;
var MARKER_COLOR = new Color("#e0185c");
var DONE_COLOR = new Color("#14874a");
var PACKET_COLOR = new Color("#ffd15c");
var PACKET_MS_PER_LEG = 700;
/** Width of a marker's label, in centimetres. */
var LABEL_W = 9;
var QUARTER = Math.PI / 2;
var LEVER_UP = 1.35;
var HINT_COLOR = new Color("#ffc247");
var ACCEPT_COLOR = new Color("#ffffff");
/** The slot under the pointer. */
var HOVER_COLOR = new Color("#ff6696");
/** How close two tags with the same name may stand on the screen before one hides: four USB ports get one tag. */
var SAME_TAG_PX = 56;
/** Tags that would cover each other go up a row, up to this many rows; the rest hide. */
var TAG_ROWS = 3;
var TAG_ROW_PX = 24;
var TAG_GAP_PX = 4;
/** The note by the pointer keeps this far from the pointer and from the edge of the view. */
var TIP_OFFSET_PX = 16;
var TIP_EDGE_PX = 8;
/** A part in hand stays this far in front of the model it would go into. */
var HOLD_GAP = 1.5;
/** Kinds that sit on a desk as a whole device: an opened box shows one of them. */
/** A fitted look never comes closer than this: a tiny part still shows a little of what is round it. */
var MIN_FIT = 26;
/** Only this share of the picture's width and height is used for what must fit: the step card covers its top. */
var FIT_PAD_H = .85;
var FIT_PAD_V = .6;
/** How much deeper than the farthest camera distance the camera still draws: the far side of the desk. */
var FAR_MARGIN = 300;
/**
* Keys that move the camera: W A S D fly it over the desk, the arrows turn and tilt it, + and − zoom.
* Codes match any keyboard layout.
*/
var KEY_MOVES = {
	KeyW: "forward",
	KeyS: "back",
	KeyA: "strafeLeft",
	KeyD: "strafeRight",
	ArrowLeft: "left",
	ArrowRight: "right",
	ArrowUp: "up",
	ArrowDown: "down",
	Equal: "in",
	NumpadAdd: "in",
	"+": "in",
	Minus: "out",
	NumpadSubtract: "out",
	"-": "out",
	PageUp: "in",
	PageDown: "out"
};
/** How fast the camera flies over the desk: this share of its distance from the point it looks at, a second. */
var FLY_SPEED = .9;
/** Radians a second the camera turns round and tilts while a key is held. */
var TURN_SPEED = 1.6;
var TILT_SPEED = 1;
/** How fast the camera closes in or backs off: the distance grows or shrinks e-fold in 1 / ZOOM_SPEED seconds. */
var ZOOM_SPEED = 1.2;
/** The camera never looks straight down: the view would spin round the vertical. */
var MIN_POLAR = .08;
var DEVICE_KINDS = /* @__PURE__ */ new Set([
	"monitor",
	"keyboard",
	"mouse",
	"speakers",
	"printer",
	"flashDrive"
]);
var BUTTON_FACE = new Vector3(-1, 0, 0);
/** The 3D bench: a desk, the board, placed parts, the part in hand. Knows nothing about steps or rules. */
var PcScene = class {
	host;
	scenario;
	layout;
	events;
	renderer;
	scene = new Scene();
	camera = new PerspectiveCamera(38, 1, .5, 400);
	controls;
	bench = new Group();
	benchModel;
	lever = null;
	buttons = [];
	propScreens = [];
	screens = [];
	boxes = [];
	/** Parts lying on the desk until they are taken: where each one lies and how big it is, for the camera. */
	loose = [];
	spinners = null;
	areas = [];
	placedMeshes = /* @__PURE__ */ new Map();
	heldMesh = null;
	ray = new Raycaster();
	pointer = new Vector2();
	holdHeight;
	holdPlane;
	holdAt;
	down = null;
	view = {
		placed: {},
		controls: {},
		inspected: [],
		held: null,
		hint: null,
		path: null
	};
	markers = new Group();
	markerKey = "";
	packet;
	leverAngle = 0;
	focusTarget = new Vector3();
	focusFrom = new Vector3();
	focusing = 0;
	/** Camera moves held down on the keyboard now. */
	keys = /* @__PURE__ */ new Set();
	lastFrame = 0;
	resize;
	/** Name tags of the slots, over the canvas, and the note by the pointer. */
	tagLayer;
	tags = /* @__PURE__ */ new Map();
	tip;
	hovered = null;
	hoverAt = null;
	allTags = false;
	constructor(host, scenario, layout, events, light = false) {
		this.host = host;
		this.scenario = scenario;
		this.layout = layout;
		this.events = events;
		this.holdHeight = layout.holdHeight ?? HOLD_HEIGHT;
		this.holdPlane = new Plane(new Vector3(0, 1, 0), -this.holdHeight);
		this.holdAt = new Vector3(0, this.holdHeight, 8);
		this.renderer = new WebGLRenderer({
			antialias: !light,
			powerPreference: light ? "low-power" : "default"
		});
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, light ? 1 : 2));
		this.renderer.outputColorSpace = SRGBColorSpace;
		this.renderer.toneMapping = ACESFilmicToneMapping;
		this.renderer.shadowMap.enabled = !light;
		this.renderer.shadowMap.type = PCFShadowMap;
		this.renderer.domElement.className = "edu-pc-canvas";
		host.appendChild(this.renderer.domElement);
		this.tagLayer = document.createElement("div");
		this.tagLayer.className = "edu-pc-tags";
		this.tagLayer.setAttribute("aria-hidden", "true");
		this.tip = document.createElement("div");
		this.tip.className = "edu-pc-tip";
		this.tip.hidden = true;
		this.tagLayer.appendChild(this.tip);
		host.appendChild(this.tagLayer);
		const pmrem = new PMREMGenerator(this.renderer);
		this.scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
		pmrem.dispose();
		this.scene.background = new Color("#30272e");
		this.scene.add(new HemisphereLight("#ffffff", "#5a4a3a", .6));
		const sun = new DirectionalLight("#ffffff", 1.6);
		sun.position.set(-20, 40, 25);
		if (!light) {
			sun.castShadow = true;
			sun.shadow.mapSize.set(2048, 2048);
			const reach = layout.bench === "board" ? 22 : Math.max(34, (layout.overview ?? 100) * .42, (layout.desk?.[0] ?? 0) / 2);
			Object.assign(sun.shadow.camera, {
				left: -reach,
				right: reach,
				top: reach,
				bottom: -reach,
				near: 10,
				far: 120
			});
			sun.shadow.bias = -5e-4;
			sun.shadow.normalBias = .03;
		}
		this.scene.add(sun);
		this.scene.add(buildDesk(layout.desk));
		this.bench.position.y = .05;
		this.scene.add(this.bench);
		this.benchModel = layout.bench === "case" ? buildModel("case", true) : layout.bench === "tower" ? systemUnit() : buildBoard(GRADE8_BOARD, scenario.slots, layout.slots);
		this.benchModel.userData.part = layout.benchPart;
		this.bench.add(this.benchModel);
		if (layout.lever) {
			const lever = buildLever(layout.lever.length);
			lever.position.set(...layout.lever.pivot);
			lever.userData.lever = true;
			this.bench.add(lever);
			this.lever = lever;
		}
		for (const pose of layout.buttons ?? []) {
			const button = new Group();
			button.add(powerButton());
			button.quaternion.setFromUnitVectors(BUTTON_FACE, new Vector3(...pose.normal).normalize());
			button.scale.setScalar(pose.size ?? 1);
			button.position.set(...pose.at);
			button.userData.control = pose.control;
			this.bench.add(button);
			this.buttons.push({
				control: pose.control,
				mesh: button,
				when: pose.when
			});
		}
		for (const c of layout.crates ?? []) {
			const basket = crate(c.label, c.colour);
			basket.position.set(...c.at);
			this.bench.add(basket);
		}
		for (const b of layout.boxes ?? []) this.addBox(b.part, b.at);
		for (const l of layout.loose ?? []) this.addLoose(l);
		this.bench.add(this.markers);
		this.packet = onTop(new Mesh(new SphereGeometry(.9, 20, 14), new MeshBasicMaterial({ color: PACKET_COLOR })));
		this.packet.visible = false;
		this.bench.add(this.packet);
		for (const prop of layout.props ?? []) {
			const device = deviceModel(prop.kind);
			device.position.set(...prop.at);
			device.rotation.y = prop.yaw ?? 0;
			this.propScreens.push(...screensOf(device));
			device.userData.prop = true;
			this.scene.add(device);
		}
		this.screens = [...this.propScreens];
		for (const slot of scenario.slots) this.addArea(slot.id, slot.accepts);
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enableDamping = true;
		this.controls.maxPolarAngle = Math.PI * .46;
		this.controls.minDistance = 10;
		this.controls.maxDistance = Math.max(140, (layout.overview ?? 40) * 2.5);
		this.camera.far = this.controls.maxDistance + FAR_MARGIN;
		this.camera.updateProjectionMatrix();
		const far = (layout.overview ?? 40) / 40;
		this.camera.position.set(0, 34 * far, 30 * far);
		this.controls.target.set(0, 0, 0);
		const el = this.renderer.domElement;
		el.addEventListener("pointerdown", this.onDown);
		el.addEventListener("pointermove", this.onMove);
		el.addEventListener("pointerup", this.onUp);
		el.addEventListener("pointerleave", this.onLeave);
		el.tabIndex = 0;
		el.setAttribute("aria-label", "Тривимірний стіл. W A S D переміщують камеру, стрілки повертають її, + і − наближають і віддаляють");
		el.addEventListener("keydown", this.onKeyDown);
		el.addEventListener("keyup", this.onKeyUp);
		el.addEventListener("blur", this.onBlur);
		this.resize = new ResizeObserver(() => this.fit());
		this.resize.observe(host);
		this.fit();
		this.renderer.setAnimationLoop(this.frame);
	}
	/** Shows a new view: placed parts, the lever, the part in hand and the highlighted slots. */
	update(view) {
		this.view = view;
		this.syncPlaced();
		this.syncHeld();
		this.syncDesk();
		this.syncPath();
	}
	/** Name tags over every slot (on), or only over the slots that matter now: the hint and where the part in hand fits (off). */
	showAllTags(on) {
		this.allTags = on;
	}
	/** Glides the camera to look at a point from a comfortable distance and direction; farther on a narrow screen. */
	focus(at, distance = 26, view = FRONT_VIEW, bounds, parts = []) {
		this.focusTarget.set(at[0], at[1], at[2]);
		const dir = new Vector3(...view).normalize();
		const box = new Box3();
		if (bounds) box.set(new Vector3(...bounds[0]), new Vector3(...bounds[1]));
		for (const part of parts) for (const obj of this.objectsOf(part)) box.union(new Box3().setFromObject(obj));
		if (!box.isEmpty()) box.getCenter(this.focusTarget);
		const far = box.isEmpty() ? distance * this.narrowFactor(distance) : Math.min(this.controls.maxDistance, Math.max(MIN_FIT, this.fitDistance(box, dir)));
		this.focusFrom = this.focusTarget.clone().addScaledVector(dir, far);
		this.focusing = 1;
	}
	/** The distance from the target at which every corner of the box is inside the picture, seen from this direction. */
	fitDistance(box, dir) {
		const right = new Vector3(0, 1, 0).cross(dir).normalize();
		if (right.lengthSq() === 0) right.set(1, 0, 0);
		const up = dir.clone().cross(right);
		const tan = Math.tan(this.camera.fov * Math.PI / 360);
		const tanV = tan * FIT_PAD_V;
		const tanH = tan * FIT_PAD_H * Math.max(.3, this.camera.aspect);
		let need = 0;
		for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
			const c = new Vector3(x, y, z).sub(this.focusTarget);
			const depth = c.dot(dir);
			need = Math.max(need, Math.abs(c.dot(right)) / tanH + depth, Math.abs(c.dot(up)) / tanV + depth);
		}
		return need;
	}
	/** What shows a part in the scene now: where it lies, its box, the device out of the box, or where it stands. */
	objectsOf(part) {
		const found = [];
		for (const l of this.loose) if (l.part === part && l.mesh.visible) found.push(l.mesh);
		for (const b of this.boxes) if (b.part === part) found.push(...[b.closed, b.open].filter((o) => o !== null && o.visible));
		const placed = this.placedMeshes.get(part);
		if (placed?.mesh.visible) found.push(placed.mesh);
		if (part === this.layout.benchPart) found.push(this.benchModel);
		return found;
	}
	/**
	* How much farther to stand on a narrow screen. Close looks need a little more room; a look at a
	* whole wide desk on a phone held upright needs enough to fit the desk's width.
	*/
	narrowFactor(distance) {
		if (this.host.clientWidth >= NARROW_PX) return 1;
		const aspect = Math.max(.3, this.host.clientWidth / Math.max(1, this.host.clientHeight));
		return distance < WIDE_SHOT ? 1.45 : Math.min(2.4, Math.max(1.45, WIDE_ASPECT / aspect));
	}
	screenPoint(target) {
		let p;
		if ("slot" in target) {
			const at = this.layout.slots[target.slot]?.at;
			if (!at) return null;
			p = this.bench.localToWorld(new Vector3(at[0], at[1] + .3, at[2]));
		} else if ("control" in target) {
			const button = this.layout.buttons?.find((b) => b.control === target.control);
			if (!button) return null;
			const face = new Vector3(...button.normal).normalize().multiplyScalar(.3);
			p = this.bench.localToWorld(new Vector3(...button.at).add(face));
		} else if ("stop" in target) {
			const at = this.layout.stops?.[target.stop];
			if (!at) return null;
			p = this.bench.localToWorld(new Vector3(...at));
		} else if ("box" in target) {
			const at = this.layout.boxes?.find((b) => b.part === target.box)?.at;
			if (!at) return null;
			p = this.bench.localToWorld(new Vector3(at[0], at[1] + 6, at[2]));
		} else {
			if (!this.lever || !this.layout.lever) return null;
			this.lever.updateMatrixWorld(true);
			p = this.lever.localToWorld(new Vector3(0, 0, -this.layout.lever.length / 2));
		}
		p.project(this.camera);
		const r = this.renderer.domElement.getBoundingClientRect();
		return {
			x: r.left + (p.x + 1) / 2 * r.width,
			y: r.top + (1 - p.y) / 2 * r.height
		};
	}
	/** Tray pictures of the given kinds, drawn from the scene's own models. */
	icons(kinds) {
		return renderIcons(this.renderer, this.scene.environment, kinds, (kind) => {
			if (kind === "motherboard" && this.layout.bench === "board") return buildBoard(GRADE8_BOARD, this.scenario.slots, this.layout.slots);
			if (kind === "case" && this.layout.bench === "tower") return systemUnit();
			return MODELLED.has(kind) ? iconModel(kind) : null;
		});
	}
	dispose() {
		this.renderer.setAnimationLoop(null);
		this.resize.disconnect();
		const el = this.renderer.domElement;
		el.removeEventListener("pointerdown", this.onDown);
		el.removeEventListener("pointermove", this.onMove);
		el.removeEventListener("pointerup", this.onUp);
		el.removeEventListener("pointerleave", this.onLeave);
		el.removeEventListener("keydown", this.onKeyDown);
		el.removeEventListener("keyup", this.onKeyUp);
		el.removeEventListener("blur", this.onBlur);
		this.tagLayer.remove();
		this.controls.dispose();
		this.scene.traverse((obj) => {
			if (obj instanceof Mesh || obj instanceof LineSegments) {
				obj.geometry.dispose();
				const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
				for (const m of materials) {
					if ("map" in m && m.map && typeof m.map === "object" && "dispose" in m.map) m.map.dispose();
					m.dispose();
				}
			}
		});
		this.noDisk?.dispose();
		this.scene.environment?.dispose();
		this.renderer.dispose();
		el.remove();
	}
	addArea(id, accepts) {
		const pose = this.layout.slots[id];
		if (!pose) return;
		const geometry = new BoxGeometry(...pose.area);
		const mesh = new Mesh(geometry, new MeshBasicMaterial({
			transparent: true,
			opacity: 0,
			depthWrite: false
		}));
		mesh.position.set(pose.at[0], pose.at[1] + pose.area[1] / 2 - .3, pose.at[2]);
		mesh.userData.slot = id;
		const edges = new LineSegments(new EdgesGeometry(geometry), new LineBasicMaterial({
			transparent: true,
			opacity: 0
		}));
		edges.position.copy(mesh.position);
		this.bench.add(mesh, edges);
		this.areas.push({
			id,
			mesh,
			edges,
			accepts
		});
		const tag = document.createElement("div");
		tag.className = "edu-pc-tag";
		tag.textContent = this.scenario.slots.find((s) => s.id === id)?.tag ?? this.slotLabel(id);
		tag.hidden = true;
		this.tagLayer.appendChild(tag);
		this.tags.set(id, tag);
	}
	slotLabel(id) {
		return this.scenario.slots.find((s) => s.id === id)?.label ?? id;
	}
	/** The parts of this scenario a slot takes, by name: what the note under the pointer says goes there. */
	takes(accepts) {
		return [...new Set(this.scenario.parts.filter((p) => accepts.includes(p.kind)).map((p) => p.name))].join(", ");
	}
	kindOf(partId) {
		return this.scenario.parts.find((p) => p.id === partId)?.kind;
	}
	syncPlaced() {
		const want = this.view.placed;
		const wanted = new Map(Object.entries(want).map(([slotId, placed]) => [slotId, this.placedLook(slotId, placed)]));
		for (const [partId, entry] of this.placedMeshes) if (want[entry.slot]?.part !== partId || wanted.get(entry.slot)?.key !== entry.key) {
			this.bench.remove(entry.mesh);
			this.placedMeshes.delete(partId);
		}
		for (const [slotId, placed] of Object.entries(want)) {
			if (this.placedMeshes.get(placed.part)?.slot === slotId) continue;
			const look = wanted.get(slotId);
			if (!look) continue;
			const mesh = look.build();
			mesh.userData.part = placed.part;
			this.bench.add(mesh);
			this.placedMeshes.set(placed.part, {
				slot: slotId,
				key: look.key,
				mesh
			});
		}
		for (const [partId, entry] of this.placedMeshes) entry.mesh.visible = this.view.held?.part !== partId;
		this.screens = [...this.propScreens, ...[...this.placedMeshes.values()].flatMap((p) => screensOf(p.mesh))];
		this.spinners = null;
	}
	/**
	* How a placed part looks, and a key that changes when that look does. A cable with a second end draws one
	* cable between its two plugs once both are in; until then it hangs loose by the socket it is going to.
	*/
	placedLook(slotId, placed) {
		const pose = this.layout.slots[slotId];
		const part = this.scenario.parts.find((p) => p.id === placed.part);
		if (!pose || !part) return null;
		const turnIn = (slot, turn) => this.scenario.slots.find((s) => s.id === slot)?.turn === void 0 ? 0 : turn;
		const turn = turnIn(slotId, placed.turn);
		const at = (partId) => Object.entries(this.view.placed).find(([, p]) => p.part === partId);
		if (part.end !== void 0 && at(part.end)) return {
			key: `${slotId}|joined`,
			build: () => placedModel(part.kind, pose, turn, "none")
		};
		const second = this.scenario.parts.find((p) => p.end === part.id);
		if (!second) return {
			key: slotId,
			build: () => placedModel(part.kind, pose, turn)
		};
		const there = at(second.id);
		const otherPose = there ? this.layout.slots[there[0]] : void 0;
		if (there && otherPose) {
			const end = plugEnd(second.kind, otherPose, turnIn(there[0], there[1].turn));
			return {
				key: `${slotId}|${there[0]}`,
				build: () => placedModel(part.kind, pose, turn, end ?? "own")
			};
		}
		const from = pose.cableFrom;
		const loose = from ? {
			...pose,
			cableFrom: [
				from[0] - 2,
				CASE_LOOSE_Y,
				from[2] - 5
			]
		} : pose;
		return {
			key: `${slotId}|loose`,
			build: () => placedModel(part.kind, loose, turn)
		};
	}
	/** A closed box on the desk, and the device it holds once opened. */
	addBox(part, at) {
		const kind = this.kindOf(part);
		const closed = cardboardBox(this.scenario.parts.find((p) => p.id === part)?.name ?? "");
		closed.position.set(...at);
		closed.userData.part = part;
		this.bench.add(closed);
		let open = null;
		if (kind && DEVICE_KINDS.has(kind)) {
			open = deviceModel(kind);
			open.position.set(...at);
			open.userData.part = part;
			open.visible = false;
			this.bench.add(open);
		}
		this.boxes.push({
			part,
			closed,
			open
		});
	}
	/** A part lying on the desk: its lowest point rests at the pose. */
	addLoose(pose) {
		const kind = this.scenario.parts.find((p) => p.id === pose.part)?.kind;
		if (!kind) return;
		const mesh = buildModel(kind, false);
		if (pose.flat) mesh.rotation.z = Math.PI / 2;
		mesh.rotation.y = pose.yaw ?? 0;
		mesh.updateMatrixWorld(true);
		const box = new Box3().setFromObject(mesh);
		mesh.position.set(pose.at[0], pose.at[1] - box.min.y, pose.at[2]);
		mesh.userData.part = pose.part;
		this.bench.add(mesh);
		const sphere = box.getBoundingSphere(new Sphere());
		const centre = sphere.center.add(mesh.position);
		this.loose.push({
			part: pose.part,
			mesh,
			centre,
			radius: sphere.radius
		});
	}
	/**
	* Flies the camera to a part the student reads about: where it lies on the desk, its box, the slot
	* it stands in, or the bench itself. False when the part is nowhere in the scene.
	*/
	showPart(part) {
		const objects = this.objectsOf(part);
		if (objects.length === 0) return false;
		const box = new Box3();
		for (const obj of objects) box.union(new Box3().setFromObject(obj));
		const centre = box.getCenter(new Vector3());
		const slot = Object.entries(this.view.placed).find(([, p]) => p.part === part)?.[0];
		const view = (slot ? this.layout.slots[slot]?.view : void 0) ?? FRONT_VIEW;
		this.focus([
			centre.x,
			centre.y,
			centre.z
		], 0, view, [box.min.toArray(), box.max.toArray()]);
		return true;
	}
	/** Markers of the data path: blue until tapped in turn, green once on the path, joined by arrows. */
	syncPath() {
		const path = this.view.path;
		const key = path ? `${path.stops.map((s) => s.id).join()}|${path.picked.join()}` : "";
		if (key === this.markerKey) return;
		this.markerKey = key;
		for (const child of [...this.markers.children]) {
			this.markers.remove(child);
			child.traverse((o) => {
				if (o instanceof Mesh || o instanceof Sprite) {
					o.geometry.dispose();
					const m = o.material;
					m.map?.dispose();
					m.dispose();
				}
			});
		}
		if (!path) return;
		for (const stop of path.stops) {
			const at = this.layout.stops?.[stop.id];
			if (!at) continue;
			const done = path.picked.includes(stop.id);
			const marker = new Group();
			marker.position.set(...at);
			marker.userData.stop = stop.id;
			marker.add(onTop(new Mesh(new SphereGeometry(1.1, 20, 14), new MeshBasicMaterial({ color: done ? DONE_COLOR : MARKER_COLOR }))));
			const label = onTop(new Sprite(new SpriteMaterial({ map: signTexture([stop.label], done ? "#116b3c" : "#ba0f4b", "#ffffff") })));
			label.scale.set(LABEL_W, LABEL_W / 4, 1);
			label.position.y = 2.6;
			marker.add(label);
			this.markers.add(marker);
		}
		const points = path.picked.flatMap((id) => {
			const at = this.layout.stops?.[id];
			return at ? [new Vector3(...at)] : [];
		});
		for (let i = 1; i < points.length; i++) {
			const from = points[i - 1];
			const to = points[i];
			if (from && to) this.markers.add(arrow(from, to));
		}
		this.pathPoints = points;
	}
	/** Boxes open once their part is read about; the device stands there until it is taken or placed. */
	syncDesk() {
		const placed = new Set(Object.values(this.view.placed).map((p) => p.part));
		for (const box of this.boxes) {
			const opened = this.view.inspected.includes(box.part);
			box.closed.visible = !opened;
			if (box.open) box.open.visible = opened && !placed.has(box.part) && this.view.held?.part !== box.part;
		}
		for (const l of this.loose) l.mesh.visible = !placed.has(l.part) && this.view.held?.part !== l.part;
		for (const button of this.buttons) button.mesh.visible = button.when === void 0 || this.view.placed[button.when] !== void 0;
	}
	syncHeld() {
		const held = this.view.held;
		if (this.heldMesh && this.heldMesh.part !== held?.part) {
			this.scene.remove(this.heldMesh.mesh);
			this.heldMesh = null;
		}
		if (held && !this.heldMesh) {
			const part = this.scenario.parts.find((p) => p.id === held.part);
			if (part) {
				const mesh = buildModel(part.kind, false);
				this.scene.add(mesh);
				const reach = new Box3().setFromObject(mesh).getBoundingSphere(new Sphere()).radius;
				this.heldMesh = {
					part: held.part,
					mesh,
					reach
				};
			}
		}
	}
	fit() {
		const w = Math.max(1, this.host.clientWidth);
		const h = Math.max(1, this.host.clientHeight);
		this.renderer.setSize(w, h, false);
		this.camera.aspect = w / h;
		this.camera.updateProjectionMatrix();
	}
	pathPoints = [];
	noDisk = null;
	/** A light runs along the laid path, over and over: the data on its way. */
	animatePath(time) {
		const pts = this.pathPoints;
		this.packet.visible = this.view.path !== null && pts.length > 1;
		if (!this.packet.visible) return;
		const legs = pts.length - 1;
		const t = (time / PACKET_MS_PER_LEG % legs + legs) % legs;
		const i = Math.floor(t);
		const a = pts[i];
		const b = pts[i + 1];
		if (a && b) this.packet.position.lerpVectors(a, b, t - i);
		const next = this.view.hint?.stop;
		for (const marker of this.markers.children) {
			if (marker.userData.stop === void 0) continue;
			const pulse = marker.userData.stop === next ? 1 + .25 * Math.sin(time / 200) : 1;
			marker.scale.setScalar(pulse);
		}
	}
	frame = (time) => {
		const pulse = .5 + .5 * Math.sin(time / 260);
		const held = this.view.held;
		const heldKind = held ? this.kindOf(held.part) : void 0;
		const hintSlots = new Set(this.view.hint?.slots ?? []);
		for (const area of this.areas) {
			const accepts = heldKind !== void 0 && area.accepts.includes(heldKind);
			const hinted = hintSlots.has(area.id) && (held === null || accepts);
			const hover = this.hovered === area.id;
			const fill = area.mesh.material;
			const line = area.edges.material;
			fill.color.copy(hover ? HOVER_COLOR : hinted ? HINT_COLOR : ACCEPT_COLOR);
			line.color.copy(fill.color);
			fill.opacity = hover ? .28 : hinted ? .12 + .18 * pulse : accepts ? .06 : 0;
			line.opacity = hover ? 1 : hinted ? .5 + .5 * pulse : accepts ? .35 : 0;
		}
		if (this.lever && this.layout.lever) {
			const up = this.view.controls[this.layout.lever.control] === this.layout.lever.upValue;
			this.leverAngle += ((up ? LEVER_UP : 0) - this.leverAngle) * .15;
			this.lever.rotation.x = this.leverAngle;
			const next = this.view.hint?.control?.id === this.layout.lever.control && !held;
			this.lever.traverse((obj) => {
				if (obj instanceof Mesh && obj.material instanceof MeshStandardMaterial) {
					obj.material.emissive.copy(HINT_COLOR);
					obj.material.emissiveIntensity = next ? .25 + .5 * pulse : 0;
				}
			});
		}
		this.animateButtons(pulse);
		this.animatePath(time);
		this.animatePower();
		if (this.heldMesh && held) {
			const m = this.heldMesh.mesh;
			m.position.lerp(this.holdAt, .35);
			m.position.y = this.holdAt.y + Math.sin(time / 400) * .15;
			m.rotation.y += (-held.turn * QUARTER - m.rotation.y) * .25;
		}
		this.steer(time);
		if (this.focusing > 0) {
			this.controls.target.lerp(this.focusTarget, .08);
			this.camera.position.lerp(this.focusFrom, .08);
			this.focusing = this.camera.position.distanceTo(this.focusFrom) > .05 ? 1 : 0;
		}
		this.controls.update();
		this.renderer.render(this.scene, this.camera);
		this.syncTags(hintSlots, heldKind);
	};
	/**
	* Name tags over the slots: where the part in hand fits, the next target, the slot under the pointer, or
	* every slot when the student asks. A tag with the same name close by on the screen stays hidden.
	*/
	syncTags(hintSlots, heldKind) {
		const w = this.renderer.domElement.clientWidth;
		const h = this.renderer.domElement.clientHeight;
		const p = new Vector3();
		const wanted = [];
		for (const area of this.areas) {
			const tag = this.tags.get(area.id);
			const pose = this.layout.slots[area.id];
			if (!tag || !pose) continue;
			const occupant = this.view.placed[area.id]?.part;
			const free = occupant === void 0 || occupant === this.view.held?.part;
			const fits = heldKind !== void 0 && area.accepts.includes(heldKind) && free;
			const hover = this.hovered === area.id;
			const hint = hintSlots.has(area.id);
			const want = hover || fits || heldKind === void 0 && (hint || this.allTags && free);
			p.set(pose.at[0], pose.at[1] + pose.area[1] - .3, pose.at[2]);
			this.bench.localToWorld(p);
			p.project(this.camera);
			const x = (p.x + 1) / 2 * w;
			const y = (1 - p.y) / 2 * h;
			const onScreen = p.z < 1 && x > -40 && x < w + 40 && y > -20 && y < h + 20;
			if (!want || !onScreen) {
				tag.hidden = true;
				continue;
			}
			wanted.push({
				id: area.id,
				tag,
				x,
				y,
				rank: hover ? 0 : fits || hint ? 1 : 2,
				fits,
				...pose.group ? { group: pose.group } : {}
			});
		}
		wanted.sort((a, b) => a.rank - b.rank);
		const placed = [];
		for (const item of wanted) {
			const { tag, x, y } = item;
			const text = tag.textContent ?? "";
			const sameGroup = (o) => item.group !== void 0 && o.group === item.group && o.text === text;
			if (item.rank > 0 && placed.some((o) => sameGroup(o) || o.text === text && Math.hypot(o.x - x, o.y - y) < SAME_TAG_PX)) {
				tag.hidden = true;
				continue;
			}
			tag.hidden = false;
			const width = Number(tag.dataset.width) || tag.offsetWidth;
			tag.dataset.width = String(width);
			const left = x - width / 2 - TAG_GAP_PX;
			const right = x + width / 2 + TAG_GAP_PX;
			const row = [...Array(TAG_ROWS).keys()].find((r) => !placed.some((o) => o.row === r && Math.abs(o.y - y) < TAG_ROW_PX && o.left < right && left < o.right));
			if (row === void 0) {
				tag.hidden = true;
				continue;
			}
			placed.push({
				text,
				x,
				y,
				left,
				right,
				row,
				...item.group ? { group: item.group } : {}
			});
			tag.style.transform = `translate(${x.toFixed(1)}px, ${(y - row * TAG_ROW_PX).toFixed(1)}px) translate(-50%, -100%)`;
			tag.classList.toggle("is-raised", row > 0);
			tag.classList.toggle("is-fit", item.fits);
			tag.classList.toggle("is-hint", hintSlots.has(item.id) && !item.fits);
			tag.classList.toggle("is-hover", this.hovered === item.id);
		}
		this.syncTip(heldKind, w, h);
	}
	/** The note by the pointer: the slot's name, what goes there and whether the part in hand fits. */
	syncTip(heldKind, w, h) {
		const area = this.areas.find((a) => a.id === this.hovered);
		if (!area || !this.hoverAt) {
			this.tip.hidden = true;
			return;
		}
		const occupant = this.view.placed[area.id]?.part;
		const taken = occupant !== void 0 && occupant !== this.view.held?.part;
		const fits = heldKind !== void 0 && area.accepts.includes(heldKind);
		const verdict = heldKind === void 0 ? "" : taken ? "Тут уже стоїть деталь" : fits ? "Сюди підходить те, що в руці" : "Те, що в руці, сюди не підходить";
		const key = `${area.id}|${verdict}`;
		if (this.tip.dataset.key !== key) {
			this.tip.dataset.key = key;
			this.tip.replaceChildren();
			const name = document.createElement("b");
			name.textContent = this.slotLabel(area.id);
			this.tip.appendChild(name);
			const what = this.takes(area.accepts);
			if (what) {
				const line = document.createElement("span");
				line.textContent = `Для: ${what}`;
				this.tip.appendChild(line);
			}
			if (verdict) {
				const line = document.createElement("span");
				line.className = fits && !taken ? "is-yes" : "is-no";
				line.textContent = verdict;
				this.tip.appendChild(line);
			}
		}
		this.tip.hidden = false;
		const tw = this.tip.offsetWidth;
		const th = this.tip.offsetHeight;
		const right = this.hoverAt.x + TIP_OFFSET_PX;
		const below = this.hoverAt.y + TIP_OFFSET_PX;
		const x = right + tw + TIP_EDGE_PX > w ? Math.max(TIP_EDGE_PX, this.hoverAt.x - TIP_OFFSET_PX - tw) : right;
		const y = below + th + TIP_EDGE_PX > h ? Math.max(TIP_EDGE_PX, this.hoverAt.y - TIP_OFFSET_PX - th) : below;
		this.tip.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px)`;
	}
	poweredOn() {
		const power = this.layout.power;
		if (power === void 0 || this.view.controls[power.control] !== power.on) return false;
		return Object.entries(power.requires ?? {}).every(([control, value]) => this.view.controls[control] === value);
	}
	/** What the screen shows with the power on: the desktop, nothing, or «disk not found» when a needed part is missing. */
	picture() {
		const missing = (this.layout.power?.needs ?? []).filter((n) => this.view.placed[n.slot] === void 0);
		if (missing.some((n) => n.screen === "dark")) return "dark";
		return missing.length > 0 ? "noDisk" : "desktop";
	}
	/** The screen shows its picture when the computer is on, and the monitor too when it has its own button. */
	screenOn() {
		const screen = this.layout.power?.screen;
		return this.poweredOn() && (screen === void 0 || this.view.controls[screen.control] === screen.on) && this.picture() !== "dark";
	}
	/** A button glows when pressing it is the next thing to do; its light ring shines once the computer is on. */
	animateButtons(pulse) {
		const on = this.poweredOn();
		for (const { control, mesh } of this.buttons) {
			const next = this.view.hint?.control?.id === control && !this.view.held;
			mesh.traverse((obj) => {
				if (!(obj instanceof Mesh) || !(obj.material instanceof MeshStandardMaterial)) return;
				if (obj.userData.light) obj.material.emissiveIntensity = on ? 1.4 : next ? .3 + .6 * pulse : 0;
				else {
					obj.material.emissive.copy(HINT_COLOR);
					obj.material.emissiveIntensity = next ? .2 + .5 * pulse : 0;
				}
			});
		}
	}
	/** With the power on, fans spin and the monitor shows its picture. */
	animatePower() {
		const on = this.poweredOn();
		const lit = this.screenOn() ? 1 : 0;
		const map = this.picture() === "noDisk" ? this.noDisk ??= noDiskTexture() : null;
		for (const screen of this.screens) {
			screen.userData.desktop ??= screen.emissiveMap;
			const want = map ?? screen.userData.desktop;
			if (screen.emissiveMap !== want) {
				screen.emissiveMap = want;
				screen.needsUpdate = true;
			}
		}
		for (const screen of this.screens) screen.emissiveIntensity += (lit - screen.emissiveIntensity) * .06;
		if (!on) return;
		if (!this.spinners) {
			const found = [];
			this.bench.traverse((o) => {
				if (o.userData.spin) found.push(o);
			});
			this.spinners = found;
		}
		for (const rotor of this.spinners) rotor.rotation.y += SPIN_PER_FRAME;
	}
	/** A tap on a full spot of a basket (or a taken USB port) means the basket: the first free spot of its group. */
	freeInGroup(slot) {
		if (typeof slot !== "string") return slot;
		const group = this.layout.slots[slot]?.group;
		const occupant = this.view.placed[slot]?.part;
		if (!group || occupant === void 0 || occupant === this.view.held?.part) return slot;
		return Object.entries(this.layout.slots).find(([id, pose]) => pose.group === group && this.view.placed[id] === void 0)?.[0] ?? slot;
	}
	/**
	* The slot area the ray points at. Areas overlap: the socket, the paste and the cooler share one spot, and
	* seen at an angle a tall RAM slot's box covers its neighbour. Prefer areas that take the held part, then
	* the one whose centre is closest to the ray, so a tap lands on the slot the student aimed at.
	*/
	slotHit() {
		const heldKind = this.view.held ? this.kindOf(this.view.held.part) : void 0;
		const fits = (id) => this.areas.some((a) => a.id === id && heldKind !== void 0 && a.accepts.includes(heldKind));
		const open = this.areas.filter((a) => !this.layout.slots[a.id]?.cover || fits(a.id));
		const hits = this.ray.intersectObjects(open.map((a) => a.mesh), false);
		const candidates = hits.some((h) => fits(h.object.userData.slot)) ? hits.filter((h) => fits(h.object.userData.slot)) : hits;
		const centre = new Vector3();
		const off = (h) => this.ray.ray.distanceToPoint(h.object.getWorldPosition(centre));
		return candidates.reduce((best, h) => !best || off(h) < off(best) ? h : best, void 0);
	}
	/**
	* Where the part in hand floats: over the desk at the hold height, but in front of a model the pointer
	* is on that rises above it, so a cable held at the standing system unit does not go into it.
	*/
	moveHeld() {
		const onPlane = this.ray.ray.intersectPlane(this.holdPlane, new Vector3());
		const solid = [this.benchModel, ...this.scene.children.filter((o) => o.userData.prop === true)];
		const hit = this.ray.intersectObjects(solid, true).find((h) => h.object.visible);
		const reach = onPlane ? this.ray.ray.origin.distanceTo(onPlane) : Infinity;
		const gap = HOLD_GAP + (this.heldMesh?.reach ?? 0);
		if (hit && hit.distance < reach) this.holdAt.copy(this.ray.ray.at(Math.max(0, hit.distance - gap), new Vector3()));
		else if (onPlane) this.holdAt.copy(onPlane);
	}
	setPointer(e) {
		const r = this.renderer.domElement.getBoundingClientRect();
		this.pointer.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
		this.ray.setFromCamera(this.pointer, this.camera);
	}
	onDown = (e) => {
		this.down = {
			x: e.clientX,
			y: e.clientY
		};
		this.renderer.domElement.focus({ preventScroll: true });
	};
	onKeyDown = (e) => {
		if (e.altKey || e.ctrlKey || e.metaKey) return;
		const move = KEY_MOVES[e.code] ?? KEY_MOVES[e.key];
		if (!move) return;
		e.preventDefault();
		this.keys.add(move);
	};
	onKeyUp = (e) => {
		const move = KEY_MOVES[e.code] ?? KEY_MOVES[e.key];
		if (move) this.keys.delete(move);
	};
	onBlur = () => {
		this.keys.clear();
	};
	/** While keys are held: flies the camera over the desk, turns and tilts it round the point it looks at, zooms. */
	steer(time) {
		const dt = Math.min(.1, Math.max(0, (time - this.lastFrame) / 1e3));
		this.lastFrame = time;
		if (this.keys.size === 0 || dt === 0) return;
		this.focusing = 0;
		const k = this.keys;
		const offset = this.camera.position.clone().sub(this.controls.target);
		const s = new Spherical().setFromVector3(offset);
		s.theta += ((k.has("left") ? 1 : 0) - (k.has("right") ? 1 : 0)) * TURN_SPEED * dt;
		s.phi += ((k.has("down") ? 1 : 0) - (k.has("up") ? 1 : 0)) * TILT_SPEED * dt;
		s.phi = Math.min(this.controls.maxPolarAngle, Math.max(MIN_POLAR, s.phi));
		const zoom = (k.has("out") ? 1 : 0) - (k.has("in") ? 1 : 0);
		s.radius = Math.min(this.controls.maxDistance, Math.max(this.controls.minDistance, s.radius * Math.exp(zoom * ZOOM_SPEED * dt)));
		const ahead = (k.has("forward") ? 1 : 0) - (k.has("back") ? 1 : 0);
		const aside = (k.has("strafeRight") ? 1 : 0) - (k.has("strafeLeft") ? 1 : 0);
		if (ahead !== 0 || aside !== 0) {
			const forward = new Vector3(-offset.x, 0, -offset.z).normalize();
			const right = new Vector3(-forward.z, 0, forward.x);
			const step = forward.multiplyScalar(ahead).add(right.multiplyScalar(aside)).normalize().multiplyScalar(s.radius * FLY_SPEED * dt);
			const target = this.controls.target;
			const [w, d] = this.layout.desk ?? DESK_SIZE;
			target.x = Math.min(w / 2, Math.max(-w / 2, target.x + step.x));
			target.z = Math.min(d / 2, Math.max(-d / 2, target.z + step.z));
		}
		this.camera.position.copy(this.controls.target).add(new Vector3().setFromSpherical(s));
	}
	onMove = (e) => {
		if (this.down && Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > CLICK_PX) this.focusing = 0;
		this.setPointer(e);
		const slot = (e.pointerType === "touch" || this.down ? void 0 : this.slotHit())?.object.userData.slot;
		this.hovered = typeof slot === "string" ? slot : null;
		const r = this.renderer.domElement.getBoundingClientRect();
		this.hoverAt = this.hovered ? {
			x: e.clientX - r.left,
			y: e.clientY - r.top
		} : null;
		this.renderer.domElement.style.cursor = this.hovered && this.view.held ? "pointer" : "";
		if (this.view.held) this.moveHeld();
	};
	onLeave = () => {
		this.hovered = null;
		this.hoverAt = null;
	};
	onUp = (e) => {
		const down = this.down;
		this.down = null;
		if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > CLICK_PX) return;
		this.setPointer(e);
		if (this.view.held) {
			const hit = this.slotHit();
			const slot = this.freeInGroup(hit?.object.userData.slot);
			if (typeof slot === "string") {
				if (hit) this.holdAt.copy(hit.point);
				this.events.onSlot(slot);
			}
			return;
		}
		const marker = this.ray.intersectObjects(this.markers.children, true)[0];
		for (let obj = marker?.object ?? null; obj; obj = obj.parent) if (typeof obj.userData.stop === "string") return this.events.onStop(obj.userData.stop);
		const targets = [
			...this.buttons.map((b) => b.mesh),
			...[...this.placedMeshes.values()].map((p) => p.mesh),
			...this.boxes.flatMap((b) => b.open ? [b.closed, b.open] : [b.closed]),
			...this.loose.map((l) => l.mesh),
			this.benchModel
		].filter((o) => o.visible);
		if (this.lever) targets.unshift(this.lever);
		const hit = this.ray.intersectObjects(targets, true)[0];
		for (let obj = hit?.object ?? null; obj; obj = obj.parent) {
			if (obj.userData.lever && this.layout.lever) return this.events.onControl(this.layout.lever.control);
			if (typeof obj.userData.control === "string") return this.events.onControl(obj.userData.control);
			if (typeof obj.userData.part === "string") return this.events.onInspect(obj.userData.part);
		}
	};
};
/** Screen materials in a model: the monitor's picture, lit when the computer is on. */
var screensOf = (model) => {
	const found = [];
	model.traverse((o) => {
		if (o instanceof Mesh && o.userData.screen && o.material instanceof MeshStandardMaterial) found.push(o.material);
	});
	return found;
};
/** Drawn after everything and through it: a marker must stay visible inside the case and behind the glass. */
var onTop = (o) => {
	const m = o.material;
	m.depthTest = false;
	m.transparent = true;
	o.renderOrder = 10;
	return o;
};
/** An arrow from one stop to the next: a thin tube and a cone at its end. */
var arrow = (from, to) => {
	const g = new Group();
	const dir = to.clone().sub(from);
	const length = dir.length();
	const material = () => new MeshBasicMaterial({ color: DONE_COLOR });
	const shaft = onTop(new Mesh(new CylinderGeometry(.28, .28, Math.max(.1, length - 3.4), 10), material()));
	shaft.position.y = (length - 3.4) / 2 + 1.1;
	const head = onTop(new Mesh(new ConeGeometry(.8, 2, 14), material()));
	head.position.y = length - 1.1 - 1;
	g.add(shaft, head);
	g.position.copy(from);
	g.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize());
	return g;
};
export { PcScene, preloadModels };
