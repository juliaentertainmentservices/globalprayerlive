/* World Prayer Live — Phase 1 v2 broadcast logic
   Prayer times, weather, and population figures are SAMPLE DATA — not
   calculated from real astronomical or live data. Replace in Phase 2. */

const CITY_ROTATE_SECONDS = 45;   // how long the featured city stays on screen
const CONTENT_ROTATE_SECONDS = 18; // how long each Quran verse / Hadith stays up

const PRAYER_ORDER = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
const PRAYER_ICON = { Fajr: "🌤️", Sunrise: "🌅", Dhuhr: "☀️", Asr: "🌇", Maghrib: "🌆", Isha: "🌙" };

const els = {
  cityName: document.getElementById("cityName"),
  countryShort: document.getElementById("countryShort"),
  flag: document.getElementById("flag"),
  countryName: document.getElementById("countryName"),
  hijriDate: document.getElementById("hijriDate"),
  gregorianDate: document.getElementById("gregorianDate"),
  prayerList: document.getElementById("prayerList"),
  nextPrayerName: document.getElementById("nextPrayerName"),
  countdownTimer: document.getElementById("countdownTimer"),
  verseArabic: document.getElementById("verseArabic"),
  verseTranslation: document.getElementById("verseTranslation"),
  verseSource: document.getElementById("verseSource"),
  hadithText: document.getElementById("hadithText"),
  hadithSource: document.getElementById("hadithSource"),
  clock: document.getElementById("clock"),
  gmtOffset: document.getElementById("gmtOffset"),
  weather: document.getElementById("weather"),
  countryFull: document.getElementById("countryFull"),
  population: document.getElementById("population"),
  tickerTrack: document.getElementById("tickerTrack"),
  fallback: document.getElementById("fallback"),
  skylineGroup: document.getElementById("skylineGroup"),
};

let cities = [];
let content = { quran: [], hadith: [] };
let cityIndex = 0;
let cityElapsed = 0;
let verseIndex = 0;
let hadithIndex = 0;
let contentElapsed = 0;

function pad(n) { return String(n).padStart(2, "0"); }

function getZonedParts(timeZone) {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts = {};
  fmt.formatToParts(now).forEach(p => { if (p.type !== "literal") parts[p.type] = p.value; });
  return {
    h: parseInt(parts.hour, 10) % 24, m: parseInt(parts.minute, 10), s: parseInt(parts.second, 10),
    y: parseInt(parts.year, 10), mo: parseInt(parts.month, 10), d: parseInt(parts.day, 10),
  };
}

function gmtOffsetLabel(timeZone) {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" });
  const part = fmt.formatToParts(now).find(p => p.type === "timeZoneName");
  if (!part) return "GMT";
  return part.value.replace("GMT", "GMT ").replace(/([+-])(\d):/, "$10$2:").trim();
}

function to12h(h, m) {
  const period = h >= 12 ? "PM" : "AM";
  let hh = h % 12; if (hh === 0) hh = 12;
  return `${pad(hh)}:${pad(m)}`;
}

function parseHHMM(str) { const [h, m] = str.split(":").map(Number); return h * 60 + m; }
function minutesSinceMidnight(h, m, s) { return h * 60 + m + s / 60; }

/* Approximate Hijri conversion (civil tabular method). Good enough for a
   broadcast graphic — verify against a moon-sighting authority before
   using for religious observance. */
function gregorianToHijri(y, mo, d) {
  const jd = Math.floor((1461 * (y + 4800 + Math.floor((mo - 14) / 12))) / 4) +
             Math.floor((367 * (mo - 2 - 12 * Math.floor((mo - 14) / 12))) / 12) -
             Math.floor((3 * Math.floor((y + 4900 + Math.floor((mo - 14) / 12)) / 100)) / 4) +
             d - 32075;
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j = (Math.floor((10985 - l2) / 5316)) * (Math.floor((50 * l2) / 17719)) +
            (Math.floor(l2 / 5670)) * (Math.floor((43 * l2) / 15238));
  const l3 = l2 - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50)) -
             (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29;
  const hMonth = Math.floor((24 * l3) / 709);
  const hDay = l3 - Math.floor((709 * hMonth) / 24);
  const hYear = 30 * n + j - 30;
  return { year: hYear, month: hMonth, day: hDay };
}
const HIJRI_MONTHS = ["Muharram","Safar","Rabi al-Awwal","Rabi al-Thani","Jumada al-Awwal","Jumada al-Thani","Rajab","Sha'ban","Ramadan","Shawwal","Dhu al-Qi'dah","Dhu al-Hijjah"];
const GREG_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function renderCity(city) {
  els.cityName.textContent = city.city;
  els.countryShort.textContent = city.country;
  els.flag.textContent = city.flag;
  els.countryName.textContent = city.country.toUpperCase();
  els.countryFull.textContent = city.country;
  els.population.textContent = city.population;
  els.weather.textContent = `${city.weather.temp}°C · ${city.weather.condition}`;

  els.prayerList.innerHTML = "";
  PRAYER_ORDER.forEach(name => {
    const li = document.createElement("li");
    li.className = "prayer-row";
    li.dataset.name = name;
    li.innerHTML = `<span class="name-wrap"><span class="icon">${PRAYER_ICON[name]}</span><span class="name">${name.toUpperCase()}</span></span><span class="time">${city.prayers[name]}</span>`;
    els.prayerList.appendChild(li);
  });
}

function renderVerse() {
  if (!content.quran.length) return;
  const v = content.quran[verseIndex % content.quran.length];
  els.verseArabic.style.opacity = 0;
  els.verseTranslation.style.opacity = 0;
  setTimeout(() => {
    els.verseArabic.textContent = v.arabic;
    els.verseTranslation.textContent = v.translation;
    els.verseSource.textContent = v.source;
    els.verseArabic.style.opacity = 1;
    els.verseTranslation.style.opacity = 1;
  }, 300);
}

function renderHadith() {
  if (!content.hadith.length) return;
  const h = content.hadith[hadithIndex % content.hadith.length];
  els.hadithText.style.opacity = 0;
  setTimeout(() => {
    els.hadithText.textContent = h.text;
    els.hadithSource.textContent = h.source;
    els.hadithText.style.opacity = 1;
  }, 300);
}

function buildTicker() {
  els.tickerTrack.innerHTML = "";
  const list = [...cities, ...cities]; // duplicate for seamless scroll loop
  list.forEach((city, i) => {
    const zt = getZonedParts(city.timezone);
    const isNext = i % cities.length === (cityIndex + 1) % cities.length;
    const div = document.createElement("div");
    div.className = "ticker-item" + (isNext ? " next" : "");
    div.innerHTML = `<span class="flag">${city.flag}</span><span class="city">${isNext ? '<span class="tag">NEXT</span> ' : ''}${city.city}</span><span class="time">${to12h(zt.h, zt.m)} ${zt.h >= 12 ? 'PM' : 'AM'}</span>`;
    els.tickerTrack.appendChild(div);
  });
}

function tick() {
  if (!cities.length) return;
  const city = cities[cityIndex];
  const zt = getZonedParts(city.timezone);

  els.clock.textContent = `${to12h(zt.h, zt.m)}:${pad(zt.s)} ${zt.h >= 12 ? "PM" : "AM"}`;
  els.gmtOffset.textContent = gmtOffsetLabel(city.timezone);

  const hijri = gregorianToHijri(zt.y, zt.mo, zt.d);
  els.hijriDate.textContent = `${hijri.day} ${HIJRI_MONTHS[hijri.month - 1]} ${hijri.year}`;
  els.gregorianDate.textContent = `${GREG_MONTHS[zt.mo - 1]} ${zt.d}, ${zt.y}`;

  const nowMin = minutesSinceMidnight(zt.h, zt.m, zt.s);
  const schedule = PRAYER_ORDER.map(name => ({ name, min: parseHHMM(city.prayers[name]) }));
  let currentIdx = -1;
  for (let i = 0; i < schedule.length; i++) if (nowMin >= schedule[i].min) currentIdx = i;
  const nextIdx = (currentIdx + 1) % schedule.length;
  const current = currentIdx >= 0 ? schedule[currentIdx] : schedule[schedule.length - 1];
  const next = schedule[nextIdx];

  els.nextPrayerName.textContent = next.name;

  let diffMin = next.min - nowMin;
  if (diffMin <= 0) diffMin += 24 * 60;
  const totalSeconds = Math.floor(diffMin * 60);
  const h = Math.floor(totalSeconds / 3600), m = Math.floor((totalSeconds % 3600) / 60), s = totalSeconds % 60;
  els.countdownTimer.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;

  document.querySelectorAll(".prayer-row").forEach(row => {
    row.classList.toggle("current", row.dataset.name === current.name);
  });

  // Rotate featured city
  cityElapsed += 1;
  if (cityElapsed >= CITY_ROTATE_SECONDS) {
    cityElapsed = 0;
    cityIndex = (cityIndex + 1) % cities.length;
    renderCity(cities[cityIndex]);
    buildTicker();
  }

  // Rotate Quran verse / Hadith independently
  contentElapsed += 1;
  if (contentElapsed >= CONTENT_ROTATE_SECONDS) {
    contentElapsed = 0;
    verseIndex++;
    hadithIndex++;
    renderVerse();
    renderHadith();
  }
}

/* ---- Procedural skyline silhouette (original artwork, not a photo) ---- */
function buildSkyline() {
  const g = els.skylineGroup;
  if (!g) return;
  const w = 1920, baseY = 940;
  let x = -40;
  let svg = "";
  let seed = 7;
  function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }

  while (x < w + 40) {
    const type = rnd();
    if (type < 0.35) {
      // minaret: tall thin tower with a small cap
      const width = 18 + rnd() * 10;
      const height = 260 + rnd() * 260;
      svg += `<rect x="${x}" y="${baseY - height}" width="${width}" height="${height}" />`;
      svg += `<circle cx="${x + width / 2}" cy="${baseY - height - 14}" r="14" />`;
      svg += `<rect x="${x + width / 2 - 2}" y="${baseY - height - 40}" width="4" height="30" />`;
      x += width + 26;
    } else if (type < 0.7) {
      // dome building
      const width = 120 + rnd() * 100;
      const height = 130 + rnd() * 90;
      svg += `<rect x="${x}" y="${baseY - height}" width="${width}" height="${height}" />`;
      svg += `<ellipse cx="${x + width / 2}" cy="${baseY - height}" rx="${width / 2}" ry="${width / 2.6}" />`;
      x += width + 20;
    } else {
      // low building block
      const width = 60 + rnd() * 80;
      const height = 60 + rnd() * 60;
      svg += `<rect x="${x}" y="${baseY - height}" width="${width}" height="${height}" />`;
      x += width + 16;
    }
  }
  g.innerHTML = svg;
}

async function init() {
  buildSkyline();
  try {
    const [citiesRes, contentRes] = await Promise.all([
      fetch("data/cities.json", { cache: "no-store" }),
      fetch("data/content.json", { cache: "no-store" }),
    ]);
    if (!citiesRes.ok) throw new Error("Failed to load cities.json");
    if (!contentRes.ok) throw new Error("Failed to load content.json");
    cities = await citiesRes.json();
    content = await contentRes.json();
    if (!Array.isArray(cities) || cities.length === 0) throw new Error("City data empty");

    // Start on Istanbul if present (matches the reference layout), else first city
    const startIdx = cities.findIndex(c => c.id === "istanbul");
    cityIndex = startIdx >= 0 ? startIdx : 0;

    renderCity(cities[cityIndex]);
    renderVerse();
    renderHadith();
    buildTicker();
    tick();
    setInterval(tick, 1000);
  } catch (err) {
    console.error(err);
    els.fallback.classList.add("show");
  }
}

init();
