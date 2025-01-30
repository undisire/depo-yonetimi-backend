# Depo Yönetim Sistemi API

Bu proje, depo yönetim sistemi için geliştirilmiş bir RESTful API'dir. Malzeme, talep, teslimat ve proje yönetimi için kapsamlı bir API sağlar.

## Özellikler

- JWT tabanlı kimlik doğrulama ve yetkilendirme
- Rol bazlı erişim kontrolü (Admin, Mühendis, Depocu)
- Malzeme yönetimi ve stok takibi
- Talep ve teslimat yönetimi
- Proje bazlı malzeme takibi
- Gerçek zamanlı bildirimler
- Dosya yükleme ve yönetimi
- Kapsamlı raporlama ve istatistikler
- Arama ve filtreleme sistemi
- Redis önbellekleme
- Rate limiting
- Swagger API dokümantasyonu

## Teknolojiler

- Node.js
- Express.js
- Sequelize ORM
- PostgreSQL
- Redis
- Socket.IO
- JWT
- Swagger
- Winston Logger

## Kurulum

1. Gerekli paketleri yükleyin:
```bash
npm install
```

2. Veritabanını oluşturun:
```bash
node sync.js
```

3. Sunucuyu başlatın:
```bash
npm start
```

## API Dokümantasyonu

API dokümantasyonuna `/api-docs` endpoint'inden erişebilirsiniz. Swagger UI üzerinden tüm endpoint'leri test edebilir ve detaylı bilgilere ulaşabilirsiniz.

## Endpoint'ler

### Auth
- POST /api/auth/register - Yeni kullanıcı kaydı
- POST /api/auth/login - Kullanıcı girişi
- GET /api/auth/profile - Kullanıcı profili
- PUT /api/auth/change-password - Şifre değiştirme

### Malzemeler
- GET /api/materials - Malzeme listesi
- GET /api/materials/:id - Malzeme detayı
- POST /api/materials - Yeni malzeme ekleme
- PUT /api/materials/:id - Malzeme güncelleme
- DELETE /api/materials/:id - Malzeme silme

### Talepler
- GET /api/requests - Talep listesi
- GET /api/requests/:id - Talep detayı
- POST /api/requests - Yeni talep oluşturma
- PUT /api/requests/:id - Talep güncelleme
- DELETE /api/requests/:id - Talep silme

### Teslimatlar
- GET /api/deliveries - Teslimat listesi
- GET /api/deliveries/:id - Teslimat detayı
- POST /api/deliveries - Yeni teslimat oluşturma
- PUT /api/deliveries/:id - Teslimat güncelleme
- DELETE /api/deliveries/:id - Teslimat silme

### Projeler
- GET /api/projects - Proje listesi
- GET /api/projects/:id - Proje detayı
- POST /api/projects - Yeni proje oluşturma
- PUT /api/projects/:id - Proje güncelleme
- DELETE /api/projects/:id - Proje silme

### Raporlar
- GET /api/reports/stock-status - Stok durumu raporu
- GET /api/reports/request-stats - Talep istatistikleri
- GET /api/reports/project-materials - Proje malzeme raporu
- GET /api/reports/low-stock - Düşük stok raporu

### İstatistikler
- GET /api/statistics/overall - Genel istatistikler
- GET /api/statistics/stock-movements - Stok hareketleri
- GET /api/statistics/request-status - Talep durumu dağılımı
- GET /api/statistics/delivery-performance - Teslimat performansı

### Bildirimler
- GET /api/notifications - Bildirim listesi
- PUT /api/notifications/:id/read - Bildirimi okundu işaretle
- DELETE /api/notifications/:id - Bildirimi sil

### Dosyalar
- POST /api/files/upload - Dosya yükleme
- GET /api/files/:id - Dosya indirme
- DELETE /api/files/:id - Dosya silme

## Güvenlik

- JWT token doğrulaması
- Rate limiting
- CORS koruması
- XSS koruması
- CSRF koruması
- SQL injection koruması
- Güvenli HTTP başlıkları

## Performans

- Redis önbellekleme
- GZIP sıkıştırma
- Rate limiting
- Statik dosya önbellekleme
- Query optimizasyonu
- İndeksleme

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.
"# depo-yonetimi-backend" 
