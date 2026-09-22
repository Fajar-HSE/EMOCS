# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## Event Management & Operational Control System (EMOCS)

**Versi:** 1.1\
**Status:** Draft for Management Review\
**Domain:** Jasa Pelatihan, Training & Sertifikasi Kompetensi

---

# 1. Executive Summary

## 1.1 Ringkasan Produk

EMOCS adalah sistem internal untuk mengelola seluruh lifecycle event perusahaan, mulai dari Event Request oleh Sales, proses review dan persetujuan, penugasan Operations, pelaksanaan event, hingga penyelesaian dan pelaporan.

Tujuan utama EMOCS adalah menjadikan sistem sebagai **single source of truth** sehingga setiap pihak dapat mengetahui status, tanggung jawab, progres, dan informasi penting sebuah event tanpa harus mencari informasi melalui WhatsApp, spreadsheet, atau komunikasi informal lainnya.

## 1.2 Masalah Utama

Proses saat ini menggunakan:

**Google Form → Spreadsheet → WhatsApp → Email/Drive**

Proses tersebut menimbulkan empat masalah utama:

| Kode | Masalah                                 | Dampak                                               |
| ---- | --------------------------------------- | ---------------------------------------------------- |
| A1   | Status event tidak terlihat bersama     | Sales harus bertanya ke Operations                   |
| A2   | Workflow dan persiapan tidak terstandar | Risiko pekerjaan terlewat                            |
| A3   | Biaya tidak terhubung dengan event      | Profitabilitas sulit diketahui                       |
| A4   | Data historis tidak terstruktur         | Pengalaman event sebelumnya tidak dapat dimanfaatkan |

## 1.3 Fokus Produk

EMOCS dikembangkan secara bertahap.

**Prioritas utama MVP:**

> Sales dapat mengetahui progres event kapan saja tanpa bertanya kepada Operations.

Fitur yang tidak mendukung tujuan tersebut tidak boleh masuk MVP kecuali terbukti menjadi kebutuhan operasional yang wajib.

---

# 2. Product Vision

> **EMOCS menjadi single source of truth atas seluruh lifecycle event perusahaan, sehingga setiap orang mengetahui status tanpa bertanya, setiap event dapat dikelola dengan proses yang jelas, dan keputusan bisnis dapat menggunakan data historis yang terpercaya.**

## 2.1 Nilai bagi setiap Role

### Sales

> "Saya membuat request dan dapat mengetahui status serta progresnya tanpa harus bertanya kepada Operations."

### Operations

> "Saya mengetahui event mana yang harus dikerjakan dan apa yang menjadi prioritas saya."

### Finance

> "Saya dapat mengetahui biaya yang terkait dengan setiap event."

### Management

> "Saya dapat mengetahui event, customer, program, dan aktivitas mana yang memberikan hasil terbaik."

---

# 3. Product Principles

Jika terjadi konflik antar keputusan produk, prinsip berikut digunakan sebagai prioritas:

1. **Business Value** — fitur harus memberikan manfaat bisnis yang jelas.
2. **Simplicity** — proses tidak boleh lebih rumit daripada proses manual yang digantikannya.
3. **Adoption** — sistem harus mudah digunakan oleh user sehari-hari.
4. **Data Quality** — lebih baik sedikit data yang benar daripada banyak data yang tidak lengkap.
5. **Single Source of Truth** — informasi event harus memiliki sumber utama yang jelas.
6. **Workflow Driven** — proses harus mengikuti tahapan kerja yang disepakati.
7. **Role Based** — setiap user hanya mendapatkan informasi dan tindakan yang relevan dengan tanggung jawabnya.
8. **Auditability** — perubahan penting harus dapat ditelusuri.
9. **Mobile Friendly** — Operations harus dapat menggunakan sistem saat berada di lapangan.
10. **Minimize Manual Entry** — sistem harus mengurangi pekerjaan input berulang.
11. **No Over-Engineering** — sistem dikembangkan sesuai kebutuhan bisnis, bukan berdasarkan kompleksitas teknologi.

---

# 4. Objectives & Success Criteria

| Kode | Objective                                                       | Target                                               |
| ---- | --------------------------------------------------------------- | ---------------------------------------------------- |
| BO-1 | Mengurangi ketergantungan pada WhatsApp untuk mengetahui status | Status inquiry turun ≥80%                            |
| BO-2 | Setiap event memiliki penanggung jawab yang jelas               | ≥95% event memiliki PIC dalam ≤1 hari kerja          |
| BO-3 | Menstandarkan proses persiapan event                            | ≥90% event menyelesaikan kebutuhan wajib sebelum H-1 |
| BO-4 | Menghubungkan biaya dengan event                                | 100% expense memiliki Event ID                       |
| BO-5 | Mengetahui profitabilitas event                                 | ≥95% event yang ditutup memiliki perhitungan margin  |
| BO-6 | Menggunakan data historis untuk estimasi                        | Deviasi estimasi ≤15% setelah data mencukupi         |

---

# 5. Non-Objectives

EMOCS **bukan**:

- CRM untuk mengelola lead dan sales pipeline.
- Sistem akuntansi atau pembukuan.
- LMS.
- Portal peserta publik.
- Sistem payroll.
- Sistem pajak.
- Sistem sertifikasi publik.
- Aplikasi mobile native pada fase awal.

Integrasi dengan sistem-sistem tersebut dapat dipertimbangkan sebagai pengembangan masa depan.

---

# 6. Stakeholders

| Stakeholder               | Tanggung Jawab                        |
| ------------------------- | ------------------------------------- |
| Business Owner / Direktur | Sponsor dan keputusan bisnis          |
| Head of Sales             | Pemilik proses Sales                  |
| Head of Operations        | Pemilik proses Operations             |
| Finance Manager           | Pemilik proses keuangan               |
| Operations PIC            | Pengguna operasional utama            |
| Sales Executive           | Pengguna Sales                        |
| IT / Digital              | Pemeliharaan sistem                   |
| Trainer / Vendor          | Pihak eksternal yang datanya dikelola |
| Peserta                   | Objek data pada fase berikutnya       |

Operations harus dilibatkan sejak awal karena sebagian besar aktivitas harian sistem berada pada tim Operations.

---

# 7. User Roles

## 7.1 Role Utama

| Role                | Tanggung Jawab                                    |
| ------------------- | ------------------------------------------------- |
| ADMIN               | Mengelola user dan konfigurasi sistem             |
| SALES               | Membuat dan memantau Event Request                |
| SALES\_MANAGER      | Mengelola dan memantau event tim Sales            |
| OPERATIONS          | Menjalankan event yang ditugaskan                 |
| OPERATIONS\_MANAGER | Review request, approval, assignment dan workload |
| FINANCE             | Mengelola proses finansial                        |
| MANAGEMENT          | Monitoring dan pengambilan keputusan              |

Satu user dapat memiliki lebih dari satu role jika diperlukan oleh organisasi.

---

# 8. Current Business Process — AS-IS

```text
Sales mendapatkan deal/komitmen
        ↓
Mengisi Google Form
        ↓
Data masuk Spreadsheet
        ↓
Operations membaca Spreadsheet
        ↓
Koordinasi melalui WhatsApp
        ↓
Menentukan PIC
        ↓
Persiapan event
        ↓
Eksekusi event
        ↓
Sales bertanya status melalui WhatsApp
        ↓
Operations memberikan informasi manual
        ↓
Event selesai
        ↓
Dokumen tersebar
        ↓
Finance melakukan rekap
        ↓
Profitabilitas sulit diketahui
```

## 8.1 Pain Points

| Titik       | Masalah                                 |
| ----------- | --------------------------------------- |
| Request     | Request dapat terlambat diketahui       |
| Status      | Tidak ada status bersama                |
| Assignment  | PIC tidak selalu tercatat jelas         |
| Preparation | Tidak ada standar persiapan             |
| Perubahan   | Informasi perubahan tersebar            |
| Post-event  | Dokumen dan informasi tidak terstruktur |
| Cost        | Biaya sulit dikaitkan dengan event      |
| Reporting   | Rekap membutuhkan pekerjaan manual      |

---

# 9. Proposed Business Process — TO-BE

```text
Sales
  ↓
Create Event Request
  ↓
Submit
  ↓
Event mendapatkan identitas
  ↓
Operations menerima request
  ↓
Review
  ├── Approve
  ├── Reject
  └── Request Revision
  ↓
Assign PIC
  ↓
Preparation
  ↓
Task & progress
  ↓
Ready
  ↓
Running
  ↓
Completed
  ↓
Post Event
  ↓
Financial Processing
  ↓
Financial Closing
  ↓
Historical Data
```

Prinsip utamanya:

> **Sistem menjadi sumber kebenaran, sedangkan WhatsApp/email menjadi kanal komunikasi dan notifikasi.**

---

# 10. Event Lifecycle

## 10.1 Status

```text
DRAFT
  ↓
SUBMITTED
  ↓
UNDER_REVIEW
  ├── REVISION_REQUESTED
  ├── REJECTED
  └── APPROVED
          ↓
     PIC_ASSIGNED
          ↓
     PREPARATION
          ↓
        READY
          ↓
       RUNNING
          ↓
      COMPLETED
          ↓
      POST_EVENT
          ↓
 FINANCIAL_CLOSING
          ↓
       CLOSED
```

Event juga dapat berakhir sebagai:

- `CANCELLED`
- `POSTPONED`

## 10.2 Prinsip Status

Setiap status harus memiliki:

- definisi yang jelas;
- pemilik tindakan;
- kondisi untuk masuk ke status tersebut;
- tindakan yang dapat dilakukan;
- tindakan yang tidak diperbolehkan;
- riwayat perubahan.

**Detail mekanisme teknis enforcement ditentukan dalam ****`System_Design.md`****.**

---

# 11. Business Rules

## 11.1 Event

1. Setiap event memiliki Event ID unik.
2. Event ID tidak berubah setelah diberikan.
3. Draft dapat disimpan sebelum submit.
4. Event hanya dapat bergerak melalui status yang sah.
5. Event yang sudah disetujui tidak boleh diubah secara bebas.
6. Perubahan penting setelah approval harus melalui Change Request.
7. Pembatalan membutuhkan alasan.
8. Penundaan membutuhkan alasan.
9. Event yang dibatalkan tetap menjadi bagian dari historical record.
10. Progress event dihitung dari pekerjaan yang telah selesai.

## 11.2 Assignment

1. Event yang telah disetujui harus memiliki PIC.
2. Event prioritas tinggi dapat membutuhkan backup PIC.
3. Penggantian PIC harus tercatat.
4. Penggantian PIC harus diinformasikan kepada pihak terkait.

## 11.3 Task

1. Task harus memiliki penanggung jawab.
2. Task harus memiliki deadline.
3. Task yang diblokir harus memiliki alasan.
4. Task yang terlambat harus dapat diketahui oleh pihak yang bertanggung jawab.
5. Task yang dibatalkan tidak dihitung sebagai pekerjaan yang belum selesai.
6. Task wajib dapat digunakan sebagai dasar pengukuran progress event.

## 11.4 Financial

1. Setiap biaya harus dapat ditelusuri ke event.
2. Biaya yang belum disetujui tidak boleh dianggap sebagai actual cost final.
3. Pengaju biaya tidak boleh menyetujui biayanya sendiri.
4. Financial closing hanya dapat dilakukan jika seluruh persyaratan closing terpenuhi.
5. Event yang telah ditutup tidak boleh diubah secara normal.
6. Perubahan setelah closing harus memiliki alasan dan riwayat.

## 11.5 Data

1. Data transaksi tidak boleh hilang hanya karena event dibatalkan.
2. Data yang sudah digunakan oleh transaksi tidak boleh dihapus sembarangan.
3. Perubahan informasi penting harus dapat ditelusuri.
4. Data pribadi hanya boleh diakses oleh pihak yang memiliki kebutuhan bisnis.

---

# 12. Event Request

## 12.1 Tujuan

Memberikan Sales cara tercepat untuk membuat request event yang lengkap dan dapat diproses Operations.

## 12.2 Informasi Utama

### Customer

- Customer
- Contact
- Nomor telepon
- Email

### Event

- Nama event
- Training / Program
- Event type
- Delivery mode
- Tanggal mulai
- Tanggal selesai
- Waktu
- Lokasi
- Kota
- Jumlah peserta
- Deskripsi
- Special requirements

### Commercial

- Sales value
- PO status
- PO number
- Payment term
- Customer reference

### Sales

- Sales owner
- Sales team
- Priority

## 12.3 Prinsip

Form harus:

- cepat;
- sederhana;
- mobile-friendly;
- memiliki default value;
- tidak meminta informasi yang belum diperlukan;
- memberikan feedback yang jelas ketika terdapat kesalahan.

**Target:** request dapat dibuat dalam ≤3 menit.

---

# 13. Event Detail

Event Detail menjadi **single source of truth** untuk sebuah event.

Informasi minimal:

- Event ID
- Nama event
- Customer
- Training
- Tanggal
- Lokasi
- Peserta
- Sales
- PIC
- Status
- Progress
- Task
- Timeline
- Catatan
- Informasi komersial sesuai hak akses

User harus dapat mengetahui:

> **"Event ini sekarang di mana, siapa yang bertanggung jawab, apa yang sudah selesai, dan apa yang harus dilakukan berikutnya?"**

---

# 14. Task & Progress

Task digunakan untuk menggambarkan pekerjaan yang harus dilakukan dalam sebuah event.

Progress event dihitung berdasarkan penyelesaian task.

Contoh:

```text
10 task aktif
6 selesai

Progress = 60%
```

User tidak perlu mengisi progress secara manual.

---

# 15. Notification

Notifikasi digunakan untuk memastikan pihak yang berkepentingan mengetahui perubahan penting tanpa harus bertanya kepada pihak lain.

## Trigger utama

- Event submitted
- Event approved
- Event rejected
- Revision requested
- PIC assigned
- PIC changed
- Task assigned
- Task overdue
- Event status changed
- Event completed
- Event cancelled
- Event postponed
- Masalah kritis
- Financial approval
- Financial closing

Prinsip:

> **Notifikasi harus membantu user mengambil tindakan, bukan membanjiri user dengan pesan.**

Setiap notifikasi penting harus memberikan konteks dan mengarahkan user ke event terkait.

---

# 16. Dashboard

## 16.1 Sales Dashboard

Menampilkan:

- Event saya
- Draft
- Submitted
- Dalam persiapan
- Event mendatang
- Event selesai
- Event yang membutuhkan perhatian
- Event bermasalah

## 16.2 Operations Dashboard

Menampilkan:

- Request baru
- Request yang menunggu review
- Event tanpa PIC
- Event hari ini
- Event mendatang
- Task overdue
- Task blocked
- Workload PIC

## 16.3 Management Dashboard

Menampilkan:

- Event berdasarkan status
- Event berdasarkan periode
- Event berdasarkan Sales
- Event berdasarkan Training
- Event berdasarkan Customer
- Pembatalan
- Performa operasional
- Informasi finansial setelah Phase 3

Prinsip:

> Setiap angka penting harus dapat ditelusuri kembali ke data event yang membentuk angka tersebut.

---

# 17. Operational Control — Phase 2

Phase 2 memperluas sistem agar Operations dapat menjalankan event secara end-to-end.

Cakupan:

- Trainer Management
- Venue Management
- Equipment Management
- Participant Management
- Document Management
- Issue Management
- Checklist
- Task Template
- Event Change Request
- SLA dan escalation
- WhatsApp notification

## 17.1 Checklist

Checklist digunakan untuk memastikan pekerjaan wajib tidak terlewat.

Checklist dapat berbeda berdasarkan:

- Training
- Event type
- Delivery mode
- Jumlah peserta

Checklist harus dapat disesuaikan untuk kebutuhan event tertentu.

---

# 18. Participant Management

Participant Management masuk Phase 2 karena data peserta merupakan data pribadi.

Data yang dikelola dapat mencakup:

- Nama
- Perusahaan
- Jabatan
- Email
- Telepon
- Data tambahan yang memang diwajibkan proses sertifikasi
- Kehadiran
- Status sertifikat

Prinsip:

- kumpulkan data seminimal mungkin;
- akses hanya untuk pihak yang membutuhkan;
- aktivitas akses penting harus dapat ditelusuri;
- kebijakan retensi harus ditentukan sebelum fitur digunakan.

---

# 19. Financial Management — Phase 3

## Tujuan

Memberikan informasi biaya dan profitabilitas aktual per event.

Cakupan:

- Budget
- Cost Category
- Expense
- Approval
- Revenue
- Actual Cost
- Pending Cost
- Projected Cost
- Budget vs Actual
- Gross Profit
- Gross Margin
- Financial Closing

## 19.1 Konsep Keuangan

### Sales Value

Nilai kesepakatan event.

### Revenue Recognized

Nilai pendapatan yang diakui berdasarkan event yang telah terlaksana.

### Actual Cost

Biaya yang telah disetujui.

### Gross Profit

```text
Revenue Recognized − Actual Cost
```

### Gross Margin

```text
Gross Profit / Revenue Recognized × 100%
```

**Detail perhitungan dan implementasi teknis ditentukan dalam ****`System_Design.md`****.**

---

# 20. Business Intelligence — Phase 4

Phase 4 hanya dibangun setelah tersedia data historis yang cukup dan berkualitas.

Cakupan:

- Historical Event Database
- Cost Benchmark
- Cost Estimator
- Customer Profitability
- Training Profitability
- Sales Profitability
- Trainer Performance
- Trend Analysis
- Forecasting

## Prinsip penting

Sistem tidak boleh memberikan kesan bahwa estimasi akurat apabila data pembanding tidak mencukupi.

Estimator harus dapat mengatakan:

> **"Data belum cukup untuk memberikan estimasi yang dapat dipercaya."**

---

# 21. Scope & Roadmap

| Phase         | Fokus                       | Status      |
| ------------- | --------------------------- | ----------- |
| Phase 0       | Discovery & Process Mapping | Persiapan   |
| Phase 1       | Event Request & Tracking    | MVP         |
| Stabilization | Adoption & Hardening        | Setelah MVP |
| Phase 2       | Operational Control         | Berikutnya  |
| Phase 3       | Financial                   | Berikutnya  |
| Phase 4       | Business Intelligence       | Berikutnya  |

---

# 22. MVP — Phase 1

## Definition of Success

> **Sales dapat mengetahui progres event kapan saja tanpa bertanya kepada Operations.**

## MUST HAVE

1. Login
2. User management
3. Role management
4. Customer master
5. Training master
6. Event Request
7. Event ID
8. Event status
9. Status history
10. Review & approval
11. PIC assignment
12. Event List
13. Event Detail
14. Task management dasar
15. Progress otomatis
16. Timeline
17. Notifikasi
18. Dashboard Sales
19. Dashboard Operations
20. Dashboard Management
21. Auditability
22. Cancel / Postpone
23. Mobile responsive

## SHOULD HAVE

- Komentar
- Lampiran
- Task template
- Duplicate event
- Export
- WhatsApp notification
- Global search

## COULD HAVE

- Calendar
- Saved views
- Dark mode
- Digest
- Kanban task

## OUT OF SCOPE MVP

- Trainer management
- Venue management
- Equipment management
- Participant management lengkap
- Checklist formal
- Issue management formal
- Budget
- Expense
- Revenue
- Profit
- Margin
- Cost estimator
- Forecasting
- Portal customer
- Native mobile app

---

# 23. User Journeys

## 23.1 Sales

```text
Login
 ↓
Dashboard
 ↓
Create Event Request
 ↓
Submit
 ↓
Menerima Event ID
 ↓
Menunggu review
 ↓
Menerima hasil review
 ↓
Mengetahui PIC
 ↓
Memantau progress
 ↓
Menerima informasi ketika event selesai
```

## 23.2 Operations Manager

```text
Login
 ↓
Request Inbox
 ↓
Review Request
 ↓
Approve / Reject / Request Revision
 ↓
Assign PIC
 ↓
Monitor workload
 ↓
Monitor event
 ↓
Handle escalation
```

## 23.3 Operations PIC

```text
Login
 ↓
Event Saya
 ↓
Pilih Event
 ↓
Kerjakan Task
 ↓
Update progress
 ↓
Siapkan event
 ↓
Event berlangsung
 ↓
Complete
 ↓
Post-event
```

## 23.4 Finance

Phase 3:

```text
Event selesai
 ↓
Review financial data
 ↓
Review expense
 ↓
Review revenue
 ↓
Review margin
 ↓
Financial Closing
```

## 23.5 Management

```text
Dashboard
 ↓
Melihat kondisi bisnis
 ↓
Drill-down
 ↓
Membandingkan event/customer/training/sales
 ↓
Mengambil keputusan
```

---

# 24. UX Requirements

## Prinsip

1. Cepat lebih penting daripada dekorasi.
2. Satu layar memiliki tujuan yang jelas.
3. Status event dapat dipahami dalam beberapa detik.
4. User selalu mengetahui langkah berikutnya.
5. Aksi yang tersedia harus sesuai dengan role dan kondisi event.
6. Operations dapat melakukan pekerjaan utama dari ponsel.
7. Sistem harus memberikan feedback yang jelas.
8. Form tidak boleh kehilangan data ketika terjadi kesalahan.

## Mobile

Aksi utama seperti:

- melihat event;
- menyelesaikan task;
- mengubah status;
- melihat informasi PIC;
- membuat issue;

harus mudah dilakukan melalui perangkat mobile.

---

# 25. Non-Functional Product Requirements

Bagian ini hanya mendefinisikan **hasil yang diharapkan**, bukan teknologi yang digunakan untuk mencapainya.

## Performance

Target awal:

- halaman utama terasa cepat;
- Event List dapat digunakan tanpa menunggu lama;
- Event Detail dapat dibuka dengan cepat;
- Dashboard dapat digunakan dalam waktu yang wajar;
- pencarian dan filter responsif.

Target angka teknis ditentukan dalam `System_Design.md`.

## Availability

Sistem harus tersedia selama jam kerja operasional dan memiliki mekanisme pemulihan jika terjadi gangguan.

Target teknis uptime, backup, RPO, dan RTO ditentukan dalam `System_Design.md`.

## Accessibility

- Kontras dapat dibaca.
- Navigasi keyboard tersedia.
- Target sentuh cukup besar.
- Pesan error dapat dipahami.
- UI menggunakan Bahasa Indonesia.

## Data Protection

Data pribadi harus:

- dikumpulkan sesuai kebutuhan;
- hanya dapat diakses pihak yang berwenang;
- memiliki kebijakan retensi;
- dapat ditelusuri akses pentingnya.

---

# 26. Acceptance Criteria — MVP

Acceptance criteria digunakan untuk menentukan apakah fitur memenuhi kebutuhan bisnis.

## AC-01 — Login

**Given** user telah diundang\
**When** user melakukan login\
**Then** user dapat masuk ke sistem dan melihat dashboard sesuai role.

## AC-02 — Draft

**Given** Sales sedang membuat request\
**When** Sales menyimpan draft\
**Then** request dapat dibuka kembali tanpa kehilangan data.

## AC-03 — Submit Event

**Given** seluruh informasi wajib telah lengkap\
**When** Sales melakukan submit\
**Then** event masuk ke proses review dan Sales mendapatkan konfirmasi.

## AC-04 — Event ID

**Given** dua request disubmit pada waktu yang hampir bersamaan\
**When** keduanya berhasil\
**Then** masing-masing memiliki Event ID yang berbeda.

## AC-05 — Review

**Given** event menunggu review\
**When** Operations Manager melakukan review\
**Then** event berubah sesuai keputusan dan Sales mendapatkan informasi hasil review.

## AC-06 — Revision

**Given** informasi request belum lengkap\
**When** Operations meminta revisi\
**Then** Sales mendapatkan alasan dan dapat memperbaiki request.

## AC-07 — PIC

**Given** event telah disetujui\
**When** Operations Manager menetapkan PIC\
**Then** PIC dan pihak terkait mendapatkan informasi penugasan.

## AC-08 — Visibility

**Given** Sales memiliki event yang sedang berjalan\
**When** Sales membuka Event Detail\
**Then** Sales dapat melihat status, PIC, progress, task dan aktivitas tanpa bertanya kepada Operations.

## AC-09 — Task

**Given** event memiliki task\
**When** PIC menyelesaikan task\
**Then** progress event diperbarui.

## AC-10 — Status

**Given** event berada pada status tertentu\
**When** user mencoba melakukan tindakan yang tidak sesuai dengan proses\
**Then** sistem menolak tindakan tersebut.

## AC-11 — Cancellation

**Given** event perlu dibatalkan\
**When** user yang berwenang membatalkan event dengan alasan\
**Then** event menjadi CANCELLED dan riwayatnya tetap tersedia.

## AC-12 — Completion

**Given** event telah selesai dilaksanakan\
**When** PIC menandai event selesai\
**Then** event menjadi COMPLETED dan pihak terkait mendapatkan informasi.

## AC-13 — Notification

**Given** terjadi event penting\
**When** sistem menghasilkan notifikasi\
**Then** pihak terkait menerima informasi yang relevan.

## AC-14 — Dashboard

**Given** terdapat event aktif\
**When** user membuka dashboard\
**Then** informasi yang ditampilkan sesuai dengan kondisi event sebenarnya.

## AC-15 — Auditability

**Given** terjadi perubahan penting\
**When** perubahan disimpan\
**Then** perubahan tersebut dapat ditelusuri kembali.

## AC-16 — Mobile

**Given** Operations menggunakan smartphone\
**When** melakukan pekerjaan utama\
**Then** fitur utama tetap dapat digunakan tanpa pengalaman desktop.

---

# 27. Edge Cases

Sistem harus memiliki perilaku yang jelas untuk kondisi berikut:

| Kasus                             | Hasil yang diharapkan                                                                         |
| --------------------------------- | --------------------------------------------------------------------------------------------- |
| Event dibatalkan                  | Event tetap tersimpan sebagai historical record                                               |
| Event ditunda                     | Status menunjukkan bahwa event belum memiliki jadwal final                                    |
| Event dijadwal ulang              | Perubahan tercatat dan pihak terkait diberi informasi                                         |
| Request duplikat                  | User mendapat peringatan sebelum melanjutkan                                                  |
| PIC tidak tersedia                | Event dapat dialihkan ke PIC lain                                                             |
| Task terlambat                    | Task ditandai sebagai overdue                                                                 |
| Task diblokir                     | Alasan blocking harus diketahui                                                               |
| Event berubah setelah approval    | Perubahan mengikuti Change Request                                                            |
| Expense setelah closing           | Tidak dapat diproses secara normal                                                            |
| Internet tidak tersedia           | User tidak boleh kehilangan data penting yang sudah dimasukkan                                |
| Dua user mengubah event bersamaan | Sistem tidak boleh diam-diam menimpa perubahan user lain                                      |
| Data historis tidak lengkap       | Data tetap dapat disimpan tetapi tidak digunakan untuk analitik yang membutuhkan data lengkap |

---

# 28. KPI & Success Metrics

## North Star Metric

> **Persentase event aktif yang statusnya diperbarui dalam 7 hari terakhir.**

Target:

**≥90% dalam 90 hari setelah go-live.**

## KPI MVP

| KPI                           |        Target |
| ----------------------------- | ------------: |
| Status inquiry via WhatsApp   |    turun ≥80% |
| Event memiliki PIC            |          ≥95% |
| Request → PIC                 | ≤1 hari kerja |
| Request → approval            | ≤2 hari kerja |
| Request dibuat melalui sistem |          100% |
| Adoption rate                 |          ≥90% |
| Kepuasan pengguna             |          ≥4/5 |

---

# 29. Definition of Done

## User Story

Sebuah user story dianggap selesai jika:

- kebutuhan bisnis terpenuhi;
- acceptance criteria terpenuhi;
- user dapat menggunakan fitur sesuai tujuan;
- tidak ada masalah kritis;
- pengalaman mobile memenuhi kebutuhan;
- perubahan dapat ditelusuri jika relevan.

## MVP

MVP dianggap selesai jika:

1. seluruh MUST HAVE selesai;
2. seluruh acceptance criteria lulus;
3. UAT disetujui process owner;
4. pengguna telah dilatih;
5. data awal telah dipersiapkan;
6. sistem digunakan sebagai jalur utama;
7. Google Form tidak lagi menjadi jalur request utama;
8. KPI baseline telah tersedia.

---

# 30. Migration & Go-Live Requirements

Sebelum go-live:

- master customer dibersihkan;
- master training dibersihkan;
- user internal dipersiapkan;
- event aktif dipersiapkan;
- data historis yang relevan dipilih;
- user mendapatkan pelatihan;
- proses baru disosialisasikan.

Prinsip:

> **Tidak boleh ada dua sumber kebenaran untuk request event.**

Setelah go-live, sistem harus menjadi sumber utama untuk request baru.

---

# 31. Roadmap

## Phase 0 — Discovery

Tujuan:

- validasi proses;
- validasi asumsi;
- pengambilan keputusan bisnis;
- pembersihan master data;
- pengukuran baseline.

Output:

- proses bisnis tervalidasi;
- keputusan bisnis disetujui;
- master data siap;
- wireframe awal;
- PRD final.

## Phase 1 — MVP

Fokus:

> Event Request → Review → Assignment → Tracking

## Stabilization

Fokus:

- adoption;
- perbaikan UX;
- bug fixing;
- feedback pengguna;
- pengukuran KPI.

## Phase 2

Fokus:

> Operations dapat menjalankan event secara end-to-end.

## Phase 3

Fokus:

> Management mengetahui biaya dan profitabilitas event.

## Phase 4

Fokus:

> Data historis menjadi alat pengambilan keputusan.

---

# 32. Assumptions & Open Questions

## Assumptions

Asumsi harus divalidasi sebelum fitur terkait dibangun.

Contoh:

- perusahaan menggunakan Google Workspace;
- user awal sekitar 10–40 orang;
- event umumnya berdurasi 1–5 hari;
- mata uang utama IDR;
- peserta tidak membutuhkan login pada fase awal;
- event memiliki satu customer;
- revenue diakui ketika event selesai.

## Open Questions

Pertanyaan yang membutuhkan keputusan management:

1. Apakah Sales boleh melihat actual cost?
2. Apakah Sales boleh melihat profit & margin?
3. Apakah Operations boleh melihat sales value?
4. Apakah Sales boleh melihat event Sales lain?
5. Siapa yang boleh melihat detail peserta?
6. Siapa yang menyetujui event?
7. Apakah event tanpa PO boleh diproses?
8. Siapa yang dapat membatalkan event?
9. Bagaimana approval budget?
10. Bagaimana threshold approval expense?
11. Bagaimana revenue didefinisikan?
12. Kapan event dianggap financially closed?
13. Apakah indirect cost dialokasikan ke event?
14. Bagaimana event gratis/promosi diperlakukan?
15. Apakah public class dapat memiliki banyak customer?
16. Berapa lama data historis disimpan?
17. Berapa lama data peserta disimpan?
18. Apakah terdapat kewajiban lokasi penyimpanan data tertentu?
19. Apakah WhatsApp diperlukan sebagai kanal notifikasi?
20. Siapa yang menjadi administrator sistem?
21. Siapa yang memelihara sistem setelah go-live?
22. Apakah sistem akan mendukung lebih dari satu entitas bisnis?

---

# 33. Product Decisions

Keputusan berikut harus dianggap sebagai keputusan produk/bisnis, bukan keputusan implementasi:

- MVP berfokus pada visibility.
- Event memiliki lifecycle yang jelas.
- Event ID menjadi identitas bisnis utama.
- Event yang dibatalkan tetap disimpan.
- Perubahan setelah approval harus dapat ditelusuri.
- Progress berasal dari pekerjaan yang diselesaikan.
- Notifikasi digunakan untuk mengurangi kebutuhan bertanya.
- Data historis menjadi aset perusahaan.
- Financial dan BI dikembangkan setelah operational data cukup.
- Tidak membangun fitur hanya karena secara teknis memungkinkan.

---

# 34. Relationship dengan Dokumen Lain

PRD ini adalah **sumber kebenaran untuk kebutuhan dan keputusan produk**.

Dokumen lain memiliki fungsi berbeda:

```text
PRD.md
│
├── Apa yang dibutuhkan?
├── Mengapa dibutuhkan?
├── Siapa yang menggunakan?
├── Bagaimana proses bisnisnya?
├── Apa yang masuk scope?
└── Kapan dianggap berhasil?
        │
        ▼
System_Design.md
│
├── Bagaimana sistem dibangun?
├── Arsitektur
├── Database
├── API
├── Security
├── Layering
├── Infrastructure
└── Technical constraints
        │
        ▼
Design.md
│
├── UI
├── UX
├── Layout
├── Visual system
└── Interaction
        │
        ▼
Agent.md
│
├── Bagaimana AI bekerja?
├── Aturan coding
├── Aturan arsitektur
├── Do / Don't
└── Workflow development
```

## Source of Truth

Jika terjadi konflik:

**Business requirement → PRD**

**Technical implementation → System\_Design.md**

**Visual/UI → Design.md**

**Cara kerja AI Coding Agent → Agent.md**

---

# 35. Final Product Principle

> **Jangan membuat sistem yang hanya mampu melakukan banyak hal.**
>
> **Buat sistem yang membuat pekerjaan menjadi lebih mudah, informasi menjadi lebih jelas, dan keputusan bisnis menjadi lebih baik.**

Untuk EMOCS, ukuran keberhasilan pertama bukan jumlah fitur.

Ukuran keberhasilan pertama adalah:

> **Ketika Sales ingin mengetahui status event, mereka membuka EMOCS—bukan WhatsApp.**
