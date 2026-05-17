const deliveryOverviewBody = document.getElementById('deliveryOverviewBody');
const deliveryOverviewCount = document.getElementById('deliveryOverviewCount');

function formatDateTime(value) {
    if (!value) return '';

    const d = new Date(value);

    return d.toLocaleString('cs-CZ', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatStatus(status) {
    if (status === 'NA_CESTE') return 'Na cestě';
    if (status === 'DODANO') return 'Dodáno';
    return status || '';
}

async function loadDeliveryOverview() {
    try {
        deliveryOverviewBody.innerHTML = `
            <tr>
                <td colspan="8">Načítám data...</td>
            </tr>
        `;
        deliveryOverviewCount.textContent = 'Načítám...';

        const res = await fetch('/delivery-overview');
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Nepodařilo se načíst dodávky.');
        }

        if (!data || data.length === 0) {
            deliveryOverviewBody.innerHTML = `
                <tr>
                    <td colspan="8">Žádné dodávky na cestě.</td>
                </tr>
            `;
            deliveryOverviewCount.textContent = '0 záznamů';
            return;
        }

        deliveryOverviewBody.innerHTML = data.map(d => `
            <tr>
                <td>
                    <a href="/delivery-detail.html?id=${d.Id}">
                        ${d.DeliveryNumber ?? ''}
                    </a>
                </td>
                <td>${d.Destination ?? ''}</td>
                <td>${d.DeliveryPlace ?? ''}</td>
                <td>${d.DocumentLanguage ?? ''}</td>
                <td>${d.BoxCount ?? 0}</td>
                <td>
                    <span class="badge badge-blue">
                        ${formatStatus(d.Status)}
                    </span>
                </td>
                <td>${formatDateTime(d.CreatedAt)}</td>
                <td>
                    <button class="btn btn-primary" onclick="openDeliveryDetail(${d.Id})">
                        Detail
                    </button>
                </td>
            </tr>
        `).join('');

        deliveryOverviewCount.textContent = `${data.length} záznamů`;

    } catch (err) {
        deliveryOverviewBody.innerHTML = `
            <tr>
                <td colspan="8">Chyba: ${err.message}</td>
            </tr>
        `;
        deliveryOverviewCount.textContent = 'Chyba';
    }
}

function openDeliveryDetail(id) {
    window.location.href = `/delivery-detail.html?id=${id}`;
}

loadDeliveryOverview();