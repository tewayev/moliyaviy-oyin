# Moliyaviy savodxonlik o‘yini

Jamoaviy intellektual o‘yin (smart doska uchun) va savollarni boshqaradigan admin panel.
Bitta sayt: o‘yin — `/`, admin panel — `/#admin` (login va parol bilan).

## Tuzilma

```
public/                 brauzerga beriladigan fayllar (Vercel shu papkani tarqatadi)
  index.html
  css/                  tokens → base → game → admin
  js/shared/schema.js   savol sxemasi va mavzular — brauzer va server uchun yagona manba
  js/core/              sozlamalar, server bilan aloqa, o'yin holati, matn formati
  js/ui/                DOM yordamchilari, ikonkalar, taymer
  js/screens/           o'yin ekranlari
  js/admin/             admin panel (kirish, mavzular, ro'yxat, muharrir, fayldan yuklash)
  js/import/            .txt shablon va Word (.docx) faylini o'qish
api/                    Vercel funksiyalari
  auth.js               kirish / chiqish / sessiya
  questions.js          savollarni o'qish, qo'shish, tahrirlash, o'chirish (faqat admin)
  import.js             ko'p savolni birdaniga yuklash (faqat admin)
  deal.js               yangi o'yin uchun savollar (ochiq, faqat tanlangan ~40 ta)
lib/                    server kodi: http, auth, storage (Vercel Blob), bank
seed/questions.json     boshlang'ich savollar (baza bo'sh bo'lsa bir marta yoziladi)
scripts/dev-server.js   mahalliy server
```

## Xavfsizlik

- Savollar bazasi **yopiq (private) Vercel Blob**da: havola orqali ochilmaydi, faqat server o‘qiydi.
- Butun baza faqat admin sessiyasi bilan beriladi. O‘yin har safar faqat o‘ziga tanlangan savollarni oladi.
- Login/parol faqat Vercel muhit o‘zgaruvchilarida. Sessiya — imzolangan, `HttpOnly`, `Secure`,
  `SameSite=Strict` cookie (12 soat). Parol o‘zgartirilsa, eski sessiyalar bekor bo‘ladi.
- Noto‘g‘ri parol: har urinish sekinlashtiriladi, 5 xatodan keyin 10 daqiqa blok.
- Boshqa saytdan so‘rov (CSRF) rad etiladi; CSP va boshqa xavfsizlik sarlavhalari `vercel.json`da.

## Muhit o‘zgaruvchilari (Vercel → Settings → Environment Variables)

| Nomi | Vazifasi |
| --- | --- |
| `ADMIN_LOGIN` | admin login |
| `ADMIN_PASSWORD` | admin parol |
| `SESSION_SECRET` | sessiyani imzolash kaliti (kamida 32 belgi, tasodifiy) |
| `BLOB_READ_WRITE_TOKEN` | Blob ombori ulanganda Vercel o‘zi qo‘shadi |

Parolni o‘zgartirgach, saytni qayta deploy qiling (Deployments → Redeploy).

## Savollarni fayl bilan yuklash

Admin panel → «Fayldan yuklash» → bo‘sh shablonni yuklab oling. Format:

```
MAVZU: Shaxsiy budjet

QIYMAT: 100
SARLAVHA: 50/30/20 qoidasi
VAZIYAT:
Jasur ishga kirdi...
SAVOL: Jamg‘armaga qancha ajratishi kerak?
A) 1 000 000 so‘m
B) 1 500 000 so‘m
C) 800 000 so‘m
JAVOB: C
QISQA JAVOB: 4 000 000 × 20% = 800 000 so‘m
IZOH:
Qoida sof daromadga qo‘llanadi.
XULOSA:
50/30/20 qoidasi (50/30/20 Rule) — sof daromadning 50/30/20 taqsimoti.
---
```

`.txt`, Word `.docx` va `.json` (zaxira) fayllari qabul qilinadi.

## Mahalliy ishga tushirish

```
npm install
npm run dev        # http://localhost:3000, login: admin / admin
```
