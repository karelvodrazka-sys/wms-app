const transferTableBody = document.getElementById('transferTableBody');
const transferCount = document.getElementById('transferCount');

let allLocations = [];

async function loadLocations() {
    const response = await fetch('/locations');
    allLocations = await response.json();
}

function locationOptions(selectedId) {
    return allLocations.map(loc => `
        <option value="${loc.Id}" ${loc.Id === selectedId ? 'selected' : ''}>
            ${loc.Code}
        </option>
    `).join('');
}

function toggleAllTransfers(source) {
    document.querySelectorAll('.transfer-checkbox').forEach(cb => {
        cb.checked = source.checked;
    });
}

async function loadPendingTransfers() {
    try {
        await loadLocations();

        transferTableBody.innerHTML = `<tr><td colspan="10">Načítám data...</td></tr>`;
        transferCount.textContent = 'Načítám...';

        const response = await fetch('/transfer/pending');
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Nepodařilo se načíst přeskladnění.');
        }

        if (!data || data.length === 0) {
            transferTableBody.innerHTML = `<tr><td colspan="10">Žádné bedny nečekají na přeskladnění.</td></tr>`;
            transferCount.textContent = '0 záznamů';
            return;
        }

        transferTableBody.innerHTML = data.map(box => `
            <tr>
                <td><input type="checkbox" class="transfer-checkbox" value="${box.Id}" /></td>
                <td>${box.BoxNumber ?? ''}</td>
                <td>${box.PartNumber ?? ''}</td>
                <td>${box.Batch ?? ''}</td>
                <td>${box.Cavity ?? ''}</td>
                <td>${box.Quantity ?? ''}</td>
                <td>${box.CurrentLocationCode ?? ''}</td>
                <td>${box.ReservedLocationCode ?? ''}</td>
                <td>
                    <select id="target-${box.Id}" class="select-modern">
                        ${locationOptions(box.ReservedLocationId)}
                    </select>
                    <button class="btn btn-primary" onclick="updateTargetLocation(${box.Id})">Uložit</button>
                </td>
                <td>
                    <button class="btn btn-danger" onclick="cancelTransfer(${box.Id})">🗑</button>
                </td>
            </tr>
        `).join('');

        transferCount.textContent = `${data.length} záznamů`;
    } catch (err) {
        transferTableBody.innerHTML = `<tr><td colspan="10">Chyba: ${err.message}</td></tr>`;
        transferCount.textContent = 'Chyba';
    }
}

async function updateTargetLocation(boxId) {
    const targetLocationId = parseInt(document.getElementById(`target-${boxId}`).value, 10);

    const response = await fetch('/transfer/update-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            BoxId: boxId,
            TargetLocationId: targetLocationId,
            UserId: 1
        })
    });

    const data = await response.json();

    if (!response.ok) {
        alert(data.error || 'Změna lokace se nepodařila.');
        return;
    }

    alert('Cílová lokace upravena.');
    loadPendingTransfers();
}

async function confirmSelectedTransfers() {
    const selected = Array.from(document.querySelectorAll('.transfer-checkbox:checked'))
        .map(cb => parseInt(cb.value, 10));

    if (selected.length === 0) {
        alert('Nevybral jsi žádné bedny.');
        return;
    }

    const response = await fetch('/transfer/confirm-multiple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            BoxIds: selected,
            UserId: 1
        })
    });

    const data = await response.json();

    if (!response.ok) {
        alert(data.error || 'Potvrzení se nepodařilo.');
        return;
    }

    alert(data.message || 'Přeskladnění potvrzeno.');
    loadPendingTransfers();
}

async function cancelTransfer(boxId) {
    if (!confirm('Opravdu zrušit zahájené přeskladnění?')) {
        return;
    }

    const response = await fetch('/transfer/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            BoxId: boxId,
            UserId: 1
        })
    });

    const data = await response.json();

    if (!response.ok) {
        alert(data.error || 'Zrušení se nepodařilo.');
        return;
    }

    alert('Přeskladnění zrušeno.');
    loadPendingTransfers();
}

loadPendingTransfers();