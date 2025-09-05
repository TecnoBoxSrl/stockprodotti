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


// ====================
// Rendering tabella
// ====================
function mostraArticoli(data) {
  const tbody = document.querySelector("#tabella-prodotti tbody");
  tbody.innerHTML = "";

  data.forEach(row => {
    const codice = row.Codice || '';
    const descrizione = row.Descrizione || '';

    const prezzo = row.Prezzo || '';
    const prezzoPromo = row["Prezzo Promo"] || '';
    const conaicollo = row.Conaicollo || '';

    const imgSrc = (row.Immagine || '').toString().trim();
    const evidenzia = (row.Evidenzia || '').toString().trim().toUpperCase() === "SI";

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

    // --- Disponibilità (Quantità a magazzino) ---
    const stockRaw = (row.Quantità || row['Disponibilità'] || row['Esistenza'] || '').toString().trim();
    const stockNum = parseFloat(stockRaw.replace(',', '.')) || 0;

    let qtyCellHTML = '';
    if (stockNum <= 0) {
      qtyCellHTML = `<span style="color:red; font-weight:bold;">VENDUTO</span>`;
    } else {
      // step dinamico in base alla frazione
      const frac = Math.abs(stockNum - Math.floor(stockNum));
      let step = '0.01';
      if (Math.abs(frac - 0.5) < 1e-9) step = '0.5';
      else if (Math.abs(frac - 0.25) < 1e-9 || Math.abs(frac - 0.75) < 1e-9) step = '0.25';

      qtyCellHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
          <div style="font-size:12px; color:#666;">Disponibilità<br><strong>${stockNum.toLocaleString('it-IT')}</strong></div>
          <input
            type="number"
            class="qty-input"
            data-codice="${codice}"
            min="0"
            max="${stockNum}"
            step="${step}"
            inputmode="decimal"
            lang="it"
            style="width:80px; text-align:center;"
            placeholder="0"
          />
        </div>`;
    }

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
}


// ====================
// Categorie (bottoni + combo)
// ====================
function popolaCategorie(data) {
  const contenitore = document.getElementById("categorie");
  const select = document.getElementById("select-categoria");
  if (!contenitore && !select) return;

  const getCat = r => (r.Categoria ?? r.categoria ?? r['Categoria '] ?? r['categoria ']);

  const categorieUniche = [...new Set(
    data.map(r => (getCat(r) || '').toString().trim()).filter(Boolean)
  )].sort();

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


// ====================
// Filtro globale + pulisci
// ====================
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


// ====================
// Zoom immagine
// ====================
function mostraZoom(src) {
  const overlay = document.getElementById("zoomOverlay");
  const zoomedImg = document.getElementById("zoomedImg");
  zoomedImg.src = src;
  overlay.style.display = "flex";
}


// ====================
// PDF export
// ====================
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


// ====================
// Bottone "torna su"
// ====================
(function () {
  const SCROLL_THRESHOLD = 600;

  function getScrollContainer() {
    return document.querySelector(".tabella-scroll");
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


// ======================
// GESTIONE INPUT QUANTITÀ
// - accetta la virgola (convertita in . al volo)
// - nessuna formattazione "it-IT" sull'input number (spinner ok)
// - clamp a max e rispetto dello step
// ======================
document.addEventListener('input', (e) => {
  if (!e.target.classList.contains('qty-input')) return;
  const el = e.target;

  // converte virgola in punto per i controlli nativi
  if (el.value.includes(',')) {
    const caret = el.selectionStart;
    el.value = el.value.replace(',', '.');
    try { el.setSelectionRange(caret, caret); } catch {}
  }

  const maxAttr = el.getAttribute('max') || '0';
  const max = parseFloat(maxAttr.toString().replace(',', '.')) || 0;

  let v = el.valueAsNumber;
  if (Number.isNaN(v)) return;

  if (max > 0 && v > max) {
    el.value = String(max);
  } else if (v < 0) {
    el.value = '0';
  }
});


// ======================
// INVIA PROPOSTA DI ACQUISTO (mailto)
// ======================
(function setupInviaProposta() {
  const btn = document.getElementById('invia-proposta');
  if (!btn) return;

  const parseEuro = (txt) => {
    let s = (txt || '').toString();
    s = s.replace(/[^\d,.\-]/g, '');            // lascia cifre, , . e -
    s = s.replace(/\./g, '').replace(',', '.'); // rimuovi migliaia, usa . come decimale
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };

  const fmtEuro = (n) => n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  btn.addEventListener('click', (e) => {
    e.preventDefault();

    // salva l'ultimo valore digitato
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();

    const righe = Array.from(document.querySelectorAll('#tabella-prodotti tbody tr'));
    const selezionati = [];

    righe.forEach(tr => {
      const input = tr.querySelector('.qty-input');
      if (!input) return;

      const raw = (input.value || '').replace(',', '.');
      const qty = parseFloat(raw);
      if (!qty || qty <= 0) return;

      const codice = (tr.querySelector('.td-codice')?.textContent || '').trim();
      const descr  = (tr.querySelector('.td-desc')?.textContent || '').trim();

      const prezzoPromoTxt = (tr.querySelector('.td-prezzo-promo')?.textContent || '').trim();
      const prezzoTxt      = (tr.querySelector('.td-prezzo')?.textContent || '').trim();

      const unit = parseEuro(prezzoPromoTxt) || parseEuro(prezzoTxt) || 0;
      const totale = unit * qty;

      selezionati.push({ codice, descr, qty, unit, totale });
    });

    if (selezionati.length === 0) {
      alert('Inserisci almeno una quantità prima di inviare la proposta.');
      return;
    }

    const totaleMerce = selezionati.reduce((sum, r) => sum + r.totale, 0);

    let body = '';
    body += 'Buongiorno, invio proposta di acquisto dalla pagina "Linea Prodotti in Svendita".%0D%0A%0D%0A';
    body += 'Righe selezionate:%0D%0A';
    selezionati.forEach((r, i) => {
      body += `${i+1}) ${r.codice} — Q.tà: ${r.qty} — Prezzo: € ${fmtEuro(r.unit)} — Totale: € ${fmtEuro(r.totale)}%0D%0A`;
      body += `   ${r.descr}%0D%0A`;
    });
    body += `%0D%0ATOTALE MERCE: € ${fmtEuro(totaleMerce)} (IVA e trasporto esclusi)%0D%0A`;
    body += `%0D%0ADATI CLIENTE:%0D%0A- Ragione Sociale:%0D%0A- Nome e Cognome:%0D%0A- Telefono:%0D%0A- Email:%0D%0A- Note:%0D%0A`;

    const subject = `Proposta di acquisto – ${selezionati.length} articoli`;
    const mailto = `mailto:preventivi@tecnobox.net?subject=${encodeURIComponent(subject)}&body=${body}`;

    window.location.href = mailto;
  });
})();
