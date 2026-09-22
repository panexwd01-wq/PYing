# PANEX Mini ERP — Freight Operations Board

ระบบจัดการงาน **Freight / Shipping / Transport / Warehouse / Extra / Accounting** แบบ "Excel บนเว็บ" — ยืดหยุ่นกว่า Excel จริง กำหนด dropdown / เงื่อนไข / สีช่องได้
สร้างด้วย **Next.js (App Router)** เก็บข้อมูลใน **Google Sheets** ผ่าน **Service Account** (อ่าน+เขียนตรง)

---

## สิ่งที่ทำได้

- **Login + สิทธิ์รายบุคคล** — admin กำหนดได้ต่อคนว่า *เห็น / เพิ่ม / แก้ไข / ลบ* tab ไหนได้บ้าง และจัดการงานสถานะ **End** ได้ไหม
- ตารางแบบ Excel เลื่อนแนวนอน (ตรึงคอลัมน์ซ้าย) — ใช้ได้ทั้ง desktop และมือถือ
- แก้ไขในตารางได้เลย (inline) บันทึกทีเดียวหลายแถว
- **Spinner** ตอนโหลด, **Overlay กันปิดจอ** ตอนบันทึก
- ช่อง **Yes/No เป็น Toggle**, วันที่ใช้ **flatpickr** แสดงเป็น **DD/MM/YYYY (ค.ศ.)** · ช่อง **ETA / ETD / Clearance Date เลือกได้แค่วันที่** (ไม่มีเวลา) ส่วน Cut Off / Closing Time ยังมีเวลา
- ช่อง **"ดึงจาก Module อื่น" = เทา read-only**
- กติกาสี: ฟ้า=ต้องกรอก, เหลือง=แก้ไขได้, เทา=Auto/Lock
- **Extra / Accounting** รวบเป็น **1 บรรทัดต่อ 1 Job No.** (Req Type แสดงรวม) กด ▸ เพื่อกางตาราง **Sell / Job Cost** แยกราย Type
- **Rate Checker** (COST / SELL) หน้าเดียว — Add New List + Search By Filter · ผู้ตรวจล็อกตามบัญชีที่ล็อกอิน · บันทึกแล้วแก้ไขไม่ได้ (เฉพาะ admin)
- **Ship Daily** พิมพ์แนวนอน — คอลัมน์ที่เกินหน้ากระดาษไหลลงบรรทัดถัดไปของรายการเดิม (ไม่มี scroll bar / ไม่ตัดข้อมูลทิ้ง)
- **Supervisor** กดแถวทีมเพื่อดูรายชื่อพนักงานทุกคนในทีมนั้น เรียงงานมากสุด → น้อยสุด
- **ตั้งค่าคอลัมน์ต่อบัญชี** — เลือกคอลัมน์ตอนย่อ · ลากจัดลำดับหน้า/หลัง · ลากขอบหัวตารางปรับความกว้าง (จำแยกของใครของมัน ไม่กระทบจอคนอื่น)
- **ค้นหาได้ทุกคอลัมน์** ในช่องค้นหาเดียว · กดฟิลเตอร์แล้ว **Export เฉพาะแถวที่กรองไว้** เป็น Excel ได้
- **แก้หลายแถวพร้อมกัน** — ติ๊กเลือกแถว แล้วใส่ค่าช่องเดียวลงให้ทุกแถวที่เลือก (เช่นเปลี่ยนชื่อเรือ/ETD ทีเดียวหลายบุ๊ก)
- **แผงโน้ตด้านข้าง** ทุกหน้า (ปุ่มมุมขวาล่าง) — โน้ตส่วนกลาง ทุกคนเห็นและแก้ร่วมกัน
- **ชุดสีกลาง** — ตั้งที่หน้าตั้งค่าว่าสีไหนแปลว่าอะไร แล้วกดเลือกสีข้างช่อง **Job No. / Booking / MBL** ได้ต่อแถว ·
  ส่วน **ชื่อลูกค้า / Carrier / S/C / ชื่อ PIC** ตั้งสีต่อรายชื่อครั้งเดียว มีผลทุกแถว
- **เลข Booking ซ้ำ** ในหน้า Export ขึ้นแดงอัตโนมัติ · หน้า **Rate** เตือนเมื่อจะลงเรทซ้ำ (ยืนยันแล้วลงได้)
- **จำนวนตู้แบบ "จำนวน + หน่วย"** 2 คู่ เลือกหน่วยเองได้ (4W / 10W / 20GP / 40HQ / 40FR …)
- เรียงตั้งต้น **ใหม่→เก่า** ตามวันที่หลักของแต่ละ tab (Import=ETA · Export=ETD · Shipping=Clearance · Transport/Warehouse=Delivery) — ฟิลเตอร์ปี/เดือนก็ยึดวันเดียวกัน
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
| `_settings` | ค่าตั้งค่า คอลัมน์ A บรรทัดละเรื่อง — `A1` คอลัมน์ตอนย่อ (ส่วนกลาง) · `A2` สีต่อรายการ dropdown · `A3` ชุดสีกลาง+ความหมาย · `A4` โน้ตส่วนกลางต่อหน้า · `A5` ตั้งค่าคอลัมน์ต่อบัญชี |

- **รหัสเชื่อม (ซ่อน)**: ทุกแถวผูกกับงานแม่ด้วย `__id` ที่ระบบสร้างเอง (ไม่ซ้ำ ไม่แสดงบนเว็บ) — **ไม่ได้ใช้ Job No. เชื่อมแล้ว**
  แก้ Job No. / พิมพ์ผิด / ยังไม่ได้กรอก ก็ไม่หลุดเชื่อม · คอลัมน์อยู่ท้ายสุดของชีท:

  | คอลัมน์ | อยู่ในชีท | เก็บอะไร |
  |---------|-----------|----------|
  | `link_cs` | 06–10 | `__id` ของงาน CS แม่ (04 หรือ 05) |
  | `link_src` | 09 | `__id` ของแถวที่สร้างแถว Extra นี้ (04–08) |
  | `link_key` | 10 | แถวนี้มาจากอะไร: `base` / `extra:<__id แถว Extra>` / `fuel:<__id แถว Transport>:<ลำดับ Supp>` |
  | `link_imp` | 05 | `__id` ของงาน Import ที่สร้างแถว Export นี้ (Re-Export) |

  ห้ามแก้คอลัมน์พวกนี้ในชีทด้วยมือ · Job No. ในโมดูลปลายทางเป็นค่าที่ดึงมาโชว์จาก CS เท่านั้น
- **Cross-module pull**: โมดูลปลายทาง (06–10) ดึงหัว Job จากงาน CS แม่ผ่าน `link_cs`
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

> ⚠️ **อัปเดตเวอร์ชันนี้ (คอลัมน์เปลี่ยน)**: `04_CS_Import` / `05_CS_Export` / `07_Transportation` เลิกใช้คอลัมน์ตายตัว
> `4W / 6W / 10W / 20GP / 40HQ` เปลี่ยนเป็น `cnt1_qty + cnt1_unit` และ `cnt2_qty + cnt2_unit`
> และมีคอลัมน์ใหม่ (DEM Start / หน่วยสินค้า / โน้ตเวลาจัดส่งต่อ Supplier / ช่องเก็บสีที่เลือกเอง)
> → วางไฟล์ `PANEX_Initialize.gs` ล่าสุดทับ แล้วรัน **`PANEX_MIGRATE()`** หนึ่งครั้ง (ย้ายตามชื่อหัวคอลัมน์ + สำรองชีทเป็น `BAK_`)
> ตัวเลขตู้เดิมจะถูกย้ายเข้าคู่ใหม่ให้อัตโนมัติ — แถวที่เดิมกรอกไว้เกิน 2 หน่วย จะยัดที่เหลือเป็นข้อความขึ้นต้นด้วย `⚠` ในช่องหน่วยที่ 2 ให้ไปแก้เอง

> 🛠 **เพิ่ม/ลบ/สลับคอลัมน์ในอนาคต**: แก้ที่ `src/lib/modules/*.ts` แล้วรัน `node scripts/gen-sheet-headers.mjs`
> สคริปต์จะ generate บล็อก `PANEX_HEADERS` ใน `PANEX_Initialize.gs` ให้ตรงกับ schema เอง (ไม่ต้องไล่แก้มือ) จากนั้นรัน `PANEX_MIGRATE()`

> ⚠️ อัปเดตจากเวอร์ชันที่ยังเชื่อมด้วย Job No.: ไม่ต้องทำอะไรกับชีท — ตอนบันทึกครั้งแรกเว็บจะเพิ่มคอลัมน์รหัสเชื่อมต่อท้าย
> และเติมรหัสให้ข้อมูลเดิมเอง (จับคู่ด้วย Job No. แบบเดิม) จากนั้นให้ admin กด **Sync** หนึ่งครั้ง
> แล้วอ่านข้อความผลลัพธ์ — ถ้ามี Job No. ซ้ำหรือรายการที่จับคู่ไม่ได้ ระบบจะแจ้งไว้ให้ตรวจ

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
| `SHEET_CACHE_TTL_MS` | ไม่จำเป็น | อายุ cache ข้อมูลจากชีท (ตั้งต้น 30000 = 30 วิ) |
| `SHEET_META_TTL_MS` | ไม่จำเป็น | อายุ cache รายชื่อ tab (ตั้งต้น 300000 = 5 นาที) |

---

## ความเร็ว — ระบบลดการคุยกับ Google Sheets ยังไง

Google Sheets ตอบช้าประมาณ 0.3–3 วินาทีต่อการเรียก 1 ครั้ง เวลาที่รู้สึกว่า "ช้า" เกือบทั้งหมดคือเวลารอตรงนี้
ไม่ใช่ปริมาณข้อมูล ระบบจึงลดจำนวนครั้งที่ต้องเรียกลงด้วย 4 อย่าง:

1. **อ่านทุกอย่างรวดเดียว** — เปิดหน้าเว็บ 1 ครั้ง = อ่านทุก tab + dropdown + ค่าตั้งค่า ใน `batchGet` ก้อนเดียว
2. **Cache ฝั่ง server** (`src/lib/sheets.ts`) — 2 ชั้น: ชั้นในต่อ 1 คำขอ, ชั้นนอกข้ามคำขออายุ `SHEET_CACHE_TTL_MS`
   เปิดหน้าซ้ำภายในช่วงนี้ **ไม่แตะ Google เลย** · เขียนชีทไหน cache ชีทนั้นถูกล้างทันที (คนอื่นเห็นของใหม่)
   · เส้นบันทึกอ่านสดเสมอ ไม่เอาค่าจาก cache มา merge · คนหลายคนกดพร้อมกันจะรอผลก้อนเดียวกัน ไม่ยิงซ้ำ
3. **บันทึกแล้วได้ข้อมูลใหม่กลับมาเลย** — API ที่เขียนข้อมูลจะแนบ snapshot ล่าสุดกลับมาในคำตอบเดียวกัน
   หน้าเว็บจึงไม่ต้องยิงอ่านซ้ำหลังเซฟ (ประหยัดไปเต็ม ๆ 1 รอบ)
4. **ตารางวาดทีละชุด** (`useRowWindow.ts`) — ข้อมูลมาครบตั้งแต่แรก แต่วาดทีละ 60 แถว เลื่อนถึงท้ายตารางค่อยต่อ
   (ตารางมีหลายสิบคอลัมน์ต่อแถว — วาดพันแถวรวดเดียวคือจุดที่หน่วงที่สุดฝั่งเบราว์เซอร์)

> ผลที่วัดได้: เปิดหน้าครั้งแรก = เรียก Google 2 ครั้ง · เปิดซ้ำในช่วง cache = 0 ครั้ง · บันทึก 1 แถว = 3 ครั้ง

**ข้อควรรู้:** ถ้าไปแก้ข้อมูลใน Google Sheet ตรง ๆ หน้าเว็บจะเห็นช้าได้ถึง `SHEET_CACHE_TTL_MS`
กดปุ่ม **รีเฟรช** เพื่อบังคับอ่านสดได้ตลอด (และหลังบันทึกผ่านเว็บ ระบบบังคับอ่านสดให้อัตโนมัติอยู่แล้ว)

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
    DataProvider                            โหลด snapshot ครั้งเดียวแล้วแชร์ทุกหน้า
    useRowWindow                            วาดตารางทีละชุด (ข้อมูลเยอะแล้วยังลื่น)
  lib/
    session.ts          เซ็น/ตรวจ session cookie (Web Crypto — ใช้ได้ทั้ง Node/Edge)
    users.ts            _users sheet + scrypt hash
    perms.ts            ทะเบียน tab + กติกาสิทธิ์
    authServer.ts       requireUser / assertCan สำหรับ API routes
    fields.ts           type กลาง (Field / PullSpec) + ID_KEY / JOB_KEY / LINK_* (รหัสเชื่อม)
    links.ts            รหัสเชื่อมข้ามโมดูล + เติมรหัสให้ข้อมูลเก่า (ใช้ทั้ง server และหน้าเว็บ)
    modules/*.ts        นิยามคอลัมน์ของแต่ละโมดูล
    schema.ts           ทะเบียนโมดูล (MODULES) + master lists ตั้งต้น
    cellRules.ts        กติกาสีของช่อง · cellState.ts กติกาล็อก
    sheets.ts           เชื่อม Google Sheets (Service Account) + cache 2 ชั้น + retry 429/503
    apiWrite.ts         เส้นเขียนของ API: อ่านสด + แนบ snapshot ล่าสุดกลับไปในคำตอบเดียว
    db.ts               CRUD ต่อโมดูล + cross-module pull + reconcile
```

## ปรับแต่งต่อ

- เพิ่ม/แก้คอลัมน์ → แก้ `src/lib/modules/*.ts` แล้ว **regenerate `PANEX_Initialize.gs`** ให้หัวตารางตรงกัน
- เพิ่ม/แก้ค่า dropdown → ผ่านหน้า **ตั้งค่า** หรือแก้ `LIST_SEED` ใน `schema.ts`
- เปลี่ยนช่องไหนเป็น read-only (ดึงจาก Module อื่น) → ตั้ง `type: "auto"` + `pull` / `rpull`
- เพิ่ม tab ใหม่ที่ต้องคุมสิทธิ์ → เพิ่มใน `TABS` (`src/lib/perms.ts`)
