const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTZBeQDcZ4tT-OSymuH_T89STQqG-OIQ2pmGmrZNSkj5VRVp4q_8oAh5D-bZ8HIIWYMW12xwEECxH5T/pub?output=csv';

let datiOriginali = [];

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

    const stepValue = (!isSoldOut && stockNum < 1) ? stockNum : 1;

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
          />
        </div>
      `;
    // ====================================

    // Prezzi e formattazioni
    const prezzo = row.Prezzo || '';
    const prezzoPromo = row["Prezzo Promo"] || '';
    const conaicollo = row.Conaicollo || '';
    const imgSrc = row.Immagine?.trim() || '';
    const evidenzia = row.Evidenzia?.trim().toUpperCase() === "SI";

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
      <td>${codice}</td>
      <td>${descrizione}</td>
      <td style="text-align:right;">${prezzoFmt}</td>
      <td style="text-align:right;">${prezzoPromoFmt}</td>
      <td style="text-align:right;">${conaiFmt}</td>
      <td style="text-align:center;">${qtyCellHTML}</td>
      <td style="text-align:center;">${imgTag}</td>
    `;

    if (evidenzia) {
      tr.style.backgroundColor = '#45ac49';
      tr.style.fontWeight = 'bold';
    }

    tbody.appendChild(tr);
  });

  // 🔒 Hard clamp (rispetta max/min, consente campo vuoto, gestisce virgola)
  document.querySelectorAll('.qty-input:not([disabled])').forEach(inp => {
    inp.addEventListener('input', () => {
      if (inp.value.trim() === '') return;  // consenti vuoto mentre scrive
      let val = inp.value.replace(',', '.');
      let num = parseFloat(val);
      if (isNaN(num)) { inp.value = ''; return; }

      const max = parseFloat(inp.max);
      const min = parseFloat(inp.min) || 0;
      if (!isNaN(max) && num > max) num = max;
      if (!isNaN(min) && num < min) num = min;

      inp.value = Number.isInteger(num) ? String(num) : String(num).replace('.', ',');
    });
    inp.addEventListener('change', () => inp.dispatchEvent(new Event('input')));
  });
}

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

// reset combo nel "Pulisci"
document.getElementById("pulisci-filtro").addEventListener("click", () => {
  document.getElementById("filtro-globale").value = "";
  mostraArticoli(datiOriginali);
  const select = document.getElementById("select-categoria");
  if (select) select.value = "";
});

// 🔍 Filtro globale + evidenzia
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

// 🔍 Zoom immagine
function mostraZoom(src) {
  const overlay = document.getElementById("zoomOverlay");
  const zoomedImg = document.getElementById("zoomedImg");
  zoomedImg.src = src;
  overlay.style.display = "flex";
}

// 📄 PDF completo (elenco attualmente visibile)
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

// ====== PROPOSTA: selezione articoli con qty > 0 ======
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
      items.push({ codice, descrizione, prezzo, prezzoPromo, conai, quantita: inp.value || String(qty).replace('.', ',') });
    }
  });
  return items;
}

// ====== MODAL dati cliente (con stile inline per essere autonomo) ======
function apriModalProposta(onConfirm) {
  const old = document.getElementById("proposta-modal");
  if (old) old.remove();

  const html = `
  <div id="proposta-modal" style="position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:10000;">
    <div class="box" style="background:#fff;width:95%;max-width:650px;border-radius:10px;padding:16px 18px;box-shadow:0 10px 30px rgba(0,0,0,.2);font-family:Segoe UI,Roboto,Helvetica Neue,Arial;">
      <h3 style="margin:0 0 10px;font-size:20px;">Invia proposta</h3>
      <div class="grid" style="display:grid;gap:10px;grid-template-columns:1fr 1fr;">
        <div class="full" style="grid-column:1/-1;">
          <label style="font-size:13px;color:#333;display:block;">Ragione sociale</label>
          <input id="prop-ragione" type="text" placeholder="Es. Tecno Box Srl" style="width:100%;padding:8px 10px;font-size:14px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:13px;color:#333;display:block;">Referente</label>
          <input id="prop-referente" type="text" placeholder="Nome Cognome" style="width:100%;padding:8px 10px;font-size:14px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:13px;color:#333;display:block;">Email</label>
          <input id="prop-email" type="email" placeholder="esempio@mail.com" style="width:100%;padding:8px 10px;font-size:14px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:13px;color:#333;display:block;">Ritiro in azienda?</label>
          <select id="prop-ritiro" style="width:100%;padding:8px 10px;font-size:14px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
            <option value="SI">SI</option>
            <option value="NO">NO</option>
          </select>
        </div>
        <div>
          <label style="font-size:13px;color:#333;display:block;">Località spedizione</label>
          <input id="prop-localita" type="text" placeholder="Città / CAP / indirizzo (se noto)" style="width:100%;padding:8px 10px;font-size:14px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
        </div>
        <div class="full" style="grid-column:1/-1;">
          <label style="font-size:13px;color:#333;display:block;">Note (opzionale)</label>
          <textarea id="prop-note" rows="3" placeholder="Es. preferenza su orari, richiesta bancale, ecc." style="width:100%;padding:8px 10px;font-size:14px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;"></textarea>
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

  modal.querySelector("#prop-annulla").addEventListener("click", () => modal.remove());
  modal.querySelector("#prop-conferma").addEventListener("click", () => {
    const dati = {
      ragione: document.getElementById("prop-ragione").value.trim(),
      referente: document.getElementById("prop-referente").value.trim(),
      email: document.getElementById("prop-email").value.trim(),
      ritiro: document.getElementById("prop-ritiro").value,
      localita: document.getElementById("prop-localita").value.trim(),
      note: document.getElementById("prop-note").value.trim(),
    };
    modal.remove();
    onConfirm(dati);
  });
}

// ====== PDF proposta (solo articoli selezionati) ======
function generaPdfProposta(datiCliente, items) {
  if (!items || items.length === 0) {
    alert("Nessun articolo selezionato. Inserisci almeno una quantità.");
    return Promise.resolve();
  }

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth()+1).padStart(2,'0');
  const dd = String(now.getDate()).padStart(2,'0');
  const dataStr = `${dd}/${mm}/${yyyy}`;

  // off-screen ma con layout reale
  const wrapper = document.createElement("div");
  wrapper.id = "pdf-proposta-temp";
  Object.assign(wrapper.style, {
    position: "absolute",
    left: "-10000px",
    top: "0",
    width: "297mm",       // larghezza A4 orizzontale
    background: "#ffffff",
    visibility: "hidden",
  });

  // NOTE DI LAYOUT:
  // - font 12/13px
  // - padding celle 5/6px
  // - image max-width 70px
  // - col width: Cod 12%, Desc 42%, Prezzo 10%, Promo 10%, Conai 12%, Q.tà 8%
  wrapper.innerHTML = `
  <div style="font-family: Segoe UI, Roboto, Helvetica, Arial; color:#000; padding: 10px; background:#fff;">
    <h2 style="margin:0 0 8px;">Proposta di acquisto</h2>
    <div style="font-size:12px; color:#555; margin-bottom:10px;">Data: ${dataStr}</div>

    <table style="width:95%; border-collapse:collapse; font-size:13px; margin:0 0 10px 0; table-layout:auto;">
      <tr><td style="width:30%; padding:6px 8px; background:#f5f5f5;">Ragione sociale</td><td style="padding:6px 8px;">${datiCliente.ragione || '-'}</td></tr>
      <tr><td style="padding:6px 8px; background:#f5f5f5;">Referente</td><td style="padding:6px 8px;">${datiCliente.referente || '-'}</td></tr>
      <tr><td style="padding:6px 8px; background:#f5f5f5;">Email</td><td style="padding:6px 8px;">${datiCliente.email || '-'}</td></tr>
      <tr><td style="padding:6px 8px; background:#f5f5f5;">Ritiro azienda</td><td style="padding:6px 8px;">${datiCliente.ritiro || '-'}</td></tr>
      <tr><td style="padding:6px 8px; background:#f5f5f5;">Località spedizione</td><td style="padding:6px 8px;">${datiCliente.localita || '-'}</td></tr>
      ${datiCliente.note ? `<tr><td style="padding:6px 8px; background:#f5f5f5;">Note</td><td style="padding:6px 8px;">${datiCliente.note}</td></tr>` : ``}
    </table>

    <table style="width:95%; border-collapse:collapse; font-size:12px; table-layout:auto;">
      <thead>
        <tr>
          <th style="width:12%; text-align:left; background:#45AC49; color:#fff; padding:6px; border:1px solid #ccc; white-space:normal;">Codice</th>
          <th style="width:42%; text-align:left; background:#45AC49; color:#fff; padding:6px; border:1px solid #ccc; white-space:normal;">Descrizione</th>
          <th style="width:10%; text-align:right; background:#45AC49; color:#fff; padding:6px; border:1px solid #ccc; white-space:normal;">Prezzo</th>
          <th style="width:10%; text-align:right; background:#45AC49; color:#fff; padding:6px; border:1px solid #ccc; white-space:normal;">Promo</th>
          <th style="width:12%; text-align:right; background:#45AC49; color:#fff; padding:6px; border:1px solid #ccc; white-space:normal;">Conai/collo</th>
          <th style="width:8%; text-align:center; background:#45AC49; color:#fff; padding:6px; border:1px solid #ccc; white-space:normal;">Q.tà</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(it => `
          <tr>
            <td style="border:1px solid #ccc; padding:6px; white-space:normal; word-break:break-word;">${it.codice}</td>
            <td style="border:1px solid #ccc; padding:6px; white-space:normal; word-break:break-word;">${it.descrizione}</td>
            <td style="border:1px solid #ccc; padding:6px; text-align:right; white-space:normal;">${it.prezzo}</td>
            <td style="border:1px solid #ccc; padding:6px; text-align:right; white-space:normal;">${it.prezzoPromo}</td>
            <td style="border:1px solid #ccc; padding:6px; text-align:right; white-space:normal;">${it.conai}</td>
            <td style="border:1px solid #ccc; padding:6px; text-align:center; white-space:normal;">${it.quantita}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <p style="margin-top:8px; font-size:11.5px; color:#444;">
      I prezzi si intendono IVA 22% esclusa. Disponibilità soggetta a conferma.
    </p>
  </div>
  `;

  document.body.appendChild(wrapper);
  
// ✅ LOG DI DEBUG + MICRO-ATTESA PRIMA DELLA CATTURA
  console.log("[DEBUG] items per PDF:", items.length, items);
  await new Promise(r => requestAnimationFrame(r)); // aspetta un frame
  await new Promise(r => setTimeout(r, 30));        // piccola attesa extra per layout/fonts
  console.log("[DEBUG] wrapper size:", wrapper.offsetWidth, "x", wrapper.offsetHeight);
  
  return html2pdf()
    .set({
      margin: 6, // mm: più stretto, più contenuto entra
      filename: `proposta-acquisto-${yyyy}${mm}${dd}.pdf`,
      image: { type: "jpeg", quality: 1 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", allowTaint: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },  // <-- come il tuo "scarica PDF"
      pagebreak: { mode: ["css", "legacy"] }
    })
    .from(wrapper)
    .save()
    .then(() => document.body.removeChild(wrapper))
    .catch(() => document.body.removeChild(wrapper));
}


// ====== Email bozza ======
function apriEmailProposta(datiCliente, itemsCount) {
  const subject = `Proposta di acquisto`;
  const body = 
`Buongiorno,

invio proposta di acquisto per gli articoli indicati nel PDF allegato.

Dati cliente
- Ragione sociale: ${datiCliente.ragione || '-'}
- Referente: ${datiCliente.referente || '-'}
- Email: ${datiCliente.email || '-'}
- Ritiro in azienda: ${datiCliente.ritiro || '-'}
- Località spedizione: ${datiCliente.localita || '-'}

Articoli selezionati: ${itemsCount}

Note:
${datiCliente.note || '-'}

Grazie, resto in attesa di conferma disponibilità e tempi.`;

  const mailto = `mailto:preventivi@tecnobox.net?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;
}

// ====== Click "Invia proposta" ======
document.getElementById("invia-proposta").addEventListener("click", () => {
  const items = getArticoliSelezionati();
  if (items.length === 0) {
    alert("Nessun articolo selezionato. Inserisci almeno una quantità.");
    return;
  }
  apriModalProposta(async (dati) => {
    await generaPdfProposta(dati, items);
    apriEmailProposta(dati, items.length);
  });
});

// 🆙 Torna su
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
