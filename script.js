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


    
// const quantita = row.Quantità || '';
 let quantita = row.Quantità || '';

// normalizza a stringa e rimuovi spazi
quantita = quantita.toString().trim();

// se vuoto, zero o negativo → VENDUTO
if (!quantita || parseFloat(quantita.replace(',', '.')) <= 0) {
  quantita = `<span style="color:red; font-weight:bold;">VENDUTO</span>`;
}


    
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
      <td style="text-align:center;">${quantita}</td>
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

// Mostra/nasconde il pulsante "Torna su"
window.onscroll = function() {
  const btn = document.getElementById("btnTop");
  if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
    btn.style.display = "block";
  } else {
    btn.style.display = "none";
  }
};

// Funzione per tornare in cima
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

