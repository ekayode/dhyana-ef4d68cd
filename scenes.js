/* Session scenes: a pale, cloudy sky behind the countdown, with one of six drawings picked at random each session.
   The guru comes up three times as often as the others. "art" sits above the clock; "bg" fills the screen.
   Steps, lotus and sunrise follow the session's progress through --p (0 to 1) and --s (step 0 to 6). */
const CLOUD = w => `<svg class="cl" width="${w}" height="${Math.round(w * 90 / 220)}" viewBox="0 0 220 90"><g fill="#fff"><ellipse cx="110" cy="62" rx="100" ry="24"/><ellipse cx="70" cy="48" rx="42" ry="30"/><ellipse cx="124" cy="38" rx="52" ry="36"/><ellipse cx="168" cy="54" rx="36" ry="24"/></g></svg>`;
const SCENES = {
  guru: { w: 3, label: "A little old monk sits and breathes, and now and then opens one eye to check on you", art: `
<svg viewBox="0 0 300 300" class="guru">
  <circle class="halo" cx="150" cy="150" r="140" fill="rgba(255,214,150,.35)"/>
  <circle cx="150" cy="150" r="118" fill="rgba(255,255,255,.55)"/>
  <path d="M42 236c30-14 186-14 216 0-26 26-66 36-108 36s-82-10-108-36z" fill="rgba(150,110,80,.18)"/>
  <path d="M70 236c-10-20 30-34 80-34s90 14 80 34c-8 16-152 16-160 0z" fill="#8a4a24"/>
  <path d="M84 232c22-12 54-14 66-14s44 2 66 14" fill="none" stroke="#5f3218" stroke-width="3" stroke-linecap="round"/>
  <g class="chest">
    <path d="M104 216c-6-40 12-74 46-74s52 34 46 74c-14 8-78 8-92 0z" fill="#a85c2c"/>
    <path d="M150 144c-14 20-22 46-22 74" fill="none" stroke="#7a4220" stroke-width="3" stroke-linecap="round"/>
    <path d="M112 170c-12 16-20 34-22 50 6 6 16 6 22 2 2-16 6-30 12-44z" fill="#c98c5e"/>
    <path d="M188 170c12 16 20 34 22 50-6 6-16 6-22 2-2-16-6-30-12-44z" fill="#c98c5e"/>
    <g fill="#3b2a1c"><circle cx="136" cy="168" r="3"/><circle cx="140" cy="176" r="3"/><circle cx="146" cy="182" r="3"/><circle cx="154" cy="182" r="3"/><circle cx="160" cy="176" r="3"/><circle cx="164" cy="168" r="3"/></g>
  </g>
  <g class="head">
    <path d="M116 112c-8-2-10 16 2 18z" fill="#c98c5e"/><path d="M184 112c8-2 10 16-2 18z" fill="#c98c5e"/>
    <circle cx="150" cy="104" r="36" fill="#d69a68"/>
    <path d="M128 84c6-8 16-12 24-12" fill="none" stroke="#e8bb8f" stroke-width="4" stroke-linecap="round"/>
    <path d="M126 118c0 26 10 48 24 56 14-8 24-30 24-56-6 8-14 10-24 10s-18-2-24-10z" fill="#d9d4c8"/>
    <path d="M140 122c3 4 7 5 10 5s7-1 10-5" fill="none" stroke="#6e4326" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M126 96c5-5 11-5 16-2M158 94c5-3 11-3 16 2" fill="none" stroke="#e7e2d6" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M130 106c3 4 8 4 11 0" fill="none" stroke="#4b2d18" stroke-width="2.5" stroke-linecap="round"/>
    <path class="shut" d="M159 106c3 4 8 4 11 0" fill="none" stroke="#4b2d18" stroke-width="2.5" stroke-linecap="round"/>
    <g class="peek"><circle cx="164.5" cy="105" r="5" fill="#f2ede2"/><circle cx="163" cy="106" r="3" fill="#2a1a10"/><circle cx="162" cy="105" r="1" fill="#fff"/></g>
    <path d="M150 104c-2 5-3 8 0 9" fill="none" stroke="#a96f45" stroke-width="2.5" stroke-linecap="round"/>
  </g>
</svg>` },
  steps: { w: 1, label: "A little old monk climbs seven coloured steps as the session goes on", art: `
<svg viewBox="0 0 390 400" class="steps">
  <path d="M0 400V330H52V400z" fill="#e9aaa0"/><path d="M52 400V296H94V400z" fill="#efc095"/><path d="M94 400V262H136V400z" fill="#eedc93"/>
  <path d="M136 400V228H178V400z" fill="#a7d3ab"/><path d="M178 400V194H220V400z" fill="#9cc8e0"/><path d="M220 400V160H262V400z" fill="#abaee0"/>
  <path d="M262 400V126H390V400z" fill="#c8aadb"/>
  <path fill="#fff" opacity=".6" d="M0 330H52V333H0zM52 296H94V299H52zM94 262H136V265H94zM136 228H178V231H136zM178 194H220V197H178zM220 160H262V163H220zM262 126H390V129H262z"/>
  <circle class="lit" cx="340" cy="76" r="26" fill="rgba(255,214,150,.28)"/><circle cx="340" cy="76" r="11" fill="#c9a35e"/>
  <g class="walker"><g class="bob">
    <path d="M26 330l-4-20h10l2 18 6 2c2 1 1 3-1 3H26z" fill="#c98c5e"/>
    <path d="M18 288c-4 10-2 18 4 24h11c6-6 10-14 6-24z" fill="#8a4a24"/>
    <path d="M14 248c0-10 8-14 15-14s15 4 15 14l-1 42H16z" fill="#a85c2c"/>
    <path d="M35 256l6 16 7 4c2 1 1 4-2 3l-9-3-8-14z" fill="#c98c5e"/>
    <circle cx="30" cy="222" r="17" fill="#d69a68"/>
    <path d="M19 214c3-5 9-7 14-7" fill="none" stroke="#e8bb8f" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M31 228c0 14 6 24 12 26 6-5 6-18 3-27-4 2-9 3-15 1z" fill="#d9d4c8"/>
    <path d="M37 219c2 2.5 5 2.5 7 0" fill="none" stroke="#4b2d18" stroke-width="2" stroke-linecap="round"/>
    <path d="M35 214c3-2 6-2 9-1" fill="none" stroke="#e7e2d6" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M14 218c-2 1-3 8 2 10z" fill="#c98c5e"/>
  </g></g>
</svg>` },
  lotus: { w: 1, label: "A lotus that opens as the session goes on", art: `
<svg viewBox="-170 -220 340 290" class="lotus">
  <circle class="glow" cx="0" cy="-50" r="130" fill="rgba(255,200,222,.35)"/>
  <g fill="#f0bcd0" stroke="#fff" stroke-width="1.5">
    <path class="p" style="--a:-82deg" d="M0 0C-34-46-30-108 0-146 30-108 34-46 0 0z"/><path class="p" style="--a:82deg" d="M0 0C-34-46-30-108 0-146 30-108 34-46 0 0z"/>
    <path class="p" style="--a:-62deg" d="M0 0C-34-46-30-108 0-150 30-108 34-46 0 0z"/><path class="p" style="--a:62deg" d="M0 0C-34-46-30-108 0-150 30-108 34-46 0 0z"/>
  </g>
  <g fill="#e49ab8" stroke="#fff" stroke-width="1.5">
    <path class="p" style="--a:-42deg" d="M0 0C-32-46-28-110 0-152 28-110 32-46 0 0z"/><path class="p" style="--a:42deg" d="M0 0C-32-46-28-110 0-152 28-110 32-46 0 0z"/>
    <path class="p" style="--a:-22deg" d="M0 0C-30-46-26-110 0-156 26-110 30-46 0 0z"/><path class="p" style="--a:22deg" d="M0 0C-30-46-26-110 0-156 26-110 30-46 0 0z"/>
  </g>
  <path d="M0 0C-26-46-22-110 0-158 22-110 26-46 0 0z" fill="#d27a9f" stroke="#fff" stroke-width="1.5"/>
  <path d="M-110 14c30-22 80-26 110-14 30-12 80-8 110 14-40 22-180 22-220 0z" fill="#9fcca8"/>
  <path d="M-150 56h300" stroke="rgba(90,130,160,.22)" stroke-width="2" stroke-linecap="round"/>
  <path d="M-90 68h180" stroke="rgba(90,130,160,.14)" stroke-width="2" stroke-linecap="round"/>
</svg>` },
  clouds: { w: 1, label: "White clouds drift past a pale sun", ownClouds: true, bg: `
<svg viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" class="bgArt">
  <circle class="sunHalo" cx="270" cy="190" r="96" fill="rgba(255,236,180,.45)"/>
  <circle cx="270" cy="190" r="44" fill="#fbe7b0"/>
  <g class="c1 shade" fill="rgba(255,255,255,.95)"><ellipse cx="100" cy="240" rx="92" ry="22"/><ellipse cx="66" cy="224" rx="40" ry="24"/><ellipse cx="118" cy="214" rx="50" ry="34"/><ellipse cx="158" cy="230" rx="34" ry="18"/></g>
  <g class="c2" fill="rgba(255,255,255,.7)"><ellipse cx="120" cy="110" rx="76" ry="16"/><ellipse cx="96" cy="98" rx="32" ry="18"/><ellipse cx="136" cy="92" rx="40" ry="24"/></g>
  <g class="c3 shade" fill="#fff"><ellipse cx="120" cy="640" rx="130" ry="26"/><ellipse cx="74" cy="620" rx="56" ry="30"/><ellipse cx="140" cy="606" rx="70" ry="44"/><ellipse cx="200" cy="628" rx="48" ry="24"/></g>
</svg>` },
  pool: { w: 1, label: "Slow ripples spread across a still pool", bg: `
<svg viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" class="bgArt">
  <circle cx="195" cy="400" r="330" fill="rgba(120,190,210,.10)"/><circle cx="195" cy="400" r="210" fill="rgba(120,190,210,.12)"/>
  <g fill="none" stroke="#6fb2c8" stroke-width="1.5"><circle class="ring" cx="195" cy="400" r="320"/><circle class="ring r2" cx="195" cy="400" r="320"/><circle class="ring r3" cx="195" cy="400" r="320"/></g>
  <g class="pad"><path d="M54 170a30 30 0 1 0 30 30l-30-30z" fill="#9fcca8"/></g>
  <g class="pad pad2"><path d="M318 640a22 22 0 1 0 22 22l-22-22z" fill="#8fc29c"/><circle cx="318" cy="662" r="7" fill="#f1b7cb"/><circle cx="318" cy="662" r="3" fill="#f4d68a"/></g>
</svg>` },
  sunrise: { w: 1, label: "The sun rises behind the mountains as the session goes on", bg: `
<svg viewBox="0 0 390 844" preserveAspectRatio="xMidYMax slice" class="bgArt">
  <g class="dawn"><circle cx="195" cy="610" r="340" fill="#fbeee6"/><circle cx="195" cy="610" r="230" fill="#f9dccb"/><circle cx="195" cy="610" r="130" fill="#f7c4a6"/></g>
  <circle class="sun" cx="195" cy="580" r="44" fill="#f5a663"/>
  <g class="bird" fill="none" stroke="#7a7486" stroke-width="1.5" stroke-linecap="round"><path d="M40 300c4-4 7-4 10 0 3-4 6-4 10 0"/><path d="M66 316c3-3 5-3 7 0 2-3 4-3 7 0"/></g>
  <path d="M0 640l60-46 44 28 66-74 62 62 52-40 106 78V844H0z" fill="#c9d0e6"/>
  <path d="M0 690l80-36 70 34 80-46 70 42 90-30V844H0z" fill="#b3bcdc"/>
  <path d="M0 750c70-28 150-28 220-8 60 16 120 8 170-14V844H0z" fill="#9ea8d0"/>
</svg>` },
};

// Picks the scene for a new session; never the same one twice in a row. Breathwork gets the sky only, so its breathing circle stays the guide.
function scenePick(mode, breath) {
  if (breath) return "sky";
  if (mode === "guru") return "guru";
  let last = ""; try { last = localStorage.getItem("sp-scene") || "" } catch (e) {}
  const pool = Object.keys(SCENES).filter(k => k !== last), sum = pool.reduce((a, k) => a + SCENES[k].w, 0);
  let r = Math.random() * sum, pick = pool[0];
  for (const k of pool) { r -= SCENES[k].w; if (r < 0) { pick = k; break } }
  try { localStorage.setItem("sp-scene", pick) } catch (e) {}
  return pick;
}
// Fills the session screen for a new session, or clears it when the dark screen is chosen.
function sceneStart(mode, breath) {
  const sit = document.getElementById("sit"), bg = document.getElementById("scene"), art = document.getElementById("sitArt");
  const day = mode !== "dark", key = day ? scenePick(mode, breath) : "", s = SCENES[key] || {};
  sit.classList.toggle("day", day); sit.dataset.scene = key;
  bg.innerHTML = day ? `<i class="sky"></i><i class="bloom"></i>${s.bg || ""}${s.ownClouds ? "" : `<div class="cls">${CLOUD(220)}${CLOUD(160)}${CLOUD(260)}</div>`}` : "";
  art.innerHTML = s.art || ""; art.hidden = !s.art;
  if (s.art) art.firstElementChild.setAttribute("aria-label", s.label), art.firstElementChild.setAttribute("role", "img");
  sceneProgress(0);
}
function sceneProgress(p) {
  const sit = document.getElementById("sit"); p = Math.min(1, Math.max(0, p || 0));
  sit.style.setProperty("--p", p.toFixed(3)); sit.style.setProperty("--s", Math.min(6, Math.floor(p * 7)));
}
