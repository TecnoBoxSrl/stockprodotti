const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTZBeQDcZ4tT-OSymuH_T89STQqG-OIQ2pmGmrZNSkj5VRVp4q_8oAh5D-bZ8HIIWYMW12xwEECxH5T/pub?output=csv';

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
                <td style="text-align: right;"><strong>${prezzoFmt}</strong></td>
                <td style="text-align: right;">${prezzoPromoFmt}</td>
                <td style="text-align: right;">${conaiFmt}</td>
                <td style="text-align: center;">${quantita}</td>
                <td style="text-align: center;">${imgTag}</td>
            `;

            if (evidenzia) {
                tr.style.backgroundColor = '#45ac49';
                tr.style.fontWeight = 'bold';
            }

            tbody.appendChild(tr);
        });



// Crea pulsanti per ogni categoria unica
const categorieUniche = [...new Set(data.map(row => row.Categoria?.trim()).filter(Boolean))];

const containerCategorie = document.getElementById("container-categorie");

categorieUniche.forEach(categoria => {
    const btn = document.createElement("button");
    btn.textContent = categoria;
    btn.classList.add("categoria-btn"); // aggiungi stile nel CSS
    btn.addEventListener("click", () => {
        filtraPerCategoria(categoria, data);
    });
    containerCategorie.appendChild(btn);
});

// Funzione di filtro
function filtraPerCategoria(categoria, dataOriginale) {
    const tbody = document.querySelector("#tabella-prodotti tbody");
    tbody.innerHTML = ""; // svuota la tabella

    const filtrati = dataOriginale.filter(r => r.Categoria?.trim() === categoria);

    filtrati.forEach(row => {
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
            <td style="text-align: right;"><strong>${prezzoFmt}</strong></td>
            <td style="text-align: right;">${prezzoPromoFmt}</td>
            <td style="text-align: right;">${conaiFmt}</td>
            <td style="text-align: center;">${quantita}</td>
            <td style="text-align: center;">${imgTag}</td>
        `;

        if (evidenzia) {
            tr.style.backgroundColor = '#45ac49';
            tr.style.fontWeight = 'bold';
        }

        tbody.appendChild(tr);
    });
}

        
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

    // ✅ Ripristina anche la visualizzazione di tutte le righe (annulla filtro per categoria)
    const rows = document.querySelectorAll("#tabella-prodotti tbody tr");
    rows.forEach(row => {
        row.style.display = "";
    });

    // ✅ Rimuove evidenziazione bottone categoria selezionato
    document.querySelectorAll(".btn-categoria").forEach(btn => {
        btn.classList.remove("active-category");
    });
});


// 🔍 Zoom immagine
function mostraZoom(src) {
    const overlay = document.getElementById("zoomOverlay");
    const zoomedImg = document.getElementById("zoomedImg");
    zoomedImg.src = src;
    overlay.style.display = "flex";
}

// ✅ Pulsante per scaricare il PDF

  document.getElementById("scarica-pdf").addEventListener("click", function () {

 // 🔒 CONTROLLO MINIMO: se nessuna riga è visibile, blocca la stampa
  if (!document.querySelector("#tabella-prodotti tbody tr:not([style*='display: none'])")) {
    alert("Nessun articolo da stampare!");
    return;
  }
      
  const element = document.querySelector("main");

  const opt = {
    margin:       0.2,
    filename:     "prodotti-svendita-tecnobox.pdf",
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
