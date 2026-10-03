/**
 * Arcade Bongo Cat for OBS: GuileKeys GK-18 edition.
 * One on-screen key per physical key (18 total), a paw pose for each, and a talking face.
 *
 * Every key below is wired to the OUTPUT the controller sends, not to the physical key.
 * That is how M1, M2 and M3 work: whatever button you set them to in the GK-18 menu,
 * write that button's name in their "input" line, for example "share" or "ps".
 * Names (same meaning in every layout, the page works out the numbers):
 *   square cross circle triangle l1 r1 l2 r2 l3 r3 share options ps touchpad up down left right
 * Other things a key can be wired to (use these when a name isn't enough):
 *     { button: 10 }            gamepad button number
 *     { hat: "up" }             D-pad direction (up / down / left / right) read from the hat axis
 *     { axis: 0, dir: "-" }     a stick axis pushed past the threshold ("-" or "+")
 *     [ "l3", { button: 14 } ]  a list: lit when any of them is active
 *     null                      not wired, never lights
 *
 * Nothing moves? Add ?debug=1 to the address. A panel on the picture then shows what the
 * browser source can see: whether it has focus, which gamepads it found, which buttons
 * are held, and which keys are lit. (Press a button on the controller first.)
 *
 * URL options (add after the file name, join with &):
 *   ?debug=1            show the diagnostics panel and log to the console
 *   ?pad=gp2040         use the gamepad whose name contains this text
 *   ?profile=raw        read button numbers as "raw" or "standard" instead of auto-detecting
 *   ?mic=0              turn the talking face off
 *   ?micThreshold=0.05  how loud you must be to count as talking
 *   ?micDevice=name     use the microphone whose name contains this text
 */

// ======================= SETTINGS =======================

const ART = "bongo/img/gk18/"; // folder with bg.png, talk.png, light_*.png, arm_*.png

// "raw" layout: D-pad is a hat switch on this axis (axis 9 on this board).
const hatAxis = 9;

// How far a stick axis must move to count as pressed (0-1), for { axis, dir } inputs.
const axisThreshold = 0.5;

// Which gamepad to use when several are connected (part of its name). "" = the first one.
let padName = "";

// "auto" = decide from what the browser reports; or force "raw" / "standard".
let profileOverride = "auto";

// Button names -> what the browser calls them. Browsers describe the same controller in
// one of two ways, and OBS may use a different one than a normal browser did:
//   raw      the board's own button order (this is what you saw in html5gamepad)
//   standard the generic layout (also what you get if Steam Input or a driver wraps it)
const OUTPUTS = {
  raw: {
    square: { button: 0 }, cross: { button: 1 }, circle: { button: 2 }, triangle: { button: 3 },
    l1: { button: 4 }, r1: { button: 5 }, l2: { button: 6 }, r2: { button: 7 },
    share: { button: 8 }, options: { button: 9 }, l3: { button: 10 }, r3: { button: 11 },
    ps: { button: 12 }, touchpad: { button: 13 },
    up: { hat: "up" }, down: { hat: "down" }, left: { hat: "left" }, right: { hat: "right" },
  },
  standard: {
    cross: { button: 0 }, circle: { button: 1 }, square: { button: 2 }, triangle: { button: 3 },
    l1: { button: 4 }, r1: { button: 5 }, l2: { button: 6 }, r2: { button: 7 },
    share: { button: 8 }, options: { button: 9 }, l3: { button: 10 }, r3: { button: 11 },
    up: { button: 12 }, down: { button: 13 }, left: { button: 14 }, right: { button: 15 },
    ps: { button: 16 }, touchpad: { button: 17 },
  },
};

// hand: which paw reaches the key. "L" = the paw on the right side of the picture
// (movement side), "R" = the paw on the left side of the picture (face-button side).
// If two keys of the same hand are held, the paw goes to the first one in this list.
const KEYS = [
  // ---- left hand ----
  { id: "l3",       hand: "L", input: { hat: "left" } },
  { id: "left",     hand: "L", input: { hat: "down" } },
  { id: "down",     hand: "L", input: { hat: "right" } },
  { id: "right",    hand: "L", input:  { hat: "left" } },
  // The GK-18 has two Up keys (thumb key + the extra "UP" key above Down). Both send D-pad
  // Up, so the page can't tell them apart: both light up. Set "upkey" to null to light
  // only the thumb key.
  { id: "up",       hand: "L", input: { hat: "up" } },
  { id: "upkey",    hand: "L", input: { button: 10 } },
  // M1: set this to whatever you assigned M1 to in the GK-18 menu.
  { id: "m1",       hand: "L", input: { hat: "left" } },

  // ---- right hand ----
  { id: "square",   hand: "R", input: { button: 0 } },
  { id: "cross",    hand: "R", input: { button: 1 } },
  { id: "triangle", hand: "R", input: { button: 3 } },
  { id: "circle",   hand: "R", input: { button: 2 } },
  { id: "r1",       hand: "R", input: { button: 5 } },
  { id: "r2",       hand: "R", input: { button: 7 } },
  { id: "l1",       hand: "R", input: { button: 4 } },
  { id: "l2",       hand: "R", input: { button: 6 } },
  { id: "rs",       hand: "R", input: null }, // R3
  // M2 and M3: set these to whatever you assigned them to in the GK-18 menu.
  { id: "m2",       hand: "R", input: { hat: "right" } },
  { id: "m3",       hand: "R", input: { button: 11 } },
];

// ---- Talking face ----
const mic = {
  enabled: true,
  threshold: 0.03, // volume (0-1) above which you count as talking
  holdMs: 250, // keep the talking face this long after you go quiet
  deviceName: "", // part of a mic name; empty = system default mic
};

// ======================= LOGIC =======================
// DO NOT EDIT BEYOND THIS POINT IF YOU DON'T KNOW WHAT YOU'RE DOING

const params = new URLSearchParams(window.location.search);
if (params.get("mic") === "0") mic.enabled = false;
if (params.has("micThreshold")) mic.threshold = Number(params.get("micThreshold")) || mic.threshold;
if (params.has("micDevice")) mic.deviceName = params.get("micDevice");
if (params.has("pad")) padName = params.get("pad");
if (params.has("profile")) profileOverride = params.get("profile");
const debug = params.get("debug") === "1";

const $ = (id) => document.getElementById(id);
const show = (el, visible) => {
  if (el) el.classList.toggle("invisible", !visible);
};

// ---- Build the layers (order = stacking order: lights under paws) ----
function addImage(parent, file, id) {
  const img = document.createElement("img");
  img.id = id;
  img.alt = "";
  img.className = "invisible";
  img.src = ART + file;
  parent.appendChild(img);
  return img;
}

const lightsEl = $("lights");
const pawsEl = { L: $("leftPaws"), R: $("rightPaws") };
const idle = { L: $("leftIdle"), R: $("rightIdle") };
const talkLayer = $("fondoTalk");

const keys = KEYS.map((k) => ({
  ...k,
  light: addImage(lightsEl, "light_" + k.id + ".png", "light_" + k.id),
  paw: addImage(pawsEl[k.hand], "arm_" + k.id + ".png", "arm_" + k.id),
}));

// ---- Input ----
const isPressed = (b) => (b && typeof b === "object" ? b.pressed : b === 1);

const profileOf = (gp) =>
  OUTPUTS[profileOverride] ? profileOverride : gp.mapping === "standard" ? "standard" : "raw";

// Turn a button name into a { button } / { hat } input for the layout in use.
const warned = new Set();
function resolve(input, profile) {
  if (typeof input === "string") {
    const found = OUTPUTS[profile][input];
    if (!found && !warned.has(input)) {
      warned.add(input);
      console.warn('Unknown button name "' + input + '" (see the list at the top of the file)');
    }
    return found || null;
  }
  if (Array.isArray(input)) return input.map((i) => resolve(i, profile));
  return input;
}

// Hat switch values (8 directions, released ~1.286), in order of index 0-7
const HAT_DIRECTIONS = [
  ["up"],
  ["up", "right"],
  ["right"],
  ["down", "right"],
  ["down"],
  ["down", "left"],
  ["left"],
  ["up", "left"],
];

function readHat(gp) {
  const value = hatAxis >= 0 ? gp.axes[hatAxis] : undefined;
  if (value === undefined) return [];
  return HAT_DIRECTIONS[Math.round(((value + 1) * 7) / 2)] || [];
}

function isActive(input, gp, hat) {
  if (!input) return false;
  if (Array.isArray(input)) return input.some((i) => isActive(i, gp, hat));
  if (input.button !== undefined) return isPressed(gp.buttons[input.button]);
  if (input.hat) return hat.includes(input.hat);
  if (input.axis !== undefined) {
    const v = gp.axes[input.axis] ?? 0;
    return input.dir === "+" ? v > axisThreshold : v < -axisThreshold;
  }
  return false;
}

const readInput = (gp) => {
  const hat = readHat(gp);
  const profile = profileOf(gp);
  const inputs = keys.map((k) => resolve(k.input, profile));
  const pressed = inputs.map((input) => isActive(input, gp, hat));

  // Some boards report every button as pressed while starting up: ignore that.
  // (Only plain button keys count; the D-pad and axes can't all be "pressed" at once.)
  const isButton = inputs.map((input) => input && input.button !== undefined);
  const allPressed = isButton.some(Boolean) && pressed.every((p, i) => p || !isButton[i]);
  return allPressed ? NO_INPUT : pressed;
};

const NO_INPUT = keys.map(() => false);

// ---- Drawing ----
function render(pressed) {
  keys.forEach((k, i) => show(k.light, pressed[i]));

  for (const hand of ["L", "R"]) {
    const first = keys.findIndex((k, i) => k.hand === hand && pressed[i]);
    keys.forEach((k, i) => {
      if (k.hand === hand) show(k.paw, i === first);
    });
    show(idle[hand], first === -1);
  }
}

// ---- Gamepad loop ----
const allGamepads = () => Array.from(navigator.getGamepads?.() ?? []).filter(Boolean);
const getGamepad = () => {
  const pads = allGamepads();
  const wanted = padName.toLowerCase();
  return (wanted && pads.find((p) => p.id.toLowerCase().includes(wanted))) || pads[0];
};

let frameId = null;
let lastDebug = "";

function loop() {
  const gp = getGamepad();
  if (gp) {
    const pressed = readInput(gp);
    render(pressed);
    if (debug) {
      const held = gp.buttons.map((b, i) => (isPressed(b) ? i : null)).filter((i) => i !== null);
      const lit = keys.filter((k, i) => pressed[i]).map((k) => k.id);
      const snapshot = "buttons " + JSON.stringify(held) + " | hat " + gp.axes[hatAxis] + " | keys " + lit.join(",");
      if (snapshot !== lastDebug) console.log(snapshot);
      lastDebug = snapshot;
    }
  }
  frameId = requestAnimationFrame(loop);
}

function startLoop(gp) {
  if (frameId !== null) return;
  console.log(
    "Gamepad connected at index " + gp.index + ": " + gp.id +
      ". It has " + gp.buttons.length + " buttons and " + gp.axes.length + " axes."
  );
  loop();
}

window.addEventListener("gamepadconnected", (e) => startLoop(e.gamepad));
window.addEventListener("gamepaddisconnected", () => {
  console.log("Waiting for gamepad.");
  cancelAnimationFrame(frameId);
  frameId = null;
  render(NO_INPUT);
});

// Also look for a gamepad every half second: the "connected" event can be missed
// (page loaded after the controller was already pressed, or the browser never sends it).
setInterval(() => {
  if (frameId !== null) return;
  const gp = getGamepad();
  if (gp) startLoop(gp);
}, 500);

render(NO_INPUT); // idle pose until a controller shows up

// ---- Diagnostics panel (?debug=1) ----
if (debug) {
  const panel = document.createElement("pre");
  panel.style.cssText =
    "position:fixed;top:0;left:0;margin:0;padding:6px;z-index:9999;pointer-events:none;" +
    "font:11px/1.35 monospace;color:#0f0;background:rgba(0,0,0,.75);white-space:pre-wrap;max-width:100%";
  document.body.appendChild(panel);

  setInterval(() => {
    const pads = allGamepads();
    const lines = [
      "page focus: " + document.hasFocus() + " | visibility: " + document.visibilityState,
      "gamepads seen by this page: " + pads.length,
    ];
    pads.forEach((p) =>
      lines.push("  #" + p.index + " " + p.id + " [mapping: " + (p.mapping || "raw") + ", " + p.buttons.length + " buttons, " + p.axes.length + " axes]")
    );
    const gp = getGamepad();
    if (gp) {
      const held = gp.buttons.map((b, i) => (isPressed(b) ? i : null)).filter((i) => i !== null);
      const lit = keys.filter((k, i) => isActive(resolve(k.input, profileOf(gp)), gp, readHat(gp))).map((k) => k.id);
      lines.push("using #" + gp.index + " with the " + profileOf(gp) + " layout");
      lines.push("buttons held: " + JSON.stringify(held) + " | hat axis " + hatAxis + ": " + gp.axes[hatAxis]);
      lines.push("keys lit: " + (lit.join(", ") || "none"));
    } else {
      lines.push("No gamepad visible yet. Press a button on the controller.");
    }
    panel.textContent = lines.join("\n");
  }, 250);
}

// ---- Talking face (microphone) ----
async function startMic() {
  if (!mic.enabled || !talkLayer || !navigator.mediaDevices) return;
  try {
    const audio = { echoCancellation: false, autoGainControl: false };
    let stream = await navigator.mediaDevices.getUserMedia({ audio });

    if (mic.deviceName) {
      // Device names are only readable once mic access has been granted
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter((d) => d.kind === "audioinput");
      const wanted = inputs.find((d) =>
        d.label.toLowerCase().includes(mic.deviceName.toLowerCase())
      );
      if (wanted) {
        stream.getTracks().forEach((t) => t.stop());
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { ...audio, deviceId: { exact: wanted.deviceId } },
        });
      } else {
        console.warn("Mic not found, using default. Available: " + inputs.map((d) => d.label).join(" | "));
      }
    }

    const ctx = new AudioContext();
    ctx.resume();
    document.addEventListener("click", () => ctx.resume());
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);

    let lastLoud = -Infinity;
    let lastLog = 0;
    setInterval(() => {
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (const s of samples) sum += s * s;
      const level = Math.sqrt(sum / samples.length); // RMS volume, 0-1

      const now = performance.now();
      if (level > mic.threshold) lastLoud = now;
      show(talkLayer, now - lastLoud < mic.holdMs);

      if (debug && now - lastLog > 500) {
        console.log("mic level " + level.toFixed(3) + " (threshold " + mic.threshold + ")");
        lastLog = now;
      }
    }, 50);
  } catch (err) {
    console.warn("Microphone not available, talking face disabled:", err);
  }
}

startMic();
