const partNumberBody = document.getElementById('partNumberBody');
const partNumberCount = document.getElementById('partNumberCount');
const partNumberSearch = document.getElementById('partNumberSearch');

let allPartNumbers = [];

const locationBody = document.getElementById('locationBody');
const locationCount = document.getElementById('locationCount');

let allLocations = [];

const newLocationWarehouse = document.getElementById('newLocationWarehouse');
let allWarehouses = [];

const destinationBody = document.getElementById('destinationBody');
const destinationCount = document.getElementById('destinationCount');

let allDestinations = [];

const qualityBody = document.getElementById('qualityBody');
const qualityCount = document.getElementById('qualityCount');

const contentBody = document.getElementById('contentBody');
const contentCount = document.getElementById('contentCount');

const deliveryPlaceBody = document.getElementById('deliveryPlaceBody');
const deliveryPlaceCount = document.getElementById('deliveryPlaceCount');
let allDeliveryPlaces = [];

let productionLocations = [];

function showMasterTab(tabName, button) {
    document.querySelectorAll('.master-tab').forEach(tab => {
        tab.classList.add('hidden');
    });

    const activeTab = document.getElementById(`tab-${tabName}`);
    if (activeTab) {
        activeTab.classList.remove('hidden');
    }

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    if (button) {
        button.classList.add('active');
    }
}

function renderPartNumbers(data) {
    if (!data || data.length === 0) {
        partNumberBody.innerHTML = `
            <tr>
                <td colspan="5">Žádné položky k zobrazení.</td>
            </tr>
        `;
        partNumberCount.textContent = '0 záznamů';
        return;
    }

    partNumberBody.innerHTML = data.map(item => `
        <tr>
            <td>${item.Id ?? ''}</td>
            <td>${item.PartNumber ?? ''}</td>
            <td>
                <input id="pnDesc_${item.Id}" value="${item.Description ?? ''}" />
            </td>
            <td>
                <select id="pnProdLoc_${item.Id}">
                    ${renderProductionLocationOptions(item.ProductionDefaultLocationId)}
                </select>
            </td>
            <td>
                <button class="btn btn-primary" onclick="updatePartNumber(${item.Id})">
                    Uložit
                </button>
            </td>
        </tr>
    `).join('');

    partNumberCount.textContent = `${data.length} záznamů`;
}

function applyPartNumberFilter() {
    const term = partNumberSearch.value.trim().toLowerCase();

    if (!term) {
        renderPartNumbers(allPartNumbers);
        return;
    }

    const filtered = allPartNumbers.filter(item =>
        String(item.PartNumber ?? '').toLowerCase().includes(term) ||
        String(item.Description ?? '').toLowerCase().includes(term)
    );

    renderPartNumbers(filtered);
}

async function loadPartNumbers() {
    try {
        partNumberBody.innerHTML = `
            <tr>
                <td colspan="3">Načítám data...</td>
            </tr>
        `;
        partNumberCount.textContent = 'Načítám...';

        const response = await fetch('/masterdata/partnumbers');
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Nepodařilo se načíst položky.');
        }

        allPartNumbers = data;
        applyPartNumberFilter();
    } catch (err) {
        partNumberBody.innerHTML = `
            <tr>
                <td colspan="3">Chyba: ${err.message}</td>
            </tr>
        `;
        partNumberCount.textContent = 'Chyba';
    }
}

partNumberSearch.addEventListener('input', applyPartNumberFilter);

// vytvoření položky
async function createPartNumber() {
    const pn = document.getElementById('newPartNumber').value.trim();
    const desc = document.getElementById('newPartDescription').value.trim();

    if (!pn) {
        alert('Zadej PN.');
        return;
    }

    try {
        const response = await fetch('/masterdata/partnumbers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                PartNumber: pn,
                Description: desc
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Chyba při ukládání.');
        }

        document.getElementById('newPartNumber').value = '';
        document.getElementById('newPartDescription').value = '';

        loadPartNumbers();

    } catch (err) {
        alert('Chyba: ' + err.message);
    }
}

// změna položky
async function updatePartNumber(id) {
    const description = document.getElementById(`pnDesc_${id}`).value.trim();
    const productionDefaultLocationId = document.getElementById(`pnProdLoc_${id}`).value || null;

    try {
        const response = await fetch(`/masterdata/partnumbers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                Description: description,
                ProductionDefaultLocationId: productionDefaultLocationId
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Nepodařilo se upravit položku.');
        }

        await loadPartNumbers();

    } catch (err) {
        alert('Chyba: ' + err.message);
    }
}

// nacteni lokaci
function renderLocations(data) {
    if (!data || data.length === 0) {
        locationBody.innerHTML = `
            <tr>
                <td colspan="6">Žádné lokace.</td>
            </tr>
        `;
        locationCount.textContent = '0 záznamů';
        return;
    }

    locationBody.innerHTML = data.map(l => `
        <tr>
            <td>${l.Id}</td>
            <td>${l.Code}</td>
            <td>
                <input 
                    id="locCapacity_${l.Id}" 
                    type="number" 
                    value="${l.CapacityBoxes ?? 4}" 
                    min="1"
                    style="width: 90px;"
                />
            </td>
            <td>
                <select id="locWarehouse_${l.Id}">
                    ${allWarehouses.map(w => `
                        <option value="${w.Id}" ${w.Name === l.WarehouseName ? 'selected' : ''}>
                            ${w.Name}
                        </option>
                    `).join('')}
                </select>
            </td>
            <td>
                <input 
                    id="locUseForSuggestion_${l.Id}" 
                    type="checkbox" 
                    ${l.UseForSuggestion ? 'checked' : ''}
                />
            </td>
            <td>
                <button class="btn btn-primary" onclick="updateLocation(${l.Id})">
                    Uložit
                </button>
            </td>
        </tr>
    `).join('');

    locationCount.textContent = `${data.length} záznamů`;
}

async function loadLocations() {
    try {
        locationBody.innerHTML = `
            <tr>
                <td colspan="6">Načítám data...</td>
            </tr>
        `;
        locationCount.textContent = 'Načítám...';

        const response = await fetch('/masterdata/locations');
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Nepodařilo se načíst lokace.');
        }

        allLocations = data;
        renderLocations(allLocations);

    } catch (err) {
        locationBody.innerHTML = `
            <tr>
                <td colspan="6">Chyba: ${err.message}</td>
            </tr>
        `;
        locationCount.textContent = 'Chyba';
    }
}


async function createLocation() {
    const code = document.getElementById('newLocationCode').value.trim();
    const capacity = parseInt(document.getElementById('newLocationCapacity').value, 10);
    const warehouseId = parseInt(document.getElementById('newLocationWarehouse').value, 10);

    if (!code) {
        alert('Zadej kód lokace.');
        return;
    }

    if (!warehouseId) {
        alert('Vyber sklad.');
        return;
    }

    try {
        const response = await fetch('/masterdata/locations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                Code: code,
                CapacityBoxes: capacity || 4,
                WarehouseId: warehouseId
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Chyba při ukládání lokace.');
        }

        document.getElementById('newLocationCode').value = '';
        document.getElementById('newLocationCapacity').value = '4';
        document.getElementById('newLocationWarehouse').value = '';

        loadLocations();

    } catch (err) {
        alert('Chyba: ' + err.message);
    }
}

async function loadWarehouses() {
    try {
        const res = await fetch('/masterdata/warehouses');
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Nepodařilo se načíst sklady.');
        }

        allWarehouses = data;

        newLocationWarehouse.innerHTML = `
            <option value="">-- vyber sklad --</option>
        ` + allWarehouses.map(w => `
            <option value="${w.Id}">${w.Name}</option>
        `).join('');

    } catch (err) {
        console.error('Chyba sklady:', err);
        newLocationWarehouse.innerHTML = `<option value="">Chyba načtení skladů</option>`;
    }
}


async function updateLocation(locationId) {
    const capacity = parseInt(document.getElementById(`locCapacity_${locationId}`).value, 10);
    const warehouseId = parseInt(document.getElementById(`locWarehouse_${locationId}`).value, 10);
    const useForSuggestion = document.getElementById(`locUseForSuggestion_${locationId}`).checked;

    if (!capacity || capacity < 1) {
        alert('Kapacita musí být větší než 0.');
        return;
    }

    if (!warehouseId) {
        alert('Vyber sklad.');
        return;
    }

    try {
        const response = await fetch(`/masterdata/locations/${locationId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                CapacityBoxes: capacity,
                WarehouseId: warehouseId,
                UseForSuggestion: useForSuggestion
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Nepodařilo se upravit lokaci.');
        }

        await loadLocations();

    } catch (err) {
        alert('Chyba: ' + err.message);
    }
}


function renderDestinations(data) {
    if (!data || data.length === 0) {
        destinationBody.innerHTML = `
            <tr>
                <td colspan="3">Žádné destinace.</td>
            </tr>
        `;
        destinationCount.textContent = '0 záznamů';
        return;
    }

    destinationBody.innerHTML = data.map(d => `
        <tr>
            <td>${d.Id}</td>
            <td>${d.Code ?? ''}</td>
            <td>${d.Name ?? ''}</td>
        </tr>
    `).join('');

    destinationCount.textContent = `${data.length} záznamů`;
}

async function loadDestinations() {
    try {
        destinationBody.innerHTML = `
            <tr>
                <td colspan="3">Načítám data...</td>
            </tr>
        `;
        destinationCount.textContent = 'Načítám...';

        const response = await fetch('/masterdata/destinations');
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Nepodařilo se načíst destinace.');
        }

        allDestinations = data;
        renderDestinations(allDestinations);

        const newPlaceDestination = document.getElementById('newPlaceDestination');

        if (newPlaceDestination) {
            newPlaceDestination.innerHTML = `
                <option value="">-- vyber destinaci --</option>
            ` + allDestinations.map(d => `
                <option value="${d.Id}">${d.Name}</option>
            `).join('');
}

    } catch (err) {
        destinationBody.innerHTML = `
            <tr>
                <td colspan="3">Chyba: ${err.message}</td>
            </tr>
        `;
        destinationCount.textContent = 'Chyba';
    }
}

async function createDestination() {
    const code = document.getElementById('newDestinationCode').value.trim();
    const name = document.getElementById('newDestinationName').value.trim();

    if (!code || !name) {
        alert('Zadej kód i název destinace.');
        return;
    }

    try {
        const response = await fetch('/masterdata/destinations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                Code: code,
                Name: name
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Chyba při ukládání destinace.');
        }

        document.getElementById('newDestinationCode').value = '';
        document.getElementById('newDestinationName').value = '';

        await loadDestinations();

    } catch (err) {
        alert('Chyba: ' + err.message);
    }
}

async function loadQuality() {
    const res = await fetch('/masterdata/quality-statuses');
    const data = await res.json();

    qualityBody.innerHTML = data.map(q => `
        <tr>
            <td>${q.Id}</td>
            <td>${q.Code}</td>
            <td>${q.Name}</td>
        </tr>
    `).join('');

    qualityCount.textContent = data.length + ' záznamů';
}

async function loadContent() {
    const res = await fetch('/masterdata/content-statuses');
    const data = await res.json();

    contentBody.innerHTML = data.map(c => `
        <tr>
            <td>${c.Id}</td>
            <td>${c.Name}</td>
        </tr>
    `).join('');

    contentCount.textContent = data.length + ' záznamů';
}


async function createQuality() {
    const code = document.getElementById('newQualityCode').value;
    const name = document.getElementById('newQualityName').value;

    await fetch('/masterdata/quality-statuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Code: code, Name: name })
    });

    loadQuality();
}

async function createContent() {
    const name = document.getElementById('newContentName').value;

    await fetch('/masterdata/content-statuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Name: name })
    });

    loadContent();
}

function renderDeliveryPlaces(data) {
    if (!data || data.length === 0) {
        deliveryPlaceBody.innerHTML = `
            <tr>
                <td colspan="10">Žádná místa dodání.</td>
            </tr>
        `;
        deliveryPlaceCount.textContent = '0 záznamů';
        return;
    }

    deliveryPlaceBody.innerHTML = data.map(p => `
        <tr>
            <td>${p.Id}</td>
            <td>${p.DestinationName ?? ''}</td>

            <td><input id="dp_name_${p.Id}" value="${p.Name ?? ''}" /></td>
            <td><input id="dp_company_${p.Id}" value="${p.CompanyName ?? ''}" /></td>
            <td><input id="dp_street_${p.Id}" value="${p.Street ?? ''}" /></td>
            <td><input id="dp_city_${p.Id}" value="${p.City ?? ''}" /></td>
            <td><input id="dp_zip_${p.Id}" value="${p.ZipCode ?? ''}" /></td>
            <td><input id="dp_country_${p.Id}" value="${p.Country ?? ''}" /></td>

            <td>
                <select id="dp_lang_${p.Id}">
                    <option value="CZ" ${p.DefaultLanguage === 'CZ' ? 'selected' : ''}>CZ</option>
                    <option value="EN" ${p.DefaultLanguage === 'EN' ? 'selected' : ''}>EN</option>
                </select>
            </td>

            <td>
                <button onclick="updateDeliveryPlace(${p.Id})" class="btn btn-primary">
                    Uložit
                </button>
            </td>
        </tr>
    `).join('');

    deliveryPlaceCount.textContent = `${data.length} záznamů`;
}

async function loadDeliveryPlaces() {
    try {
        deliveryPlaceBody.innerHTML = `
            <tr>
                <td colspan="6">Načítám data...</td>
            </tr>
        `;
        deliveryPlaceCount.textContent = 'Načítám...';

        const response = await fetch('/masterdata/delivery-places');
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Nepodařilo se načíst místa dodání.');
        }

        allDeliveryPlaces = data;
        renderDeliveryPlaces(allDeliveryPlaces);

    } catch (err) {
        deliveryPlaceBody.innerHTML = `
            <tr>
                <td colspan="6">Chyba: ${err.message}</td>
            </tr>
        `;
        deliveryPlaceCount.textContent = 'Chyba';
    }
}

async function createDeliveryPlace() {
    const deliveryDestinationId = parseInt(document.getElementById('newPlaceDestination').value, 10);
    const name = document.getElementById('newPlaceName').value.trim();

    if (!deliveryDestinationId || !name) {
        alert('Vyber destinaci a zadej název místa.');
        return;
    }

    const body = {
        DeliveryDestinationId: deliveryDestinationId,
        Name: name,
        CompanyName: document.getElementById('newPlaceCompany').value.trim(),
        Street: document.getElementById('newPlaceStreet').value.trim(),
        City: document.getElementById('newPlaceCity').value.trim(),
        ZipCode: document.getElementById('newPlaceZip').value.trim(),
        Country: document.getElementById('newPlaceCountry').value.trim(),
        DefaultLanguage: document.getElementById('newPlaceLanguage').value
    };

    try {
        const response = await fetch('/masterdata/delivery-places', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Nepodařilo se uložit místo dodání.');
        }

        document.getElementById('newPlaceName').value = '';
        document.getElementById('newPlaceCompany').value = '';
        document.getElementById('newPlaceStreet').value = '';
        document.getElementById('newPlaceCity').value = '';
        document.getElementById('newPlaceZip').value = '';
        document.getElementById('newPlaceCountry').value = '';

        await loadDeliveryPlaces();

    } catch (err) {
        alert('Chyba: ' + err.message);
    }
}


async function updateDeliveryPlace(id) {
    const body = {
        Name: document.getElementById(`dp_name_${id}`).value.trim(),
        CompanyName: document.getElementById(`dp_company_${id}`).value.trim(),
        Street: document.getElementById(`dp_street_${id}`).value.trim(),
        City: document.getElementById(`dp_city_${id}`).value.trim(),
        ZipCode: document.getElementById(`dp_zip_${id}`).value.trim(),
        Country: document.getElementById(`dp_country_${id}`).value.trim(),
        DefaultLanguage: document.getElementById(`dp_lang_${id}`).value
    };

    const res = await fetch(`/masterdata/delivery-places/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
        alert(data.error || 'Chyba při ukládání');
        return;
    }

    await loadDeliveryPlaces();
}

async function loadProductionLocations() {
    const res = await fetch('/masterdata/production-locations');
    productionLocations = await res.json();
}

function renderProductionLocationOptions(selectedId) {
    return `
        <option value="">-- bez výrobní lokace --</option>
        ${productionLocations.map(l => `
            <option value="${l.Id}" ${Number(selectedId) === Number(l.Id) ? 'selected' : ''}>
                ${l.WarehouseName} / ${l.LocationCode}
            </option>
        `).join('')}
    `;
}


(async function initMasterdata() {
    await loadWarehouses();
    await loadProductionLocations();
    await loadPartNumbers();
    await loadLocations();
    await loadDestinations();
    await loadDeliveryPlaces();
    await loadQuality();
    await loadContent();
})();