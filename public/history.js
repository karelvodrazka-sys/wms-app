const historyBody = document.getElementById('historyBody');
const historyCount = document.getElementById('historyCount');
const historySearch = document.getElementById('historySearch');

let allHistory = [];

function matchesMultiFilter(value, filterText) {
    if (!filterText) return true;

    const terms = filterText
        .split(/[;,]/)
        .map(x => x.trim().toLowerCase())
        .filter(Boolean);

    if (terms.length === 0) return true;

    const text = String(value ?? '').toLowerCase();

    return terms.some(term => text.includes(term));
}

function applyColumnFilters(data) {
    const filters = Array.from(document.querySelectorAll('.column-filter'));

    return data.filter(row =>
        filters.every(input => {
            const field = input.dataset.field;
            const filterText = input.value;
            return matchesMultiFilter(row[field], filterText);
        })
    );
}

function formatDateTime(value) {
    if (!value) return '';

    const text = String(value);

    // vezme datum/čas tak, jak přišel z SQL, bez převodu časové zóny
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);

    if (!match) return text;

    const [, year, month, day, hour, minute, second] = match;

    return `${parseInt(day, 10)}. ${parseInt(month, 10)}. ${year} ${hour}:${minute}:${second}`;
}

function renderHistory(data) {
    if (!data || data.length === 0) {
        historyBody.innerHTML = `
            <tr>
                <td colspan="18">Žádná historie k zobrazení.</td>
            </tr>
        `;
        historyCount.textContent = '0 záznamů';
        return;
    }

    historyBody.innerHTML = data.map(row => `
        <tr>
            <td>${formatDateTime(row.DoneAt)}</td>
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
            <td>${row.DeliveryNumber ?? ''}</td>
            <td>${row.DeliveryDestination ?? ''}</td>
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
    const term = historySearch ? historySearch.value.trim().toLowerCase() : '';

    let filtered = allHistory;

    if (term) {
        filtered = filtered.filter(row =>
            Object.values(row).some(value =>
                String(value ?? '').toLowerCase().includes(term)
            )
        );
    }

    filtered = applyColumnFilters(filtered);

    renderHistory(filtered);
}

async function loadHistory() {
    try {
        historyBody.innerHTML = `
            <tr>
                <td colspan="18">Načítám data...</td>
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
                <td colspan="18">Chyba: ${err.message}</td>
            </tr>
        `;
        historyCount.textContent = 'Chyba';
    }
}

if (historySearch) {
    historySearch.addEventListener('input', applyHistoryFilter);
}

document.querySelectorAll('.column-filter').forEach(input => {
    input.addEventListener('input', applyHistoryFilter);
});

loadHistory();

function exportHistory() {
    window.location.href = '/history/export';
}

function clearHistoryFilters() {
    if (historySearch) {
    historySearch.value = '';
}

    document.querySelectorAll('.column-filter').forEach(input => {
        input.value = '';
    });

    applyHistoryFilter();
}