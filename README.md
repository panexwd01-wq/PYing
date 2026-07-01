# CS Import — Operations Board (Module 1)

ระบบจัดการงาน **CS Import** แบบ "Excel บนเว็บ" — ยืดหยุ่นกว่า Excel จริง กำหนด dropdown / เงื่อนไข / สีช่องได้
สร้างด้วย **Next.js (App Router)** เก็บข้อมูลใน **Google Sheets** ผ่าน **Service Account** (อ่าน+เขียนตรง ไม่ต้องใช้ Google Apps Script)

> Module นี้อิงรูปแบบจาก `temp_excel.xlsx` — Sheet1 = layout 63 คอลัมน์, Sheet2 = ชนิดช่อง/เงื่อนไข/กติกาสี

---

## สิ่งที่ทำได้

- ตารางแบบ Excel เลื่อนแนวนอน (ตรึงคอลัมน์ซ้าย: Status / Job Type / Job No.) — ใช้ได้ทั้ง desktop และมือถือ
- แก้ไขในตารางได้เลย (inline) บันทึกทีเดียวหลายแถว
- **Spinner** ตอนโหลด, **Overlay กันปิดจอ** ตอนบันทึก, มี transition เล็ก ๆ
- ช่อง **Yes/No เป็น Toggle** (ไม่ใช้ radio)
- วันที่/เวลาใช้ **flatpickr** ภาษาไทย แสดงปี พ.ศ. + เวลาแบบ 24 ชม.
- ช่อง **"ดึงจาก Module อื่น" = เทา read-only** (Shipping/Transport/Warehouse ที่ยังไม่ได้สร้าง)
- กติกาสี: ฟ้า=ต้องกรอก, เหลือง=แก้ไขได้, เทา=Auto/Lock
- หน้า **ตั้งค่า**: ปุ่ม Initialize + จัดการ dropdown ทุกชุด
- Auto: ใส่ `IM/OPS Status Date` ให้อัตโนมัติเมื่อ Status = End

## โครงสร้างชีท (Google Sheet เดียว)

ระบบเป็น **multi-module** — แต่ละโมดูล = 1 tab (แถวแรก = header, คอลัมน์ A = `__id` ภายใน):

| ชีท | โมดูล |
|-----|-------|
| `04_CS_Import` | CS Import |
| `05_CS_Export` | CS Export |
| `06_Shipping` | Shipping |
| `07_Transportation` | Transportation |
| `08_Warehouse` | Warehouse |
| `09_Extra_Service` | Extra / Service |
| `10_Accounting` | Accounting |
| `_lists` | dropdown ทุกชุด (แบบ **บล็อก**: list ละ 1 คอลัมน์ เว้น 1 คอลัมน์คั่น) |

- **Cross-module pull**: โมดูลปลายทาง (06–10) ดึงหัว Job จาก CS Import/Export ด้วย **Job No.** — กรอก Job No. แล้วกดปุ่ม **⟳ ดึงจาก CS** ช่องสีเทาจะถูกเติมอัตโนมัติ
- **Auto End Date**: ทุกโมดูล เมื่อ Status = End ระบบลงวันที่ในช่อง `* Status Date` ให้อัตโนมัติ

> เดิมใช้ tab `_database` — เวอร์ชันนี้ย้ายมาเป็น `_lists` กด **Initialize** ในหน้า **ตั้งค่า** 1 ครั้งเพื่อสร้าง tab ทั้งหมด + seed dropdown

---

## ติดตั้งและรันในเครื่อง

```bash
npm install
cp .env.example .env.local   # แล้วใส่ค่าจริง
npm run dev                  # http://localhost:3000
```

## ตั้งค่า Google (ทำครั้งเดียว — ฟรีทั้งหมด)

1. ไป [Google Cloud Console](https://console.cloud.google.com/) → สร้าง Project
2. เปิดใช้งาน **Google Sheets API** (APIs & Services → Enable APIs → ค้นหา "Google Sheets API")
3. สร้าง **Service Account** (IAM & Admin → Service Accounts → Create)
4. ที่ Service Account นั้น → Keys → **Add Key → JSON** → ดาวน์โหลดไฟล์
5. เปิดไฟล์ JSON เอา 2 ค่าไปใส่ `.env.local`:
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_PRIVATE_KEY` (วางทั้งก้อนในเครื่องหมายคำพูด คง `\n` ไว้)
6. **แชร์ Google Sheet** ([เปิดชีท](https://docs.google.com/spreadsheets/d/1NzkfO_G0pa0fZMvuMlIzaLp-oUx5KAat_GVzng5xSKE)) ให้อีเมล Service Account เป็น **Editor**
   (แชร์มือเดียวครั้งเดียว — ไม่เกี่ยวกับ `setSharing`)
7. เปิดเว็บ → เมนู **ตั้งค่า** → กด **Initialize** เพื่อสร้างหัวตาราง + dropdown ตั้งต้น

> `SHEET_ID` ตั้งค่าเริ่มต้นเป็นชีทที่ตกลงไว้แล้ว เปลี่ยนได้ใน `.env.local`

---

## Deploy ขึ้น Vercel + GitHub

1. push โค้ดขึ้น GitHub repo
2. [vercel.com](https://vercel.com) → **Add New Project** → เลือก repo (framework: Next.js ตรวจอัตโนมัติ)
3. ใส่ **Environment Variables** 3 ตัว (เหมือน `.env.local`):
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY` (วางทั้งก้อน รวม `\n`)
   - `SHEET_ID`
4. **Deploy** — เสร็จแล้วได้ URL ใช้งานได้ทันที

> ทุกการเรียก Google Sheets วิ่งผ่าน API route ฝั่ง server (`/api/*`) — key ไม่หลุดไป client และไม่มีปัญหา CORS

---

## โครงไฟล์

```
src/
  app/
    page.tsx            Dashboard (สรุปจำนวนงานแต่ละโมดูล)
    m/[key]/page.tsx    หน้าตารางของแต่ละโมดูล (filter + inline edit + save + ดึงจาก CS)
    settings/page.tsx   Initialize + จัดการ dropdown
    api/                init / lists / jobs / refresh (เชื่อม Sheets)
  components/
    ModuleBoard.tsx     ตารางงาน generic ใช้ได้ทุกโมดูล
    JobGrid, Cell, Toggle, DateTimePicker, FilterBar, Spinner, Overlay ...
  lib/
    fields.ts           type กลาง (Field / PullSpec) + ID_KEY / JOB_KEY
    modules/*.ts         นิยามคอลัมน์ของแต่ละโมดูล (csImport, csExport, shipping, …)
    schema.ts           ทะเบียนโมดูล (MODULES) + master lists ตั้งต้น
    sheets.ts           เชื่อม Google Sheets (Service Account)
    db.ts               CRUD ต่อโมดูล + cross-module pull engine + block parser ของ _lists
```

## ปรับแต่งต่อ

- เพิ่ม/แก้คอลัมน์ → แก้ `src/lib/schema.ts` (`FIELDS`)
- เพิ่ม/แก้ค่า dropdown → ผ่านหน้า **ตั้งค่า** หรือแก้ `LIST_SEED` ใน schema
- เปลี่ยนช่องไหนเป็น read-only (ดึงจาก Module อื่น) → ตั้ง `type: "auto"`
