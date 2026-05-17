let currentBox = null;
let allLocations = [];

const pendingTableBody = document.getElementById('pendingTableBody');
const pendingCount = document.getElementById('pendingCount');

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

async function loadBox() {
    const boxId = document.getElementById('boxId').value.trim();
    const resultEl = document.getElementById('result');
    const infoEl = document.getElementById('boxInfo');

    resultEl.innerText = '';
    infoEl.style.display = 'none';
    currentBox = null;

    if (!boxId) {
        resultEl.innerText = 'Zadej číslo bedny.';
        return;
    }

    try {
        const response = await fetch(`/boxes/by-number/${boxId}`);
        const data = await response.json();

        if (!response.ok) {
            resultEl.innerText = data.error || 'Nepodařilo se načíst bednu.';
            return;
        }

        currentBox = data;

        document.getElementById('boxNumber').innerText = data.BoxNumber ?? '';
        document.getElementById('partNumber').innerText = data.PartNumber ?? '';
        document.getElementById('batch').innerText = data.Batch ?? '';
        document.getElementById('cavity').innerText = data.Cavity ?? '';
        document.getElementById('reservedLocation').innerText = data.ReservedLocationCode ?? '(není)';

        infoEl.style.display = 'block';
    } catch (err) {
        resultEl.innerText = 'Chyba: ' + err.message;
    }
}

async function confirmPutaway() {
    const resultEl = document.getElementById('result');

    if (!currentBox) {
        resultEl.innerText = 'Nejprve načti bednu.';
        return;
    }

    try {
        const body = {
            BoxId: currentBox.Id,
            UserId: 1
        };

        const response = await fetch('/confirm-putaway', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            resultEl.innerText = data.error || 'Potvrzení se nepodařilo.';
            return;
        }

        resultEl.innerText = 'Zaskladnění potvrzeno.';
        document.getElementById('boxInfo').style.display = 'none';
        currentBox = null;
        loadPendingBoxes();
    } catch (err) {
        resultEl.innerText = 'Chyba: ' + err.message;
    }
}

function toggleAllPending(source) {
    const checkboxes = document.querySelectorAll('.pending-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = source.checked;
    });
}

async function loadPendingBoxes() {
    try {
        await loadLocations();

        pendingTableBody.innerHTML = `
            <tr>
                <td colspan="9">Načítám data...</td>
            </tr>
        `;
        pendingCount.textContent = 'Načítám...';

        const response = await fetch('/putaway/pending');
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Nepodařilo se načíst čekající bedny.');
        }

        if (!data || data.length === 0) {
            pendingTableBody.innerHTML = `
                <tr>
                    <td colspan="9">Žádné bedny čekající na zaskladnění.</td>
                </tr>
            `;
            pendingCount.textContent = '0 záznamů';
            return;
        }

        pendingTableBody.innerHTML = data.map(box => `
            <tr>
                <td><input type="checkbox" class="pending-checkbox" value="${box.Id}" /></td>
                <td>${box.BoxNumber ?? ''}</td>
                <td>${box.PartNumber ?? ''}</td>
                <td>${box.Batch ?? ''}</td>
                <td>${box.Cavity ?? ''}</td>
                <td>${box.Quantity ?? ''}</td>
                <td>${box.ReservedLocationCode ?? ''}</td>
                <td>
                    <select id="putaway-target-${box.Id}" class="select-modern">
                        ${locationOptions(box.ReservedLocationId)}
                    </select>
                    <button class="btn btn-primary" onclick="updatePutawayLocation(${box.Id})">Uložit</button>
                </td>
                <td>
                    <button class="btn btn-danger" onclick="cancelPutaway(${box.Id})">🗑</button>
                </td>
            </tr>
        `).join('');

        pendingCount.textContent = `${data.length} záznamů`;
    } catch (err) {
        console.error('Chyba při načítání čekajících beden:', err);
        pendingTableBody.innerHTML = `
            <tr>
                <td colspan="9">Nepodařilo se načíst data.</td>
            </tr>
        `;
        pendingCount.textContent = 'Chyba';
    }
}

async function updatePutawayLocation(boxId) {
    const targetLocationId = parseInt(document.getElementById(`putaway-target-${boxId}`).value, 10);

    const response = await fetch('/putaway/update-location', {
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

    alert('Rezervovaná lokace upravena.');
    loadPendingBoxes();
}

async function confirmSelectedPutaway() {
    const selected = Array.from(document.querySelectorAll('.pending-checkbox:checked'))
        .map(cb => parseInt(cb.value, 10));

    if (selected.length === 0) {
        alert('Nevybral jsi žádné bedny.');
        return;
    }

    try {
        const response = await fetch('/putaway/confirm-multiple', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                BoxIds: selected,
                UserId: 1
            })
        });

        const data = await response.json();

       if (!response.ok) {
        const errorMessage = data.error || 'Hromadné zaskladnění se nepodařilo.';

        if (errorMessage.toLowerCase().includes('lokace je plna')) {
        throw new Error(
            'Lokace je plná. Vyber u dané bedny jinou lokaci v rozbalovacím seznamu, klikni Uložit a potom potvrď zaskladnění znovu.'
            );
        }

    throw new Error(errorMessage);
}

        alert(data.message || 'Hromadné zaskladnění dokončeno.');
        loadPendingBoxes();
    } catch (err) {
        alert('Chyba: ' + err.message);
    }
}

async function cancelPutaway(boxId) {
    if (!confirm('Opravdu zrušit příjem této bedny? Bedna bude odaktivována.')) {
        return;
    }

    const response = await fetch('/putaway/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            BoxId: boxId,
            UserId: 1
        })
    });

    const data = await response.json();

    if (!response.ok) {
        alert(data.error || 'Zrušení příjmu se nepodařilo.');
        return;
    }

    alert('Příjem bedny zrušen.');
    loadPendingBoxes();
}

loadPendingBoxes();