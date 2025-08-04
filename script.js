
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
            const imgTag = imgSrc ? `<img class="zoomable" src="${imgSrc}" alt="foto prodotto" onclick="mostraZoom('${imgSrc}')">` : '';

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${codice}</td>
                <td class="descrizione-wrap">${descrizione}</td>
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

document.getElementById("filtro-globale").addEventListener("input", function(e) {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll("#tabella-prodotti tbody tr").forEach(tr => {
        const match = tr.innerText.toLowerCase().includes(term);
        tr.style.display = match ? "" : "none";
    });
});

function mostraZoom(src) {
    const overlay = document.getElementById("zoomOverlay");
    const zoomedImg = document.getElementById("zoomedImg");
    zoomedImg.src = src;
    overlay.style.display = "flex";
}
