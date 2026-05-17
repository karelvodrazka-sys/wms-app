let currentBox = null;
let contentStatuses = [];
let productionLocations = [];

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

async function loadContentStatuses() {
    const res = await fetch('/masterdata/content-statuses');
    const data = await res.json();

    if (!res.ok) {
        showMessage(data.error || 'Nepodařilo se načíst obsahové stavy.', true);
        return;
    }

    contentStatuses = data;

    const select = document.getElementById('boxContentStatusId');
    select.innerHTML = data.map(s => `
        <option value="${s.Id}">${s.Name}</option>
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

    const select = document.getElementById('targetLocationId');
    select.innerHTML = `
        <option value="">-- ponechat aktuální --</option>
    ` + data.map(l => `
        <option value="${l.Id}">
            ${l.WarehouseName} / ${l.LocationCode}
        </option>
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
                <div><strong>Aktuální ks:</strong> ${box.Quantity ?? ''}</div>
                <div><strong>Sklad:</strong> ${box.WarehouseName ?? box.Warehouse ?? ''}</div>
                <div><strong>Lokace:</strong> ${box.LocationCode ?? box.Location ?? ''}</div>
            </div>
        `;

        document.getElementById('quantity').value = box.Quantity ?? '';

        if (box.BoxContentStatusId) {
            document.getElementById('boxContentStatusId').value = box.BoxContentStatusId;
        }

        if (box.CurrentLocationId) {
            document.getElementById('targetLocationId').value = box.CurrentLocationId;
        }

        document.getElementById('editForm').classList.remove('hidden');
        showMessage(`Načtena bedna ${box.BoxNumber}.`);
        document.getElementById('quantity').focus();

    } catch (err) {
        currentBox = null;
        document.getElementById('editForm').classList.add('hidden');
        showMessage('Chyba: ' + err.message, true);
    }
}

async function saveProductionBoxEdit() {
    if (!currentBox) {
        showMessage('Nejdřív načti bednu.', true);
        return;
    }

    const quantity = parseInt(document.getElementById('quantity').value, 10);
    const boxContentStatusId = parseInt(document.getElementById('boxContentStatusId').value, 10);
    const targetLocationIdValue = document.getElementById('targetLocationId').value;
    const targetLocationId = targetLocationIdValue ? parseInt(targetLocationIdValue, 10) : null;

    if (Number.isNaN(quantity) || quantity < 0) {
        showMessage('Počet ks musí být číslo 0 nebo větší.', true);
        return;
    }

    if (!boxContentStatusId) {
        showMessage('Vyber obsahový stav.', true);
        return;
    }

    try {
        const res = await fetch('/api/production/update-box', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                boxId: currentBox.Id,
                quantity,
                boxContentStatusId,
                targetLocationId,
                userId: 1
            })
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.message || data.error || 'Nepodařilo se uložit změnu.');
        }

        showMessage('Změny byly uloženy.');

        currentBox = null;
        document.getElementById('boxNumberInput').value = '';
        document.getElementById('boxInfo').innerHTML = '';
        document.getElementById('editForm').classList.add('hidden');
        document.getElementById('boxNumberInput').focus();

    } catch (err) {
        showMessage('Chyba: ' + err.message, true);
    }
}

function initScanInput() {
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

(async function init() {
    await loadContentStatuses();
    await loadProductionLocations();

    initScanInput();

    setTimeout(() => {
        document.getElementById('boxNumberInput').focus();
    }, 100);
})();