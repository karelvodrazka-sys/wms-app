function normalizeScan(input) {
    return input
        .replaceAll('$', ';')
        .replaceAll('¨', '-')
        .replaceAll('ˇ', '-')
        .replaceAll('´', '-')
        .replaceAll('–', '-')
        .replaceAll('—', '-')
        .replaceAll('|', ';');
}

function isOcrOrder(value) {
    return /^\d{8}$/.test(value.trim());
}

function isOcrBatch(value) {
    return /^\d{2}-\d{2}$/.test(value.trim());
}

function isOcrPartNumber(value) {
    return /^\d{5}-\d{2}[A-Z]?$/.test(value.trim().toUpperCase());
}

function showMessage(message, isError = false) {
    const resultEl = document.getElementById('result');
    resultEl.innerText = message;
    resultEl.classList.toggle('error-message', isError);
}

function playBeep() {
    try {
        const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-3.mp3');
        audio.play();
    } catch {}
}

async function loadPartNumbersToSelect() {
    const select = document.getElementById('partNumberSelect');

    const res = await fetch('/masterdata/partnumbers');
    const data = await res.json();

    select.innerHTML = `<option value="">-- vyber položku --</option>` + data.map(p => `
        <option value="${p.Id}" data-prod-location="${p.ProductionDefaultLocationId || ''}">
            ${p.PartNumber} ${p.Description ? ' - ' + p.Description : ''}
        </option>
    `).join('');
}

function selectPartNumberByCode(code) {
    const select = document.getElementById('partNumberSelect');

    for (const option of select.options) {
        if (option.textContent.includes(code)) {
            select.value = option.value;
            return true;
        }
    }

    return false;
}

function handleSequentialScan(value) {
    const cleaned = normalizeScan(value.trim()).toUpperCase();
    const activeId = document.activeElement?.id;

    if (activeId === 'orderNumber') {
        if (!isOcrOrder(cleaned)) {
            document.getElementById('orderNumber').value = '';
            showMessage('Tohle není zakázka. Naskenuj 8 číslic.', true);
            return;
        }

        document.getElementById('orderNumber').value = cleaned;
        showMessage('');
        playBeep();
        document.getElementById('partNumberScan').focus();
        return;
    }

    if (activeId === 'partNumberScan') {
        if (!isOcrPartNumber(cleaned)) {
            document.getElementById('partNumberScan').value = '';
            showMessage('Tohle není položka. Naskenuj PN ve formátu 60345-01 nebo 60345-01G.', true);
            return;
        }

        const found = selectPartNumberByCode(cleaned);

        if (!found) {
            document.getElementById('partNumberScan').value = '';
            showMessage(`PN ${cleaned} není v číselníku.`, true);
            return;
        }

        document.getElementById('partNumberScan').value = cleaned;
        showMessage('');
        playBeep();
        document.getElementById('batch').focus();
        return;
    }

    if (activeId === 'batch') {
        if (!isOcrBatch(cleaned)) {
            document.getElementById('batch').value = '';
            showMessage('Tohle není šarže. Naskenuj formát 02-22.', true);
            return;
        }

        document.getElementById('batch').value = cleaned;
        showMessage('');
        playBeep();
        document.getElementById('cavity').focus();
    }
}

function initScanInputs() {
    ['orderNumber', 'partNumberScan', 'batch'].forEach(id => {
        const input = document.getElementById(id);
        let timer = null;

        input.addEventListener('input', () => {
            clearTimeout(timer);

            timer = setTimeout(() => {
                const value = input.value.trim();
                if (value) handleSequentialScan(value);
            }, 250);
        });

        input.addEventListener('keydown', e => {
            if (e.key !== 'Enter') return;

            e.preventDefault();
            clearTimeout(timer);

            const value = input.value.trim();
            if (value) handleSequentialScan(value);
        });
    });
}

function formatDateForInput(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function initDateButtons() {
    const container = document.getElementById('dateButtons');
    const input = document.getElementById('castingDate');

    for (let i = 0; i <= 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'date-btn';
        btn.textContent = `${date.getDate()}. ${date.getMonth() + 1}.`;

        btn.addEventListener('click', () => {
            input.value = formatDateForInput(date);
            document.getElementById('quantity').focus();
        });

        container.appendChild(btn);
    }
}

function initCavityButtons() {
    const container = document.getElementById('cavityButtons');
    const input = document.getElementById('cavity');

    for (let i = 1; i <= 6; i++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'date-btn';
        btn.textContent = String(i);

        btn.addEventListener('click', () => {
            input.value = String(i);
            document.getElementById('castingDate').focus();
        });

        container.appendChild(btn);
    }
}

function validateProductionBoxForm() {
    const partNumberId = parseInt(document.getElementById('partNumberSelect').value, 10);
    const option = document.getElementById('partNumberSelect').selectedOptions[0];

    if (!partNumberId) {
        showMessage('Naskenuj položku.', true);
        return false;
    }

    if (!option.dataset.prodLocation) {
        showMessage('Položka nemá nastavenou defaultní výrobní lokaci v číselníku.', true);
        return false;
    }

    if (!isOcrOrder(document.getElementById('orderNumber').value)) {
        showMessage('Chybí nebo je špatně zakázka.', true);
        return false;
    }

    if (!isOcrBatch(document.getElementById('batch').value)) {
        showMessage('Chybí nebo je špatně šarže.', true);
        return false;
    }

    const cavity = parseInt(document.getElementById('cavity').value, 10);
    if (!cavity || cavity < 1 || cavity > 6) {
        showMessage('Otisk musí být 1 až 6.', true);
        return false;
    }

    if (!document.getElementById('castingDate').value) {
        showMessage('Zadej datum lití.', true);
        return false;
    }

    const quantity = parseInt(document.getElementById('quantity').value, 10);
    if (!quantity || quantity <= 0) {
        showMessage('Počet ks musí být větší než 0.', true);
        return false;
    }

    return true;
}

async function createProductionBox() {
    if (!validateProductionBoxForm()) return;

    const body = {
        PartNumberId: parseInt(document.getElementById('partNumberSelect').value, 10),
        Batch: document.getElementById('batch').value.trim(),
        Cavity: parseInt(document.getElementById('cavity').value, 10),
        OrderNumber: document.getElementById('orderNumber').value.trim(),
        CastingDate: document.getElementById('castingDate').value,
        Quantity: parseInt(document.getElementById('quantity').value, 10),
        BoxContentStatusId: parseInt(document.getElementById('boxContentStatusId').value, 10),
        BoxQualityStatusId: parseInt(document.getElementById('boxQualityStatusId').value, 10),
        RedCardNumber: document.getElementById('redCardNumber').value.trim() || null,
        CreatedByUserId: 1
    };

    try {
        const res = await fetch('/production/box', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Nepodařilo se vytvořit bednu.');
        }

        showMessage(`Bedna vytvořena ve výrobě: ${data.data.BoxNumber}`);

        if (confirm(`Bedna ${data.data.BoxNumber} vytvořena. Chceš vytisknout štítek?`)) {
            window.open(`/box-label.html?id=${data.data.BoxId}`, '_blank');
        }

        document.getElementById('orderNumber').value = '';
        document.getElementById('partNumberScan').value = '';
        document.getElementById('partNumberSelect').value = '';
        document.getElementById('batch').value = '';
        document.getElementById('cavity').value = '1';
        document.getElementById('castingDate').value = '';
        document.getElementById('quantity').value = '';
        document.getElementById('redCardNumber').value = '';
        document.getElementById('orderNumber').focus();

    } catch (err) {
        showMessage('Chyba: ' + err.message, true);
    }
}

document.getElementById('castingDate').addEventListener('change', () => {
    document.getElementById('quantity').focus();
});

loadPartNumbersToSelect();
initScanInputs();
initDateButtons();
initCavityButtons();

setTimeout(() => {
    document.getElementById('orderNumber').focus();
}, 100);