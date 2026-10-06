# bongo-cat-gk18

Arcade Bongo Cat browser overlay for the GuileKeys GK-18 controller.

## Link for using in OBS or TikTok Live Studio

https://rinlean.github.io/bongo-cat-gk18/

## What it does

- Shows a GK-18 themed Bongo Cat background.
- Lights up on-screen keys when matching controller inputs are pressed.
- Switches paw poses based on the active key per hand.
- Optionally shows a talking face driven by microphone volume.

## Files

- `/home/runner/work/bongo-cat-gk18/bongo-cat-gk18/hitboxGK18.html` – page layout and layer containers.
- `/home/runner/work/bongo-cat-gk18/bongo-cat-gk18/hitboxGK18.js` – input mapping, rendering loop, and microphone logic.
- `/home/runner/work/bongo-cat-gk18/bongo-cat-gk18/bgandpos.css` – base visibility and image positioning styles.
- `/home/runner/work/bongo-cat-gk18/bongo-cat-gk18/bongo/img/gk18` – GK-18 art assets used by the overlay.

## Quick start

1. Open `/home/runner/work/bongo-cat-gk18/bongo-cat-gk18/hitboxGK18.html` in a browser, or add it as a local file in an OBS Browser Source.
2. Connect the controller and press a button once so the browser detects it.
3. Allow microphone access if you want the talking face effect.

## URL options

Append query params to `hitboxGK18.html`:

- `?debug=1` – show diagnostics panel and debug logs.
- `?pad=gp2040` – pick a gamepad whose name contains this text.
- `?profile=raw` or `?profile=standard` – force input profile.
- `?mic=0` – disable talking face.
- `?micThreshold=0.05` – set talking activation threshold.
- `?micDevice=name` – use a mic device whose name contains this text.

## Customization

- Edit the `KEYS` list in `hitboxGK18.js` to change which physical inputs drive each on-screen key.
- Edit `OUTPUTS` in `hitboxGK18.js` if your browser/controller mapping differs.
- Replace images in `bongo/img/gk18` to reskin the overlay while keeping filenames the same.

## Credits

- Original project inspiration and base concept: [ROMthesheep/Arcade-Bongo-Cat](https://github.com/ROMthesheep/Arcade-Bongo-Cat)
