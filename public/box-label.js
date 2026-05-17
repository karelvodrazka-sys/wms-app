function getBoxId() {
    const params = new URLSearchParams(window.location.search);
    return parseInt(params.get('id'), 10);
}

async function loadLabelData() {
    const boxId = getBoxId();

    if (!boxId) {
        alert('Chybí ID bedny.');
        return;
    }

    const res = await fetch(`/box/${boxId}/label-data`);
    const box = await res.json();

    if (!res.ok) {
        alert(box.error || 'Nepodařilo se načíst štítek.');
        return;
    }

    document.getElementById('boxNumber').textContent = box.BoxNumber ?? '';
    document.getElementById('partNumber').textContent = box.PartNumber ?? '';
    document.getElementById('batch').textContent = box.Batch ?? '';
    document.getElementById('cavity').textContent = box.Cavity ?? '';
    document.getElementById('orderNumber').textContent = box.OrderNumber ?? '';
    document.getElementById('quantity').textContent = box.Quantity ?? '';

    JsBarcode("#boxBarcode", box.BoxNumber, {
        format: "CODE128",
        width: 2,
        height: 55,
        displayValue: true,
        fontSize: 16,
        margin: 2
    });
}

loadLabelData();