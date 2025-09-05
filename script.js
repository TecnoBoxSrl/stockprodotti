const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTZBeQDcZ4tT-OSymuH_T89STQqG-OIQ2pmGmrZNSkj5VRVp4q_8oAh5D-bZ8HIIWYMW12xwEECxH5T/pub?output=csv';

let datiOriginali = [];

Papa.parse(sheetURL, {
  download: true,
  header: true,
  // normalizza nomi colonne
  transformHeader: h => h.trim(),
  complete: function(results) {
    const raw = results.data || [];
    // scarta righe completamente vuote
    datiOriginali = raw.filter(r => (r.Codice || r.Descrizione));

    console.log('[DEBUG] righe caricate:', datiOriginali.length);
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
      // step dinamico a partire dalla frazione della disponibilità
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
}


function popolaCategorie(data) {
  const contenitore = document.getElementById("categorie");
  const select = document.getElementById("select-categoria");
  if (!contenitore && !select) {
    console.warn('[DEBUG] Mancano #categorie e #select-categoria nel DOM');
    return;
  }

  const getCat = r => (r.Categoria ?? r.categoria ?? r['Categoria '] ?? r['categoria ']);

  const categorieUniche = [...new Set(
    data.map(r => (getCat(r) || '').toString().trim()).filter(Boolean)
  )].sort();

  console.log('[DEBUG] categorie trovate:', categorieUniche);

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

// 🧼 Pulsante Pulisci (reset)
document.getElementById("pulisci-filtro").addEventListener("click", function () {
  const input = document.getElementById("filtro-globale");
  input.value = "";
  mostraArticoli(datiOriginali);
  const select = document.getElementById("select-categoria");
  if (select) select.value = "";
});

// 🔍 Zoom immagine
function mostraZoom(src) {
  const overlay = document.getElementById("zoomOverlay");
  const zoomedImg = document.getElementById("zoomedImg");
  zoomedImg.src = src;
  overlay.style.display = "flex";
}

// 📄 PDF
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

// 🔼 Bottone "torna su"
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

/* ======================
   GESTIONE INPUT QUANTITÀ
   - accetta virgola
   - rispetta step e max
   - blocca superamenti anche con frecce
   ====================== */

// Normalizza input quantità: accetta virgola, rispetta max, memorizza in data-normalized
document.addEventListener('input', (e) => {
  if (!e.target.classList.contains('qty-input')) return;

  const el = e.target;
  const max = parseFloat((el.getAttribute('max') || '0').replace(',', '.')) || 0;

  // accetta virgola: converti a punto per parsing
  let val = (el.value || '').replace(',', '.');

  if (val === '') { el.dataset.normalized = ''; return; }

  if (isNaN(val)) {
    val = val.replace(/[^0-9.\-]/g,'');
  }

  let num = parseFloat(val);
  if (isNaN(num)) { el.dataset.normalized = ''; return; }

  if (num < 0) num = 0;
  if (max > 0 && num > max) num = max;

  el.dataset.normalized = num.toString();
});

// Alla conferma (blur/enter) formatta con locale it-IT (virgola)
document.addEventListener('change', (e) => {
  if (!e.target.classList.contains('qty-input')) return;

  const el = e.target;
  const n = parseFloat(el.dataset.normalized || el.value.replace(',', '.'));
  if (!isNaN(n)) {
    // mostra fino a 3 decimali ma non forza sempre 3
    el.value = n.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  }
});

// Protegge dallo sforamento con frecce tastiera/spinner
document.addEventListener('keydown', (e) => {
  if (!e.target.classList.contains('qty-input')) return;

  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    const el = e.target;
    const max = parseFloat((el.getAttribute('max') || '0').replace(',', '.')) || 0;

    // attendi l'aggiornamento dell'input
    setTimeout(() => {
      let v = parseFloat((el.value || '').toString().replace(',', '.'));
      if (isNaN(v)) return;
      if (max > 0 && v > max) {
        el.value = max.toLocaleString('it-IT', { maximumFractionDigits: 3 });
        el.dataset.normalized = max.toString();
      }
    }, 0);
  }
});
