const tableBody = document.getElementById('boxesTableBody');
const boxCount = document.getElementById('boxCount');
const reloadBtn = document.getElementById('reloadBtn');
const searchInput = document.getElementById('searchInput');

let allBoxes = [];
let currentFilter = 'ALL';

function setFilter(filter, button = null) {
    currentFilter = filter;

    document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.classList.remove('active');
    });

    if (button) {
        button.classList.add('active');
    }

    applyFilter();
}

function pill(value, type = '') {
    let className = 'status-pill';

    if (type === 'logistic') {
        if (value === 'Zásoba') className += ' pill-green';
        else if (value === 'Čeká na zaskladnění') className += ' pill-orange';
        else if (value === 'Čeká v přeskladnění') className += ' pill-blue';
        else if (value === 'V dodávce') className += ' pill-purple';
        else if (value === 'Přesunuto interně') className += ' pill-gray';
    }

    if (type === 'quality') {
        if (value === 'Volná') className += ' pill-green';
        else if (value === 'Červená karta') className += ' pill-red';
        else if (value === '3D kontrola') className += ' pill-blue';
        else if (value === 'Po impregnaci') className += ' pill-teal';
    }

    if (type === 'content') {
        if (value === 'Odlitek') className += ' pill-gray';
        else if (value.includes('WIP')) className += ' pill-blue';
    }

    return `<span class="${className}">${value ?? ''}</span>`;
}

function renderTable(data) {
    if (!data || data.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="14">Žádná data k zobrazení.</td>
            </tr>
        `;
        boxCount.textContent = '0 záznamů';
        return;
    }

    tableBody.innerHTML = data.map(box => `
        <tr>
            <td>
                <input type="checkbox" class="box-checkbox" value="${box.Id}" />
            </td>
            <td>
                <a href="/box-detail.html?id=${box.Id}&from=overview">${box.BoxNumber ?? ''}</a>
            </td>
            <td>${box.PartNumber ?? ''}</td>
            <td>${box.Batch ?? ''}</td>
            <td>${box.Cavity ?? ''}</td>
            <td>${box.OrderNumber ?? ''}</td>
            <td>${box.Quantity ?? ''}</td>
            <td>${pill(box.BoxContentStatus, 'content')}</td>
            <td>${pill(box.BoxLogisticStatus, 'logistic')}</td>
            <td>${pill(box.BoxQualityStatus, 'quality')}</td>
            <td>${box.RedCardNumber ?? ''}</td>
            <td>${box.WarehouseName ?? ''}</td>
            <td>${box.LocationCode ?? ''}</td>
            <td>${box.ColumnCode ?? ''}</td>
        </tr>
    `).join('');

    boxCount.textContent = `${data.length} záznamů`;
}

function applyFilter() {
    const term = searchInput.value.trim().toLowerCase();

    let filtered = allBoxes;

    // text filter
    if (term) {
        filtered = filtered.filter(box =>
            (box.BoxNumber ?? '').toLowerCase().includes(term) ||
            (box.PartNumber ?? '').toLowerCase().includes(term) ||
            (box.Batch ?? '').toLowerCase().includes(term) ||
            (box.OrderNumber ?? '').toLowerCase().includes(term) ||
            (box.LocationCode ?? '').toLowerCase().includes(term)
        );
    }

    // QUICK FILTER
    if (currentFilter !== 'ALL') {
        filtered = filtered.filter(box => {
            switch (currentFilter) {
                case 'WAITING':
                    return box.BoxLogisticStatus === 'Čeká na zaskladnění';
                case 'STOCK':
                    return box.BoxLogisticStatus === 'Zásoba';
                case 'TRANSFER':
                    return box.BoxLogisticStatus.includes('Přesun');
                case 'CK':
                    return box.BoxQualityStatus === 'Červená karta';
                default:
                    return true;
            }
        });
    }

    renderTable(filtered);
}

async function loadBoxes() {
    try {
        tableBody.innerHTML = `
            <tr>
                <td colspan="14">Načítám data...</td>
            </tr>
        `;
        boxCount.textContent = 'Načítám...';

        const response = await fetch('/boxes');

        if (!response.ok) {
            throw new Error(`HTTP chyba: ${response.status}`);
        }

        const data = await response.json();
        allBoxes = data;
        applyFilter();
    } catch (error) {
        console.error('Chyba při načítání beden:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="14">Nepodařilo se načíst data.</td>
            </tr>
        `;
        boxCount.textContent = 'Chyba';
    }
}

function toggleAll(source) {
    const checkboxes = document.querySelectorAll('.box-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = source.checked;
    });
}

async function issueSelected() {
    const selected = Array.from(document.querySelectorAll('.box-checkbox:checked'))
        .map(cb => parseInt(cb.value, 10));

    const destinationId = parseInt(document.getElementById('destination').value, 10);

    if (selected.length === 0) {
        alert('Nevybral jsi žádné bedny.');
        return;
    }

    if (!destinationId) {
        alert('Vyber destinaci.');
        return;
    }

    try {
        // 1. založení dodávky
        const deliveryResponse = await fetch('/delivery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                DeliveryDestinationId: destinationId,
                CreatedByUserId: 1
            })
        });

        const deliveryData = await deliveryResponse.json();

        if (!deliveryResponse.ok || !deliveryData.success) {
            throw new Error(deliveryData.error || 'Nepodařilo se založit dodávku.');
        }

        const deliveryId = deliveryData.data.DeliveryId;

        // 2. přidání beden do dodávky
        for (const boxId of selected) {
            const addResponse = await fetch('/delivery/add-box', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    DeliveryId: deliveryId,
                    BoxId: boxId,
                    UserId: 1
                })
            });

            const addData = await addResponse.json();

            if (!addResponse.ok || !addData.success) {
                throw new Error(addData.error || `Nepodařilo se přidat bednu ${boxId} do dodávky.`);
            }
        }

        // 3. potvrzení dodávky
        const confirmResponse = await fetch('/delivery/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                DeliveryId: deliveryId,
                UserId: 1
            })
        });

        const confirmData = await confirmResponse.json();

        if (!confirmResponse.ok || !confirmData.success) {
            throw new Error(confirmData.error || 'Nepodařilo se potvrdit dodávku.');
        }

        alert(`Výdej hotový. Dodávka: ${deliveryData.data.DeliveryNumber}`);
        loadBoxes();
    } catch (err) {
        console.error('Chyba při výdeji:', err);
        alert('Chyba: ' + err.message);
    }
}

reloadBtn.addEventListener('click', loadBoxes);
searchInput.addEventListener('input', applyFilter);

loadBoxes();

async function changeSelectedQualityStatus() {
    const selected = Array.from(document.querySelectorAll('.box-checkbox:checked'))
        .map(cb => parseInt(cb.value, 10));

    const newQualityStatusId = parseInt(document.getElementById('qualityStatusBulk').value, 10);

    const redCardNumber = document.getElementById('redCardNumberBulk').value.trim() || null;

    if (selected.length === 0) {
        alert('Nevybral jsi žádné bedny.');
        return;
    }

    if (!newQualityStatusId) {
        alert('Vyber kvalitativní stav.');
        return;
    }

    try {
        const response = await fetch('/boxes/change-quality-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                BoxIds: selected,
                NewQualityStatusId: newQualityStatusId,
                UserId: 1,
                RedCardNumber: redCardNumber,
                Note: 'Hromadná změna z přehledu beden'
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Nepodařilo se změnit kvalitativní stav.');
        }

        alert(data.message || 'Kvalitativní stav byl změněn.');
        loadBoxes();
    } catch (err) {
        console.error('Chyba při hromadné změně kvalitativního stavu:', err);
        alert('Chyba: ' + err.message);
    }
}

// hromadné přeskladnění
async function transferSelected() {
    const selected = Array.from(document.querySelectorAll('.box-checkbox:checked'))
        .map(cb => parseInt(cb.value, 10));

    if (selected.length === 0) {
        alert('Nevybral jsi žádné bedny.');
        return;
    }

    try {
        for (const boxId of selected) {

            // 1. navrhni lokaci
            const suggestRes = await fetch(`/suggest-transfer-location/${boxId}`);
            const suggestData = await suggestRes.json();

            if (!suggestRes.ok || !suggestData.success || !suggestData.data) {
                throw new Error(suggestData.error || `Nelze navrhnout lokaci pro bednu ${boxId}`);
            }

            const targetLocationId = suggestData.data.Id;

            // 2. pouze START (bez confirm!)
            const startRes = await fetch('/start-transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    BoxId: boxId,
                    TargetLocationId: targetLocationId,
                    UserId: 1
                })
            });

            const startData = await startRes.json();

            if (!startRes.ok || !startData.success) {
                throw new Error(startData.error || `Chyba při zahájení přeskladnění pro bednu ${boxId}`);
            }
        }

        alert(`Zahájeno přeskladnění pro ${selected.length} beden`);
        loadBoxes();

    } catch (err) {
        console.error(err);
        alert('Chyba: ' + err.message);
    }
}