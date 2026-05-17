let loadedBoxes = [];
let currentDeliveryId = null;
let productionLocations = [];

const body = document.getElementById('productionReceiptBody');
const result = document.getElementById('result');

function normalizeScan(input) {
    return input
        .replaceAll('$', ';')
        .replaceAll('¨', '-')
        .replaceAll('"', '-')
        .replaceAll('ˇ', '-')
        .replaceAll('´', '-')
        .replaceAll('–', '-')
        .replaceAll('—', '-')
        .replaceAll('|', ';');
}

function showMessage(message, isError = false) {
    result.innerText = message;
    result.classList.toggle('error-message', isError);
}

function renderBoxes() {
    if (loadedBoxes.length === 0) {
        body.innerHTML = `
            <tr>
                <td colspan="6">Zatím nejsou načtené žádné bedny.</td>
            </tr>
        `;
        return;
    }

    body.innerHTML = loadedBoxes.map(b => `
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

async function loadProductionLocations() {
    const res = await fetch('/masterdata/production-locations');
    const data = await res.json();

    if (!res.ok) {
        showMessage(data.error || 'Nepodařilo se načíst výrobní lokace.', true);
        return;
    }

    productionLocations = data;

    const select = document.getElementById('targetProductionLocation');

    select.innerHTML = `
        <option value="">-- vyber cílovou výrobní lokaci --</option>
    ` + data.map(l => `
        <option value="${l.Id}">
            ${l.WarehouseName} / ${l.LocationCode}
        </option>
    `).join('');

    const saved = localStorage.getItem('productionDefaultReceiptLocationId');

    if (saved) {
        select.value = saved;
        document.getElementById('defaultLocationInfo').innerText = 'Použita tvoje výchozí výrobní lokace.';
    }
}

function saveDefaultLocation() {
    const locationId = document.getElementById('targetProductionLocation').value;

    if (!locationId) {
        showMessage('Nejdřív vyber výrobní lokaci.', true);
        return;
    }

    localStorage.setItem('productionDefaultReceiptLocationId', locationId);
    document.getElementById('defaultLocationInfo').innerText = 'Výchozí výrobní lokace uložena.';
}

function addBoxToList(box) {
    if (loadedBoxes.some(b => b.Id === box.Id)) {
        showMessage(`Bedna ${box.BoxNumber} už je načtená.`, true);
        return;
    }

    loadedBoxes.push(box);
    renderBoxes();
    showMessage(`Načtena bedna ${box.BoxNumber}.`);
}

async function loadBox() {
    const input = document.getElementById('boxNumberInput');
    const boxNumber = normalizeScan(input.value.trim());
    input.value = '';

    if (!boxNumber) return;

    try {
        const res = await fetch(`/boxes/by-number/${boxNumber}`);
        const box = await res.json();

        if (!res.ok || !box.Id) {
            throw new Error(box.error || 'Bedna nenalezena.');
        }

        addBoxToList(box);

    } catch (err) {
        showMessage('Chyba: ' + err.message, true);
    }
}

async function loadDelivery() {
    const input = document.getElementById('deliveryNumberInput');
    let number = normalizeScan(input.value.trim());
    input.value = '';

    if (!number) return;

    // pokud scanner vezme jen číslo, doplníme DL-
    if (/^\d{5}$/.test(number)) {
        number = `DL-${number}`;
    }

    try {
        const res = await fetch(`/delivery/by-number/${encodeURIComponent(number)}`);
        const boxes = await res.json();

        if (!res.ok) {
            throw new Error(boxes.error || 'Dodávka nenalezena.');
        }

        if (!boxes || boxes.length === 0) {
            throw new Error('Dodávka neobsahuje žádné bedny.');
        }

        const deliveryOverviewRes = await fetch('/delivery-overview');
        const openDeliveries = await deliveryOverviewRes.json();

        const foundDelivery = openDeliveries.find(d => d.DeliveryNumber === number);
        if (foundDelivery) {
            currentDeliveryId = foundDelivery.Id;
        }

        boxes.forEach(addBoxToList);
        showMessage(`Načtena dodávka ${number}.`);

    } catch (err) {
        showMessage('Chyba: ' + err.message, true);
    }
}

async function completeProductionReceipt() {
    const targetLocationId = parseInt(document.getElementById('targetProductionLocation').value, 10);

    if (!targetLocationId) {
        showMessage('Vyber cílovou výrobní lokaci.', true);
        return;
    }

    if (loadedBoxes.length === 0) {
        showMessage('Nejsou načtené žádné bedny.', true);
        return;
    }

    try {
        const res = await fetch('/production/receipt/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                BoxIds: loadedBoxes.map(b => b.Id),
                TargetLocationId: targetLocationId,
                DeliveryId: currentDeliveryId,
                UserId: 1
            })
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Nepodařilo se dokončit příjem.');
        }

        showMessage(`Příjem dokončen. Přijato beden: ${data.data.ReceivedBoxes}`);

        loadedBoxes = [];
        currentDeliveryId = null;
        renderBoxes();

        document.getElementById('boxNumberInput').focus();

    } catch (err) {
        showMessage('Chyba: ' + err.message, true);
    }
}

function initScanInput(inputId, actionFn) {
    const input = document.getElementById(inputId);
    let timer = null;

    input.addEventListener('input', () => {
        clearTimeout(timer);

        timer = setTimeout(() => {
            if (input.value.trim()) {
                actionFn();
            }
        }, 250);
    });

    input.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;

        e.preventDefault();
        clearTimeout(timer);
        actionFn();
    });
}

(async function initProductionReceipt() {
    await loadProductionLocations();

    initScanInput('boxNumberInput', loadBox);
    initScanInput('deliveryNumberInput', loadDelivery);

    renderBoxes();

    setTimeout(() => {
        document.getElementById('boxNumberInput').focus();
    }, 100);
})();