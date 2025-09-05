// =================== CONFIG ===================
const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTZBeQDcZ4tT-OSymuH_T89STQqG-OIQ2pmGmrZNSkj5VRVp4q_8oAh5D-bZ8HIIWYMW12xwEECxH5T/pub?output=csv';

let datiOriginali = [];

// =================== LOAD DATI ===================
Papa.parse(sheetURL, {
  download: true,
  header: true,
  transformHeader: h => h.trim(),
  complete: function(results) {
    const raw = results.data || [];
    datiOriginali = raw.filter(r => (r.Codice || r.Descrizione));
    popolaCategorie(datiOriginali);
    mostraArticoli(datiOriginali);
  }
});

// =================== RENDER TABELLA ===================
function mostraArticoli(data) {
  const tbody = document.querySelector("#tabella-prodotti tbody");
  tbody.innerHTML = "";

  data.forEach(row => {
    const codice = row.Codice || '';
    const descrizione = row.Descrizione || '';

    // ===== Quantità / Disponibilità =====
    const qtyRaw = (row['Quantità'] ?? row['quantità'] ?? row['Qta'] ?? row['Q.tà'] ?? row['Quantita'] ?? row['quantita'] ?? '').toString().trim();
    const stockNum = qtyRaw ? parseFloat(qtyRaw.replace(',', '.')) : 0;
    const isSoldOut = !qtyRaw || isNaN(stockNum) || stockNum <= 0;

    // step dinamico in base alla frazione della disponibilità
    let stepValue = '0.01';
    if (!isSoldOut) {
      const frac = Math.abs(stockNum - Math.floor(stockNum));
      if (Math.abs(frac - 0.5) < 1e-9) stepValue = '0.5';
      else if (Math.abs(frac - 0.25) < 1e-9 || Math.abs(frac - 0.75) < 1e-9) stepValue = '0.25';
      else if (frac === 0) stepValue = '1';
    }

    const qtyCellHTML = isSoldOut
      ? `
        <div class="qty-wrap">
          <div class="qty-label">Disponibilità</div>
          <div class="qty-value" style="color:red; font-weight:bold;">VENDUTO</div>
          <input type="number" class="qty-input" value="" placeholder="0" min="0" step="1" disabled />
        </div>
      `
      : `
        <div class="qty-wrap">
          <div class="qty-label">Disponibilità</div>
          <div class="qty-value">${qtyRaw}</div>
          <input
            type="number"
            class="qty-input"
            data-codice="${codice}"
            value=""
            placeholder="0"
            min="0"
            max="${stockNum}"
            step="${stepValue}"
            inputmode="decimal"
            lang="it"
          />
        </div>
      `;
    // ====================================

    // Prezzi e formattazioni
    const prezzo = row.Prezzo || '';
    const prezzoPromo = row["Prezzo Promo"] || '';
    const conaicollo = row.Conaicollo || '';
    const imgSrc = (row.Immagine || '').toString().trim();
    const evidenzia = (row.Evidenzia || '').toString().trim().toUpperCase() === "SI";

    const prezzoFmt = (prezzo && !isNaN(prezzo.replace(',', '.')))
      ? `€${Number(prezzo.replace(',', '.')).toFixed(2).replace('.', ',')}` : '';

    const prezzoPromoFmt = (prezzoPromo && !isNaN(prezzoPromo.replace(',', '.')))
      ? `<span style="color:red; font-weight:bold;">€${Number(prezzoPromo.replace(',', '.')).toFixed(2).replace('.', ',')}</span>` : '';

    const conaiFmt = (conaicollo && !isNaN(conaicollo.replace(',', '.')))
      ? `€${Number(conaicollo.replace(',', '.')).toFixed(2).replace('.', ',')}` : '';

    const imgTag = imgSrc
      ? `<img src="${imgSrc}" alt="foto prodotto" class="zoomable" onclick="mostraZoom('${imgSrc}')">` : '';

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="td-codice">${codice}</td>
      <td class="td-desc">${descrizione}</td>
      <td class="td-prezzo" style="text-align:right;">${prezzoFmt}</td>
      <td class="td-prezzo-promo" style="text-align:right;">${prezzoPromoFmt}</td>
      <td class="td-conai" style="text-align:right;">${conaiFmt}</td>
      <td style="text-align:center;">${qtyCellHTML}</td>
      <td style="text-align:center;">${imgTag}</td>
    `;

    if (evidenzia) {
      tr.style.backgroundColor = '#45ac49';
      tr.style.fontWeight = 'bold';
    }
    tbody.appendChild(tr);
  });

  // Gestione quantità: virgola → punto, clamp a max, spinner ok
  document.querySelectorAll('.qty-input:not([disabled])').forEach(inp => {
    inp.addEventListener('input', () => {
      if (inp.value.trim() === '') return; // consenti campo vuoto

      // virgola → punto per usare i controlli nativi del number
      if (inp.value.includes(',')) {
        const caret = inp.selectionStart;
        inp.value = inp.value.replace(',', '.');
        try { inp.setSelectionRange(caret, caret); } catch {}
      }

      let num = inp.valueAsNumber;
      if (Number.isNaN(num)) return;

      const max = parseFloat(inp.max);
      const min = parseFloat(inp.min) || 0;
      if (!isNaN(max) && num > max) num = max;
      if (!isNaN(min) && num < min) num = min;

      inp.value = String(num); // formato “canonico” per non rompere spinner
    });

    // protezione da superamento max/min con frecce
    inp.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      const el = e.currentTarget;
      setTimeout(() => {
        let v = el.valueAsNumber;
        if (Number.isNaN(v)) return;
        const max = parseFloat(el.max);
        if (!isNaN(max) && v > max) el.value = String(max);
        if (v < 0) el.value = '0';
      }, 0);
    });
  });
}

// =================== CATEGORIE ===================
function popolaCategorie(data) {
  const contenitore = document.getElementById("categorie");
  const select = document.getElementById("select-categoria");
  if (!contenitore && !select) return;

  const getCat = r => (r.Categoria ?? r.categoria ?? r['Categoria '] ?? r['categoria ']);
  const categorieUniche = [...new Set(
    data.map(r => (getCat(r) || '').toString().trim()).filter(Boolean)
  )].sort();

  if (contenitore) {
    contenitore.innerHTML = "";
    categorieUniche.forEach(categoria => {
      const btn = document.createElement("button");
      btn.textContent = categoria;
      btn.classList.add("btn-categoria");
      btn.addEventListener("click", () => {
        const filtrati = datiOriginali.filter(r => (getCat(r) || '').trim() === categoria);
        mostraArticoli(filtrati);
      });
      contenitore.appendChild(btn);
    });
  }

  if (select) {
    select.innerHTML = '<option value="">Scegli la categoria di articoli</option>';
    categorieUniche.forEach(categoria => {
      const opt = document.createElement("option");
      opt.value = categoria;
      opt.textContent = categoria;
      select.appendChild(opt);
    });

    if (!select.dataset.bound) {
      select.addEventListener("change", () => {
        if (select.value === "") mostraArticoli(datiOriginali);
        else {
          const filtrati = datiOriginali.filter(r => (getCat(r) || '').trim() === select.value);
          mostraArticoli(filtrati);
        }
      });
      select.dataset.bound = "1";
    }
  }
}

// =================== FILTRI ===================
document.getElementById("pulisci-filtro").addEventListener("click", () => {
  document.getElementById("filtro-globale").value = "";
  mostraArticoli(datiOriginali);
  const select = document.getElementById("select-categoria");
  if (select) select.value = "";
});

document.getElementById("filtro-globale").addEventListener("input", function(e) {
  const term = e.target.value.trim().toLowerCase();
  const righe = document.querySelectorAll("#tabella-prodotti tbody tr");

  righe.forEach(tr => {
    let visibile = false;
    tr.querySelectorAll("td").forEach(td => {
      td.innerHTML = td.innerHTML.replace(/<mark>(.*?)<\/mark>/g, "$1");
      const testo = td.textContent.toLowerCase();
      if (term && testo.includes(term)) {
        visibile = true;
        const regex = new RegExp(`(${term})`, "gi");
        td.innerHTML = td.innerHTML.replace(regex, "<mark>$1</mark>");
      }
    });
    tr.style.display = (term === "" || visibile) ? "" : "none";
  });
});

// =================== Zoom immagine ===================
function mostraZoom(src) {
  const overlay = document.getElementById("zoomOverlay");
  const zoomedImg = document.getElementById("zoomedImg");
  zoomedImg.src = src;
  overlay.style.display = "flex";
}

// =================== PDF elenco visibile ===================
document.getElementById("scarica-pdf").addEventListener("click", () => {
  const visibile = document.querySelector("#tabella-prodotti tbody tr:not([style*='display: none'])");
  if (!visibile) { alert("Nessun articolo da stampare!"); return; }

  const src = document.getElementById("contenuto-pdf");
  const clone = src.cloneNode(true);

  clone.querySelectorAll(".no-print, .filters, #categorie, #combo-categorie").forEach(el => el.remove());

  const thead = clone.querySelector("#tabella-prodotti thead");
  if (thead) thead.querySelectorAll("th").forEach(th => { th.style.position = "static"; });

  const wrapper = clone.querySelector(".tabella-scroll");
  if (wrapper) { wrapper.style.overflow = "visible"; wrapper.style.maxHeight = "none"; }

  const styleFix = document.createElement("style");
  styleFix.textContent = `
    #tabella-prodotti { width: 95% !important; table-layout: auto !important; }
    #tabella-prodotti th, #tabella-prodotti td { white-space: normal !important; }
    #tabella-prodotti th, #tabella-prodotti td { font-size: 13px !important; padding: 6px !important; }
    #tabella-prodotti img { max-width: 80px !important; height: auto !important; }
    .immagine-shock{max-width:160px!important;height:auto!important}
  `;
  clone.appendChild(styleFix);

  const tmp = document.createElement("div");
  tmp.style.position = "fixed";
  tmp.style.left = "-99999px";
  tmp.appendChild(clone);
  document.body.appendChild(tmp);

  html2pdf()
    .set({
      margin: 1,
      filename: "prodotti-svendita-tecnobox.pdf",
      image: { type: "jpeg", quality: 1 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: true, scrollX: 0, scrollY: 0 },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
      pagebreak: { mode: ["css", "legacy"] }
    })
    .from(clone)
    .save()
    .then(() => document.body.removeChild(tmp))
    .catch(() => document.body.removeChild(tmp));
});

// =================== PROPOSTA: selezione articoli con qty > 0 ===================
function getArticoliSelezionati() {
  const rows = document.querySelectorAll("#tabella-prodotti tbody tr");
  const items = [];
  rows.forEach(tr => {
    const tds = tr.querySelectorAll("td");
    if (tds.length < 7) return;
    const codice = tds[0].textContent.trim();
    const descrizione = tds[1].textContent.trim();
    const prezzo = tds[2].textContent.trim();
    const prezzoPromo = tds[3].textContent.trim();
    const conai = tds[4].textContent.trim();

    const inp = tr.querySelector(".qty-input:not([disabled])");
    if (!inp) return;
    const val = (inp.value || '').toString().replace(',', '.').trim();
    const qty = val === '' ? 0 : parseFloat(val);
    if (!isNaN(qty) && qty > 0) {
      // per stampa/visualizzazione usa la virgola
      const quantitaText = (inp.value || String(qty)).replace(/\./g, ',');
      items.push({ codice, descrizione, prezzo, prezzoPromo, conai, quantita: quantitaText });
    }
  });
  return items;
}

// =================== MODAL dati cliente ===================
function apriModalProposta(onConfirm) {
  const old = document.getElementById("proposta-modal");
  if (old) old.remove();

  const html = `
  <div id="proposta-modal" style="position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:10000;">
    <div class="box" style="background:#fff;width:95%;max-width:720px;border-radius:10px;padding:16px 18px;box-shadow:0 10px 30px rgba(0,0,0,.2);font-family:Segoe UI,Roboto,Helvetica Neue,Arial;">
      <h3 style="margin:0 0 10px;font-size:20px;">Invia proposta</h3>

      <div class="grid" style="display:grid;gap:10px;grid-template-columns:1fr 1fr;">
        <div class="full" style="grid-column:1/-1;">
          <label style="font-size:13px;color:#333;display:block;">Ragione sociale *</label>
          <input id="prop-ragione" type="text" placeholder="Ragione sociale" style="width:100%;padding:8px 10px;font-size:14px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
          <div class="err" id="err-ragione" style="display:none;color:#c00;font-size:12px;margin-top:4px;"></div>
        </div>

        <div>
          <label style="font-size:13px;color:#333;display:block;">Referente *</label>
          <input id="prop-referente" type="text" placeholder="Nome Cognome" style="width:100%;padding:8px 10px;font-size:14px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
          <div class="err" id="err-referente" style="display:none;color:#c00;font-size:12px;margin-top:4px;"></div>
        </div>

        <div>
          <label style="font-size:13px;color:#333;display:block;">Email *</label>
          <input id="prop-email" type="email" placeholder="inserisci email valida" style="width:100%;padding:8px 10px;font-size:14px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
          <div class="err" id="err-email" style="display:none;color:#c00;font-size:12px;margin-top:4px;"></div>
        </div>

        <div>
          <label style="font-size:13px;color:#333;display:block;">Telefono *</label>
          <input id="prop-telefono" type="tel" placeholder="Inserisci recapito telefonico" style="width:100%;padding:8px 10px;font-size:14px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
          <div class="err" id="err-telefono" style="display:none;color:#c00;font-size:12px;margin-top:4px;"></div>
        </div>

        <div>
          <label style="font-size:13px;color:#333;display:block;">Ritiro in azienda?</label>
          <select id="prop-ritiro" style="width:100%;padding:8px 10px;font-size:14px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
            <option value="SI">SI</option>
            <option value="NO">NO</option>
          </select>
        </div>

        <div>
          <label style="font-size:13px;color:#333;display:block;">Città</label>
          <input id="prop-citta" type="text" placeholder="Città" style="width:100%;padding:8px 10px;font-size:14px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
          <div class="err" id="err-citta" style="display:none;color:#c00;font-size:12px;margin-top:4px;"></div>
        </div>

        <div>
          <label style="font-size:13px;color:#333;display:block;">CAP</label>
          <input id="prop-cap" type="text" placeholder="Es. 20100" style="width:100%;padding:8px 10px;font-size:14px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
          <div class="err" id="err-cap" style="display:none;color:#c00;font-size:12px;margin-top:4px;"></div>
        </div>

        <div class="full" style="grid-column:1/-1;">
          <label style="font-size:13px;color:#333;display:block;">Indirizzo</label>
          <input id="prop-indirizzo" type="text" placeholder="Via e numero civico" style="width:100%;padding:8px 10px;font-size:14px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
          <div class="err" id="err-indirizzo" style="display:none;color:#c00;font-size:12px;margin-top:4px;"></div>
        </div>

        <div class="full" style="grid-column:1/-1;">
          <label style="font-size:13px;color:#333;display:block;">Note (opzionale)</label>
          <textarea id="prop-note" rows="3" placeholder="" style="width:100%;padding:8px 10px;font-size:14px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;"></textarea>
        </div>
      </div>

      <div class="actions" style="display:flex;gap:10px;justify-content:flex-end;margin-top:12px;">
        <button id="prop-annulla" style="border:none;border-radius:6px;padding:8px 14px;cursor:pointer;font-weight:600;background:#aaa;color:#fff;">Annulla</button>
        <button id="prop-conferma" style="border:none;border-radius:6px;padding:8px 14px;cursor:pointer;font-weight:600;background:#45AC49;color:#fff;">Genera PDF e apri email</button>
      </div>
    </div>
  </div>
  `;
  document.body.insertAdjacentHTML("beforeend", html);
  const modal = document.getElementById("proposta-modal");

  // utilità
  const $ = id => document.getElementById(id);
  const setErr = (inputEl, errEl, msg) => {
    if (msg) {
      inputEl.style.borderColor = "#c00";
      errEl.textContent = msg;
      errEl.style.display = "block";
    } else {
      inputEl.style.borderColor = "#ccc";
      errEl.textContent = "";
      errEl.style.display = "none";
    }
  };
  const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const isPhone = v => v.replace(/\D/g,'').length >= 7;
  const isCAP = v => /^\d{5}$/.test(v);

  function setAddressDisabled(disabled) {
    ["prop-citta","prop-cap","prop-indirizzo"].forEach(id => {
      const el = $(id);
      el.disabled = disabled;
      el.style.background = disabled ? "#f3f3f3" : "#fff";
      if (disabled) {
        setErr(el, $(`err-${id.split('prop-')[1]}`), "");
      }
    });
  }
  const selRitiro = modal.querySelector("#prop-ritiro");
  const updateAddress = () => setAddressDisabled(selRitiro.value === "SI");
  selRitiro.addEventListener("change", updateAddress);
  updateAddress();

  modal.querySelector("#prop-annulla").addEventListener("click", () => modal.remove());

  // Conferma con validazione
  modal.querySelector("#prop-conferma").addEventListener("click", () => {
    const ragione   = $("prop-ragione").value.trim();
    const referente = $("prop-referente").value.trim();
    const email     = $("prop-email").value.trim();
    const telefono  = $("prop-telefono").value.trim();
    const ritiro    = $("prop-ritiro").value;
    const citta     = $("prop-citta").value.trim();
    const cap       = $("prop-cap").value.trim();
    const indirizzo = $("prop-indirizzo").value.trim();
    const note      = $("prop-note").value.trim();

    setErr($("prop-ragione"), $("err-ragione"), "");
    setErr($("prop-referente"), $("err-referente"), "");
    setErr($("prop-email"), $("err-email"), "");
    setErr($("prop-telefono"), $("err-telefono"), "");
    setErr($("prop-citta"), $("err-citta"), "");
    setErr($("prop-cap"), $("err-cap"), "");
    setErr($("prop-indirizzo"), $("err-indirizzo"), "");

    let ok = true;
    if (!ragione)   { setErr($("prop-ragione"), $("err-ragione"), "Campo obbligatorio"); ok = false; }
    if (!referente) { setErr($("prop-referente"), $("err-referente"), "Campo obbligatorio"); ok = false; }
    if (!email || !isEmail(email)) { setErr($("prop-email"), $("err-email"), "Inserire un'email valida"); ok = false; }
    if (!telefono || !isPhone(telefono)) { setErr($("prop-telefono"), $("err-telefono"), "Inserire un numero valido"); ok = false; }

    if (ritiro === "NO") {
      if (!citta)     { setErr($("prop-citta"), $("err-citta"), "Campo obbligatorio"); ok = false; }
      if (!cap || !isCAP(cap)) { setErr($("prop-cap"), $("err-cap"), "CAP a 5 cifre"); ok = false; }
      if (!indirizzo) { setErr($("prop-indirizzo"), $("err-indirizzo"), "Campo obbligatorio"); ok = false; }
    }

    if (!ok) return;

    const dati = { ragione, referente, email, telefono, ritiro, citta, cap, indirizzo, note };
    modal.remove();
    onConfirm(dati);
  });
}

// =================== Device detection (SOLO iPad) ===================
function isIPadOS() {
  const ua = navigator.userAgent || navigator.vendor || "";
  const iPadUA = /\biPad\b/i.test(ua);
  const macTouch = /\bMacintosh\b/i.test(ua) && 'ontouchend' in document; // iPadOS >= 13
  return iPadUA || macTouch;
}

// =================== PROPOSTA PDF ===================
// ====== PROPOSTA PDF (iPad: share o download diretto; altri: invariato) ======
async function generaPdfProposta(datiCliente, items) {
  if (!items || items.length === 0) { alert("Nessun articolo selezionato. Inserisci almeno una quantità."); return; }
  if (!window.html2pdf) { alert("Libreria PDF non caricata. Metti html2pdf.bundle.min.js prima di script.js"); return; }

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dataStr = `${dd}/${mm}/${yyyy}`;
  const filename = `proposta-acquisto-${yyyy}${mm}${dd}.pdf`;

  // 1) Costruisci contenuto off-screen (uguale al tuo)
  const content = document.createElement("div");
  content.innerHTML = `
  <div style="font-family: Segoe UI, Roboto, Helvetica, Arial; color:#000; padding: 10px; background:#fff;">
    <h2 style="margin:0 0 8px;">Proposta di acquisto</h2>
    <div style="font-size:12px; color:#555; margin-bottom:10px;">Data: ${dataStr}</div>

    <table style="width:95%; border-collapse:collapse; font-size:13px; margin:0 0 10px 0; table-layout:auto;">
      <tr><td style="width:30%; padding:6px 8px; background:#f5f5f5;">Ragione sociale</td><td style="padding:6px 8px;">${datiCliente.ragione || '-'}</td></tr>
      <tr><td style="padding:6px 8px; background:#f5f5f5;">Referente</td><td style="padding:6px 8px;">${datiCliente.referente || '-'}</td></tr>
      <tr><td style="padding:6px 8px; background:#f5f5f5;">Email</td><td style="padding:6px 8px;">${datiCliente.email || '-'}</td></tr>
      <tr><td style="padding:6px 8px; background:#f5f5f5;">Telefono</td><td style="padding:6px 8px;">${datiCliente.telefono || '-'}</td></tr>
      <tr><td style="padding:6px 8px; background:#f5f5f5;">Ritiro in azienda</td><td style="padding:6px 8px;">${datiCliente.ritiro || '-'}</td></tr>
      <tr><td style="padding:6px 8px; background:#f5f5f5;">Città</td><td style="padding:6px 8px;">${datiCliente.citta || '-'}</td></tr>
      <tr><td style="padding:6px 8px; background:#f5f5f5;">CAP</td><td style="padding:6px 8px;">${datiCliente.cap || '-'}</td></tr>
      <tr><td style="padding:6px 8px; background:#f5f5f5;">Indirizzo</td><td style="padding:6px 8px;">${datiCliente.indirizzo || '-'}</td></tr>
      ${datiCliente.note ? `<tr><td style="padding:6px 8px; background:#f5f5f5;">Note</td><td style="padding:6px 8px;">${datiCliente.note}</td></tr>` : ``}
    </table>

    <table style="width:95%; border-collapse:collapse; font-size:12px; table-layout:auto;">
      <thead>
        <tr>
          <th style="width:12%; text-align:left; background:#45AC49; color:#fff; padding:6px; border:1px solid #ccc;">Codice</th>
          <th style="width:42%; text-align:left; background:#45AC49; color:#fff; padding:6px; border:1px solid #ccc;">Descrizione</th>
          <th style="width:10%; text-align:right; background:#45AC49; color:#fff; padding:6px; border:1px solid #ccc;">Prezzo</th>
          <th style="width:10%; text-align:right; background:#45AC49; color:#fff; padding:6px; border:1px solid #ccc;">Promo</th>
          <th style="width:12%; text-align:right; background:#45AC49; color:#fff; padding:6px; border:1px solid #ccc;">Conai/collo</th>
          <th style="width:8%; text-align:center; background:#45AC49; color:#fff; padding:6px; border:1px solid #ccc;">Q.tà</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(it => `
          <tr>
            <td style="border:1px solid #ccc; padding:6px; word-break:break-word;">${it.codice}</td>
            <td style="border:1px solid #ccc; padding:6px; word-break:break-word;">${it.descrizione}</td>
            <td style="border:1px solid #ccc; padding:6px; text-align:right;">${it.prezzo}</td>
            <td style="border:1px solid #ccc; padding:6px; text-align:right;">${it.prezzoPromo}</td>
            <td style="border:1px solid #ccc; padding:6px; text-align:right;">${it.conai}</td>
            <td style="border:1px solid #ccc; padding:6px; text-align:center;">${it.quantita}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <p style="margin-top:8px; font-size:11.5px; color:#444;">
      I prezzi si intendono IVA 22% esclusa. Disponibilità soggetta a conferma.
    </p>
  </div>`;

  // 2) OFF-SCREEN container
  const tmp = document.createElement("div");
  tmp.style.position = "fixed"; tmp.style.left = "-99999px"; tmp.style.top = "0";
  tmp.appendChild(content);
  document.body.appendChild(tmp);

  try {
    if (isIPadOS()) {
      // iPad: prima prova con Web Share, altrimenti download diretto (niente nuove schede)
      await html2pdf()
        .set({
          margin: 6,
          image: { type: "jpeg", quality: 1 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", allowTaint: true, scrollX: 0, scrollY: 0 },
          jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
          pagebreak: { mode: ["css", "legacy"] }
        })
        .from(content)
        .toPdf()
        .get('pdf')
        .then(async (pdf) => {
          const blob = pdf.output('blob');
          const file = new File([blob], filename, { type: 'application/pdf' });

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'Proposta di acquisto' });
          } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;      // forza il salvataggio, senza aprire schede
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 4000);
          }
        });

    } else {
      // PC / smartphone / altri: comportamento invariato
      await html2pdf()
        .set({
          margin: 6,
          filename: filename,
          image: { type: "jpeg", quality: 1 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", allowTaint: true, scrollX: 0, scrollY: 0 },
          jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
          pagebreak: { mode: ["css", "legacy"] }
        })
        .from(content)
        .save();
    }
  } finally {
    document.body.removeChild(tmp);
  }
}


// =================== Email bozza ===================
function apriEmailProposta(datiCliente, itemsCount) {
  const subject = `Proposta di acquisto`;
  const body =
`Buongiorno,

invio proposta di acquisto per gli articoli indicati nel PDF allegato.

Dati cliente
- Ragione sociale: ${datiCliente.ragione || '-'}
- Referente: ${datiCliente.referente || '-'}
- Email: ${datiCliente.email || '-'}
- Telefono: ${datiCliente.telefono || '-'}
- Ritiro in azienda: ${datiCliente.ritiro || '-'}

Indirizzo spedizione
- Città: ${datiCliente.citta || '-'}
- CAP: ${datiCliente.cap || '-'}
- Indirizzo: ${datiCliente.indirizzo || '-'}

Articoli selezionati: ${itemsCount}

Note:
${datiCliente.note || '-'}

Grazie, resto in attesa di conferma disponibilità e tempi.`;

  const mailto = `mailto:preventivi@tecnobox.net?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;
}

// =================== Click "Invia proposta" ===================
document.getElementById("invia-proposta").addEventListener("click", () => {
  const items = getArticoliSelezionati();
  if (items.length === 0) {
    alert("Nessun articolo selezionato. Inserisci almeno una quantità.");
    return;
  }

  apriModalProposta(async (dati) => {
    await generaPdfProposta(dati, items);

    // iPad: chiedi se aprire la mail (evita che il mailto interferisca col salvataggio)
    if (isIPadOS()) {
      const apri = confirm("PDF pronto. Vuoi aprire adesso l'email di proposta?");
      if (apri) apriEmailProposta(dati, items.length);
    } else {
      apriEmailProposta(dati, items.length);
    }
  });
});


// =================== 🆙 Torna su ===================
(function () {
  const SCROLL_THRESHOLD = 600;
  function getScrollContainer() { return document.querySelector(".tabella-scroll"); }
  function updateBtnVisibility() {
    const btn = document.getElementById("btnTop");
    if (!btn) return;
    const winScroll = document.documentElement.scrollTop || document.body.scrollTop || 0;
    const box = getScrollContainer();
    const boxScroll = box ? box.scrollTop : 0;
    const visible = (winScroll > SCROLL_THRESHOLD || boxScroll > SCROLL_THRESHOLD);
    btn.classList.toggle("is-visible", visible);
  }
  window.addEventListener("scroll", updateBtnVisibility, { passive: true });
  window.addEventListener("load", () => {
    const box = getScrollContainer();
    if (box) box.addEventListener("scroll", updateBtnVisibility, { passive: true });
    updateBtnVisibility();
  });
  window.scrollToTop = function () {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior = prefersReduced ? "auto" : "smooth";
    window.scrollTo({ top: 0, behavior });
    const box = getScrollContainer();
    if (box) box.scrollTo({ top: 0, behavior });
  };
})();
