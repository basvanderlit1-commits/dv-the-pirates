// Gedeeld door de clubpagina en de teamdashboards: zones in de stand, agenda-abonnement, kopieerknoppen en een uitslag delen.
// Let op: de pagina's hebben zelf al $, esc enz.; hier alleen unieke namen op het hoogste niveau.

// kleuren waarmee teambeheer de stand markeert
const ZONE = { kampioen: "kampioen, promoveert", promotie: "promoveert", nacompetitie: "nacompetitie", degradatie: "degradeert" };

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
