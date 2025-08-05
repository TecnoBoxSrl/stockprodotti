const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRRDCJzWLq3Xy-EkBQqzANaYZy-Ln_xFpKw8fFS8qvS9yA939BnLOyvXPTvLnu0eA/pub?output=csv';

Papa.parse(sheetURL, {
    download: true,
    header: true,
    complete: function(results) {
        const data = results.data;
        const tbody = document.querySelector("#tabella-prodotti tbody");

        data.forEach(row => {
            const codice = row.Codice || '';
            const descrizione = row.Descrizione || '';
            const quantita = row.Quantità || '';
            const prezzo = row.Prezzo || '';
            const prezzoPromo = row["Prezzo Promo"] || '';
            const conaicollo = row.Conaicollo || '';
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
                <td>${quantita}</td>
                <td>${prezzoFmt}</td>
                <td>${prezzoPromoFmt}</td>
                <td>${conaiFmt}</td>
                <td>${imgTag}</td>
            `;

            if (evidenzia) {
                tr.style.backgroundColor = '#45ac49';
                tr.style.fontWeight = 'bold';
            }

            tbody.appendChild(tr);
        });
    }
});

// 🔍 Filtro con evidenziazione
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

// 🧼 Pulsante "Pulisci"
document.getElementById("pulisci-filtro").addEventListener("click", function () {
    const input = document.getElementById("filtro-globale");
    input.value = "";
    input.dispatchEvent(new Event("input"));
});

// 🔍 Zoom immagine
function mostraZoom(src) {
    const overlay = document.getElementById("zoomOverlay");
    const zoomedImg = document.getElementById("zoomedImg");
    zoomedImg.src = src;
    overlay.style.display = "flex";
}

// 🖨️ Pulsante "Scarica PDF"
document.getElementById("scarica-pdf").addEventListener("click", function () {
  const element = document.querySelector("main");

  const opt = {
    margin:       0.2,
    filename:     "prodotti-svendita-TecnoBoxSrl.pdf",
    image:        { type: 'jpeg', quality: 1 },
    html2canvas:  {
      scale: 3,           // aumenta qualità
      useCORS: true,      // se ci sono immagini esterne
      allowTaint: true,
      scrollX: 0,
      scrollY: 0
    },
    jsPDF:        {
      unit: 'px',
      format: [element.scrollWidth + 40, element.scrollHeight + 40], // PDF su misura
      orientation: 'landscape'
    }
  };

  html2pdf().set(opt).from(element).save();
});



