# Portal Informasi Capstone

## 1. Deskripsi Aplikasi

Portal Informasi Capstone Berkelanjutan adalah platform untuk mendukung kesinambungan proyek capstone di lingkungan perguruan tinggi. Project Owner dapat mengunggah proyek dan dokumen pendukung; Requester dapat mencari dan mengajukan permintaan untuk melanjutkan proyek. Terdapat fitur komentar, rating, dan kategori proyek (Kesehatan, Pengelolaan Sampah, Smart City, Transportasi Ramah Lingkungan).

## 1.1 Diagram Aplikasi ERD

<img width="1339" height="612" alt="Screenshot 2025-09-30 183930" src="https://github.com/user-attachments/assets/796e4563-7726-4150-b6ce-e5a625b74628" />

## 1.2 Diagram Aplikasi Activity Diagram

<img width="1339" height="933" alt="Screenshot 2025-09-30 184051" src="https://github.com/user-attachments/assets/4a37f143-d22d-4610-b7d7-1f1ea1874a2a" />

## 1.3 Diagram Aplikasi Use Case Diagram

<img width="1339" height="933" alt="usecaseDiagram" src="/usecaseDiagram.jpg" />

## 1.4 Diagram Aplikasi Arsitektur BackEnd

<img width="1339" height="933" alt="arsitektur_Backend" src="/arsitektur_Backend.png" />

---

## 2. Nama Kelompok & Anggota

**Anggota:**

- Chaira Nastya Warestri — 23/514942/TK/56550
- Devan Westley — 23/522479/TK/57681
- Fanny Elisabeth Panjaitan — 23/518300/TK/57035
- Fanisah — 23/518614/TK/57120
- Warda Saniia Fawahaana — 23/518824/TK/57170

---

## 3. Struktur folder & file (contoh)

```
project-root/
├─ node_modules/
├─ src/
│  ├─ app.js
│  ├─ index.js
│  ├─ routes/
│  ├─ controllers/
│  ├─ models/
│  ├─ middlewares/
│  ├─ services/
│  └─ utils/
├─ testing/
├─ .env
├─ .gitignore
├─ index.js
├─ package.json
├─ package-lock.json
└─ testRedis.js
```

**Keterangan singkat direktori `src/`:**

- `app.js` — konfigurasi Express, middleware, session, dan koneksi Redis.
- `routes/` — definisi route/endpoint REST API.
- `controllers/` — logika handler untuk setiap endpoint.
- `models/` — skema/Mongoose model (User, Project, Comment, Rating, dsb.).
- `middlewares/` — autentikasi (JWT), pengecekan role, upload (multer), dsb.
- `services/` — integrasi eksternal (Cloudinary, Google Drive API, Redis cache).

---

## 4. Teknologi yang Digunakan

**Bahasa & Platform**

- Node.js
- JavaScript (ES6+)

**Framework & Library Backend**

- Express.js
- Mongoose (ODM MongoDB)

**Autentikasi & Keamanan**

- JSON Web Token (JWT)
- bcrypt
- Passport.js + Google OAuth 2.0

**Penyimpanan & Media**

- MongoDB
- Cloudinary (media)
- Google Drive API (dokumen proposal)

**Caching & Session**

- Redis

**Middleware & Utilitas**

- multer, morgan, cors, cookie-parser, dotenv

**Tools & Deployment**

- npm
- Git & GitHub/GitLab
- Vercel (deployment)
- SSL/TLS (HTTPS)

---

## 5. Persyaratan Lingkungan (Environment)

Buat file `.env` di root dengan variabel berikut (contoh nama variabel):

```
PORT=3000
MONGODB_URI=<mongo_connection_string>
JWT_SECRET=<jwt_secret>
CLOUDINARY_CLOUD_NAME=<cloud_name>
CLOUDINARY_API_KEY=<api_key>
CLOUDINARY_API_SECRET=<api_secret>
GOOGLE_DRIVE_CLIENT_ID=<google_client_id>
GOOGLE_DRIVE_CLIENT_SECRET=<google_client_secret>
GOOGLE_DRIVE_REFRESH_TOKEN=<refresh_token>
REDIS_URL=<redis_connection_string>
SESSION_SECRET=<session_secret>
```

> **Catatan:** Jangan commit `.env` atau file kredensial ke repository. Pastikan `.gitignore` memuat baris untuk mengabaikan file sensitif.

---

## 6. Instalasi & Menjalankan Aplikasi (Local)

1. Clone repository

```bash
git clone <repository-url>
cd project-root
```

2. Install dependensi

```bash
npm install
```

3. Buat file `.env` sesuai bagian 5
4. Jalankan aplikasi (development)

```bash
npm run dev
```

5. Jalankan test (jika tersedia)

```bash
npm test
```

**Perintah umum:**

- `npm start` — menjalankan versi production
- `npm run dev` — jalankan dengan nodemon (jika disediakan)

---

## 7. Endpoints (Contoh singkat)

- `POST /api/auth/register` — registrasi user
- `POST /api/auth/login` — login (mengembalikan JWT)
- `GET /api/projects` — daftar proyek (filter berdasarkan kategori)
- `POST /api/projects` — tambah proyek (Project Owner)
- `POST /api/projects/:id/request` — Requester mengajukan permintaan melanjutkan proyek
- `POST /api/projects/:id/comment` — tambah komentar
- `POST /api/projects/:id/rating` — tambah rating

---

## 9. Link Laporan (Google Drive)

**URL GDrive (view/download link):**
[Link Laporan Kelompok 1](https://drive.google.com/drive/folders/1JJEDu8F6aF8g1oG9Si84WgNA_NbBZXB1?usp=sharing)

---
