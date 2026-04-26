require('dotenv').config();

const path = require('path');
const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// 🔌 připojení na SQL Server
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT, 10),
    database: process.env.DB_DATABASE,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

// 🔹 test endpoint
app.get('/', (req, res) => {
    res.send('WMS běží');
});

// 🔹 seznam beden
app.get('/boxes', async (req, res) => {
    try {
        await sql.connect(dbConfig);

        const result = await sql.query(`
            SELECT *
            FROM vw_BoxStockOverview
            ORDER BY BoxNumber
        `);

        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// 🔹 vytvoření bedny (příjem)
app.post('/receipt', async (req, res) => {
    try {
        const {
            PartNumberId,
            Batch,
            Cavity,
            OrderNumber,
            CastingDate,
            Quantity,
            BoxContentStatusId,
            BoxQualityStatusId,
            RedCardNumber,
            CreatedByUserId
        } = req.body;

        if (
            !PartNumberId ||
            !Batch ||
            !Cavity ||
            !OrderNumber ||
            !CastingDate ||
            !Quantity ||
            !BoxContentStatusId ||
            !BoxQualityStatusId ||
            !CreatedByUserId
        ) {
            return res.status(400).json({
                error: 'Chybi povinna data pro prijem bedny.'
            });
        }

        const pool = await sql.connect(dbConfig);

        const result = await pool.request()
            .input('PartNumberId', sql.Int, PartNumberId)
            .input('Batch', sql.NVarChar(5), Batch)
            .input('Cavity', sql.TinyInt, Cavity)
            .input('OrderNumber', sql.NVarChar(50), OrderNumber)
            .input('CastingDate', sql.Date, CastingDate)
            .input('Quantity', sql.Int, Quantity)
            .input('BoxContentStatusId', sql.Int, BoxContentStatusId)
            .input('BoxQualityStatusId', sql.Int, BoxQualityStatusId)
            .input('CreatedByUserId', sql.Int, CreatedByUserId)
            .input('RedCardNumber', sql.NVarChar(50), RedCardNumber)
            .execute('CreateReceiptBox');

        res.json({
            success: true,
            data: result.recordset[0]
        });
    } catch (err) {
        console.error('Chyba /receipt:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server běží na http://localhost:${PORT}`);
});

// 🔹 návrh lokace pro přijímanou bednu
app.get('/suggest-location', async (req, res) => {
    try {
        const { PartNumberId, Batch, Cavity } = req.query;

        if (!PartNumberId || !Batch || !Cavity) {
            return res.status(400).json({
                error: 'Chybi parametry PartNumberId, Batch, Cavity'
            });
        }

        const pool = await sql.connect(dbConfig);

        const result = await pool.request()
            .input('PartNumberId', sql.Int, PartNumberId)
            .input('Batch', sql.NVarChar(5), Batch)
            .input('Cavity', sql.TinyInt, Cavity)
            .execute('SuggestLocationForBox');

        res.json(result.recordset[0]);

    } catch (err) {
        console.error('Chyba /suggest-location:', err);
        res.status(500).json({
            error: err.message
        });
    }
});

// 🔹 potvrzení příjmu po fyzickém zaskladnění
app.post('/confirm-putaway', async (req, res) => {
    try {
        const { BoxId, UserId } = req.body;

        if (!BoxId || !UserId) {
            return res.status(400).json({
                error: 'Chybi BoxId nebo UserId'
            });
        }

        const pool = await sql.connect(dbConfig);

        await pool.request()
            .input('BoxId', sql.Int, BoxId)
            .input('ConfirmedByUserId', sql.Int, UserId)
            .execute('ConfirmPutaway');

        res.json({
            success: true,
            message: 'Zaskladneni potvrzeno'
        });

    } catch (err) {
        console.error('Chyba /confirm-putaway:', err);
        res.status(500).json({
            error: err.message
        });
    }
});

// 🔹 návrh lokace pro přeskladnění
app.get('/suggest-transfer-location/:boxId', async (req, res) => {
    try {
        const boxId = parseInt(req.params.boxId, 10);

        if (!boxId) {
            return res.status(400).json({
                error: 'Neplatne BoxId'
            });
        }

        const pool = await sql.connect(dbConfig);

        const result = await pool.request()
            .input('BoxId', sql.Int, boxId)
            .execute('SuggestTransferLocation');

        res.json({
            success: true,
            data: result.recordset[0] || null
        });
    } catch (err) {
        console.error('Chyba /suggest-transfer-location:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// 🔹 zahájení přeskladnění
app.post('/start-transfer', async (req, res) => {
    try {
        const { BoxId, TargetLocationId, UserId } = req.body;

        if (!BoxId || !TargetLocationId || !UserId) {
            return res.status(400).json({
                error: 'Chybi BoxId, TargetLocationId nebo UserId'
            });
        }

        const pool = await sql.connect(dbConfig);

        await pool.request()
            .input('BoxId', sql.Int, BoxId)
            .input('TargetLocationId', sql.Int, TargetLocationId)
            .input('UserId', sql.Int, UserId)
            .execute('StartTransfer');

        res.json({
            success: true,
            message: 'Preskladneni zahajeno'
        });
    } catch (err) {
        console.error('Chyba /start-transfer:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// 🔹 potvrzení přeskladnění po fyzickém zaskladnění
app.post('/confirm-transfer', async (req, res) => {
    try {
        const { BoxId, UserId } = req.body;

        if (!BoxId || !UserId) {
            return res.status(400).json({
                error: 'Chybi BoxId nebo UserId'
            });
        }

        const pool = await sql.connect(dbConfig);

        await pool.request()
            .input('BoxId', sql.Int, BoxId)
            .input('UserId', sql.Int, UserId)
            .execute('ConfirmTransfer');

        res.json({
            success: true,
            message: 'Preskladneni potvrzeno'
        });
    } catch (err) {
        console.error('Chyba /confirm-transfer:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// 🔹 založení dodávky
app.post('/delivery', async (req, res) => {
    try {
        const { DeliveryDestinationId, CreatedByUserId } = req.body;

        if (!DeliveryDestinationId || !CreatedByUserId) {
            return res.status(400).json({
                error: 'Chybi DeliveryDestinationId nebo CreatedByUserId'
            });
        }

        const pool = await sql.connect(dbConfig);

        const result = await pool.request()
            .input('DeliveryDestinationId', sql.Int, DeliveryDestinationId)
            .input('CreatedByUserId', sql.Int, CreatedByUserId)
            .execute('CreateDelivery');

        res.json({
            success: true,
            data: result.recordset[0]
        });
    } catch (err) {
        console.error('Chyba /delivery:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// 🔹 Přidání bedny do dodávky
app.post('/delivery/add-box', async (req, res) => {
    try {
        const { DeliveryId, BoxId, UserId } = req.body;

        if (!DeliveryId || !BoxId || !UserId) {
            return res.status(400).json({
                error: 'Chybi DeliveryId, BoxId nebo UserId'
            });
        }

        const pool = await sql.connect(dbConfig);

        await pool.request()
            .input('DeliveryId', sql.Int, DeliveryId)
            .input('BoxId', sql.Int, BoxId)
            .input('UserId', sql.Int, UserId)
            .execute('AddBoxToDelivery');

        res.json({
            success: true,
            message: 'Bedna pridana do dodavky'
        });
    } catch (err) {
        console.error('Chyba /delivery/add-box:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// 🔹 Potvrzení dodávky
app.post('/delivery/confirm', async (req, res) => {
    try {
        const { DeliveryId, UserId } = req.body;

        if (!DeliveryId || !UserId) {
            return res.status(400).json({
                error: 'Chybi DeliveryId nebo UserId'
            });
        }

        const pool = await sql.connect(dbConfig);

        await pool.request()
            .input('DeliveryId', sql.Int, DeliveryId)
            .input('UserId', sql.Int, UserId)
            .execute('ConfirmDelivery');

        res.json({
            success: true,
            message: 'Dodavka potvrzena'
        });
    } catch (err) {
        console.error('Chyba /delivery/confirm:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// 🔹 Seznam dodávek
app.get('/deliveries', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);

        const result = await pool.request().query(`
            SELECT
                d.Id,
                d.DeliveryNumber,
                dd.Name AS Destination,
                d.CreatedAt
            FROM Deliveries d
            JOIN DeliveryDestinations dd ON dd.Id = d.DeliveryDestinationId
            ORDER BY d.Id DESC
        `);

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🔹 Detail dodávky
app.get('/deliveries/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const pool = await sql.connect(dbConfig);

        const result = await pool.request()
            .input('DeliveryId', sql.Int, id)
            .query(`
                SELECT
                    b.BoxNumber,
                    pn.PartNumber AS PartNumber,
                    b.Batch,
                    b.Cavity,
                    b.Quantity
                FROM DeliveryBoxes db
                JOIN Boxes b ON b.Id = db.BoxId
                JOIN PartNumbers pn ON pn.Id = b.PartNumberId
                WHERE db.DeliveryId = @DeliveryId
            `);

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🔹 Založení inventury
app.post('/inventory', async (req, res) => {
    try {
        const { PartNumberId, CreatedByUserId } = req.body;

        if (!PartNumberId || !CreatedByUserId) {
            return res.status(400).json({
                error: 'Chybi PartNumberId nebo CreatedByUserId'
            });
        }

        const pool = await sql.connect(dbConfig);

        const result = await pool.request()
            .input('PartNumberId', sql.Int, PartNumberId)
            .input('CreatedByUserId', sql.Int, CreatedByUserId)
            .execute('CreateInventory');

        res.json({
            success: true,
            data: result.recordset[0]
        });
    } catch (err) {
        console.error('Chyba /inventory:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// 🔹 Detail inventury
app.get('/inventory/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const pool = await sql.connect(dbConfig);

        const result = await pool.request()
            .input('InventoryId', sql.Int, id)
            .query(`
                SELECT
                    il.Id,
                    i.InventoryNumber,
                    b.BoxNumber,
                    pn.PartNumber,
                    b.Batch,
                    b.Cavity,
                    il.ExpectedQuantity,
                    il.ActualQuantity,
                    el.Code AS ExpectedLocationCode,
                    al.Code AS ActualLocationCode,
                    il.ResultCode,
                    il.Comment
                FROM InventoryLines il
                JOIN Inventories i ON i.Id = il.InventoryId
                JOIN Boxes b ON b.Id = il.BoxId
                JOIN PartNumbers pn ON pn.Id = b.PartNumberId
                LEFT JOIN Locations el ON el.Id = il.ExpectedLocationId
                LEFT JOIN Locations al ON al.Id = il.ActualLocationId
                WHERE il.InventoryId = @InventoryId
                ORDER BY b.BoxNumber
            `);

        res.json(result.recordset);
    } catch (err) {
        console.error('Chyba /inventory/:id:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// 🔹 Zapsání výsledku inventury
app.post('/inventory/line', async (req, res) => {
    try {
        const {
            InventoryLineId,
            ActualLocationId,
            ActualQuantity,
            ResultCode,
            Comment
        } = req.body;

        if (!InventoryLineId || !ResultCode) {
            return res.status(400).json({
                error: 'Chybi InventoryLineId nebo ResultCode'
            });
        }

        const pool = await sql.connect(dbConfig);

        await pool.request()
            .input('InventoryLineId', sql.Int, InventoryLineId)
            .input('ActualLocationId', sql.Int, ActualLocationId)
            .input('ActualQuantity', sql.Int, ActualQuantity)
            .input('ResultCode', sql.NVarChar(50), ResultCode)
            .input('Comment', sql.NVarChar(500), Comment)
            .execute('UpdateInventoryLine');

        res.json({
            success: true,
            message: 'Radek inventury aktualizovan'
        });
    } catch (err) {
        console.error('Chyba /inventory/line:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});


// 🔹 seznam beden čekajících na zaskladnění
app.get('/putaway/pending', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);

        const result = await pool.request().query(`
            SELECT
                b.Id,
                b.BoxNumber,
                pn.PartNumber,
                b.Batch,
                b.Cavity,
                b.Quantity,
                rl.Code AS ReservedLocationCode
            FROM Boxes b
            JOIN PartNumbers pn ON pn.Id = b.PartNumberId
            JOIN BoxLogisticStatuses bls ON bls.Id = b.BoxLogisticStatusId
            LEFT JOIN Locations rl ON rl.Id = b.ReservedLocationId
            WHERE bls.Code = 'WAITING_PUTAWAY'
              AND b.IsActive = 1
            ORDER BY b.BoxNumber
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error('Chyba /putaway/pending:', err);
        res.status(500).json({ error: err.message });
    }
});

// 🔹 hromadné potvrzení zaskladnění
app.post('/putaway/confirm-multiple', async (req, res) => {
    try {
        const { BoxIds, UserId } = req.body;

        if (!Array.isArray(BoxIds) || BoxIds.length === 0 || !UserId) {
            return res.status(400).json({
                error: 'Chybi BoxIds nebo UserId'
            });
        }

        const pool = await sql.connect(dbConfig);

        for (const boxId of BoxIds) {
            await pool.request()
                .input('BoxId', sql.Int, boxId)
                .input('ConfirmedByUserId', sql.Int, UserId)
                .execute('ConfirmPutaway');
        }

        res.json({
            success: true,
            message: `Zaskladneno ${BoxIds.length} beden`
        });
    } catch (err) {
        console.error('Chyba /putaway/confirm-multiple:', err);
        res.status(500).json({ error: err.message });
    }
});

// 🔹 hromadná změna kvalitativního stavu beden
app.post('/boxes/change-quality-status', async (req, res) => {
    try {
        const { BoxIds, NewQualityStatusId, UserId, RedCardNumber, Note } = req.body;

        if (!Array.isArray(BoxIds) || BoxIds.length === 0 || !NewQualityStatusId || !UserId) {
            return res.status(400).json({
                error: 'Chybi BoxIds, NewQualityStatusId nebo UserId'
            });
        }

        const pool = await sql.connect(dbConfig);

        for (const boxId of BoxIds) {
            await pool.request()
                .input('BoxId', sql.Int, boxId)
                .input('NewQualityStatusId', sql.Int, NewQualityStatusId)
                .input('UserId', sql.Int, UserId)
                .input('Note', sql.NVarChar(200), Note || null)
                .input('RedCardNumber', sql.NVarChar(50), RedCardNumber || null)
                .execute('ChangeBoxQualityStatus');
        }

        res.json({
            success: true,
            message: `Kvalitativni stav změněn u ${BoxIds.length} beden`
        });
    } catch (err) {
        console.error('Chyba /boxes/change-quality-status:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// 🔹 endpoint pro obrazivku beden čekajících na potvrzení přeskladnění
app.get('/locations', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT Id, Code, ColumnCode
            FROM Locations
            WHERE IsActive = 1
            ORDER BY Code
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/transfer/pending', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT
                b.Id,
                b.BoxNumber,
                pn.PartNumber,
                b.Batch,
                b.Cavity,
                b.Quantity,
                cl.Code AS CurrentLocationCode,
                rl.Code AS ReservedLocationCode,
                b.ReservedLocationId
            FROM Boxes b
            JOIN PartNumbers pn ON pn.Id = b.PartNumberId
            LEFT JOIN Locations cl ON cl.Id = b.CurrentLocationId
            LEFT JOIN Locations rl ON rl.Id = b.ReservedLocationId
            JOIN BoxLogisticStatuses bls ON bls.Id = b.BoxLogisticStatusId
            WHERE bls.Code = 'WAITING_TRANSFER'
              AND b.IsActive = 1
            ORDER BY b.BoxNumber
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/transfer/update-location', async (req, res) => {
    try {
        const { BoxId, TargetLocationId, UserId } = req.body;

        if (!BoxId || !TargetLocationId || !UserId) {
            return res.status(400).json({ error: 'Chybi BoxId, TargetLocationId nebo UserId' });
        }

        const pool = await sql.connect(dbConfig);

        await pool.request()
            .input('BoxId', sql.Int, BoxId)
            .input('TargetLocationId', sql.Int, TargetLocationId)
            .input('UserId', sql.Int, UserId)
            .query(`
                UPDATE Boxes
                SET ReservedLocationId = @TargetLocationId,
                    UpdatedAt = GETDATE(),
                    UpdatedByUserId = @UserId
                WHERE Id = @BoxId
            `);

        res.json({ success: true, message: 'Cilova lokace upravena' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/transfer/confirm-multiple', async (req, res) => {
    try {
        const { BoxIds, UserId } = req.body;

        if (!Array.isArray(BoxIds) || BoxIds.length === 0 || !UserId) {
            return res.status(400).json({ error: 'Chybi BoxIds nebo UserId' });
        }

        const pool = await sql.connect(dbConfig);

        for (const boxId of BoxIds) {
            await pool.request()
                .input('BoxId', sql.Int, boxId)
                .input('UserId', sql.Int, UserId)
                .execute('ConfirmTransfer');
        }

        res.json({ success: true, message: `Potvrzeno preskladneni ${BoxIds.length} beden` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/transfer/cancel', async (req, res) => {
    try {
        const { BoxId, UserId } = req.body;

        if (!BoxId || !UserId) {
            return res.status(400).json({ error: 'Chybi BoxId nebo UserId' });
        }

        const pool = await sql.connect(dbConfig);

        await pool.request()
            .input('BoxId', sql.Int, BoxId)
            .input('UserId', sql.Int, UserId)
            .query(`
                UPDATE Boxes
                SET ReservedLocationId = NULL,
                    BoxLogisticStatusId = 2,
                    UpdatedAt = GETDATE(),
                    UpdatedByUserId = @UserId
                WHERE Id = @BoxId;

                INSERT INTO BoxMovements (
                    BoxId,
                    MovementTypeId,
                    FromLocationId,
                    ToLocationId,
                    ReferenceType,
                    DoneByUserId,
                    Note
                )
                SELECT
                    Id,
                    8,
                    CurrentLocationId,
                    NULL,
                    'TRANSFER_CANCEL',
                    @UserId,
                    'Zruseno zahajene preskladneni'
                FROM Boxes
                WHERE Id = @BoxId;
            `);

        res.json({ success: true, message: 'Preskladneni zruseno' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🔹 možnost změny lokace na obrazovce beden čekajících na potvrzení zaskladnění
app.post('/putaway/update-location', async (req, res) => {
    try {
        const { BoxId, TargetLocationId, UserId } = req.body;

        if (!BoxId || !TargetLocationId || !UserId) {
            return res.status(400).json({ error: 'Chybi BoxId, TargetLocationId nebo UserId' });
        }

        const pool = await sql.connect(dbConfig);

        await pool.request()
            .input('BoxId', sql.Int, BoxId)
            .input('TargetLocationId', sql.Int, TargetLocationId)
            .input('UserId', sql.Int, UserId)
            .query(`
                UPDATE Boxes
                SET ReservedLocationId = @TargetLocationId,
                    UpdatedAt = GETDATE(),
                    UpdatedByUserId = @UserId
                WHERE Id = @BoxId
                  AND BoxLogisticStatusId = 1
            `);

        res.json({ success: true, message: 'Rezervovana lokace upravena' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🔹 možnost zrušení příjmu pro bednu čekající na potvrzení zaskladnění
app.post('/putaway/cancel', async (req, res) => {
    try {
        const { BoxId, UserId } = req.body;

        if (!BoxId || !UserId) {
            return res.status(400).json({ error: 'Chybi BoxId nebo UserId' });
        }

        const pool = await sql.connect(dbConfig);

        await pool.request()
            .input('BoxId', sql.Int, BoxId)
            .input('UserId', sql.Int, UserId)
            .query(`
                UPDATE Boxes
                SET IsActive = 0,
                    ReservedLocationId = NULL,
                    UpdatedAt = GETDATE(),
                    UpdatedByUserId = @UserId
                WHERE Id = @BoxId
                  AND BoxLogisticStatusId = 1;

                INSERT INTO BoxMovements (
                    BoxId,
                    MovementTypeId,
                    FromLocationId,
                    ToLocationId,
                    ReferenceType,
                    DoneByUserId,
                    Note
                )
                SELECT
                    Id,
                    8,
                    NULL,
                    NULL,
                    'RECEIPT_CANCEL',
                    @UserId,
                    'Zrusen prijem / bedna odaktivovana'
                FROM Boxes
                WHERE Id = @BoxId;
            `);

        res.json({ success: true, message: 'Prijem bedny zrusen' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🔹 bedna podle čísla
app.get('/boxes/by-number/:boxNumber', async (req, res) => {
    try {
        const { boxNumber } = req.params;

        if (!boxNumber) {
            return res.status(400).json({ error: 'Neplatne BoxNumber' });
        }

        const pool = await sql.connect(dbConfig);

        const result = await pool.request()
            .input('BoxNumber', sql.Char(5), boxNumber)
            .query(`
                SELECT
                    b.Id,
                    b.BoxNumber,
                    pn.PartNumber,
                    b.Batch,
                    b.Cavity,
                    b.OrderNumber,
                    b.Quantity,
                    b.ReservedLocationId,
                    rl.Code AS ReservedLocationCode,
                    bls.Code AS LogisticStatus
                FROM Boxes b
                JOIN PartNumbers pn ON pn.Id = b.PartNumberId
                JOIN BoxLogisticStatuses bls ON bls.Id = b.BoxLogisticStatusId
                LEFT JOIN Locations rl ON rl.Id = b.ReservedLocationId
                WHERE b.BoxNumber = @BoxNumber
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Bedna nenalezena' });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Chyba /boxes/by-number/:boxNumber:', err);
        res.status(500).json({ error: err.message });
    }
});

// 🔹 dodávka podle čísla
app.get('/delivery/by-number/:number', async (req, res) => {
    try {
        const { number } = req.params;
        const pool = await sql.connect(dbConfig);

        const result = await pool.request()
            .input('DeliveryNumber', sql.NVarChar(50), number)
            .query(`
                SELECT
                    b.Id,
                    b.BoxNumber,
                    pn.PartNumber,
                    b.Batch,
                    b.Cavity,
                    b.OrderNumber,
                    b.Quantity
                FROM Deliveries d
                JOIN DeliveryBoxes db ON db.DeliveryId = d.Id
                JOIN Boxes b ON b.Id = db.BoxId
                JOIN PartNumbers pn ON pn.Id = b.PartNumberId
                WHERE d.DeliveryNumber = @DeliveryNumber
            `);

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🔹 endpoint pro navrzeni lokace při příjmu již existujících beden
app.post('/receipt/prepare-existing', async (req, res) => {
    try {
        const { BoxIds, UserId } = req.body;

        if (!Array.isArray(BoxIds) || BoxIds.length === 0 || !UserId) {
            return res.status(400).json({
                error: 'Chybi BoxIds nebo UserId'
            });
        }

        const pool = await sql.connect(dbConfig);

        const prepared = [];

        for (const boxId of BoxIds) {
            const boxResult = await pool.request()
                .input('BoxId', sql.Int, boxId)
                .query(`
                    SELECT
                        b.Id,
                        b.PartNumberId,
                        b.Batch,
                        b.Cavity,
                        bls.Code AS LogisticStatusCode
                    FROM Boxes b
                    JOIN BoxLogisticStatuses bls ON bls.Id = b.BoxLogisticStatusId
                    WHERE b.Id = @BoxId
                    AND b.IsActive = 1
                `);

            if (boxResult.recordset.length === 0) {
                throw new Error(`Bedna ${boxId} nenalezena.`);
            }

            const box = boxResult.recordset[0];

            const suggestResult = await pool.request()
                .input('PartNumberId', sql.Int, box.PartNumberId)
                .input('Batch', sql.NVarChar(5), box.Batch)
                .input('Cavity', sql.TinyInt, box.Cavity)
                .execute('SuggestLocationForBox');

            if (!suggestResult.recordset || suggestResult.recordset.length === 0) {
                throw new Error(`Nepodarilo se navrhnout lokaci pro bednu ${boxId}.`);
            }

            const location = suggestResult.recordset[0];

            await pool.request()
                .input('BoxId', sql.Int, boxId)
                .input('LocationId', sql.Int, location.Id)
                .input('UserId', sql.Int, UserId)
                .input('WasInImpregnation', sql.Bit, box.LogisticStatusCode === 'IN_IMPREGNATION' ? 1 : 0)
                .query(`
                    UPDATE Boxes
                    SET
                        ReservedLocationId = @LocationId,
                        BoxLogisticStatusId = 1,
                        BoxQualityStatusId = CASE
                        WHEN @WasInImpregnation = 1 THEN 5
                        ELSE BoxQualityStatusId
                        END,
                        CurrentLocationId = NULL,
                        UpdatedAt = GETDATE(),
                        UpdatedByUserId = @UserId
                    WHERE Id = @BoxId
                `);

            await pool.request()
                .input('BoxId', sql.Int, boxId)
                .input('LocationId', sql.Int, location.Id)
                .input('UserId', sql.Int, UserId)
                .query(`
                    INSERT INTO BoxMovements (
                        BoxId,
                        MovementTypeId,
                        FromLocationId,
                        ToLocationId,
                        ReferenceType,
                        DoneByUserId,
                        Note
                    )
                    VALUES (
                        @BoxId,
                        1,
                        NULL,
                        @LocationId,
                        'RECEIPT_EXISTING',
                        @UserId,
                        'Existujici bedna pripravena k zaskladneni'
                    )
                `);

            prepared.push({
                BoxId: boxId,
                ReservedLocationId: location.Id,
                ReservedLocationCode: location.Code,
                ReservedColumnCode: location.ColumnCode
            });
        }

        res.json({
            success: true,
            message: `Pripraveno k zaskladneni ${prepared.length} beden`,
            data: prepared
        });
    } catch (err) {
        console.error('Chyba /receipt/prepare-existing:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// 🔹 endpoint pro zobrazení historie
app.get('/history', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);

        const result = await pool.request().query(`
            SELECT TOP 1000
                MovementId,
                BoxId,
                BoxNumber,
                PartNumber,
                Batch,
                Cavity,
                OrderNumber,
                CastingDate,
                Quantity,
                BoxContentStatus,
                CurrentLogisticStatus,
                CurrentQualityStatus,
                CurrentRedCardNumber,
                MovementTypeCode,
                MovementTypeName,
                FromLocationCode,
                ToLocationCode,
                ReferenceType,
                ReferenceId,
                DoneAt,
                Username,
                Note,
                MovementRedCardNumber
            FROM vw_BoxMovementHistory
            ORDER BY MovementId DESC
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error('Chyba /history:', err);
        res.status(500).json({ error: err.message });
    }
});

// 🔹 export historie do csv
app.get('/history/export', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);

        const result = await pool.request().query(`
            SELECT TOP 5000
                DoneAt AS Datum,
                BoxNumber AS Bedna,
                PartNumber AS PN,
                Batch AS Sarze,
                Cavity AS Otisk,
                OrderNumber AS Zakazka,
                Quantity AS Ks,
                MovementTypeName AS Pohyb,
                FromLocationCode AS Odkud,
                ToLocationCode AS Kam,
                BoxContentStatus AS ObsahovyStav,
                CurrentLogisticStatus AS LogistickyStav,
                CurrentQualityStatus AS KvalitativniStav,
                CurrentRedCardNumber AS CisloCK,
                Username AS Uzivatel,
                Note AS Poznamka
            FROM vw_BoxMovementHistory
            ORDER BY MovementId DESC
        `);

        const rows = result.recordset;

        if (rows.length === 0) {
            return res.status(404).send('Žádná data k exportu.');
        }

        const headers = Object.keys(rows[0]);

        const csv = [
            headers.join(';'),
            ...rows.map(row =>
                headers.map(header => {
                    const value = row[header] ?? '';
                    return `"${String(value).replace(/"/g, '""')}"`;
                }).join(';')
            )
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="historie_pohybu.csv"');

        res.send('\uFEFF' + csv);
    } catch (err) {
        console.error('Chyba /history/export:', err);
        res.status(500).send(err.message);
    }
});

// 🔹 export pro detail bedny
app.get('/boxes/:id/detail', async (req, res) => {
    try {
        const boxId = parseInt(req.params.id, 10);

        if (!boxId) {
            return res.status(400).json({ error: 'Neplatne BoxId' });
        }

        const pool = await sql.connect(dbConfig);

        const result = await pool.request()
            .input('BoxId', sql.Int, boxId)
            .query(`
                SELECT
                    b.Id,
                    b.BoxNumber,
                    pn.PartNumber,
                    b.Batch,
                    b.Cavity,
                    b.OrderNumber,
                    b.CastingDate,
                    b.Quantity,
                    bcs.Name AS BoxContentStatus,
                    bls.Name AS BoxLogisticStatus,
                    bqs.Name AS BoxQualityStatus,
                    CASE
                        WHEN bqs.Code = 'CK' THEN b.RedCardNumber
                        ELSE NULL
                    END AS RedCardNumber,
                    w.Name AS WarehouseName,
                    l.Code AS LocationCode,
                    l.ColumnCode,
                    b.CreatedAt,
                    cu.Username AS CreatedBy,
                    b.UpdatedAt,
                    uu.Username AS UpdatedBy
                FROM Boxes b
                JOIN PartNumbers pn ON pn.Id = b.PartNumberId
                JOIN BoxContentStatuses bcs ON bcs.Id = b.BoxContentStatusId
                JOIN BoxLogisticStatuses bls ON bls.Id = b.BoxLogisticStatusId
                JOIN BoxQualityStatuses bqs ON bqs.Id = b.BoxQualityStatusId
                LEFT JOIN Warehouses w ON w.Id = b.CurrentWarehouseId
                LEFT JOIN Locations l ON l.Id = b.CurrentLocationId
                LEFT JOIN Users cu ON cu.Id = b.CreatedByUserId
                LEFT JOIN Users uu ON uu.Id = b.UpdatedByUserId
                WHERE b.Id = @BoxId
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Bedna nenalezena' });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🔹 export pro historii jedné bedny
app.get('/boxes/:id/history', async (req, res) => {
    try {
        const boxId = parseInt(req.params.id, 10);

        if (!boxId) {
            return res.status(400).json({ error: 'Neplatne BoxId' });
        }

        const pool = await sql.connect(dbConfig);

        const result = await pool.request()
            .input('BoxId', sql.Int, boxId)
            .query(`
                SELECT
                    MovementId,
                    BoxId,
                    BoxNumber,
                    PartNumber,
                    Batch,
                    Cavity,
                    OrderNumber,
                    Quantity,
                    MovementTypeName,
                    FromLocationCode,
                    ToLocationCode,
                    ReferenceType,
                    ReferenceId,
                    DoneAt,
                    Username,
                    Note,
                    MovementRedCardNumber
                FROM vw_BoxMovementHistory
                WHERE BoxId = @BoxId
                ORDER BY MovementId DESC
            `);

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});