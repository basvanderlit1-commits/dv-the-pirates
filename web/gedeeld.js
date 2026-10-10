// Gedeeld door de clubpagina en de teamdashboards: zones in de stand, agenda-abonnement, kopieerknoppen en een uitslag delen.
// Let op: de pagina's hebben zelf al $, esc enz.; hier alleen unieke namen op het hoogste niveau.

// kleuren waarmee teambeheer de stand markeert
const ZONE = { kampioen: "kampioen, promoveert", promotie: "promoveert", nacompetitie: "nacompetitie", degradatie: "degradeert" };

// bijzondere prestatie van teambeheer: "2x 180", "1x 171" of "153 finish"
const aantal180 = p => Number((/^(\d+)x 180$/.exec(p) || [0, 0])[1]);
const aantalMax = p => Number((/^(\d+)x \d+$/.exec(p) || [0, 0])[1]);  // maximum-categorie: 180, 177, 174, 171, 162
const prestatieKort = p => p.replace(" finish", "").replace(/^1x /, "").replace(/^(\d+)x /, "$1× ");  // "2× 180", "171", "153"

function zoneLegend(zones) {
  const has = new Set(zones);
  const items = Object.keys(ZONE).filter(z => has.has(z));
  return items.length
    ? items.map(z => `<span class="zone z-${z}"></span>${ZONE[z]}`).join(" ") + ` <span class="dim">· zoals gemarkeerd op teambeheer</span>`
    : "";
}

// abonneren op een agenda (.ics): webcal:// opent op iPhone en Mac direct de agenda-app
function agendaRow(label, file) {
  const url = new URL(file, location.href).href, webcal = url.replace(/^https?:/, "webcal:");
  const e = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  return `<div class="topic">${label ? `<b class="tlabel">${e(label)}</b>` : ""}<a class="btn" href="${e(webcal)}">Abonneren</a>` +
    `<button class="btn ghost" type="button" data-copy="${e(url)}">Kopieer link</button></div>` +
    (label ? "" : `<p class="note">iPhone: tik op Abonneren. Android / Google Agenda: kopieer de link en voeg hem op de computer toe via Google Agenda → Andere agenda's → Via URL. Wijzigingen komen vanzelf door.</p>`);
}

function bindCopy() {
  document.querySelectorAll("[data-copy]:not([data-bound])").forEach(b => {
    b.dataset.bound = 1;
    const label = b.textContent;
    b.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = "Gekopieerd"; }
      catch (err) { prompt("Kopieer:", b.dataset.copy); }
      setTimeout(() => { b.textContent = label; }, 2000);
    });
  });
}

// teampreview: kaart met stand, uitslagen, spelers en vergelijking van een tegenstander.
// t = { team, div, stand, tegenstanders, matches } van het Pirates-team vanuit wiens oogpunt we kijken.
// Geeft false als er niets te tonen is (dan gaat een eventuele link gewoon door).
function teamPreview(t, naam) {
  const e = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const getal = (v, d = 1) => Number(v).toLocaleString("nl-NL", { minimumFractionDigits: d, maximumFractionDigits: d });
  const pil = r => r ? `<span class="pill ${r}">${r}</span>` : "";
  const isB = m => m.ronde.startsWith("b"), rn = m => isB(m) ? "Beker" : "R" + e(m.ronde);
  const datum = s => { const [d, m, y] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const vandaag = new Date(); vandaag.setHours(0, 0, 0, 0);
  const over = s => { const n = Math.round((datum(s) - vandaag) / 864e5); return n <= 0 ? "vandaag" : n === 1 ? "morgen" : `over ${n} dagen`; };
  const sc = ms => ms.map(m => `${m.wij}–${m.zij}`).join(", ");
  const row = (l, r) => `<div class="tp-row"><span>${l}</span><span class="r">${r}</span></div>`;
  const o = (t.tegenstanders || {})[naam] || {}, st = (t.stand || []).find(s => s.team === naam);
  if (!o.uitslagen && !st) return false;
  const u = o.uitslagen || [];
  const pw = u.reduce((a, m) => a + m.wij, 0), pn = u.reduce((a, m) => a + m.wij + m.zij, 0), pp = pn ? Math.round(100 * pw / pn) + "%" : "–";
  const onder = t.matches.filter(m => m.tegen === naam && !m.vrij);
  const ucomp = u.filter(m => !isB(m)), wcomp = t.matches.filter(m => m.uitslag && !isB(m));
  const zelfde = [...new Set(ucomp.map(m => m.tegen))].filter(x => x !== t.team)
    .map(x => [x, wcomp.filter(m => m.tegen === x), ucomp.filter(m => m.tegen === x)]).filter(([, w]) => w.length);
  const kpis = st
    ? [["Punten", st.pnt], ["Gemiddeld", getal(st.gem)], ["Winst–verlies", `${st.w}–${st.v}`], ["Partijen", pp]]
    : [["Gespeeld", u.length], ["Gewonnen", u.filter(m => m.uitslag === "W").length], ["Verloren", u.filter(m => m.uitslag === "V").length], ["Partijen", pp]];
  let dlg = document.getElementById("teamdlg");
  if (!dlg) {
    dlg = document.body.appendChild(Object.assign(document.createElement("dialog"), { id: "teamdlg", className: "teamdlg" }));
    dlg.setAttribute("aria-label", "Teampreview");
    dlg.addEventListener("click", ev => {
      if (ev.target === dlg || ev.target.closest(".dlg-close")) return dlg.close();
      const b = ev.target.closest(".tp-tabs button");
      if (!b) return;
      dlg.querySelector(".tp-cols").dataset.t = b.dataset.t;
      dlg.querySelectorAll(".tp-tabs button").forEach(x => x.setAttribute("aria-selected", x === b));
    });
  }
  dlg.innerHTML = `<div class="tp-head">
    <span class="zone${st && st.zone ? " z-" + st.zone : ""}" title="${e(st ? ZONE[st.zone] || "positie" : "")}">${st ? st.pos : "–"}</span>
    <div class="tp-title"><h2>${e(naam)}</h2><small>${st ? `${st.pos}e van ${t.stand.length} in ${e(t.div)}` : "andere divisie"}${o.locatie ? " · " + e(o.locatie) : ""}</small></div>
    <button class="dlg-close" type="button" aria-label="Sluiten">×</button></div>
  <div class="tp-body">
    <div class="tp-kpis">${kpis.map(([l, v]) => `<div><b>${e(v)}</b><span>${l}</span></div>`).join("")}
      <div class="vorm"><div class="form">${(o.vorm || []).map(pil).join("") || `<b>–</b>`}</div><span>Vorm</span></div></div>
    ${onder.length ? `<div><h3 class="sub-h">Tegen ${e(t.team)}</h3>${onder.map(m => row(`${rn(m)} · ${m.tu.toLowerCase()} <small>· ${e(m.datum)}</small>`,
      m.uitslag ? `${m.wij}–${m.zij} ${pil(m.uitslag)}` : `<span class="vs">${datum(m.datum) >= vandaag ? over(m.datum) : "nog geen uitslag"}</span>`)).join("")}</div>` : ""}
    <div class="tabs tp-tabs" role="tablist">${["Uitslagen", "Spelers", "Vergelijk"].map((x, i) => `<button role="tab" type="button" data-t="${i}" aria-selected="${!i}">${x}</button>`).join("")}</div>
    <div class="tp-cols" data-t="0">
      <div class="tp-col"><h3 class="sub-h">Laatste uitslagen</h3>${[...u].reverse().slice(0, 6).map(m => row(`${rn(m)} · ${e(m.tegen)} <small>${m.tu.toLowerCase()}</small>`, `${m.wij}–${m.zij} ${pil(m.uitslag)}`)).join("") || `<p class="empty">Nog niet gespeeld.</p>`}</div>
      <div class="tp-col"><h3 class="sub-h">Sterkste spelers (singles)</h3>${(o.spelers || []).map(p => row(`${e(p.naam)}${p.rol === "Captain" ? ` <small>C</small>` : ""}`, `${getal(p.winst, 0)}% <span class="vs">${p.singles} gesp.</span>`)).join("") || `<p class="empty">Nog geen gegevens.</p>`}</div>
      <div class="tp-col"><h3 class="sub-h">Zelfde tegenstander</h3>${zelfde.slice(0, 6).map(([x, w, z]) => row(e(x), `<span class="vs">wij</span> ${sc(w)} <span class="vs">zij</span> ${z.length ? sc(z) : "–"}`)).join("") || `<p class="empty">Nog geen gezamenlijke tegenstanders.</p>`}</div>
    </div>
    <div class="tp-foot">${o.locatie ? `<a class="btn" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.locatie)}" target="_blank" rel="noopener">Route ↗</a>` : ""}${o.url ? `<a class="btn ghost" href="${e(o.url)}" target="_blank" rel="noopener">Teambeheer ↗</a>` : ""}</div>
  </div>`;
  dlg.showModal();
  return true;
}

// elk element met data-team opent de teampreview; ctx(el) geeft het Pirates-team erbij
function bindTeamPreview(ctx) {
  const open = (ev, el) => { const t = ctx(el); if (t && teamPreview(t, el.dataset.team)) { ev.preventDefault(); ev.stopPropagation(); } };
  document.addEventListener("click", ev => { const el = ev.target.closest("[data-team]"); if (el) open(ev, el); }, true);
  document.addEventListener("keydown", ev => {
    const el = ev.target.closest && ev.target.closest("[data-team]");
    if (el && el.tagName !== "BUTTON" && (ev.key === "Enter" || ev.key === " ")) open(ev, el);
  });
}

// uitslag als afbeelding (1080x1080) delen via WhatsApp/teamapp; zonder deelfunctie wordt hij gedownload
async function shareResult(r, btn) {
  const label = btn && btn.textContent;
  if (btn) btn.textContent = "Even geduld…";
  try {
    const S = 1080, c = document.createElement("canvas");
    c.width = c.height = S;
    const x = c.getContext("2d");
    await Promise.all(['64px "Lilita One"', '700 64px "Barlow Condensed"', '600 32px "Source Sans 3"']
      .map(f => document.fonts.load(f).catch(() => {})));
    const mark = new Image();
    mark.src = "mark.png";
    await mark.decode().catch(() => {});
    const fit = (text, font, size, max) => { do { x.font = font.replace("#", size); size -= 2; } while (x.measureText(text).width > max && size > 20); };
    x.fillStyle = "#222222"; x.fillRect(0, 0, S, S);
    x.fillStyle = "#BD202C"; x.fillRect(0, 0, S, 16); x.fillRect(0, S - 16, S, 16);
    if (mark.naturalWidth) { const w = 300; x.drawImage(mark, (S - w) / 2, 60, w, w * mark.naturalHeight / mark.naturalWidth); }
    x.textAlign = "center";
    const kop = `D.V. THE PIRATES · ${r.wat.toUpperCase()} · ${r.datum}`;
    x.fillStyle = "#ADADAD";
    fit(kop, '600 #px "Source Sans 3", sans-serif', 34, S - 120);
    x.fillText(kop, S / 2, 360);
    x.fillStyle = "#F3F3F3";
    fit(r.team, '#px "Lilita One", sans-serif', 92, S - 120);
    x.fillText(r.team, S / 2, 470);
    x.fillStyle = r.uitslag === "W" ? "#4CC38A" : r.uitslag === "V" ? "#F07A7A" : "#F3F3F3";
    x.font = '700 260px "Barlow Condensed", sans-serif';
    x.fillText(`${r.wij}–${r.zij}`, S / 2, 730);
    x.font = '700 40px "Source Sans 3", sans-serif';
    x.fillText({ W: "GEWONNEN", V: "VERLOREN", G: "GELIJK" }[r.uitslag] || "", S / 2, 800);
    const tegen = `${r.tu === "Thuis" ? "thuis tegen" : "uit bij"} ${r.tegen}`;
    x.fillStyle = "#F3F3F3";
    fit(tegen, '600 #px "Source Sans 3", sans-serif', 50, S - 120);
    x.fillText(tegen, S / 2, 890);
    x.fillStyle = "#737373";
    x.font = '600 28px "Source Sans 3", sans-serif';
    x.fillText(`DBMN divisie ${r.div} · basvanderlit1-commits.github.io/dv-the-pirates`, S / 2, 1010);
    const blob = await new Promise(res => c.toBlob(res, "image/png"));
    const naam = `${r.team} - ${r.tegen} ${r.wij}-${r.zij}.png`.replace(/[\\/:*?"<>|]/g, "");
    const file = new File([blob], naam, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], text: `${r.team} ${r.wij}–${r.zij} ${r.tegen}` }); return; }
      catch (e) { if (e.name === "AbortError") return; }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = naam; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  } finally {
    if (btn) btn.textContent = label;
  }
}
