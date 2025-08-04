document.addEventListener("DOMContentLoaded", function () {
    const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRRDCJzWLq3Xy-EkBQqzANaYZy-Ln_xFpKw8fFS8qvS9yA939BnLOyvXPTvLnu0eA/pub?output=csv';
    const tbody = document.querySelector("#tabella-prodotti tbody");

    Papa.parse(sheetURL, {
        download: true,
        header: true,
        complete: function (results) {
            const data = results.data;

            data.forEach(row => {
                const codice = row.Codice || '';
                const descrizione = row.Descrizione || '';
                const quantita = row.Quantità || '';
                const prezzo = row.Prezzo || '';
                const prezzoPromo = row["Prezzo Promo"] || '';
                const conaicollo = row.Conaicollo || '';
                const imgSrc = row.Immagine?.trim() || '';

                const prezzoFmt = (!isNaN(prezzo.replace(',', '.')) && prezzo !== '') 
                    ? `€${Number(prezzo.replace(',', '.')).toFixed(2).replace('.', ',')}` : '';
                const prezzoPromoFmt = (!isNaN(prezzoPromo.replace(',', '.')) && prezzoPromo !== '') 
                    ? `<span style="color:red; font-weight:bold;">€${Number(prezzoPromo.replace(',', '.')).toFixed(2).replace('.', ',')}</span>` : '';
                const conaiFmt = (!isNaN(conaicollo.replace(',', '.')) && conaicollo !== '') 
                    ? `€${Number(conaicollo.replace(',', '.')).toFixed(2).replace('.', ',')}` : '';
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

    // Filtro globale
    document.getElementById("filtro-globale").addEventListener("input", function () {
        const searchTerm = this.value.toLowerCase();
        document.querySelectorAll("#tabella-prodotti tbody tr").forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(searchTerm) ? "" : "none";
        });
    });
});

// Funzione per mostrare immagine ingrandita
function mostraZoom(src) {
    const overlay = document.getElementById("zoomOverlay");
    const zoomedImg = document.getElementById("zoomedImg");
    zoomedImg.src = src;
    overlay.style.display = "flex";
    overlay.onclick = () => overlay.style.display = "none";
}
