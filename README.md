# World Prayer Live — Phase 1

A 1920×1080 broadcast-style webpage: 10 cities, live local clocks, a sample
prayer schedule, current/next-prayer highlighting, a countdown timer, and
automatic city rotation every 45 seconds.

**Prayer times in `data/cities.json` are SAMPLE DATA only** — they are not
calculated from real astronomical data and must not be used for actual
worship. That's Phase 2.

---

## Part A — Put the website on GitHub Pages

1. Go to https://github.com and log in (create a free account if you don't have one).
2. Click the **+** icon top-right → **New repository**.
   - Name it e.g. `world-prayer-live`
   - Set it to **Public**
   - Don't add a README (we already have one)
   - Click **Create repository**
3. On the new repo page, click **uploading an existing file** (or drag-and-drop).
4. Unzip the file I gave you, then drag in **all of it** — `index.html`,
   `style.css`, `script.js`, `README.md`, and the whole `data` folder — into
   the upload box. Keep the folder structure intact (GitHub preserves it).
5. Scroll down, click **Commit changes**.
6. Go to the repo's **Settings** tab → **Pages** (left sidebar).
7. Under "Build and deployment" → Source: **Deploy from a branch**.
   Branch: **main**, folder: **/(root)**. Click **Save**.
8. Wait 1–2 minutes. Refresh the Pages settings screen — you'll see a green
   box with your live URL, something like:
   `https://yourusername.github.io/world-prayer-live/`
9. Open that URL. You should see the full broadcast screen rotating through
   the 10 cities.

That's your permanent, free, always-on website. Nothing else needs to run
for the *website* to stay up — GitHub hosts it 24/7 regardless of your
computer.

---

## Part B — Turn the website into a 24/7 YouTube livestream

The website alone does not stream anywhere. Something has to open it in a
browser and push that video to YouTube, continuously. The **simplest and
most reliable way to start** is OBS Studio — not FFmpeg/Puppeteer, which is
more failure-prone to hand-configure by copy/paste. Once this basic version
runs stably for a few days, we can move to the fuller automated version.

### B1. Get your YouTube stream key
1. Go to https://studio.youtube.com
2. Click **Create** (top right) → **Go live**.
3. If asked, verify your channel for live streaming (can take up to 24h the
   first time — do this today if you haven't before).
4. Go to the **Stream** tab. You'll see a **Stream key** — click "Copy".
   **Never paste this key anywhere public** (not in chat, not in GitHub).

### B2. Install OBS Studio on the office computer
1. Download from https://obsproject.com (Windows/Mac/Linux, free).
2. Install it with default options.

### B3. Configure OBS
1. Open OBS → **Settings** → **Stream**.
   - Service: **YouTube - RTMPS**
   - Stream key: paste the key from B1.
2. **Settings** → **Video**:
   - Base (Canvas) Resolution: **1920x1080**
   - Output (Scaled) Resolution: **1920x1080**
   - FPS: **30**
3. **Settings** → **Output** → Output Mode: Simple.
   - Video Bitrate: **4000–6000 Kbps** (good for a mostly-static graphic scene)
   - Encoder: hardware encoder if available (NVENC/QuickSync), else x264
4. Click **OK**.

### B4. Add your website as a source
1. In the main OBS window, under **Sources**, click **+** → **Browser**.
2. Name it "Prayer Broadcast" → OK.
3. URL: your GitHub Pages link from Part A.
4. Width: **1920**, Height: **1080**.
5. Check "Shutdown source when not visible" **OFF**, and "Refresh browser
   when scene becomes active" **OFF** (so it doesn't restart the rotation
   every time you switch scenes).
6. Click OK. You should see the broadcast live inside OBS.

### B5. Go live
1. In YouTube Studio's "Go live" screen, set title/description/visibility.
   **Start with "Unlisted" or "Private"** for testing — do not go public yet.
2. Back in OBS, click **Start Streaming** (bottom right).
3. Within ~15–30 seconds, YouTube Studio should show "Stream is live."

### B6. Keep the office computer streaming reliably
- **Power settings:** Control Panel → Power Options → set sleep to **Never**,
  and disable "turn off display" if that's easier for you to leave on;
  either way, sleep must stay off.
- **Auto-login + auto-start:** put a shortcut to OBS in the Windows
  **Startup** folder (`shell:startup`), and in OBS → Settings → General,
  enable **"Automatically start streaming when application starts."**
- **Auto-restart after crash:** OBS Studio itself doesn't have a built-in
  watchdog. For Phase 1, check on it once a day. In Phase 5 (later), we can
  add a small script that detects a dropped stream and restarts OBS
  automatically — happy to build that once this base version is stable.
- **Internet:** wired Ethernet is much more reliable than Wi-Fi for a 24/7
  stream.

### B7. Let it run
Let the unlisted stream run for 24–72 hours and check it periodically. Once
it's stable, we can:
- move to the full headless Chrome + FFmpeg auto-recovering setup (no OBS,
  no GUI, restarts itself), and
- build Phase 2 (real, accurate prayer time calculations) to replace the
  sample data.

---

## File structure

```
world-prayer-live/
├── index.html        the broadcast page
├── style.css          all visual styling
├── script.js           clock, countdown, rotation logic
├── data/
│   └── cities.json     the 10 sample cities + prayer times
└── README.md           this file
```

To add/edit a city later: open `data/cities.json`, copy one block, change
the values, commit the change on GitHub — the live page updates
automatically, no code changes needed.
