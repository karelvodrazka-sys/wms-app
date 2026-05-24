const tableBody = document.getElementById('boxesTableBody');
const boxCount = document.getElementById('boxCount');
const reloadBtn = document.getElementById('reloadBtn');
const searchInput = document.getElementById('searchInput');

let allBoxes = [];
let currentUser = null;
let currentFilter = 'ALL';

function matchesMultiFilter(value, filterText) {
    if (!filterText) return true;

    const terms = filterText
        .split(/[;,]/)
        .map(x => x.trim().toLowerCase())
        .filter(Boolean);

    const text = String(value ?? '').toLowerCase();

    return terms.some(term => text.includes(term));
}

function applyColumnFilters(data) {
    const filters = Array.from(document.querySelectorAll('.column-filter'));

    return data.filter(row =>
        filters.every(input => {
            const field = input.dataset.field;
            const filterText = input.value;
            return matchesMultiFilter(row[field], filterText);
        })
    );
}

function hasPermission(code) {
    return currentUser?.permissions?.includes(code);
}

async function loadCurrentUser() {
    const res = await fetch('/me');
    currentUser = await res.json();

    console.log('USER:', currentUser);

    const userInfo = document.getElementById('userInfo');
    if (userInfo && currentUser) {
        userInfo.textContent = `${currentUser.displayName} (${currentUser.email})`;
    }
}

function applyPermissions() {
    const rules = [
        { id: 'transferBtn', permission: 'TRANSFER_START' },

    ];

    rules.forEach(rule => {
        const el = document.getElementById(rule.id);
        if (el && !hasPermission(rule.permission)) {
            el.style.display = 'none';
        }
    });
}

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
                <td colspan="13">Žádná data k zobrazení.</td>
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
        </tr>
    `).join('');

    boxCount.textContent = `${data.length} záznamů`;
}

function applyFilter() {
    let filtered = allBoxes;

    // QUICK FILTER
    if (currentFilter !== 'ALL') {
        filtered = filtered.filter(box => {
            switch (currentFilter) {
                case 'WAITING':
                    return box.BoxLogisticStatus === 'Čeká na zaskladnění';
                case 'STOCK':
                    return box.BoxLogisticStatus === 'Zásoba';
                case 'TRANSFER':
                    return box.BoxLogisticStatus?.includes('Přesun');
                case 'CK':
                    return box.BoxQualityStatus === 'Červená karta';
                default:
                    return true;
            }
        });
    }

    // COLUMN FILTERS
    filtered = applyColumnFilters(filtered);

    renderTable(filtered);
}

async function loadBoxes() {
    try {
        tableBody.innerHTML = `
            <tr>
                <td colspan="13">Načítám data...</td>
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
                <td colspan="13">Nepodařilo se načíst data.</td>
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

function getCurrentlyDisplayedBoxes() {
    let filtered = allBoxes;

    if (currentFilter !== 'ALL') {
        filtered = filtered.filter(box => {
            switch (currentFilter) {
                case 'WAITING':
                    return box.BoxLogisticStatus === 'Čeká na zaskladnění';
                case 'STOCK':
                    return box.BoxLogisticStatus === 'Zásoba';
                case 'TRANSFER':
                    return box.BoxLogisticStatus?.includes('Přesun');
                case 'CK':
                    return box.BoxQualityStatus === 'Červená karta';
                default:
                    return true;
            }
        });
    }

    return applyColumnFilters(filtered);
}

function printPickingList() {
    const displayedBoxes = getCurrentlyDisplayedBoxes();

    const selectedIds = Array.from(document.querySelectorAll('.box-checkbox:checked'))
        .map(cb => parseInt(cb.value, 10));

    const boxes = selectedIds.length > 0
        ? displayedBoxes.filter(box => selectedIds.includes(box.Id))
        : displayedBoxes;

    if (!boxes || boxes.length === 0) {
        alert('Není co tisknout.');
        return;
    }

    const rows = boxes.map(box => `
        <tr>
            <td>${box.BoxNumber ?? ''}</td>
            <td>${box.PartNumber ?? ''}</td>
            <td>${box.Batch ?? ''}</td>
            <td>${box.Cavity ?? ''}</td>
            <td>${box.OrderNumber ?? ''}</td>
            <td>${box.Quantity ?? ''}</td>
            <td>${box.BoxQualityStatus ?? ''}</td>
            <td>${box.RedCardNumber ?? ''}</td>
            <td>${box.WarehouseName ?? ''}</td>
            <td>${box.LocationCode ?? ''}</td>
        </tr>
    `).join('');

    const printWindow = window.open('', '_blank');

    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="cs">
        <head>
            <meta charset="UTF-8">
            <title>Vychystávací seznam</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    color: #111827;
                    margin: 24px;
                }

                h1 {
                    font-size: 24px;
                    margin-bottom: 4px;
                }

                .meta {
                    font-size: 13px;
                    color: #4b5563;
                    margin-bottom: 18px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                }

                th, td {
                    border: 1px solid #d1d5db;
                    padding: 6px 8px;
                    text-align: left;
                }

                th {
                    background: #f3f4f6;
                }

                @media print {
                    body {
                        margin: 10mm;
                    }
                }
            </style>
        </head>
        <body>
            <h1>Vychystávací seznam</h1>
            <div class="meta">
                Vygenerováno: ${new Date().toLocaleString('cs-CZ')}
                | Počet beden: ${boxes.length}
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Bedna</th>
                        <th>PN</th>
                        <th>Šarže</th>
                        <th>Otisk</th>
                        <th>Zakázka</th>
                        <th>Ks</th>
                        <th>Kvalita</th>
                        <th>ČK</th>
                        <th>Sklad</th>
                        <th>Lokace</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>

            <script>
                window.onload = function() {
                    window.print();
                };
            </script>
        </body>
        </html>
    `);

    printWindow.document.close();
}

if (reloadBtn) {
    reloadBtn.addEventListener('click', loadBoxes);
}

if (searchInput) {
    searchInput.addEventListener('input', applyFilter);
}

document.querySelectorAll('.column-filter').forEach(input => {
    input.addEventListener('input', applyFilter);
});

async function initPage() {
    await loadCurrentUser();
    applyPermissions();
    loadBoxes();
}

initPage();

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

function clearBoxFilters() {
    if (searchInput) {
    searchInput.value = '';
}

    document.querySelectorAll('.column-filter').forEach(input => {
        input.value = '';
    });

    applyFilter();
}

let deliveryPlaces = [];

async function loadDeliveryPlaces() {
    const res = await fetch('/masterdata/delivery-places');
    const data = await res.json();

    if (!res.ok) {
        console.error(data.error || 'Nepodařilo se načíst místa dodání.');
        return;
    }

    deliveryPlaces = data;
}

function onDestinationChange() {
    const destinationId = parseInt(document.getElementById('destination').value, 10);
    const placeSelect = document.getElementById('deliveryPlace');

    const filteredPlaces = deliveryPlaces.filter(p =>
        p.DeliveryDestinationId === destinationId && p.IsActive
    );

    placeSelect.innerHTML = `
        <option value="">Vyber místo dodání</option>
    ` + filteredPlaces.map(p => `
        <option value="${p.Id}" data-lang="${p.DefaultLanguage}">
            ${p.Name}${p.CompanyName ? ' - ' + p.CompanyName : ''}
        </option>
    `).join('');
}