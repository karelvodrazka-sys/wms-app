const params = new URLSearchParams(window.location.search);
const deliveryId = params.get('id');

const deliveryTitle = document.getElementById('deliveryTitle');
const deliveryInfo = document.getElementById('deliveryInfo');
const deliveryBoxesBody = document.getElementById('deliveryBoxesBody');
const boxCount = document.getElementById('boxCount');

function formatStatus(status) {
    if (status === 'NA_CESTE') return 'Na cestě';
    if (status === 'DODANO') return 'Dodáno';
    return status || '';
}

function formatDateTime(value) {
    if (!value) return '';

    return new Date(value).toLocaleString('cs-CZ');
}

async function loadDeliveryDetail() {
    try {
        const res = await fetch(`/delivery/${deliveryId}/detail`);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Nepodařilo se načíst detail.');
        }

        const d = data.delivery;

        deliveryTitle.textContent = `Dodávka ${d.DeliveryNumber}`;

        deliveryInfo.innerHTML = `
            <div><strong>Destinace:</strong> ${d.Destination ?? ''}</div>
            <div><strong>Místo dodání:</strong> ${d.DeliveryPlace ?? ''}</div>
            <div><strong>Jazyk:</strong> ${d.DocumentLanguage ?? ''}</div>
            <div><strong>Stav:</strong> ${formatStatus(d.Status)}</div>
            <div><strong>Vytvořeno:</strong> ${formatDateTime(d.CreatedAt)}</div>
        `;

        if (!data.boxes || data.boxes.length === 0) {
            deliveryBoxesBody.innerHTML = `
                <tr>
                    <td colspan="6">Dodávka neobsahuje žádné bedny.</td>
                </tr>
            `;
            boxCount.textContent = '0 beden';
            return;
        }

        deliveryBoxesBody.innerHTML = data.boxes.map(b => `
            <tr>
                <td>
                    <a href="/box-detail.html?id=${b.Id}">
                        ${b.BoxNumber}
                    </a>
                </td>
                <td>${b.PartNumber ?? ''}</td>
                <td>${b.Batch ?? ''}</td>
                <td>${b.Cavity ?? ''}</td>
                <td>${b.OrderNumber ?? ''}</td>
                <td>${b.Quantity ?? ''}</td>
            </tr>
        `).join('');

        boxCount.textContent = `${data.boxes.length} beden`;

    } catch (err) {
        deliveryInfo.innerHTML = `
            <div class="error-message">
                ${err.message}
            </div>
        `;
    }
}

document.getElementById('printDeliveryBtn')
    .addEventListener('click', () => {
        window.open(`/delivery-print.html?id=${deliveryId}`, '_blank');
    });

loadDeliveryDetail();