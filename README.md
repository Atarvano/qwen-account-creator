# Qwen Account Creator

![Qwen signup flow](img/step2.png)

[🇮🇩 Bahasa Indonesia](#indonesian) | [🇬🇧 English](#english)

---

<a id="indonesian"></a>
## 🇮🇩 Bahasa Indonesia

Sebuah skrip otomatisasi berbasis Node.js yang menggunakan Playwright untuk membuat akun Qwen secara otomatis. Skrip ini menghasilkan email sementara dari `generator.email`, membuat identitas acak, mengisi form pendaftaran Qwen, membuka link aktivasi email, lalu menyimpan akun yang berhasil ke `accounts.txt`.

### 🌟 Fitur Utama

- **Otomatisasi Penuh**: Mengisi form pendaftaran Qwen dan menyelesaikan proses aktivasi akun.
- **Email Sementara Acak**: Menggunakan `generator.email` untuk membuat inbox sementara dan mengambil link aktivasi.
- **Bypass & Stealth**: Menggunakan Firefox Playwright dengan stealth script untuk mengurangi deteksi webdriver.
- **Data Acak (Faker)**: Memakai `@faker-js/faker` untuk membuat nama acak yang realistis.
- **Penyimpanan Praktis**: Semua akun yang berhasil dibuat otomatis disimpan ke `accounts.txt` dengan format `email|password`.
- **Custom Config**: Mendukung pengaturan lokal melalui `config.json` untuk password default, headless mode, dan timeout.

### 📋 Persyaratan Sistem

Pastikan Anda sudah menginstal:
- **Node.js**: Versi 18.0.0 atau yang lebih baru.
- **NPM**: Biasanya sudah ikut terpasang bersama Node.js.

### 🚀 Instalasi

1. Pastikan terminal berada di direktori proyek ini.
2. Instal semua dependency NPM:
   ```bash
   npm install
   ```
3. Instal browser Firefox untuk Playwright:
   ```bash
   npm run install-browsers
   ```
   Atau secara manual:
   ```bash
   npx playwright install firefox
   ```

### ⚙️ Konfigurasi (`config.json`)

Agar skrip bisa berjalan, Anda wajib mengatur password di `config.json`.
Jika file belum ada, jalankan skrip sekali agar file default dibuat otomatis.

Contoh isi `config.json`:

```json
{
  "headless": false,
  "slow_mo": 1000,
  "timeout": 30000,
  "password": "GantiPasswordAnda123!"
}
```

- **`password`** (Wajib): Password yang akan dipakai untuk akun baru.
- **`headless`**: Ubah ke `true` jika Anda ingin browser berjalan tanpa jendela.
- **`slow_mo`**: Delay kecil antar aksi browser untuk stabilitas dan debugging.
- **`timeout`**: Timeout default untuk aksi Playwright dalam milidetik.

### 💻 Cara Penggunaan

1. Buka terminal di direktori proyek.
2. Jalankan skrip:
   ```bash
   npm start
   ```
   Atau langsung:
   ```bash
   node qwen_account_creator.js
   ```
3. Masukkan jumlah akun yang ingin dibuat saat diminta.
4. Skrip akan membuat akun satu per satu secara berurutan.
5. Akun yang berhasil dibuat dan teraktivasi akan disimpan ke `accounts.txt`.

### 🔄 Alur Kerja

1. Buka halaman register Qwen.
2. Klik **Sign up**.
3. Isi nama lengkap, email, password, dan konfirmasi password.
4. Centang persetujuan terms.
5. Klik **Create Account**.
6. Tunggu halaman **pending activation**.
7. Poll inbox `generator.email` untuk email dari Qwen.
8. Ambil link **Activate My Account**.
9. Buka link aktivasi.
10. Kembali ke Qwen dan klik **Check Again**.
11. Jika login berhasil, simpan akun ke `accounts.txt`.

### ⚠️ Disclaimer

1. Skrip ini ditujukan untuk pembelajaran otomasi browser dan pengujian alur web.
2. Penggunaan berlebihan dapat memicu rate limit, challenge, CAPTCHA, atau blokir dari pihak target.
3. Gunakan dengan tanggung jawab Anda sendiri.

---

<a id="english"></a>
## 🇬🇧 English

An automated Node.js script that uses Playwright to create Qwen accounts automatically. The script generates a temporary mailbox from `generator.email`, creates a random identity, fills the Qwen signup form, opens the activation link from email, and saves successful accounts to `accounts.txt`.

### 🌟 Key Features

- **Full Automation**: Fills the Qwen signup form and completes account activation.
- **Temporary Email Generation**: Uses `generator.email` to create inboxes and fetch activation links.
- **Bypass & Stealth**: Runs Firefox through Playwright with a stealth script to reduce webdriver detection.
- **Randomized Data (Faker)**: Uses `@faker-js/faker` to generate realistic random names.
- **Convenient Storage**: Successfully activated accounts are saved to `accounts.txt` in `email|password` format.
- **Custom Configuration**: Supports local settings through `config.json` for password, headless mode, and timeout.

### 📋 System Requirements

Make sure you have the following installed:
- **Node.js**: Version 18.0.0 or newer.
- **NPM**: Usually included with Node.js.

### 🚀 Installation

1. Open a terminal in the project directory.
2. Install all required NPM dependencies:
   ```bash
   npm install
   ```
3. Install the Firefox browser binary for Playwright:
   ```bash
   npm run install-browsers
   ```
   Or manually:
   ```bash
   npx playwright install firefox
   ```

### ⚙️ Configuration (`config.json`)

To run the script, you must set a password in `config.json`.
If the file does not exist yet, run the script once and it will create a default config file.

Example `config.json`:

```json
{
  "headless": false,
  "slow_mo": 1000,
  "timeout": 30000,
  "password": "ChangeYourPassword123!"
}
```

- **`password`** (Required): Password used for newly created accounts.
- **`headless`**: Set to `true` to run without opening a browser window.
- **`slow_mo`**: Small delay between browser actions for stability and debugging.
- **`timeout`**: Default Playwright timeout in milliseconds.

### 💻 Usage

1. Open a terminal in the project directory.
2. Run the script:
   ```bash
   npm start
   ```
   Or directly:
   ```bash
   node qwen_account_creator.js
   ```
3. Enter the number of accounts you want to create when prompted.
4. The script will process account creation sequentially, one account at a time.
5. Successfully created and activated accounts are saved to `accounts.txt`.

### 🔄 Workflow

1. Open the Qwen register page.
2. Click **Sign up**.
3. Fill full name, email, password, and confirm password.
4. Accept the terms checkbox.
5. Click **Create Account**.
6. Wait for the **pending activation** page.
7. Poll the `generator.email` inbox for the Qwen message.
8. Extract the **Activate My Account** link.
9. Open the activation link.
10. Return to Qwen and click **Check Again**.
11. If the session is active, save the account to `accounts.txt`.

### ⚠️ Disclaimer

1. This script is intended for browser automation and web flow learning purposes.
2. Heavy usage may trigger rate limiting, challenges, CAPTCHA, or access blocks from the target service.
3. Use it at your own risk and responsibility.
