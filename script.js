/* World Prayer Live — Phase 1 broadcast logic
   Sample data only. Prayer times are illustrative, not calculated. */

const CITY_ROTATE_SECONDS = 45; // how long each city stays on screen
const DATA_URL = "data/cities.json";

const els = {
  flag: document.getElementById("flag"),
  cityName: document.getElementById("cityName"),
  countryName: document.getElementById("countryName"),
  clock: document.getElementById("clock"),
  date: document.getElementById("date"),
  cityProgressFill: document.getElementById("cityProgressFill"),
  prayerList: document.getElementById("prayerList"),
  nextPrayerName: document.getElementById("nextPrayerName"),
  currentPrayerName: document.getElementById("currentPrayerName"),
  countdownTimer: document.getElementById("countdownTimer"),
  fallback: document.getElementById("fallback"),
};

const PRAYER_ORDER = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];

let cities = [];
let cityIndex = 0;
let cityElapsed = 0;

function pad(n) { return String(n).padStart(2, "0"); }

/** Returns {h,m,s,dateObj} for a given IANA timezone, "now". */
function getZonedTime(timeZone) {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts = {};
  fmt.formatToParts(now).forEach(p => { if (p.type !== "literal") parts[p.type] = p.value; });
  return {
    h: parseInt(parts.hour, 10) % 24,
    m: parseInt(parts.minute, 10),
    s: parseInt(parts.second, 10),
    y: parseInt(parts.year, 10),
    mo: parseInt(parts.month, 10),
    d: parseInt(parts.day, 10),
  };
}

function minutesSinceMidnight(h, m) { return h * 60 + m; }

function parseHHMM(str) {
  const [h, m] = str.split(":").map(Number);
  return h * 60 + m;
}

function formatDate(y, mo, d) {
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${months[mo - 1]} ${d}, ${y}`;
}

function renderCity(city) {
  els.flag.textContent = city.flag;
  els.cityName.textContent = city.city;
  els.countryName.textContent = city.country;

  els.prayerList.innerHTML = "";
  PRAYER_ORDER.forEach(name => {
    const li = document.createElement("li");
    li.className = "prayer-row";
    li.dataset.name = name;
    li.innerHTML = `<span class="name">${name}</span><span class="time">${city.prayers[name]}</span>`;
    els.prayerList.appendChild(li);
  });
}

function tick() {
  if (!cities.length) return;
  const city = cities[cityIndex];

  // Clock
  const zt = getZonedTime(city.timezone);
  els.clock.textContent = `${pad(zt.h)}:${pad(zt.m)}:${pad(zt.s)}`;
  els.date.textContent = formatDate(zt.y, zt.mo, zt.d);

  // Current / next prayer
  const nowMin = minutesSinceMidnight(zt.h, zt.m) + zt.s / 60;
  const schedule = PRAYER_ORDER.map(name => ({ name, min: parseHHMM(city.prayers[name]) }));

  let currentIdx = -1;
  for (let i = 0; i < schedule.length; i++) {
    if (nowMin >= schedule[i].min) currentIdx = i;
  }
  const nextIdx = (currentIdx + 1) % schedule.length;
  const current = currentIdx >= 0 ? schedule[currentIdx] : schedule[schedule.length - 1];
  const next = schedule[nextIdx];

  els.currentPrayerName.textContent = current.name;
  els.nextPrayerName.textContent = next.name;

  // Countdown to next prayer (handles wrap past midnight)
  let diffMin = next.min - nowMin;
  if (diffMin <= 0) diffMin += 24 * 60;
  const totalSeconds = Math.floor(diffMin * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  els.countdownTimer.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;

  // Highlight rows
  document.querySelectorAll(".prayer-row").forEach(row => {
    row.classList.remove("current", "next");
    if (row.dataset.name === current.name) row.classList.add("current");
    if (row.dataset.name === next.name) row.classList.add("next");
  });

  // City rotation progress bar
  cityElapsed += 1;
  const pct = Math.min(100, (cityElapsed / CITY_ROTATE_SECONDS) * 100);
  els.cityProgressFill.style.width = pct + "%";

  if (cityElapsed >= CITY_ROTATE_SECONDS) {
    cityElapsed = 0;
    cityIndex = (cityIndex + 1) % cities.length;
    renderCity(cities[cityIndex]);
  }
}

async function init() {
  try {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load city data: " + res.status);
    cities = await res.json();
    if (!Array.isArray(cities) || cities.length === 0) throw new Error("City data empty");

    renderCity(cities[cityIndex]);
    tick();
    setInterval(tick, 1000);
  } catch (err) {
    console.error(err);
    els.fallback.classList.add("show");
  }
}

init();
