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
            const imgSrc = row.Immagine?.trim() || '';

            const prezzoFmt = (!isNaN(prezzo) && prezzo !== '') ? `€${Number(prezzo).toFixed(2).replace('.', ',')}` : '';
            const prezzoPromoFmt = (!isNaN(prezzoPromo) && prezzoPromo !== '') ? `<span style="color:red; font-weight:bold;">€${Number(prezzoPromo).toFixed(2).replace('.', ',')}</span>` : '';
            const conaiFmt = (conaicollo && conaicollo.trim() !== '') 
                ? `€${Number(conaicollo.replace(',', '.')).toFixed(2).replace('.', ',')}` 
                : '';

            const imgTag = imgSrc ? `<img src="${imgSrc}" alt="foto prodotto" class="zoomable" onclick="mostraZoom('${imgSrc}')">` : '';

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
            tbody.appendChild(tr);
        });
    }
});

function mostraZoom(src) {
    const overlay = document.getElementById("zoomOverlay");
    const zoomedImg = document.getElementById("zoomedImg");
    zoomedImg.src = src;
    overlay.style.display = "flex";
}

// ✅ Ricerca con evidenziazione senza rimuovere HTML
document.getElementById("filtro-globale").addEventListener("input", function(e) {
    const term = e.target.value.toLowerCase();
    const rows = document.querySelectorAll("#tabella-prodotti tbody tr");

    rows.forEach(tr => {
        let match = false;

        tr.querySelectorAll("td").forEach(td => {
            if (!td.dataset.original) {
                td.dataset.original = td.innerHTML;
            } else {
                td.innerHTML = td.dataset.original;
            }

            const testo = td.textContent.toLowerCase();

            if (term && testo.includes(term)) {
                match = true;
                const regex = new RegExp(`(${term})`, 'gi');
                td.innerHTML = td.innerHTML.replace(regex, '<mark>$1</mark>');
            }
        });

        tr.style.display = match || !term ? "" : "none";
    });
});
