const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

class DocumentService {
  // Teslimat belgesi oluştur
  async createDeliveryDocument(delivery, request, material, project) {
    const doc = new PDFDocument();
    const filename = `delivery_${delivery.id}_${Date.now()}.pdf`;
    const filePath = path.join(__dirname, '../uploads/deliveries', filename);
    const writeStream = fs.createWriteStream(filePath);

    // QR kod oluştur
    const qrCodeData = await QRCode.toDataURL(JSON.stringify({
      deliveryId: delivery.id,
      requestId: request.id,
      materialCode: material.material_code,
      date: delivery.delivery_date
    }));

    // PDF oluştur
    doc.pipe(writeStream);

    // Başlık
    doc.fontSize(20).text('Teslimat Belgesi', { align: 'center' });
    doc.moveDown();

    // QR kodu
    doc.image(qrCodeData, 450, 50, { width: 100 });

    // Teslimat bilgileri
    doc.fontSize(12);
    doc.text(`Teslimat No: ${delivery.id}`);
    doc.text(`Tarih: ${new Date(delivery.delivery_date).toLocaleDateString('tr-TR')}`);
    doc.moveDown();

    // Proje bilgileri
    doc.fontSize(14).text('Proje Bilgileri');
    doc.fontSize(12);
    doc.text(`Proje Adı: ${project.project_name}`);
    doc.text(`PYP No: ${project.pyp_number}`);
    doc.moveDown();

    // Malzeme bilgileri
    doc.fontSize(14).text('Malzeme Bilgileri');
    doc.fontSize(12);
    doc.text(`Malzeme Kodu: ${material.material_code}`);
    doc.text(`Malzeme Adı: ${material.description}`);
    doc.text(`Birim: ${material.unit}`);
    doc.moveDown();

    // Miktar bilgileri
    doc.fontSize(14).text('Miktar Bilgileri');
    doc.fontSize(12);
    doc.text(`Talep Edilen: ${request.requested_qty} ${material.unit}`);
    doc.text(`Teslim Edilen: ${request.revised_qty || request.requested_qty} ${material.unit}`);
    doc.moveDown();

    // İmza alanları
    doc.fontSize(14).text('İmzalar', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12);
    doc.text('Teslim Eden: _________________', { align: 'left' });
    doc.text('Teslim Alan: _________________', { align: 'right' });

    // PDF'i sonlandır
    doc.end();

    // Promise olarak dön
    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => {
        resolve({
          filename,
          path: filePath,
          size: fs.statSync(filePath).size
        });
      });
      writeStream.on('error', reject);
    });
  }

  // Talep formu oluştur
  async createRequestForm(request, material, project) {
    const doc = new PDFDocument();
    const filename = `request_${request.id}_${Date.now()}.pdf`;
    const filePath = path.join(__dirname, '../uploads/requests', filename);
    const writeStream = fs.createWriteStream(filePath);

    // QR kod oluştur
    const qrCodeData = await QRCode.toDataURL(JSON.stringify({
      requestId: request.id,
      materialCode: material.material_code,
      date: request.createdAt
    }));

    // PDF oluştur
    doc.pipe(writeStream);

    // Başlık
    doc.fontSize(20).text('Malzeme Talep Formu', { align: 'center' });
    doc.moveDown();

    // QR kodu
    doc.image(qrCodeData, 450, 50, { width: 100 });

    // Talep bilgileri
    doc.fontSize(12);
    doc.text(`Talep No: ${request.id}`);
    doc.text(`Tarih: ${new Date(request.createdAt).toLocaleDateString('tr-TR')}`);
    doc.moveDown();

    // Proje bilgileri
    doc.fontSize(14).text('Proje Bilgileri');
    doc.fontSize(12);
    doc.text(`Proje Adı: ${project.project_name}`);
    doc.text(`PYP No: ${project.pyp_number}`);
    doc.moveDown();

    // Malzeme bilgileri
    doc.fontSize(14).text('Malzeme Bilgileri');
    doc.fontSize(12);
    doc.text(`Malzeme Kodu: ${material.material_code}`);
    doc.text(`Malzeme Adı: ${material.description}`);
    doc.text(`Birim: ${material.unit}`);
    doc.moveDown();

    // Miktar bilgileri
    doc.fontSize(14).text('Miktar Bilgileri');
    doc.fontSize(12);
    doc.text(`Talep Edilen: ${request.requested_qty} ${material.unit}`);
    if (request.revised_qty) {
      doc.text(`Revize Edilen: ${request.revised_qty} ${material.unit}`);
    }
    doc.moveDown();

    // Durum bilgisi
    doc.fontSize(14).text('Durum');
    doc.fontSize(12);
    doc.text(`Talep Durumu: ${request.status}`);
    doc.moveDown();

    // İmza alanları
    doc.fontSize(14).text('İmzalar', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12);
    doc.text('Talep Eden: _________________', { align: 'left' });
    doc.text('Onaylayan: _________________', { align: 'right' });

    // PDF'i sonlandır
    doc.end();

    // Promise olarak dön
    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => {
        resolve({
          filename,
          path: filePath,
          size: fs.statSync(filePath).size
        });
      });
      writeStream.on('error', reject);
    });
  }
}

module.exports = new DocumentService();
