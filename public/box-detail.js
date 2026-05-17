const params = new URLSearchParams(window.location.search);
const boxId = params.get('id');
const from = params.get('from');

const boxTitle = document.getElementById('boxTitle');
const boxDetail = document.getElementById('boxDetail');
const boxHistoryBody = document.getElementById('boxHistoryBody');
const historyCount = document.getElementById('historyCount');
const backBtn = document.getElementById('backBtn');

function formatDate(value) {
    if (!value) return '';
    return new Date(value).toLocaleString('cs-CZ');
}

function detailItem(label, value) {
    return `
        <div class="detail-item">
            <div class="detail-label">${label}</div>
            <div class="detail-value">${value ?? ''}</div>
        </div>
    `;
}

async function loadBoxDetail() {
    try {
        const response = await fetch(`/boxes/${boxId}/detail`);
        const box = await response.json();

        if (!response.ok) {
            throw new Error(box.error || 'Bedna nenalezena.');
        }

        boxTitle.textContent = `Detail bedny ${box.BoxNumber}`;

        boxDetail.innerHTML = `
            ${detailItem('Číslo bedny', box.BoxNumber)}
            ${detailItem('PN', box.PartNumber)}
            ${detailItem('Šarže', box.Batch)}
            ${detailItem('Otisk', box.Cavity)}
            ${detailItem('Zakázka', box.OrderNumber)}
            ${detailItem('Datum lití', box.CastingDate ? new Date(box.CastingDate).toLocaleDateString('cs-CZ') : '')}
            ${detailItem('Počet ks', box.Quantity)}
            ${detailItem('Obsahový stav', box.BoxContentStatus)}
            ${detailItem('Logistický stav', box.BoxLogisticStatus)}
            ${detailItem('Kvalitativní stav', box.BoxQualityStatus)}
            ${detailItem('Číslo ČK', box.RedCardNumber)}
            ${detailItem('Sklad', box.WarehouseName)}
            ${detailItem('Lokace', box.LocationCode)}
            ${detailItem('Vytvořeno', formatDate(box.CreatedAt))}
            ${detailItem('Vytvořil', box.CreatedBy)}
            ${detailItem('Upraveno', formatDate(box.UpdatedAt))}
            ${detailItem('Upravil', box.UpdatedBy)}
        `;
    } catch (err) {
        boxDetail.innerHTML = `Chyba: ${err.message}`;
    }
}

async function loadBoxHistory() {
    try {
        const response = await fetch(`/boxes/${boxId}/history`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Historii se nepodařilo načíst.');
        }

        if (!data || data.length === 0) {
            boxHistoryBody.innerHTML = `<tr><td colspan="8">Žádná historie.</td></tr>`;
            historyCount.textContent = '0 záznamů';
            return;
        }

        boxHistoryBody.innerHTML = data.map(row => `
            <tr>
                <td>${formatDate(row.DoneAt)}</td>
                <td>${row.MovementTypeName ?? ''}</td>
                <td>${row.FromLocationCode ?? ''}</td>
                <td>${row.ToLocationCode ?? ''}</td>
                <td>${row.ReferenceType ?? ''} ${row.ReferenceId ?? ''}</td>
                <td>${row.Username ?? ''}</td>
                <td>${row.MovementRedCardNumber ?? ''}</td>
                <td>${row.Note ?? ''}</td>
            </tr>
        `).join('');

        historyCount.textContent = `${data.length} záznamů`;
    } catch (err) {
        boxHistoryBody.innerHTML = `<tr><td colspan="8">Chyba: ${err.message}</td></tr>`;
        historyCount.textContent = 'Chyba';
    }
}

if (!boxId) {
    boxDetail.innerHTML = 'Chybí ID bedny.';
} else {
    loadBoxDetail();
    loadBoxHistory();
}

if (from === 'history') {
    backBtn.href = '/history.html';
    backBtn.textContent = 'Zpět na historii';
} else {
    backBtn.href = '/';
    backBtn.textContent = 'Zpět na přehled';
}

if (from === 'history') {
    backBtn.href = '/history.html';
    backBtn.textContent = 'Zpět na historii';
} else {
    backBtn.href = '/';
    backBtn.textContent = 'Zpět na přehled';
}

if (!boxId) {
    boxDetail.innerHTML = 'Chybí ID bedny.';
    boxHistoryBody.innerHTML = '<tr><td colspan="8">Chybí ID bedny.</td></tr>';
    historyCount.textContent = 'Chyba';
} else {
    loadBoxDetail();
    loadBoxHistory();
}

function printBoxLabel() {
    const params = new URLSearchParams(window.location.search);
    const boxId = params.get('id');

    if (!boxId) {
        alert('Chybí ID bedny.');
        return;
    }

    window.open(`/box-label.html?id=${boxId}`, '_blank');
}