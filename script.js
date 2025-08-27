const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTZBeQDcZ4tT-OSymuH_T89STQqG-OIQ2pmGmrZNSkj5VRVp4q_8oAh5D-bZ8HIIWYMW12xwEECxH5T/pub?output=csv';

let datiOriginali = [];

// -------------------- UTIL --------------------
function getQtyRaw(row) {
  const keys = Object.keys(row);
  const hit = keys.find(k => k.trim().toLowerCase() === 'quantità' || k.trim().toLowerCase() === 'quantita');
  return hit ? row[hit] : row.Quantità || row.Quantita || row['Quantità '] || row['Quantita '] || '';
}

// normalizza numeri stile IT ("1.000", "12,5", "10 pz") -> "1000.0"
function normalizeNumberString(s) {
  if (s == null) return '';
  return s.toString().trim()
    .replace(/\./g, '')       // rimuove separatore migliaia
    .replace(',', '.')        // decimali IT -> punto
    .replace(/[^\d.]+/g, ''); // elimina testo extra
}

function normalizzaQuantita(val) {
  const s = normalizeNumberString(val);
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
// ------------------------------------------------

Papa.parse(sheetURL, {
  download: true,
  header: true,
  transformHeader: h => h.trim(),
  complete: function(results) {
    const raw = results.data || [];
    datiOriginali = raw.filter(r => (r.Codice || r.Descrizione));

    console.log('[DEBUG] headers normalizzati, righe:', datiOriginali.length);
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

    // ---- Quantità: lettura robusta header + calcolo stock ----
    const qtyRaw = (getQtyRaw(row) ?? '').toString().trim();
    const stockNum = normalizzaQuantita(qtyRaw);  // numero JS
    const isSoldOut = stockNum <= 0;

    // step dinamico: 1 se stock >= 1, altrimenti = stock (es. 0.55)
    let stepValue = 1;
    if (stockNum > 0 && stockNum < 1) stepValue = stockNum;

    // input number con frecce + max = stock reale
    const qtyCellHTML = isSoldOut
      ? `<span style="color:red; font-weight:bold;">VENDUTO</span>`
      : `
        <div class="qty-wrap">
          <input
            type="number"
            class="qty-input"
            data-codice="${codice}"
            value="0"
            min="0"
            max="${stockNum}"
            step="${stepValue}"
            inputmode="decimal"
          />
          <small class="qty-hint">disp: ${qtyRaw || stockNum}</small>
        </div>
      `;
    // -----------------------------------------------------------

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
      <td style="text-align:left;">${qtyCellHTML}</td>
      <td style="text-align:center;">${imgTag}</td>
    `;

    if (evidenzia) {
      tr.style.backgroundColor = '#45ac49';
      tr.style.fontWeight = 'bold';
    }

    tbody.appendChild(tr);
  });
}


// -------------------- CATEGORIE --------------------
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

  if (categorieUniche.length === 0) {
    console.error('[DEBUG] Nessuna categoria trovata. Controlla il nome colonna nello Sheet.');
  }

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


// -------------------- PULISCI --------------------
document.getElementById("pulisci-filtro").addEventListener("click", () => {
  document.getElementById("filtro-globale").value = "";
  mostraArticoli(datiOriginali);
  const select = document.getElementById("select-categoria");
  if (select) select.value = "";
});


// -------------------- FILTRO GLOBALE SAFE --------------------
(function () {
  const filtro = document.getElementById("filtro-globale");
  if (!filtro) return;

  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  filtro.addEventListener("input", function (e) {
    const termRaw = e.target.value.trim();
    const term = termRaw.toLowerCase();
    const rows = document.querySelectorAll("#tabella-prodotti tbody tr");

    rows.forEach(tr => {
      let matched = false;

      // Pulisci <mark> SOLO dove non ci sono input/qty
      tr.querySelectorAll("td").forEach(td => {
        const isQtyCell = td.querySelector('.qty-wrap') || td.querySelector('input,select,button');
        if (!isQtyCell) {
          td.innerHTML = td.innerHTML.replace(/<mark>(.*?)<\/mark>/g, "$1");
        }
      });

      if (term === "") {
        tr.style.display = "";
        return;
      }

      tr.querySelectorAll("td").forEach(td => {
        const isQtyCell = td.querySelector('.qty-wrap') || td.querySelector('input,select,button');
        if (isQtyCell) return;

        const testo = td.textContent.toLowerCase();
        if (testo.includes(term)) {
          matched = true;
          const rx = new RegExp(`(${escapeRegExp(termRaw)})`, "gi");
          td.innerHTML = td.innerHTML.replace(rx, "<mark>$1</mark>");
        }
      });

      tr.style.display = matched ? "" : "none";
    });
  });
})();


// -------------------- ZOOM IMG --------------------
function mostraZoom(src) {
  const overlay = document.getElementById("zoomOverlay");
  const zoomedImg = document.getElementById("zoomedImg");
  zoomedImg.src = src;
  overlay.style.display = "flex";
}


// -------------------- PDF LISTA PRODOTTI --------------------
document.getElementById("scarica-pdf").addEventListener("click", () => {
  const visibile = document.querySelector("#tabella-prodotti tbody tr:not([style*='display: none'])");
  if (!visibile) { alert("Nessun articolo da stampare!"); return; }

  const src = document.getElementById("contenuto-pdf");
  const clone = src.cloneNode(true);

  // rimuovi elementi non stampabili
  clone.querySelectorAll(".no-print, .filters, #categorie, #combo-categorie").forEach(el => el.remove());

  // disattiva sticky e overflow nel clone
  const thead = clone.querySelector("#tabella-prodotti thead");
  if (thead) thead.querySelectorAll("th").forEach(th => { th.style.position = "static"; });

  const wrapper = clone.querySelector(".tabella-scroll");
  if (wrapper) { wrapper.style.overflow = "visible"; wrapper.style.maxHeight = "none"; }

  // rimuovi eventuali evidenziazioni
  clone.querySelectorAll('mark').forEach(m => {
    const t = document.createTextNode(m.textContent);
    m.replaceWith(t);
  });

  // trasforma gli input quantità in testo semplice per il PDF
  clone.querySelectorAll('.qty-wrap').forEach(w => {
    const input = w.querySelector('.qty-input');
    const hint  = w.querySelector('.qty-hint')?.textContent || '';
    if (input) {
      const span = document.createElement('span');
      span.textContent = `Q.tà: ${input.value || 0} ${hint ? `(${hint})` : ''}`;
      w.replaceWith(span);
    }
  });

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


// -------------------- TOP BUTTON --------------------
(function () {
  const SCROLL_THRESHOLD = 600;

  function getScrollContainer() {
    return document.querySelector(".tabella-scroll");
  }

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


// -------------------- INPUT QUANTITÀ: virgola, salto finale, cap, pulse MAX --------------------
document.addEventListener('input', function (e) {
  if (!e.target.classList.contains('qty-input')) return;

  const input = e.target;
  const wrap  = input.closest('.qty-wrap');

  // normalizza virgola -> punto per compatibilità con type=number
  if (input.value.includes(',')) {
    const caret = input.selectionStart;
    input.value = input.value.replace(',', '.');
    try { input.setSelectionRange(caret, caret); } catch {}
  }

  const max = parseFloat((input.max || '0').toString().replace(',', '.')) || 0;
  let val = parseFloat(input.value) || 0;

  // “salto finale”:
  // - se step=1 e max ha decimali, quando si supera floor(max) ci si aggancia a max
  const step = parseFloat(input.step) || 1;
  if (step === 1 && max % 1 !== 0) {
    if (val > Math.floor(max) && val < max) {
      val = max;
    }
  }

  // se lo stock < 1, lo step è esattamente lo stock: 0 -> max (un click)
  if (max > 0 && max < 1) {
    // opzionale: forza a multipli di max (in pratica 0 o max)
    if (val > 0 && val < max) val = max;
  }

  // clamp
  if (val > max) val = max;
  if (val < 0) val = 0;

  input.value = val;

  // feedback visivo quando tocchi il massimo
  const atMax = (val === max && max > 0);
  input.classList.toggle('qty-max-reached', atMax);
  if (wrap) wrap.classList.toggle('max-reached', atMax);

  if (atMax && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }

  // aria-live (annuncio screen reader)
  let live = document.getElementById('qty-live');
  if (!live) {
    live = document.createElement('div');
    live.id = 'qty-live';
    live.setAttribute('aria-live', 'polite');
    live.style.position = 'absolute';
    live.style.left = '-9999px';
    document.body.appendChild(live);
  }
  live.textContent = atMax ? 'Quantità massima raggiunta' : '';
});
