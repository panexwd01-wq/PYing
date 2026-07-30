# PANEX Mini ERP — Freight Operations Board

ระบบจัดการงาน **Freight / Shipping / Transport / Warehouse / Extra / Accounting** แบบ "Excel บนเว็บ" — ยืดหยุ่นกว่า Excel จริง กำหนด dropdown / เงื่อนไข / สีช่องได้
สร้างด้วย **Next.js (App Router)** เก็บข้อมูลใน **Google Sheets** ผ่าน **Service Account** (อ่าน+เขียนตรง)

---

## สิ่งที่ทำได้

- **Login + สิทธิ์รายบุคคล** — admin กำหนดได้ต่อคนว่า *เห็น / เพิ่ม / แก้ไข / ลบ* tab ไหนได้บ้าง และจัดการงานสถานะ **End** ได้ไหม
- ตารางแบบ Excel เลื่อนแนวนอน (ตรึงคอลัมน์ซ้าย) — ใช้ได้ทั้ง desktop และมือถือ
- แก้ไขในตารางได้เลย (inline) บันทึกทีเดียวหลายแถว
- **Spinner** ตอนโหลด, **Overlay กันปิดจอ** ตอนบันทึก
- ช่อง **Yes/No เป็น Toggle**, วันที่/เวลาใช้ **flatpickr** ภาษาไทย (ปี พ.ศ. + 24 ชม.)
- ช่อง **"ดึงจาก Module อื่น" = เทา read-only**
- กติกาสี: ฟ้า=ต้องกรอก, เหลือง=แก้ไขได้, เทา=Auto/Lock
- **Extra / Accounting** รวบเป็น **1 บรรทัดต่อ 1 Job No.** (Req Type แสดงรวม) กด ▸ เพื่อกางตาราง **Sell / Job Cost** แยกราย Type
- **Rate Checker** (COST / SELL) หน้าเดียว — Add New List + Search By Filter · ผู้ตรวจล็อกตามบัญชีที่ล็อกอิน · บันทึกแล้วแก้ไขไม่ได้ (เฉพาะ admin)
- **Ship Daily** พิมพ์แนวนอน — คอลัมน์ที่เกินหน้ากระดาษไหลลงบรรทัดถัดไปของรายการเดิม (ไม่มี scroll bar / ไม่ตัดข้อมูลทิ้ง)
- **Supervisor** กดแถวทีมเพื่อดูรายชื่อพนักงานทุกคนในทีมนั้น เรียงงานมากสุด → น้อยสุด
- Auto: ลง `* Status Date` อัตโนมัติเมื่อ Status = End

## โครงสร้างชีท (Google Sheet เดียว)

ระบบเป็น **multi-module** — แต่ละโมดูล = 1 tab (แถวแรก = header, คอลัมน์ A = `__id` ภายใน):

| ชีท | โมดูล |
|-----|-------|
| `04_CS_Import` | CS Import |
| `05_CS_Export` | CS Export |
| `06_Shipping` | Shipping |
| `07_Transportation` | Transportation |
| `08_Warehouse` | Warehouse |
| `09_Extra_Service` | Extra / Service (รวมช่องของตาราง Sell / Job Cost) |
| `10_Accounting` | Accounting |
| `13_Cost_Rates` / `13_Sell_Rates` | Rate Checker |
| `_lists` | dropdown ทุกชุด (แบบ **บล็อก**: list ละ 1 คอลัมน์ เว้น 1 คอลัมน์คั่น) |
| `_users` | ผู้ใช้ระบบ + สิทธิ์ (รหัสผ่านเก็บเป็น scrypt hash) |
| `_settings` | ค่าตั้งค่าส่วนกลาง (คอลัมน์ตอนย่อ / สี Co-Agent) |

- **Cross-module pull**: โมดูลปลายทาง (06–10) ดึงหัว Job จาก CS Import/Export ด้วย **Job No.**
- **Reverse pull**: CS Import/Export ดึงค่ากลับจากปลายทาง (เช่น **PERMIT** ที่กรอกใน Shipping)
- **Auto End Date**: ทุกโมดูล เมื่อ Status = End ระบบลงวันที่ในช่อง `* Status Date` ให้อัตโนมัติ

### PERMIT / Form E

- **PERMIT** กรอกที่ tab **Shipping** เท่านั้น (dropdown: TISI / PHYTO / อาหารและยา / N/A — แก้รายการได้ที่หน้าตั้งค่า)
  ค่าไหนที่ไม่ใช่ค่าว่างและไม่ใช่ `N/A` ช่องจะเป็น **สีแดง** และ CS Import/Export จะเห็นค่า+สีเดียวกันแบบ **แก้ไม่ได้**
- **Form E** กรอกที่ **CS Import/Export** เท่านั้น — tab Shipping ดึงไปแสดงแบบ **แก้ไม่ได้**
- Job ที่ไม่ได้ทำ Shipping (`Shipping? = No`) จะไม่มีค่า PERMIT (ปล่อยว่าง)

---

## ตั้งค่าชีทครั้งแรก (Google Apps Script)

การ **Initialize** ทำที่ไฟล์ `PANEX_Initialize.gs` เท่านั้น (ฝั่งเว็บไม่มีปุ่มนี้แล้ว):

1. เปิด Google Sheet → **Extensions → Apps Script**
2. วางเนื้อหาไฟล์ `PANEX_Initialize.gs` ทับ
3. รันฟังก์ชัน **`PANEX_INITIALIZE()`** หนึ่งครั้ง → สร้างทุก tab + หัวตาราง + seed `_lists` (dropdown) + `_users` (รายชื่อ + สิทธิ์) + `_settings` (คอลัมน์ตอนย่อ A1 / สี Carrier A2)
   - ทุก seed **เขียนเฉพาะตอนที่ยังว่าง** — ชีทที่มีข้อมูลอยู่แล้วจะข้ามไป ไม่ทับของเดิม
4. เข้าเว็บ → ล็อกอินด้วยชื่อผู้ใช้ในชีท `_users` (รหัสผ่านของแต่ละคนตามเดิม) · ชุด seed มี `admin` ด้วย
   - **built-in admin**: `james` / `1150` เข้าได้เสมอแม้ `_users` ยังว่างหรือ Google Sheet ล่ม (hardcode ใน `src/lib/users.ts`)

> ⚠️ ถ้าอัปเดตจากเวอร์ชันเก่า: คอลัมน์ของ `09_Extra_Service` และ `13_*_Rates` เปลี่ยนไป — ควร**เคลียร์ข้อมูลในสองชีทนี้ก่อน**รัน Initialize ไม่งั้นค่าเดิมจะเลื่อนคอลัมน์

## ผู้ใช้ & สิทธิ์

- เมนู **ผู้ใช้** (เห็นเฉพาะ admin) — เพิ่ม/แก้/ลบผู้ใช้, ตั้งรหัสผ่าน, เปิด-ปิดใช้งาน
- สิทธิ์ต่อ tab: **เห็น / เพิ่ม / แก้ไข / ลบ / END** (END = จัดการงานที่สถานะ End ได้)
- สิทธิ์แยกอีก 1 อย่าง: **แก้ไข Dropdown** (หน้าตั้งค่า)
- `admin` ได้ทุกสิทธิ์เสมอ · ระบบกันไม่ให้เหลือ admin ที่ใช้งานได้น้อยกว่า 1 คน
- Session หมดอายุเมื่อ **ไม่ได้ใช้งานครบ 24 ชั่วโมง** (ใช้งานต่อเนื่องจะต่ออายุให้เอง)

---

## ติดตั้งและรันในเครื่อง

```bash
npm install
cp .env.example .env.local   # แล้วใส่ค่าจริง
npm run dev                  # http://localhost:3000
```

## ตั้งค่า Google (ทำครั้งเดียว — ฟรีทั้งหมด)

1. ไป [Google Cloud Console](https://console.cloud.google.com/) → สร้าง Project
2. เปิดใช้งาน **Google Sheets API**
3. สร้าง **Service Account** → Keys → **Add Key → JSON** → ดาวน์โหลดไฟล์
4. เปิดไฟล์ JSON เอา 2 ค่าไปใส่ `.env.local`:
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_PRIVATE_KEY` (วางทั้งก้อนในเครื่องหมายคำพูด คง `\n` ไว้)
5. **แชร์ Google Sheet** ให้อีเมล Service Account เป็น **Editor**
6. รัน `PANEX_INITIALIZE()` ใน Apps Script (ดูหัวข้อด้านบน)

### Environment variables

| ตัวแปร | จำเป็น | ใช้ทำอะไร |
|--------|--------|-----------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | ✅ | เชื่อม Google Sheets |
| `GOOGLE_PRIVATE_KEY` | ✅ | เชื่อม Google Sheets |
| `SHEET_ID` | ✅ | ชีทที่ใช้เก็บข้อมูล |
| `AUTH_SECRET` | แนะนำ | กุญแจเซ็น session cookie (ไม่ตั้ง = fallback ไปใช้ `SHEET_ID`) |

---

## Deploy ขึ้น Vercel + GitHub

1. push โค้ดขึ้น GitHub repo
2. [vercel.com](https://vercel.com) → **Add New Project** → เลือก repo (framework: Next.js ตรวจอัตโนมัติ)
3. ใส่ **Environment Variables** ตามตารางด้านบน
4. **Deploy**

> ทุกการเรียก Google Sheets วิ่งผ่าน API route ฝั่ง server (`/api/*`) — key ไม่หลุดไป client และไม่มีปัญหา CORS
> ทุก route (ยกเว้น `/login` และ `/api/auth/*`) ถูกกันด้วย middleware — ไม่ล็อกอินเข้าไม่ได้

---

## โครงไฟล์

```
src/
  middleware.ts         กัน route ที่ยังไม่ล็อกอิน + ต่ออายุ session
  app/
    login/page.tsx      หน้าเข้าสู่ระบบ
    users/page.tsx      จัดการผู้ใช้ + ตารางสิทธิ์ (admin)
    page.tsx            Dashboard
    m/[key]/page.tsx    หน้าตารางของแต่ละโมดูล
    rates/page.tsx      Rate Checker (COST บน / SELL ล่าง)
    views/*             Supervisor / Action / Mgmt / Sales / Ship Daily
    settings/page.tsx   จัดการ dropdown
    api/                auth / users / lists / jobs / refresh / snapshot / sync
  components/
    AuthProvider, AppShell, RequireTab      ระบบสิทธิ์ฝั่ง client
    ModuleBoard                             ตารางงาน generic ใช้ได้ทุกโมดูล
    JobGrid / GroupedGrid / RecordPanel     ตารางปกติ / รวบตาม Job No. / แผงรายละเอียด
    ExtraLinesTable                         ตาราง Sell / Job Cost ของ Extra
    RateBoard, Cell, Toggle, DateTimePicker, FilterBar, Spinner, Overlay ...
  lib/
    session.ts          เซ็น/ตรวจ session cookie (Web Crypto — ใช้ได้ทั้ง Node/Edge)
    users.ts            _users sheet + scrypt hash
    perms.ts            ทะเบียน tab + กติกาสิทธิ์
    authServer.ts       requireUser / assertCan สำหรับ API routes
    fields.ts           type กลาง (Field / PullSpec) + ID_KEY / JOB_KEY
    modules/*.ts        นิยามคอลัมน์ของแต่ละโมดูล
    schema.ts           ทะเบียนโมดูล (MODULES) + master lists ตั้งต้น
    cellRules.ts        กติกาสีของช่อง · cellState.ts กติกาล็อก
    sheets.ts           เชื่อม Google Sheets (Service Account)
    db.ts               CRUD ต่อโมดูล + cross-module pull + reconcile
```

## ปรับแต่งต่อ

- เพิ่ม/แก้คอลัมน์ → แก้ `src/lib/modules/*.ts` แล้ว **regenerate `PANEX_Initialize.gs`** ให้หัวตารางตรงกัน
- เพิ่ม/แก้ค่า dropdown → ผ่านหน้า **ตั้งค่า** หรือแก้ `LIST_SEED` ใน `schema.ts`
- เปลี่ยนช่องไหนเป็น read-only (ดึงจาก Module อื่น) → ตั้ง `type: "auto"` + `pull` / `rpull`
- เพิ่ม tab ใหม่ที่ต้องคุมสิทธิ์ → เพิ่มใน `TABS` (`src/lib/perms.ts`)
