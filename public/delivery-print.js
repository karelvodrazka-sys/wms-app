function getDeliveryId() {
    const params = new URLSearchParams(window.location.search);
    return parseInt(params.get('id'), 10);
}

function formatDate(value) {
    if (!value) return '';
    const text = String(value);
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);

    if (!match) return text;

    const [, y, m, d, h, min] = match;
    return `${parseInt(d, 10)}. ${parseInt(m, 10)}. ${y} ${h}:${min}`;
}

function applyLanguage(lang) {
    if (lang === 'EN') {
        document.getElementById('docTitle').textContent = 'Delivery note';
        document.getElementById('supplierTitle').textContent = 'Supplier';
        document.getElementById('recipientTitle').textContent = 'Recipient';
        document.getElementById('boxListTitle').textContent = 'Box list';

        document.querySelectorAll('.print-table th')[0].textContent = 'Box';
        document.querySelectorAll('.print-table th')[2].textContent = 'Batch';
        document.querySelectorAll('.print-table th')[3].textContent = 'Cavity';
        document.querySelectorAll('.print-table th')[4].textContent = 'Order';
        document.querySelectorAll('.print-table th')[5].textContent = 'Qty';
    }
}

async function loadPrintData() {
    const deliveryId = getDeliveryId();

    if (!deliveryId) {
        alert('Chybí ID dodávky.');
        return;
    }

    const res = await fetch(`/delivery/${deliveryId}/print-data`);
    const data = await res.json();

    if (!res.ok) {
        alert(data.error || 'Nepodařilo se načíst dodací list.');
        return;
    }

    const h = data.header;
    const lang = h.DocumentLanguage || 'CZ';

    applyLanguage(lang);

    document.getElementById('deliveryNumber').textContent =
        lang === 'EN'
            ? `Delivery No.: ${h.DeliveryNumber}`
            : `Číslo dodávky: ${h.DeliveryNumber}`;

    JsBarcode("#deliveryBarcode", h.DeliveryNumber, {
        format: "CODE128",
        width: 2,
        height: 60,
        displayValue: true,
        fontSize: 16,
        margin: 4
    });

    document.getElementById('deliveryDate').textContent =
        lang === 'EN'
            ? `Date: ${formatDate(h.CreatedAt)}`
            : `Datum: ${formatDate(h.CreatedAt)}`;

    document.getElementById('recipientCompany').innerHTML =
        `<strong>${h.CompanyName || h.PlaceName || ''}</strong>`;

    document.getElementById('recipientStreet').textContent = h.Street || '';
    document.getElementById('recipientCity').textContent =
        [h.ZipCode, h.City].filter(Boolean).join(' ');

    document.getElementById('recipientCountry').textContent = h.Country || '';

    document.getElementById('destinationName').textContent =
        h.DestinationName ? `${lang === 'EN' ? 'Destination' : 'Destinace'}: ${h.DestinationName}` : '';

    const boxesBody = document.getElementById('boxesBody');

    boxesBody.innerHTML = data.boxes.map(b => `
        <tr>
            <td>${b.BoxNumber ?? ''}</td>
            <td>${b.PartNumber ?? ''}</td>
            <td>${b.Batch ?? ''}</td>
            <td>${b.Cavity ?? ''}</td>
            <td>${b.OrderNumber ?? ''}</td>
            <td>${b.Quantity ?? ''}</td>
        </tr>
    `).join('');
}

loadPrintData();