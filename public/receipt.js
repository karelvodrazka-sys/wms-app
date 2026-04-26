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
    const deliveryNumber = document.getElementById('deliveryNumber').value.trim();
    const resultEl = document.getElementById('existingResult');

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

async function createBox() {
    const body = {
        PartNumberId: parseInt(document.getElementById('partNumberId').value, 10),
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
            document.getElementById('result').innerText =
                'Chyba: ' + (data.error || 'Nepodařilo se vytvořit bednu.');
            return;
        }

        const result = data.data;

        document.getElementById('result').innerText =
            `Bedna vytvořena: ${result.BoxNumber}, navržená lokace: ${result.ReservedLocationCode}, sloupec: ${result.ReservedColumnCode}`;
    } catch (err) {
        document.getElementById('result').innerText =
            'Chyba: ' + err.message;
    }
}

renderExistingBoxes();


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