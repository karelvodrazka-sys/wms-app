let currentDeliveryId = null;
let deliveryBoxes = [];
let deliveryPlaces = [];

const body = document.getElementById('deliveryBoxesBody');

function renderBoxes() {
    if (deliveryBoxes.length === 0) {
        body.innerHTML = `
            <tr>
                <td colspan="4">Zatím žádné bedny</td>
            </tr>
        `;
        return;
    }

    body.innerHTML = deliveryBoxes.map(b => `
        <tr>
            <td>${b.BoxNumber}</td>
            <td>${b.PartNumber}</td>
            <td>${b.Batch}</td>
            <td>${b.Quantity}</td>
        </tr>
    `).join('');
}

async function loadDeliveryPlaces() {
    const res = await fetch('/masterdata/delivery-places');
    const data = await res.json();

    if (!res.ok) {
        alert(data.error || 'Nepodařilo se načíst místa dodání.');
        return;
    }

    deliveryPlaces = data;
}

// načtení destinací
async function loadDestinations() {
    const res = await fetch('/masterdata/destinations');
    const data = await res.json();

    const select = document.getElementById('deliveryDestination');

    select.innerHTML = `
        <option value="">-- vyber destinaci --</option>
    ` + data.map(d => `
        <option value="${d.Id}">${d.Name}</option>
    `).join('');

    document.getElementById('deliveryDestination').addEventListener('change', onDestinationChange);
}

// založení dodávky
async function createDelivery() {
    const destinationId = parseInt(document.getElementById('deliveryDestination').value, 10);
    const deliveryPlaceId = parseInt(document.getElementById('deliveryPlace').value, 10);
    const documentLanguage = document.getElementById('documentLanguage').value;

    if (!destinationId) {
        alert('Vyber destinaci');
        return;
    }

    if (!deliveryPlaceId) {
    alert('Vyber místo dodání.');
    return;
    }

    const res = await fetch('/delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            DeliveryDestinationId: destinationId,
            DeliveryPlaceId: deliveryPlaceId,
            DocumentLanguage: documentLanguage,
            CreatedByUserId: 1
        })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
        alert(data.error || 'Chyba při založení dodávky');
        return;
    }

    currentDeliveryId = data.data.DeliveryId;

    document.getElementById('deliveryInfo').innerText =
        `Dodávka založena: ${data.data.DeliveryNumber}`;
}

// scan input
document.getElementById('scanBoxInput')
    .addEventListener('keydown', async (e) => {

    if (e.key !== 'Enter') return;

    const boxNumber = e.target.value.trim();
    e.target.value = '';

    if (!currentDeliveryId) {
        alert('Nejdřív založ dodávku.');
        return;
    }

    try {
        const res = await fetch(`/boxes/by-number/${boxNumber}`);
        const box = await res.json();

        if (!res.ok || !box.Id) {
            alert('Bedna nenalezena');
            return;
        }

        const addRes = await fetch('/delivery/add-box', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                DeliveryId: currentDeliveryId,
                BoxId: box.Id,
                UserId: 1
            })
        });

        const addData = await addRes.json();

        if (!addRes.ok || !addData.success) {
            throw new Error(addData.error);
        }

        deliveryBoxes.push(box);
        renderBoxes();

    } catch (err) {
        alert('Chyba: ' + err.message);
    }
});

// potvrzení dodávky
async function confirmDelivery() {
    if (!currentDeliveryId) {
        alert('Dodávka není založená.');
        return;
    }

    const res = await fetch('/delivery/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            DeliveryId: currentDeliveryId,
            UserId: 1
        })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
        alert(data.error || 'Chyba při potvrzení');
        return;
    }

    const printedDeliveryId = currentDeliveryId;

    if (confirm('Dodávka potvrzena. Chceš vytisknout dodací list?')) {
    window.open(`/delivery-print.html?id=${printedDeliveryId}`, '_blank');
    }

        currentDeliveryId = null;
        deliveryBoxes = [];

        document.getElementById('deliveryDestination').value = '';
        document.getElementById('deliveryPlace').innerHTML = `
            <option value="">-- vyber místo dodání --</option>
        `;
        document.getElementById('documentLanguage').value = 'CZ';
        document.getElementById('scanBoxInput').value = '';
        document.getElementById('deliveryInfo').innerText = '';
        
    renderBoxes();
}

// funkce změna destinace včetně změny místa
function onDestinationChange() {
    const destinationId = parseInt(document.getElementById('deliveryDestination').value, 10);
    const placeSelect = document.getElementById('deliveryPlace');

    const filteredPlaces = deliveryPlaces.filter(p =>
        p.DeliveryDestinationId === destinationId && p.IsActive
    );

    placeSelect.innerHTML = `
        <option value="">-- vyber místo dodání --</option>
    ` + filteredPlaces.map(p => `
        <option value="${p.Id}" data-lang="${p.DefaultLanguage}">
            ${p.Name}${p.CompanyName ? ' - ' + p.CompanyName : ''}
        </option>
    `).join('');
}

// změna jazyka podle místa doručení
document.getElementById('deliveryPlace').addEventListener('change', function () {
    const selected = this.options[this.selectedIndex];
    const lang = selected?.dataset?.lang;

    if (lang) {
        document.getElementById('documentLanguage').value = lang;
    }
});

// init
(async function initDeliveryPage() {
    await loadDeliveryPlaces();
    await loadDestinations();
    renderBoxes();
})();