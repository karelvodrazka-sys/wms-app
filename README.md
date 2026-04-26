# WMS Vulkán – testovací verze

## Požadavky
- Node.js (doporučeno verze 18+)
- SQL Server
- Přístup k databázi

---

## Instalace

1. Naklonovat repozitář:

git clone <URL_REPOZITARE>
cd WMS-Vulkan

2. Nainstalovat balíčky:
npm install

3. Vytvořit soubor .env podle .env.example:
DB_USER=...
DB_PASSWORD=...
DB_SERVER=...
DB_PORT=1433
DB_DATABASE=WarehouseDB
PORT=3000

4. Spuštění aplikace
node server.js

Aplikace poběží na: http://localhost:3000


Databáze

Databáze se dodává jako .bak soubor.

Obnovení:

Otevřít SQL Server Management Studio
Restore Database
Vybrat .bak
Nastavit název WarehouseDB


Poznámky
Aplikace je testovací verze
Přístup přes webový prohlížeč
Doporučeno používat Chrome / Edge