const xlsx = require("xlsx");
const path = require("path");
const { Material, Uom, sequelize } = require("../models");

const filePath = path.join(__dirname, "liste.xlsm"); // Dosya yolu
const workbook = xlsx.readFile(filePath); // Dosyayı oku
const sheetName = workbook.SheetNames[0]; // İlk sayfayı seç
const sheet = workbook.Sheets[sheetName]; // Sayfayı al
const data = xlsx.utils.sheet_to_json(sheet); // JSON'a dönüştür

(async () => {
  const columns = data.shift();

  const uoms = {};
  for (const row of data) {
    const uom = row.__EMPTY_16;

    uoms[uom] = uoms[uom] || 0;
    uoms[uom]++;
  }

  await Uom.bulkCreate(
    Object.keys(uoms).map((name) => ({
      name,
      symbol: name,
    })),
    { ignoreDuplicates: true }
  );

  const uomid_by_symbol = await Uom.findAll().then((uoms) =>
    uoms.reduce((acc, uom) => {
      acc[uom.symbol] = uom.id;
      return acc;
    }, {})
  );

  const rows = [];
  for (const row of data) {
    rows.push({
      sap_no: row.__EMPTY_4,
      code: row.__EMPTY_4,
      name: row.__EMPTY_9,
      description: row.__EMPTY_18,
      uom_id: uomid_by_symbol[row.__EMPTY_16],
    });
  }

  await Material.bulkCreate(rows, {
    ignoreDuplicates: true,
  });

  sequelize.close();
})();
