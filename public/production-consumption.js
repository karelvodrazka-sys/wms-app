let loadedBoxes = [];

const body = document.getElementById('consumptionBody');
const result = document.getElementById('result');
const boxCount = document.getElementById('boxCount');

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
    result.innerText = message || '';
    result.classList.toggle('error-message', isError);
}

function renderBoxes() {
    boxCount.textContent = `${loadedBoxes.length} beden`;

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

        if (loadedBoxes.some(b => b.Id === box.Id)) {
            showMessage(`Bedna ${box.BoxNumber} už je v seznamu.`, true);
            return;
        }

        loadedBoxes.push(box);
        renderBoxes();
        showMessage(`Načtena bedna ${box.BoxNumber}.`);

    } catch (err) {
        showMessage('Chyba: ' + err.message, true);
    }
}

async function consumeBoxes() {
    if (loadedBoxes.length === 0) {
        showMessage('Nejsou načtené žádné bedny ke spotřebě.', true);
        return;
    }

    const ok = confirm(`Opravdu označit ${loadedBoxes.length} beden jako spotřebované?`);
    if (!ok) return;

    try {
        const res = await fetch('/api/production/consume-boxes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                boxIds: loadedBoxes.map(b => b.Id),
                userId: 1
            })
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.message || 'Nepodařilo se označit bedny jako spotřebované.');
        }

        showMessage(`Spotřeba dokončena. Spotřebováno beden: ${data.consumed}`);

        loadedBoxes = [];
        renderBoxes();
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

initScanInput();
renderBoxes();

setTimeout(() => {
    document.getElementById('boxNumberInput').focus();
}, 100);