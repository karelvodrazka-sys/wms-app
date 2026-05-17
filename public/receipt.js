let existingBoxes = [];

function renderExistingBoxes() {
    const body = document.getElementById('existingBoxesBody');

    if (!existingBoxes || existingBoxes.length === 0) {
        body.innerHTML = `
            <tr>
                <td colspan="6">Zatím nejsou načtené žádné bedny.</td>
            </tr>
        `;
        return;
    }

    body.innerHTML = existingBoxes.map(box => `
        <tr>
            <td>${box.BoxNumber ?? ''}</td>
            <td>${box.PartNumber ?? ''}</td>
            <td>${box.Batch ?? ''}</td>
            <td>${box.Cavity ?? ''}</td>
            <td>${box.OrderNumber ?? ''}</td>
            <td>${box.Quantity ?? ''}</td>
        </tr>
    `).join('');
}

function addExistingBox(box) {
    const alreadyExists = existingBoxes.some(b => b.Id === box.Id);

    if (!alreadyExists) {
        existingBoxes.push(box);
    }

    renderExistingBoxes();
}

async function loadReturnBox() {
    const boxNumber = document.getElementById('returnBoxNumber').value.trim();
    const resultEl = document.getElementById('existingResult');

    resultEl.innerText = '';

    if (!boxNumber) {
        resultEl.innerText = 'Zadej číslo bedny.';
        return;
    }

    try {
        const res = await fetch(`/boxes/by-number/${boxNumber}`);
        const box = await res.json();

        if (!res.ok || !box || !box.Id) {
            resultEl.innerText = box.error || 'Bedna nenalezena.';
            return;
        }

        addExistingBox(box);
        resultEl.innerText = `Bedna ${box.BoxNumber} načtena.`;
        document.getElementById('returnBoxNumber').value = '';
    } catch (err) {
        resultEl.innerText = 'Chyba: ' + err.message;
    }
}

async function loadDelivery() {
    const deliveryInput = document.getElementById('deliveryNumber');
    const resultEl = document.getElementById('existingResult');

    const deliveryNumberRaw = deliveryInput.value.trim();

    const deliveryNumber = deliveryNumberRaw
        .replaceAll('¨', '-')
        .replaceAll('ˇ', '-')
        .replaceAll('´', '-')
        .replaceAll('–', '-')
        .replaceAll('—', '-');

    deliveryInput.value = deliveryNumber;

    resultEl.innerText = '';

    if (!deliveryNumber) {
        resultEl.innerText = 'Zadej číslo dodávky.';
        return;
    }

    try {
        const res = await fetch(`/delivery/by-number/${deliveryNumber}`);
        const boxes = await res.json();

        if (!res.ok) {
            resultEl.innerText = boxes.error || 'Dodávku se nepodařilo načíst.';
            return;
        }

        if (!boxes || boxes.length === 0) {
            resultEl.innerText = 'Dodávka nenalezena nebo neobsahuje žádné bedny.';
            return;
        }

        boxes.forEach(addExistingBox);

        resultEl.innerText = `Načteno ${boxes.length} beden z dodávky ${deliveryNumber}.`;
        document.getElementById('deliveryNumber').value = '';
    } catch (err) {
        resultEl.innerText = 'Chyba: ' + err.message;
    }
}

// pomocné funkce pro validaci polí formuláře pro založení nové bedny
function clearReceiptValidation() {
    document.querySelectorAll('#newBoxView input, #newBoxView select').forEach(el => {
        el.classList.remove('input-error');
    });

    const resultEl = document.getElementById('result');
    resultEl.innerText = '';
    resultEl.classList.remove('error-message');
}

function markInvalid(elementId, message, errors) {
    const el = document.getElementById(elementId);

    if (el) {
        el.classList.add('input-error');
    }

    errors.push({
        element: el,
        message
    });
}

function validateNewBoxForm() {
    clearReceiptValidation();

    const errors = [];

    const partNumberId = parseInt(document.getElementById('partNumberSelect').value, 10);
    const batch = document.getElementById('batch').value.trim();
    const cavity = parseInt(document.getElementById('cavity').value, 10);
    const orderNumber = document.getElementById('orderNumber').value.trim();
    const castingDate = document.getElementById('castingDate').value;
    const quantity = parseInt(document.getElementById('quantity').value, 10);

    if (!partNumberId) {
        markInvalid('partNumberSelect', 'Vyber položku.', errors);
    }

    if (!batch) {
        markInvalid('batch', 'Zadej šarži.', errors);
    } else if (!/^\d{2}-\d{2}$/.test(batch)) {
        markInvalid('batch', 'Šarže musí být ve formátu 03-11.', errors);
    }

    if (!cavity || cavity < 1 || cavity > 6) {
        markInvalid('cavity', 'Otisk musí být číslo 1 až 6.', errors);
    }

    if (!orderNumber) {
        markInvalid('orderNumber', 'Zadej zakázku.', errors);
    }

    if (!castingDate) {
        markInvalid('castingDate', 'Zadej datum lití.', errors);
    }

    if (!quantity || quantity <= 0) {
        markInvalid('quantity', 'Počet ks musí být číslo větší než 0.', errors);
    }

    if (errors.length > 0) {
        const resultEl = document.getElementById('result');
        resultEl.classList.add('error-message');
        resultEl.innerText = errors.map(e => e.message).join(' ');

        if (errors[0].element) {
            errors[0].element.focus();
        }

        return false;
    }

    return true;
}

// založení nové bedny
async function createBox() {
    const resultEl = document.getElementById('result');

        if (!validateNewBoxForm()) {
        return;
    }

    const partNumberId = parseInt(document.getElementById('partNumberSelect').value, 10);

    if (!partNumberId) {
        resultEl.innerText = 'Vyber položku (PN).';
        return;
    }

    const body = {
        PartNumberId: partNumberId,
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
        const response = await fetch('/receipt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            resultEl.innerText =
                'Chyba: ' + (data.error || 'Nepodařilo se vytvořit bednu.');
            return;
        }

        const result = data.data;

        resultEl.innerText =
            `Bedna vytvořena: ${result.BoxNumber}, navržená lokace: ${result.ReservedLocationCode}`;

        if (confirm(`Bedna ${result.BoxNumber} vytvořena. Chceš vytisknout štítek?`)) {
            window.open(`/box-label.html?id=${result.BoxId}`, '_blank');
        }

        // necháme cavity defaultně 1, ostatní pole po úspěšném příjmu vyčistíme
        document.getElementById('batch').value = '';
        document.getElementById('orderNumber').value = '';
        document.getElementById('castingDate').value = '';
        document.getElementById('quantity').value = '';
        document.getElementById('redCardNumber').value = '';
        document.getElementById('cavity').value = '1';

    } catch (err) {
        resultEl.innerText = 'Chyba: ' + err.message;
    }
}

async function prepareExistingBoxesForPutaway() {
    const resultEl = document.getElementById('existingResult');

    if (!existingBoxes || existingBoxes.length === 0) {
        resultEl.innerText = 'Nejsou načtené žádné bedny.';
        return;
    }

    const boxIds = existingBoxes.map(box => box.Id);

    try {
        const response = await fetch('/receipt/prepare-existing', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                BoxIds: boxIds,
                UserId: 1
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            resultEl.innerText = 'Chyba: ' + (data.error || 'Nepodařilo se připravit bedny.');
            return;
        }

        resultEl.innerText = data.message;

        existingBoxes = [];
        renderExistingBoxes();

    } catch (err) {
        resultEl.innerText = 'Chyba: ' + err.message;
    }
}

async function loadPartNumbersToSelect() {
    const select = document.getElementById('partNumberSelect');

    try {
        select.innerHTML = `<option value="">Načítám položky...</option>`;

        const res = await fetch('/masterdata/partnumbers');
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Nepodařilo se načíst položky.');
        }

        if (!data || data.length === 0) {
            select.innerHTML = `<option value="">Žádné položky v číselníku</option>`;
            return;
        }

        select.innerHTML = `
            <option value="">-- vyber položku --</option>
        ` + data.map(p => `
            <option value="${p.Id}">
                ${p.PartNumber} ${p.Description ? ' - ' + p.Description : ''}
            </option>
        `).join('');

    } catch (err) {
        console.error('Chyba PN:', err);
        select.innerHTML = `<option value="">Chyba načtení položek</option>`;
    }
}

// funkce pro validaci vstupu z OCR
function isOcrOrder(value) {
    return /^\d{8}$/.test(value.trim());
}

function isOcrBatch(value) {
    return /^\d{2}-\d{2}$/.test(value.trim());
}

function isOcrPartNumber(value) {
    return /^\d{5}-\d{2}[A-Z]?$/.test(value.trim().toUpperCase());
}

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

function showScanError(message) {
    const resultEl = document.getElementById('result');

    if (resultEl) {
        resultEl.innerText = message;
        resultEl.classList.add('error-message');
    }
}

function clearScanMessage() {
    const resultEl = document.getElementById('result');

    if (resultEl) {
        resultEl.innerText = '';
        resultEl.classList.remove('error-message');
    }
}

function handleSequentialOcrScan(value) {
    const cleaned = normalizeScan(value.trim()).toUpperCase();
    const activeId = document.activeElement?.id;

    if (activeId === 'orderNumber') {
        if (!isOcrOrder(cleaned)) {
            document.getElementById('orderNumber').value = '';
            showScanError('Tohle není zakázka. Naskenuj zakázku ve formátu 8 číslic.');
            return;
        }

        document.getElementById('orderNumber').value = cleaned;
        clearScanMessage();
        playBeep();
        document.getElementById('partNumberScan')?.focus();
        return;
    }

    if (activeId === 'partNumberScan') {
        if (!isOcrPartNumber(cleaned)) {
            document.getElementById('partNumberScan').value = '';
            showScanError('Tohle není položka. Naskenuj položku ve formátu 60345-01 nebo 60345-01G.');
            return;
        }

        document.getElementById('partNumberScan').value = cleaned;
        selectPartNumberByCode(cleaned);
        clearScanMessage();
        playBeep();
        document.getElementById('batch')?.focus();
        return;
    }

    if (activeId === 'batch') {
        if (!isOcrBatch(cleaned)) {
            document.getElementById('batch').value = '';
            showScanError('Tohle není šarže. Naskenuj šarži ve formátu 02-22.');
            return;
        }

        document.getElementById('batch').value = cleaned;
        clearScanMessage();
        playBeep();
        document.getElementById('cavity')?.focus();
        return;
    }
}

// výběr PN přes scan
function selectPartNumberByCode(code) {
    const select = document.getElementById('partNumberSelect');

    if (!select) {
        alert('Nenalezen select položky ve formuláři.');
        return;
    }

    let found = false;

    for (const option of select.options) {
        if (option.textContent.includes(code)) {
            select.value = option.value;
            found = true;
            break;
        }
    }

    if (!found) {
        alert(`PN ${code} nenalezeno v číselníku.`);
    }
}

// zvuk po načtení ze scanu
function playBeep() {
    try {
        const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-3.mp3');
        audio.play();
    } catch (err) {
        console.warn('Zvuk se nepodařilo přehrát:', err);
    }
}

// funkce - jednotlive casti obrazovky prijmu a prepinani
function showExistingView() {
    document.getElementById('existingView').style.display = 'block';
    document.getElementById('newBoxView').style.display = 'none';

    document.getElementById('btnExisting').classList.add('btn-primary');
    document.getElementById('btnNew').classList.remove('btn-primary');

    document.getElementById('returnBoxNumber')?.focus();
}

function showNewBoxView() {
    document.getElementById('existingView').style.display = 'none';
    document.getElementById('newBoxView').style.display = 'block';

    document.getElementById('btnExisting').classList.remove('btn-primary');
    document.getElementById('btnNew').classList.add('btn-primary');

    setTimeout(() => {
    document.getElementById('orderNumber')?.focus();
    }, 100);
}

document.getElementById('btnExisting').addEventListener('click', showExistingView);
document.getElementById('btnNew').addEventListener('click', showNewBoxView);


// generování tlačítek pro datum na formuláři vytváření nové bedny
function formatDateForInput(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatDateButtonLabel(date, index) {
       return `${date.getDate()}. ${date.getMonth() + 1}.`;
}

function initDateButtons() {
    const container = document.getElementById('dateButtons');
    const input = document.getElementById('castingDate');

    if (!container || !input) return;

    container.innerHTML = '';

    for (let i = 0; i <= 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'date-btn';
        btn.textContent = formatDateButtonLabel(date, i);

        btn.addEventListener('click', () => {
            input.value = formatDateForInput(date);
            document.getElementById('quantity')?.focus();
        });

        container.appendChild(btn);
    }
}

const castingDateInput = document.getElementById('castingDate');

if (castingDateInput) {
    castingDateInput.addEventListener('change', function () {
        document.getElementById('quantity')?.focus();
    });
}

function initSequentialOcrInputs() {

    const inputs = [
        document.getElementById('orderNumber'),
        document.getElementById('partNumberScan'),
        document.getElementById('batch')
    ].filter(Boolean);

    inputs.forEach(input => {

        let timer = null;

        input.addEventListener('input', function () {

            clearTimeout(timer);

            timer = setTimeout(() => {

                const value = input.value.trim();

                if (!value) return;

                handleSequentialOcrScan(value);

            }, 250);
        });

        input.addEventListener('keydown', function (e) {

            if (e.key !== 'Enter') return;

            e.preventDefault();

            clearTimeout(timer);

            const value = input.value.trim();

            if (!value) return;

            handleSequentialOcrScan(value);
        });
    });
}


function initScanInput(inputId, actionFn) {
    const input = document.getElementById(inputId);

    if (!input) return;

    let scanTimer = null;

    input.addEventListener('input', function () {
        clearTimeout(scanTimer);

        scanTimer = setTimeout(() => {
            const value = input.value.trim();

            if (!value) return;

            actionFn();
        }, 250);
    });

    input.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;

        e.preventDefault();
        clearTimeout(scanTimer);

        const value = input.value.trim();

        if (!value) return;

        actionFn();
    });
}

function initCavityButtons() {
    const container = document.getElementById('cavityButtons');
    const input = document.getElementById('cavity');

    if (!container || !input) return;

    container.innerHTML = '';

    for (let i = 1; i <= 6; i++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'date-btn';
        btn.textContent = String(i);

        btn.addEventListener('click', () => {
            input.value = String(i);
            document.getElementById('castingDate')?.focus();
        });

        container.appendChild(btn);
    }
}

initDateButtons();
initCavityButtons();
initSequentialOcrInputs();

initScanInput('returnBoxNumber', loadReturnBox);
initScanInput('deliveryNumber', loadDelivery);

renderExistingBoxes();
loadPartNumbersToSelect();