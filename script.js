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

    // ---- Quantità: lettura robusta header + normalizzazione valore ----
    function getQtyRaw(r) {
      const keys = Object.keys(r);
      const hit = keys.find(k => k.trim().toLowerCase() === 'quantità' || k.trim().toLowerCase() === 'quantita');
      return hit ? r[hit] : r.Quantità || r.Quantita || r['Quantità '] || r['Quantita '] || '';
    }

    const qtyRaw = (getQtyRaw(row) ?? '').toString().trim();
    // normalizza per calcolo stock (es. "1.000", "12,5", "10 pz")
    const normalizedStock = qtyRaw.replace(/\./g, '').replace(',', '.').replace(/[^\d.]+/g, '');
    const stockNum = parseFloat(normalizedStock) || 0;
    const isSoldOut = stockNum <= 0;

    // input TESTUALE che accetta virgola o punto
    const qtyCellHTML = isSoldOut
      ? `<span style="color:red; font-weight:bold;">VENDUTO</span>`
      : `
        <div class="qty-wrap">
          <input type="text" class="qty-input" data-codice="${codice}"
                 value="0" placeholder="0,0" 
                 inputmode="decimal"
                 pattern="^[0-9]+([,.][0-9]{1,2})?$" />
          <small class="qty-hint">disp: ${qtyRaw || stockNum}</small>
        </div>
      `;
    // ------------------------------------------------------------------

    // Prezzi e formattazioni (come avevi)
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

// Helper: converte "1,5" -> 1.5 (numero), gestisce stringhe vuote
function normalizzaQuantita(val) {
  if (val == null) return 0;
  const s = val.toString().trim().replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
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



// 🔍 Filtro globale (safe per celle con input quantità)
(function () {
  const filtro = document.getElementById("filtro-globale");
  if (!filtro) return;

  // Escape dei caratteri speciali per costruire la RegExp in sicurezza
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  filtro.addEventListener("input", function (e) {
    const termRaw = e.target.value.trim();
    const term = termRaw.toLowerCase();
    const rows = document.querySelectorAll("#tabella-prodotti tbody tr");

    rows.forEach(tr => {
      let matched = false;

      // 1) Pulisci i <mark> SOLO nelle celle eleggibili (no qty-wrap/input)
      tr.querySelectorAll("td").forEach(td => {
        const isQtyCell = td.querySelector('.qty-wrap') || td.querySelector('input,select,button');
        if (!isQtyCell) {
          td.innerHTML = td.innerHTML.replace(/<mark>(.*?)<\/mark>/g, "$1");
        }
      });

      // 2) Se il termine è vuoto, mostra la riga e passa oltre
      if (term === "") {
        tr.style.display = "";
        return;
      }

      // 3) Evidenzia e determina match SOLO nelle celle eleggibili
      tr.querySelectorAll("td").forEach(td => {
        const isQtyCell = td.querySelector('.qty-wrap') || td.querySelector('input,select,button');
        if (isQtyCell) return; // non toccare la cella quantità

        const testo = td.textContent.toLowerCase();
        if (testo.includes(term)) {
          matched = true;
          const rx = new RegExp(`(${escapeRegExp(termRaw)})`, "gi");
          td.innerHTML = td.innerHTML.replace(rx, "<mark>$1</mark>");
        }
      });

      // 4) Mostra/Nascondi riga
      tr.style.display = matched ? "" : "none";
    });
  });
})();


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
