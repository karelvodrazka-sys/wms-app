function showTab(tabId, button) {
    document.querySelectorAll('#singleQualityTab, #qualityOverviewTab').forEach(tab => {
        tab.classList.add('hidden');
    });

    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.classList.remove('hidden');
    }

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    if (button) {
        button.classList.add('active');
    }

    if (tabId === 'qualityOverviewTab') {
    loadQualityOverview();
    }
}

let currentBox = null;

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
    const result = document.getElementById('result');
    result.innerText = message || '';
    result.classList.toggle('error-message', isError);
}

async function loadQualityStatuses() {
    const res = await fetch('/masterdata/quality-statuses');
    const data = await res.json();

    const select = document.getElementById('boxQualityStatusId');

    select.innerHTML = data.map(s => `
        <option value="${s.Id}">${s.Name}</option>
    `).join('');
}

async function loadBox() {
    const input = document.getElementById('boxNumberInput');
    const boxNumber = normalizeScan(input.value.trim());
    input.value = '';

    if (!boxNumber) return;

    try {
        const res = await fetch(`/boxes/by-number/${encodeURIComponent(boxNumber)}`);
        const box = await res.json();

        if (!res.ok || !box.Id) {
            throw new Error(box.error || 'Bedna nenalezena.');
        }

        currentBox = box;

        document.getElementById('boxInfo').innerHTML = `
            <div class="detail-grid">
                <div><strong>Bedna:</strong> ${box.BoxNumber ?? ''}</div>
                <div><strong>PN:</strong> ${box.PartNumber ?? ''}</div>
                <div><strong>Šarže:</strong> ${box.Batch ?? ''}</div>
                <div><strong>Otisk:</strong> ${box.Cavity ?? ''}</div>
                <div><strong>Zakázka:</strong> ${box.OrderNumber ?? ''}</div>
                <div><strong>Ks:</strong> ${box.Quantity ?? ''}</div>
                <div><strong>Kvalita:</strong> ${box.BoxQualityStatus ?? ''}</div>
                <div><strong>ČK:</strong> ${box.RedCardNumber ?? ''}</div>
            </div>
        `;

        document.getElementById('redCardNumber').value = box.RedCardNumber ?? '';

        if (box.BoxQualityStatusId) {
            document.getElementById('boxQualityStatusId').value = box.BoxQualityStatusId;
        }

        document.getElementById('editForm').classList.remove('hidden');
        showMessage(`Načtena bedna ${box.BoxNumber}.`);
        document.getElementById('boxQualityStatusId').focus();

    } catch (err) {
        currentBox = null;
        document.getElementById('editForm').classList.add('hidden');
        showMessage('Chyba: ' + err.message, true);
    }
}

async function saveQualityBoxEdit() {
    if (!currentBox) {
        showMessage('Nejdřív načti bednu.', true);
        return;
    }

    const boxQualityStatusId = parseInt(document.getElementById('boxQualityStatusId').value, 10);
    const redCardNumber = document.getElementById('redCardNumber').value.trim();

    if (!boxQualityStatusId) {
        showMessage('Vyber kvalitativní stav.', true);
        return;
    }

    try {
        const res = await fetch('/api/quality/update-box', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                boxId: currentBox.Id,
                boxQualityStatusId,
                redCardNumber,
                userId: 1
            })
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Nepodařilo se uložit změnu.');
        }

        showMessage('Kvalitativní stav bedny byl uložen.');

        currentBox = null;
        document.getElementById('boxNumberInput').value = '';
        document.getElementById('boxInfo').innerHTML = '';
        document.getElementById('redCardNumber').value = '';
        document.getElementById('editForm').classList.add('hidden');
        document.getElementById('boxNumberInput').focus();

    } catch (err) {
        showMessage('Chyba: ' + err.message, true);
    }
}

function initBoxScan() {
    const input = document.getElementById('boxNumberInput');
    let timer = null;

    input.addEventListener('input', () => {
        clearTimeout(timer);

        timer = setTimeout(() => {
            if (input.value.trim()) {
                loadBox();
            }
        }, 250);
    });

    input.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;

        e.preventDefault();
        clearTimeout(timer);
        loadBox();
    });
}

(async function initQualityPage() {
    await loadQualityStatuses();
    initBoxScan();

    setTimeout(() => {
        document.getElementById('boxNumberInput').focus();
    }, 100);
})();

let allQualityBoxes = [];
let currentQualityFilter = 'ALL';

function pill(value, type = '') {
    let className = 'status-pill';

    if (type === 'quality') {
        if (value === 'Volná') className += ' pill-green';
        else if (value === 'Červená karta') className += ' pill-red';
        else if (value === '3D kontrola') className += ' pill-blue';
        else if (value === 'Po impregnaci') className += ' pill-teal';
    }

    return `<span class="${className}">${value ?? ''}</span>`;
}

function renderQualityOverview(data) {
    const body = document.getElementById('boxesTableBody');
    const count = document.getElementById('boxCount');

    if (!data || data.length === 0) {
        body.innerHTML = `
            <tr>
                <td colspan="14">Žádná data k zobrazení.</td>
            </tr>
        `;
        count.textContent = '0 záznamů';
        return;
    }

    body.innerHTML = data.map(box => `
        <tr>
            <td>
                <input type="checkbox" class="box-checkbox" value="${box.Id}" />
            </td>

            <td>
                <a href="/box-detail.html?id=${box.Id}&from=quality">${box.BoxNumber ?? ''}</a>
            </td>

            <td>${box.PartNumber ?? ''}</td>
            <td>${box.Batch ?? ''}</td>
            <td>${box.Cavity ?? ''}</td>
            <td>${box.OrderNumber ?? ''}</td>
            <td>${box.Quantity ?? ''}</td>

            <td>
                <select id="qualityStatus_${box.Id}" class="select-modern">
                    ${qualityStatusesForRow(box.BoxQualityStatusId, box.BoxQualityStatus)}
                </select>
            </td>

            <td>
                <input
                    id="redCard_${box.Id}"
                    class="select-modern"
                    value="${box.RedCardNumber ?? ''}"
                    placeholder="ČK"
                />
            </td>

            <td>${box.WarehouseName ?? ''}</td>
            <td>${box.LocationCode ?? ''}</td>

            <td class="pending-column">
                ${box.PendingQualityStatusId ? 'ANO' : ''}
            </td>

            <td class="pending-target-column">
                ${box.PendingQualityStatus ?? ''}
            </td>

            <td>
                <button class="btn btn-primary" onclick="saveQualityRow(${box.Id})">
                    Uložit
                </button>
            </td>
            </td>
        </tr>
    `).join('');

    count.textContent = `${data.length} záznamů`;
}

function qualityStatusesForRow(selectedId, selectedName) {
    const statuses = Array.from(document.getElementById('boxQualityStatusId').options);

    return statuses.map(option => {
        const optionId = parseInt(option.value, 10);
        const isSelected =
            optionId === selectedId ||
            option.textContent.trim() === String(selectedName ?? '').trim();

        return `
            <option value="${option.value}" ${isSelected ? 'selected' : ''}>
                ${option.textContent}
            </option>
        `;
    }).join('');
}

async function saveQualityRow(boxId) {
    const boxQualityStatusId = parseInt(
        document.getElementById(`qualityStatus_${boxId}`).value,
        10
    );

    const redCardNumber = document
        .getElementById(`redCard_${boxId}`)
        .value
        .trim();

    if (!boxQualityStatusId) {
        alert('Vyber kvalitativní stav.');
        return;
    }

    try {
        const res = await fetch('/boxes/change-quality-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                BoxIds: [boxId],
                NewQualityStatusId: boxQualityStatusId,
                UserId: 1,
                RedCardNumber: redCardNumber,
                Note: 'Řádkový požadavek na změnu kvality z přehledu kvality'
            })
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Nepodařilo se založit požadavek.');
        }

        alert('Požadavek na změnu kvality byl založen.');

        await loadQualityOverview();

    } catch (err) {
        alert('Chyba: ' + err.message);
    }
}

function applyQualityOverviewFilter() {
    let filtered = allQualityBoxes;

    if (currentQualityFilter !== 'ALL') {
        filtered = filtered.filter(box => {
            switch (currentQualityFilter) {
                case 'CK':
                    return box.BoxQualityStatus === 'Červená karta';
                case '3D':
                    return box.BoxQualityStatus === '3D kontrola';
                case 'IMPREGNATION':
                    return box.BoxQualityStatus === 'Před impregnací'
                        || box.BoxQualityStatus === 'Po impregnaci';
                default:
                    return true;
            }
        });
    }
    filtered = applyQualityColumnFilters(filtered);
    renderQualityOverview(filtered);
}

function matchesQualityMultiFilter(value, filterText) {
    if (!filterText) return true;

    const terms = filterText
        .split(/[;,]/)
        .map(x => x.trim().toLowerCase())
        .filter(Boolean);

    const text = String(value ?? '').toLowerCase();

    return terms.some(term => text.includes(term));
}

function applyQualityColumnFilters(data) {
    const filters = Array.from(document.querySelectorAll('.quality-column-filter'));

    return data.filter(row =>
        filters.every(input => {
            const field = input.dataset.field;
            return matchesQualityMultiFilter(row[field], input.value);
        })
    );
}

document.addEventListener('input', e => {
    if (e.target.classList.contains('quality-column-filter')) {
        applyQualityOverviewFilter();
    }
});

async function loadQualityOverview() {
    const body = document.getElementById('boxesTableBody');
    const count = document.getElementById('boxCount');

    try {
        body.innerHTML = `
            <tr>
                <td colspan="14">Načítám data...</td>
            </tr>
        `;
        count.textContent = 'Načítám...';

        const res = await fetch('/boxes');
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Nepodařilo se načíst bedny.');
        }

        allQualityBoxes = data;
        applyQualityOverviewFilter();

    } catch (err) {
        body.innerHTML = `
            <tr>
                <td colspan="14">Chyba: ${err.message}</td>
            </tr>
        `;
        count.textContent = 'Chyba';
    }
}

function setQualityFilter(filter, button = null) {
    currentQualityFilter = filter;

    document.querySelectorAll('#qualityOverviewTab .filter-chip').forEach(btn => {
        btn.classList.remove('active');
    });

    if (button) {
        button.classList.add('active');
    }

    applyQualityOverviewFilter();
}

function clearQualityFilters() {
    currentQualityFilter = 'ALL';

    document.querySelectorAll('#qualityOverviewTab .filter-chip').forEach(btn => {
        btn.classList.remove('active');
    });

    const first = document.querySelector('#qualityOverviewTab .filter-chip');
    if (first) first.classList.add('active');

    applyQualityOverviewFilter();
}

function toggleAll(source) {
    document.querySelectorAll('.box-checkbox').forEach(cb => {
        cb.checked = source.checked;
    });
}

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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                BoxIds: selected,
                NewQualityStatusId: newQualityStatusId,
                UserId: 1,
                RedCardNumber: redCardNumber,
                Note: 'Hromadná změna z modulu kvality'
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Nepodařilo se změnit kvalitativní stav.');
        }

        alert(data.message || 'Kvalitativní stav byl změněn.');

        document.getElementById('qualityStatusBulk').value = '';
        document.getElementById('redCardNumberBulk').value = '';

        await loadQualityOverview();

    } catch (err) {
        alert('Chyba: ' + err.message);
    }
}