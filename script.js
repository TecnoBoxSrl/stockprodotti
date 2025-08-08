const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTZBeQDcZ4tT-OSymuH_T89STQqG-OIQ2pmGmrZNSkj5VRVp4q_8oAh5D-bZ8HIIWYMW12xwEECxH5T/pub?output=csv';

let datiOriginali = [];

Papa.parse(sheetURL, {
  download: true,
  header: true,
  complete: function(results) {
    datiOriginali = results.data.filter(row => row.Codice); // rimuovi righe vuote
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
    const quantita = row.Quantità || '';
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
  const categorieUniche = [...new Set(data.map(r => r.Categoria).filter(Boolean))].sort();

  // Bottoni (desktop)
  if (contenitore) {
    contenitore.innerHTML = "";
    categorieUniche.forEach(cat => {
      const btn = document.createElement("button");
      btn.textContent = cat;
      btn.classList.add("btn-categoria");
      btn.onclick = () => mostraArticoli(datiOriginali.filter(r => r.Categoria === cat));
      contenitore.appendChild(btn);
    });
  }

  // Combo (mobile)
  if (select) {
    select.innerHTML = '<option value="">Scegli la categoria di articoli</option>';
    categorieUniche.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      select.appendChild(opt);
    });
    if (!select.dataset.bound) {
      select.addEventListener("change", () => {
        if (select.value === "") mostraArticoli(datiOriginali);
        else mostraArticoli(datiOriginali.filter(r => r.Categoria === select.value));
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
