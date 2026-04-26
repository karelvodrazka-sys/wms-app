const historyBody = document.getElementById('historyBody');
const historyCount = document.getElementById('historyCount');
const historySearch = document.getElementById('historySearch');

let allHistory = [];

function formatDate(value) {
    if (!value) return '';
    return new Date(value).toLocaleString('cs-CZ');
}

function renderHistory(data) {
    if (!data || data.length === 0) {
        historyBody.innerHTML = `
            <tr>
                <td colspan="16">Žádná historie k zobrazení.</td>
            </tr>
        `;
        historyCount.textContent = '0 záznamů';
        return;
    }

    historyBody.innerHTML = data.map(row => `
        <tr>
            <td>${formatDate(row.DoneAt)}</td>
            <td>
                <a href="/box-detail.html?id=${row.BoxId}&from=history">${row.BoxNumber ?? ''}</a>
            </td>
            <td>${row.PartNumber ?? ''}</td>
            <td>${row.Batch ?? ''}</td>
            <td>${row.Cavity ?? ''}</td>
            <td>${row.OrderNumber ?? ''}</td>
            <td>${row.Quantity ?? ''}</td>
            <td>${row.MovementTypeName ?? row.MovementTypeCode ?? ''}</td>
            <td>${row.FromLocationCode ?? ''}</td>
            <td>${row.ToLocationCode ?? ''}</td>
            <td>${row.BoxContentStatus ?? ''}</td>
            <td>${row.CurrentLogisticStatus ?? ''}</td>
            <td>${row.CurrentQualityStatus ?? ''}</td>
            <td>${row.CurrentRedCardNumber ?? row.MovementRedCardNumber ?? ''}</td>
            <td>${row.Username ?? ''}</td>
            <td>${row.Note ?? ''}</td>
        </tr>
    `).join('');

    historyCount.textContent = `${data.length} záznamů`;
}

function applyHistoryFilter() {
    const term = historySearch.value.trim().toLowerCase();

    if (!term) {
        renderHistory(allHistory);
        return;
    }

    const filtered = allHistory.filter(row =>
        Object.values(row).some(value =>
            String(value ?? '').toLowerCase().includes(term)
        )
    );

    renderHistory(filtered);
}

async function loadHistory() {
    try {
        historyBody.innerHTML = `
            <tr>
                <td colspan="16">Načítám data...</td>
            </tr>
        `;
        historyCount.textContent = 'Načítám...';

        const response = await fetch('/history');
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Nepodařilo se načíst historii.');
        }

        allHistory = data;
        applyHistoryFilter();
    } catch (err) {
        historyBody.innerHTML = `
            <tr>
                <td colspan="16">Chyba: ${err.message}</td>
            </tr>
        `;
        historyCount.textContent = 'Chyba';
    }
}

historySearch.addEventListener('input', applyHistoryFilter);

loadHistory();

function exportHistory() {
    window.location.href = '/history/export';
}