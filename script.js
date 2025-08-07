const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTZBeQDcZ4tT-OSymuH_T89STQqG-OIQ2pmGmrZNSkj5VRVp4q_8oAh5D-bZ8HIIWYMW12xwEECxH5T/pub?output=csv';

function caricaDati() {
  Papa.parse(sheetURL, {
    download: true,
    header: true,
    complete: function(results) {
      const data = results.data;
      const tbody = document.querySelector("#tabella-prodotti tbody");
      tbody.innerHTML = ""; // 🧹 pulizia tabella

      data.forEach(row => {
        const codice = row.Codice || '';
        const descrizione = row.Descrizione || '';
        const quantita = row.Quantità || '';
        const prezzo = row.Prezzo || '';
        const prezzoPromo = row["Prezzo Promo"] || '';
        const conaicollo = row.Conaicollo || '';
        const categoria = row.Categoria || '';
        const evidenzia = row.Evidenzia?.trim().toUpperCase() === "SI";
        const imgSrc = row.Immagine?.trim() || '';

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

        tr.dataset.categoria = categoria;

        if (evidenzia) {
          tr.style.backgroundColor = '#45ac49';
          tr.style.fontWeight = 'bold';
        }

        tbody.appendChild(tr);
      });
    }
  });
}

caricaDati();

document.getElementById("filtro-globale").addEventListener("input", function(e) {
  const term = e.target.value.trim().toLowerCase();
  const rows = document.querySelectorAll("#tabella-prodotti tbody tr");

  rows.forEach(tr => {
    let visible = false;
    tr.querySelectorAll("td").forEach(td => {
      td.innerHTML = td.innerHTML.replace(/<mark>(.*?)<\/mark>/g, "$1");
      const plain = td.textContent.toLowerCase();
      if (term && plain.includes(term)) {
        visible = true;
        const regex = new RegExp(`(${term})`, "gi");
        td.innerHTML = td.innerHTML.replace(regex, `<mark>$1</mark>`);
      }
    });
    tr.style.display = (term === "" || visible) ? "" : "none";
  });
});

document.getElementById("pulisci-filtro").addEventListener("click", function () {
  const input = document.getElementById("filtro-globale");
  input.value = "";
  input.dispatchEvent(new Event("input"));
  caricaDati(); // 🔄 ricarica dati
  document.querySelectorAll(".btn-categoria").forEach(btn => btn.classList.remove("active-category"));
});

function mostraZoom(src) {
  const overlay = document.getElementById("zoomOverlay");
  const zoomedImg = document.getElementById("zoomedImg");
  zoomedImg.src = src;
  overlay.style.display = "flex";
}
