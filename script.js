const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTZBeQDcZ4tT-OSymuH_T89STQqG-OIQ2pmGmrZNSkj5VRVp4q_8oAh5D-bZ8HIIWYMW12xwEECxH5T/pub?output=csv';

let datiOriginali = [];

Papa.parse(sheetURL, {
  download: true,
  header: true,
  // 🔧 normalizza nomi colonne: via spazi ed uniforma a “titolo case”
  transformHeader: h => h.trim(),
  complete: function(results) {
    const raw = results.data || [];
    // scarta righe completamente vuote
    datiOriginali = raw.filter(r => (r.Codice || r.Descrizione));

    console.log('[DEBUG] headers normalizzati, righe:', datiOriginali.length);
    // stampa un esempio di chiavi reali
    if (datiOriginali[0]) console.log('[DEBUG] chiavi prima riga:', Object.keys(datiOriginali[0]));

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

    // --- Quantità / Disponibilità dallo Sheet (supporta virgola) ---
    const qtyRaw = (row['Quantità'] ?? row['quantità'] ?? row['Qta'] ?? row['Q.tà'] ?? '').toString().trim();
    const stockNum = qtyRaw ? parseFloat(qtyRaw.replace(',', '.')) : 0;
    const isSoldOut = !qtyRaw || isNaN(stockNum) || stockNum <= 0;

    // step: se stock < 1 consenti incremento esattamente uguale allo stock (es. 0,5)
    const stepValue = (!isSoldOut && stockNum < 1) ? stockNum : 1;

    // HTML cella con input limitato al max = stock
    const qtyCellHTML = isSoldOut
      ? `
        <div class="qty-wrap">
          <div class="qty-label">Disponibilità</div>
          <div class="qty-value" style="color:red; font-weight:bold;">VENDUTO</div>
          <input type="number" class="qty-input" value="0" min="0" step="1" disabled />
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
    // ---------------------------------------------------------------

// Gestione digitazione: svuota su focus, clamp su blur/input
document.querySelectorAll('.qty-input:not([disabled])').forEach(inp => {
  // al focus: se vuoto seleziona, se c'è "0" lo seleziona comunque
  inp.addEventListener('focus', () => {
    setTimeout(() => inp.select(), 0);
  });

  // durante la digitazione: consenti vuoto, normalizza virgola/punto e rispetta max/min
  inp.addEventListener('input', () => {
    if (inp.value.trim() === '') return; // vuoto permesso mentre scrive
    let val = inp.value.replace(',', '.');
    let num = parseFloat(val);
    if (isNaN(num)) { inp.value = ''; return; }

    const max = parseFloat(inp.max);
    const min = parseFloat(inp.min) || 0;
    if (!isNaN(max) && num > max) num = max;
    if (!isNaN(min) && num < min) num = min;

    // mostra con virgola in UI se decimale
    inp.value = Number.isInteger(num) ? String(num) : String(num).replace('.', ',');
  });

  // al blur: se resta vuoto rimetti 0
  inp.addEventListener('blur', () => {
    if (inp.value.trim() === '') inp.value = '0';
  });
});




    
    // Prezzi e formattazioni
    const prezzo = row.Prezzo || '';
    const prezzoPromo = row["Prezzo Promo"] || '';
    const conaicollo = row.Conaicollo || '';
    const imgSrc = row.Immagine?.trim() || '';
    const evidenzia = row.Evidenzia?.trim().toUpperCase() === "SI";

    const prezzoFmt = (prezzo && !isNaN(prezzo.replace(',', '.')))
      ? `€${Number(prezzo.replace(',', '.')).toFixed(2).replace('.', ',')}`
      : '';

    const prezzoPromoFmt = (prezzoPromo && !isNaN(prezzoPromo.replace(',', '.')))
      ? `<span style="color:red; font-weight:bold;">€${Number(prezzoPromo.replace(',', '.')).toFixed(2).replace('.', ',')}</span>`
      : '';

    const conaiFmt = (conaicollo && !isNaN(conaicollo.replace(',', '.')))
      ? `€${Number(conaicollo.replace(',', '.')).toFixed(2).replace('.', ',')}`
      : '';

    const imgTag = imgSrc
      ? `<img src="${imgSrc}" alt="foto prodotto" class="zoomable" onclick="mostraZoom('${imgSrc}')">`
      : '';

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

  // 🔒 Hard clamp: impedisce di superare il max anche digitando a mano
  document.querySelectorAll('.qty-input:not([disabled])').forEach(inp => {
    inp.addEventListener('input', () => {
      const max = parseFloat(inp.max);
      const min = parseFloat(inp.min) || 0;
      let val = inp.value.replace(',', '.');      // consenti virgola in input
      let num = parseFloat(val);
      if (isNaN(num)) { num = 0; }
      if (num > max) num = max;
      if (num < min) num = min;
      // normalizza visualizzazione (virgola per decimali italiani)
      inp.value = (Number.isInteger(num) ? num.toString() : num.toString().replace('.', ','));
    });
    inp.addEventListener('change', () => inp.dispatchEvent(new Event('input')));
  });
}



function popolaCategorie(data) {
  const contenitore = document.getElementById("categorie");
  const select = document.getElementById("select-categoria");
  if (!contenitore && !select) {
    console.warn('[DEBUG] Mancano #categorie e #select-categoria nel DOM');
    return;
  }

  // prendi la categoria con fallback su varianti di intestazione
  const getCat = r => (r.Categoria ?? r.categoria ?? r['Categoria '] ?? r['categoria ']);
  const categorieUniche = [...new Set(
    data.map(r => (getCat(r) || '').toString().trim()).filter(Boolean)
  )].sort();

  console.log('[DEBUG] categorie trovate:', categorieUniche);

  // Nessuna categoria? Mostra riga di diagnosi in pagina
  if (categorieUniche.length === 0) {
    console.error('[DEBUG] Nessuna categoria trovata. Controlla il nome colonna nello Sheet.');
  }

  // --- BOTTONI (desktop) ---
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

  // --- COMBO (mobile) ---
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



// 🔍 Filtro globale
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

// 🧼 Pulsante Pulisci
document.getElementById("pulisci-filtro").addEventListener("click", function () {
  const input = document.getElementById("filtro-globale");
  input.value = "";
  mostraArticoli(datiOriginali); // RESET

const select = document.getElementById("select-categoria");
  if (select) {
    select.value = "";
  }
});

// 🔍 Zoom immagine
function mostraZoom(src) {
  const overlay = document.getElementById("zoomOverlay");
  const zoomedImg = document.getElementById("zoomedImg");
  zoomedImg.src = src;
  overlay.style.display = "flex";
}

// 📄 PDF: header + tabella, multipagina A4, senza filtri/categorie, con override CSS per evitare tagli
document.getElementById("scarica-pdf").addEventListener("click", () => {
  const visibile = document.querySelector("#tabella-prodotti tbody tr:not([style*='display: none'])");
  if (!visibile) { alert("Nessun articolo da stampare!"); return; }

  const src = document.getElementById("contenuto-pdf");
  const clone = src.cloneNode(true);

  // rimuovi ciò che non vuoi
  clone.querySelectorAll(".no-print, .filters, #categorie, #combo-categorie").forEach(el => el.remove());

  // disattiva sticky e overflow nel clone
  const thead = clone.querySelector("#tabella-prodotti thead");
  if (thead) thead.querySelectorAll("th").forEach(th => { th.style.position = "static"; });

  const wrapper = clone.querySelector(".tabella-scroll");
  if (wrapper) { wrapper.style.overflow = "visible"; wrapper.style.maxHeight = "none"; }

  // ⚠️ OVERRIDE CSS SOLO NEL CLONE per evitare tagli a destra
  const styleFix = document.createElement("style");
  styleFix.textContent = `
    #tabella-prodotti { width: 95% !important; table-layout: auto !important; }
    #tabella-prodotti th, #tabella-prodotti td { white-space: normal !important; }
    #tabella-prodotti th, #tabella-prodotti td { font-size: 13px !important; padding: 6px !important; }
    #tabella-prodotti img { max-width: 80px !important; height: auto !important; }
.immagine-shock{max-width:160px!important;height:auto!important}
  `;
  clone.appendChild(styleFix);

  // monta off-screen
  const tmp = document.createElement("div");
  tmp.style.position = "fixed";
  tmp.style.left = "-99999px";
  tmp.appendChild(clone);
  document.body.appendChild(tmp);

  html2pdf()
    .set({
      margin: 1, // mm
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

(function () {
  const SCROLL_THRESHOLD = 600;

  function getScrollContainer() {
    return document.querySelector(".tabella-scroll");
  }

  function scrolledAmount() {
    const winScroll =
      document.documentElement.scrollTop || document.body.scrollTop || 0;
    const box = getScrollContainer();
    const boxScroll = box ? box.scrollTop : 0;
    return { winScroll, boxScroll };
  }

 function updateBtnVisibility() {
  const btn = document.getElementById("btnTop");
  if (!btn) return;

  const winScroll = document.documentElement.scrollTop || document.body.scrollTop || 0;
  const box = document.querySelector(".tabella-scroll");
  const boxScroll = box ? box.scrollTop : 0;

  const visible = (winScroll > SCROLL_THRESHOLD || boxScroll > SCROLL_THRESHOLD);
  btn.classList.toggle("is-visible", visible);
}


  // Listener su finestra
  window.addEventListener("scroll", updateBtnVisibility, { passive: true });
  // Listener sul contenitore scrollabile (dopo che esiste nel DOM)
  window.addEventListener("load", () => {
    const box = getScrollContainer();
    if (box) box.addEventListener("scroll", updateBtnVisibility, { passive: true });
    updateBtnVisibility(); // stato iniziale
  });

  // Funzione globale richiamata dal bottone
  window.scrollToTop = function () {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior = prefersReduced ? "auto" : "smooth";

    // scrolla la finestra
    window.scrollTo({ top: 0, behavior });
    // scrolla anche il contenitore
    const box = getScrollContainer();
    if (box) box.scrollTo({ top: 0, behavior });
  };
})();



// ====== UTILI: articoli selezionati (qty > 0) ======
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
    const val = inp.value ? inp.value.toString().replace(',', '.') : "0";
    const qty = parseFloat(val);
    if (!isNaN(qty) && qty > 0) {
      items.push({
        codice, descrizione, prezzo, prezzoPromo, conai,
        quantita: inp.value  // mantieni formattazione con virgola se presente
      });
    }
  });
  return items;
}

// ====== MODAL per i dati cliente ======
function apriModalProposta(onConfirm) {
  // se esiste già, rimuovi
  const old = document.getElementById("proposta-modal");
  if (old) old.remove();

  const html = `
    <div id="proposta-modal">
      <div class="box">
        <h3>Invia proposta</h3>
        <div class="grid">
          <div class="full">
            <label>Ragione sociale</label>
            <input id="prop-ragione" type="text" placeholder="Es. Tecno Box Srl">
          </div>
          <div>
            <label>Referente</label>
            <input id="prop-referente" type="text" placeholder="Nome Cognome">
          </div>
          <div>
            <label>Email</label>
            <input id="prop-email" type="email" placeholder="esempio@mail.com">
          </div>
          <div>
            <label>Ritiro in azienda?</label>
            <select id="prop-ritiro">
              <option value="SI">SI</option>
              <option value="NO">NO</option>
            </select>
          </div>
          <div>
            <label>Località spedizione</label>
            <input id="prop-localita" type="text" placeholder="Città / CAP / indirizzo (se noto)">
          </div>
          <div class="full">
            <label>Note (opzionale)</label>
            <textarea id="prop-note" rows="3" placeholder="Es. preferenza su orari, richiesta bancale, ecc."></textarea>
          </div>
        </div>
        <div class="actions">
          <button class="btn cancel" id="prop-annulla">Annulla</button>
          <button class="btn go" id="prop-conferma">Genera PDF e apri email</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", html);
  const modal = document.getElementById("proposta-modal");
  modal.style.display = "flex";

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

// ====== PDF con soli articoli selezionati ======
function generaPdfProposta(datiCliente, items) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth()+1).padStart(2,'0');
  const dd = String(now.getDate()).padStart(2,'0');
  const dataStr = `${dd}/${mm}/${yyyy}`;

  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-99999px";

  wrapper.innerHTML = `
  <div style="font-family: Segoe UI, Roboto, Helvetica, Arial; padding: 10px;">
    <h2 style="margin:0 0 8px;">Proposta di acquisto</h2>
    <div style="font-size:13px; color:#555; margin-bottom:10px;">Data: ${dataStr}</div>

    <table style="width:100%; border-collapse:collapse; font-size:14px; margin-bottom:12px;">
      <tr>
        <td style="width:30%; padding:6px 8px; background:#f5f5f5;">Ragione sociale</td>
        <td style="padding:6px 8px;">${datiCliente.ragione || '-'}</td>
      </tr>
      <tr>
        <td style="padding:6px 8px; background:#f5f5f5;">Referente</td>
        <td style="padding:6px 8px;">${datiCliente.referente || '-'}</td>
      </tr>
      <tr>
        <td style="padding:6px 8px; background:#f5f5f5;">Email</td>
        <td style="padding:6px 8px;">${datiCliente.email || '-'}</td>
      </tr>
      <tr>
        <td style="padding:6px 8px; background:#f5f5f5;">Ritiro azienda</td>
        <td style="padding:6px 8px;">${datiCliente.ritiro || '-'}</td>
      </tr>
      <tr>
        <td style="padding:6px 8px; background:#f5f5f5;">Località spedizione</td>
        <td style="padding:6px 8px;">${datiCliente.localita || '-'}</td>
      </tr>
      ${datiCliente.note ? `
      <tr>
        <td style="padding:6px 8px; background:#f5f5f5;">Note</td>
        <td style="padding:6px 8px;">${datiCliente.note}</td>
      </tr>` : ``}
    </table>

    <table style="width:100%; border-collapse:collapse; font-size:13px;">
      <thead>
        <tr>
          <th style="text-align:left; background:#45AC49; color:#fff; padding:6px; border:1px solid #ccc;">Codice</th>
          <th style="text-align:left; background:#45AC49; color:#fff; padding:6px; border:1px solid #ccc;">Descrizione</th>
          <th style="text-align:right; background:#45AC49; color:#fff; padding:6px; border:1px solid #ccc;">Prezzo</th>
          <th style="text-align:right; background:#45AC49; color:#fff; padding:6px; border:1px solid #ccc;">Promo</th>
          <th style="text-align:right; background:#45AC49; color:#fff; padding:6px; border:1px solid #ccc;">Conai/collo</th>
          <th style="text-align:center; background:#45AC49; color:#fff; padding:6px; border:1px solid #ccc;">Q.tà</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(it => `
          <tr>
            <td style="border:1px solid #ccc; padding:6px;">${it.codice}</td>
            <td style="border:1px solid #ccc; padding:6px;">${it.descrizione}</td>
            <td style="border:1px solid #ccc; padding:6px; text-align:right;">${it.prezzo}</td>
            <td style="border:1px solid #ccc; padding:6px; text-align:right;">${it.prezzoPromo}</td>
            <td style="border:1px solid #ccc; padding:6px; text-align:right;">${it.conai}</td>
            <td style="border:1px solid #ccc; padding:6px; text-align:center;">${it.quantita}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <p style="margin-top:8px; font-size:12px; color:#444;">
      I prezzi si intendono IVA 22% esclusa. Disponibilità soggetta a conferma.
    </p>
  </div>
  `;
  document.body.appendChild(wrapper);

  // genera e salva PDF
  return html2pdf()
    .set({
      margin: 10,
      filename: `proposta-acquisto-${yyyy}${mm}${dd}.pdf`,
      image: { type: "jpeg", quality: 1 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: true, scrollX: 0, scrollY: 0 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    })
    .from(wrapper)
    .save()
    .then(() => document.body.removeChild(wrapper))
    .catch(() => document.body.removeChild(wrapper));
}

// ====== Email: costruisci bozza e apri client ======
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
  // 1) raccogli gli articoli con qty > 0
  const items = getArticoliSelezionati();
  if (items.length === 0) {
    alert("Nessun articolo selezionato. Inserisci almeno una quantità.");
    return;
  }
  // 2) chiedi dati cliente
  apriModalProposta(async (dati) => {
    // 3) genera PDF, poi apri mail
    await generaPdfProposta(dati, items);
    apriEmailProposta(dati, items.length);
  });
});
