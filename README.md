# Nisia POS

ระบบขายหน้าร้านสำหรับร้านค้า (PWA) รันบน Cloudflare Workers ผ่าน OpenNext ใช้ Next.js 16.4 (App Router, Cache Components), React 19, PostgreSQL และ Tailwind CSS 4

| Repository | การเข้าถึง |
|---|---|
| [nisiastudio/nisia-pos](https://github.com/nisiastudio/nisia-pos) | private (repo หลักของทีม, remote `origin`) |
| [smebuffth/pos-app-free](https://github.com/smebuffth/pos-app-free) | public (remote `smebuffth`) |

## ฟีเจอร์
- **หน้าแรก (Landing Page)** แนะนำระบบสำหรับผู้ที่ยังไม่เข้าสู่ระบบ ผู้ที่เข้าสู่ระบบอยู่จะถูกพาไปหน้าเริ่มต้นตามตำแหน่งทันที แอปที่ติดตั้งแล้ว (PWA) เปิดหน้าเข้าสู่ระบบโดยตรง
- **หน้าขาย** สแกนบาร์โค้ดด้วยกล้องหรือเครื่องสแกน ตะกร้า ส่วนลดรายรายการและทั้งบิล เงินสดพร้อมเงินทอน PromptPay QR (สร้างในเครื่อง) โอนเงิน และบัตร
- **ขายต่อได้แม้ไม่มีอินเทอร์เน็ต** บิลเก็บไว้บนเครื่องพร้อมรหัสบิลประจำเครื่อง แล้วส่งเมื่อกลับมาออนไลน์ บิลที่ถูกปฏิเสธจะให้ผู้จัดการตรวจในหน้า "บิลออฟไลน์"
- **กะการขาย** เปิดกะ เงินเข้าออก ปิดกะพร้อมส่วนต่างเงินสด
- **สินค้าและสต็อก** หมวดหมู่ รับเข้า ปรับตามการนับจริง ประวัติการเคลื่อนไหวทุกครั้ง
- **บิลและรายงาน** ยกเลิกบิลพร้อมคืนสต็อก รายงานช่วงวันที่ ส่งออก CSV
- **พนักงาน** เจ้าของ ผู้จัดการ แคชเชียร์ ตรวจสิทธิ์ทุกหน้าและทุก API
- **ผู้ช่วย AI** (เจ้าของเท่านั้น) ถามเรื่องยอดขายเป็นภาษาไทย ตัวเลขมาจากฐานข้อมูล AI เขียนข้อมูลไม่ได้ รายการแนะนำสั่งซื้อคำนวณจากยอดขาย 14 วันล่าสุด ไม่ได้มาจาก AI
- **MCP** endpoint `/mcp` แบบอ่านอย่างเดียว สำหรับเจ้าของและผู้จัดการ ใช้โทเคนส่วนตัวจากหน้าฉัน

## การเริ่มต้นใช้งาน (พัฒนา)
ต้องมี Node.js 20.9 ขึ้นไป, Docker Desktop และ Git

```bash
git clone https://github.com/smebuffth/pos-app-free.git
cd pos-app-free
npm install
```

1. เปิด Docker Desktop แล้วรัน `scripts/db-up.sh nisia_pos .` (ตั้งค่า `.dev.vars` และ `.env.local` ให้)
2. ใส่ค่าที่เหลือใน `.dev.vars`: `CRON_SECRET` และ `APP_ENCRYPTION_KEY` (ดู `.env.example`)
3. `node --env-file=.dev.vars scripts/migrate.mjs` แล้ว `node --env-file=.dev.vars scripts/migrate.mjs --run seed/seed.sql`
4. `npm run dev` เปิด `/setup` เพื่อสร้างบัญชีเจ้าของร้านครั้งแรก

## คำสั่ง
| คำสั่ง | ใช้ทำอะไร |
|---|---|
| `npm run dev` | พัฒนาบนเครื่อง |
| `npm run lint` / `npm run typegen` | ตรวจโค้ด / สร้าง type ของ route |
| `npm run build` / `npm run cf:build` | สร้างแอป / สร้าง Worker bundle |
| `npm run cf:preview` | ทดสอบบน Workers runtime ในเครื่อง |
| `npm run cf:deploy` | ขึ้น production (ต้องตั้ง secret ก่อน) |
| `npm run check:pos` | ตรวจกฎการขาย สต็อก ส่วนลด ออฟไลน์ กะ PromptPay และ AI ในฐานข้อมูลทดสอบ |
| `npm run check:mcp` | ตรวจเครื่องมือ MCP ผ่าน handler ของ SDK |
| `npm run tunnel` | เปิด `npm run dev` ออกภายนอกผ่าน HTTPS ด้วย Cloudflare Quick Tunnel (ดูหัวข้อ Cloudflare Tunnel) |
| `npm run tunnel:named` | รัน Named Tunnel ตาม `cloudflared/config.yml` ด้วยโดเมนของคุณเอง |
| `scripts/reset-test-db.sh <container>` | สร้างฐานข้อมูล `*_test` ใหม่สำหรับตรวจ (ไม่เคยลบฐานข้อมูลอื่น) |

`check:pos` และ `check:mcp` รับเฉพาะ `DATABASE_URL` ที่ชื่อฐานข้อมูลมีคำว่า `_test` เท่านั้น

## กฎพื้นฐานของโปรเจกต์
- **ไม่ใช้ `<select>` ของเบราว์เซอร์** dropdown ทุกตัวใช้ `Autocomplete` จาก `components/ui/autocomplete.tsx`
  - `searchable` (ค่าเริ่มต้น) มีช่องพิมพ์ค้นหา ใช้กับรายการยาวหรือเพิ่มขึ้นเรื่อย ๆ เช่น สินค้า หมวดหมู่
  - `searchable={false}` เลือกอย่างเดียว ใช้กับตัวเลือกสั้นที่ตายตัว เช่น สถานะ ตำแหน่ง VAT
  - ส่ง `id` เมื่อมี `<Label htmlFor>` ชี้มาที่ช่อง ค่าส่งไปกับฟอร์มผ่าน hidden input ตาม `name`
- **ปิดไอคอน dev ของ Next.js** (`devIndicators: false` ใน `next.config.ts`)
- **หน้าที่อ่านข้อมูลสดด้วย `connection()`** ใส่ `export const instant = false` เพื่อไม่ให้ dev overlay เตือนเรื่อง uncached data
- **รองรับ Cloudflare Tunnel เสมอ** ดูหัวข้อด้านล่าง
- **ห้าม commit ความลับ** `.env*` (ยกเว้น `.env.example`), `.dev.vars` และ `cloudflared/config.yml` ถูก ignore ไว้ repo `pos-app-free` เป็น public ถ้าความลับหลุดเข้า commit ต้องเปลี่ยนคีย์นั้นทันที

## การ push
`git push` ส่งไปที่ `origin` (nisiastudio) ส่วน repo public ต้องใช้บัญชี GitHub smebuffth

```bash
gh auth switch --user smebuffth && git push smebuffth main && gh auth switch --user ronnakit290
```

## Cloudflare Tunnel
เปิดแอปที่รันบนเครื่อง (`npm run dev`) ให้เข้าจากที่อื่นได้ผ่าน HTTPS โดยไม่ต้องเปิดพอร์ตหรือตั้งค่าเราเตอร์ ใช้เมื่อ
- **ทดสอบบนมือถือหรือแท็บเล็ตจริง** กล้องสแกนบาร์โค้ด service worker (ขายออฟไลน์) และการติดตั้งเป็นแอป ทำงานเฉพาะบน HTTPS หรือ `localhost` การเปิดผ่าน IP ในวง LAN แบบ `http://192.168.x.x` จึงใช้ฟีเจอร์เหล่านี้ไม่ได้
- **ให้ทีมหรือลูกค้าดูงานชั่วคราว** ก่อน deploy จริง

### โปรเจกต์ตั้งค่าอะไรไว้แล้ว
Next.js บล็อกคำขอจากโฮสต์อื่นที่ไม่ใช่ `localhost` เป็นค่าเริ่มต้น `next.config.ts` จึงใส่ชื่อโฮสต์ของ tunnel ไว้ 2 ที่
- `allowedDevOrigins` ให้ dev server ส่งไฟล์ JavaScript และ HMR ให้หน้าที่เปิดผ่าน tunnel ได้ (มีผลเฉพาะ `npm run dev`)
- `experimental.serverActions.allowedOrigins` ให้ Server Actions เช่น เข้าสู่ระบบ ขาย และบันทึกการตั้งค่า ผ่านการตรวจ CSRF ได้ (มีผลทั้ง dev และ production)

`*.trycloudflare.com` (Quick Tunnel) อนุญาตไว้เสมอ ส่วนโดเมนของคุณเองใส่ในตัวแปร `TUNNEL_HOSTNAMES` ใน `.env.local` คั่นด้วยจุลภาค ไม่ต้องใส่ `https://` และพอร์ต แล้วรีสตาร์ต `npm run dev` ทุกครั้งที่แก้ เพราะ `next.config.ts` อ่านค่านี้ตอนเริ่มเท่านั้น

ลิงก์ใบเสร็จดิจิทัล (`/r/<id>`) สร้างจากโดเมนที่เปิดอยู่ จึงเป็นลิงก์ของ tunnel โดยอัตโนมัติ

### ติดตั้ง cloudflared
```bash
brew install cloudflared
```
ระบบอื่นดูที่ [Cloudflare: Downloads](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) ตรวจด้วย `cloudflared --version`

### แบบเร็ว: Quick Tunnel (ไม่ต้องมีบัญชี)
1. รัน `npm run dev`
2. เปิดอีกหน้าต่างแล้วรัน `npm run tunnel`
3. เปิด URL `https://<คำสุ่ม>.trycloudflare.com` ที่ cloudflared แสดงในหน้าต่างนั้น บนอุปกรณ์ใดก็ได้

ข้อจำกัด: URL เปลี่ยนทุกครั้งที่รันใหม่ ไม่รับประกันความเสถียร เหมาะกับการทดสอบเท่านั้น และเพราะคุกกี้ผูกกับโดเมน จึงต้องเข้าสู่ระบบใหม่ทุกครั้งที่ URL เปลี่ยน

### แบบโดเมนของตัวเอง: Named Tunnel
ต้องมีบัญชี Cloudflare และโดเมนที่อยู่ใน Cloudflare แล้ว (เช่น `nisiastudio.com`) URL จะคงที่ เช่น `https://pos-dev.nisiastudio.com`
1. `cloudflared tunnel login` เลือกโดเมนในหน้าเว็บที่เปิดขึ้น
2. `cloudflared tunnel create nisia-pos-dev` จด UUID ที่ได้ ไฟล์ credentials อยู่ที่ `~/.cloudflared/<UUID>.json`
3. `cloudflared tunnel route dns nisia-pos-dev pos-dev.nisiastudio.com` สร้าง DNS ชี้มาที่ tunnel
4. `cp cloudflared/config.example.yml cloudflared/config.yml` แล้วแก้ UUID, path ของ credentials และ hostname
5. ใส่ `TUNNEL_HOSTNAMES=pos-dev.nisiastudio.com` ใน `.env.local` แล้วรีสตาร์ต `npm run dev`
6. `npm run tunnel:named`

อย่าใช้ `pos.nisiastudio.com` เป็นชื่อของ tunnel เพราะเป็นโดเมน production ใน `wrangler.jsonc`

### ทดสอบ Workers runtime ผ่าน tunnel
รัน `npm run cf:preview` (พอร์ต 8787) แล้วใช้ `cloudflared tunnel --url http://localhost:8787` หรือเปลี่ยน `service` ใน `cloudflared/config.yml` เป็น `http://localhost:8787` สำหรับ Named Tunnel ต้องตั้ง `TUNNEL_HOSTNAMES` ไว้ก่อน `cf:build` เพราะค่า `allowedOrigins` ถูกฝังตอน build

### MCP ผ่าน tunnel
MCP client ที่ไม่ใช่เบราว์เซอร์ใช้ได้ทันทีด้วย `https://<tunnel>/mcp` และโทเคนจากหน้าฉัน ส่วน client ที่ทำงานในเบราว์เซอร์ต้องเพิ่มชื่อโฮสต์ของ tunnel ใน `MCP_ALLOWED_ORIGINS`

### ความปลอดภัย
- **ทุกคนที่มี URL เข้าถึงแอปและฐานข้อมูลพัฒนาของคุณได้** ตั้งรหัสผ่านบัญชีทดสอบให้ไม่ซ้ำกับที่อื่น และปิด tunnel (Ctrl+C) ทันทีที่เลิกใช้
- `npm run dev` ไม่ใช่โหมด production มีหน้าแสดง error และรายละเอียดโค้ด อย่าใช้ tunnel แทนการ deploy จริงด้วย `npm run cf:deploy`
- Named Tunnel ควรตั้ง [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/) (Zero Trust → Access → Applications) ให้เฉพาะอีเมลของทีมเข้าได้
- ห้าม commit `cloudflared/config.yml` และไฟล์ credentials `.gitignore` กันไว้แล้ว

### แก้ปัญหา
| อาการ | สาเหตุและวิธีแก้ |
|---|---|
| หน้าเว็บเปิดได้แต่กดอะไรไม่ได้ หรือ log มี `Blocked cross-origin request to Next.js dev resource` | ชื่อโฮสต์ไม่อยู่ใน `TUNNEL_HOSTNAMES` หรือยังไม่รีสตาร์ต `npm run dev` หลังแก้ |
| เข้าสู่ระบบหรือบันทึกแล้วขึ้น error เรื่อง origin หรือ `Invalid Server Actions request` | สาเหตุเดียวกับข้อบน |
| `502 Bad Gateway` หรือ `Unable to reach the origin service` | `npm run dev` ยังไม่รัน หรือไม่ได้รันที่พอร์ต 3000 |
| ล็อกอินอยู่ที่ `localhost` แต่ผ่าน tunnel ต้องล็อกอินใหม่ | ปกติ คุกกี้แยกตามโดเมน |

## ก่อน deploy
- ตั้ง secret: `npx wrangler secret put DATABASE_URL`, `CRON_SECRET`, `APP_ENCRYPTION_KEY`
- ตั้ง custom domain ใน `wrangler.jsonc` (ตอนนี้ `pos.nisiastudio.com`) และให้ zone `nisiastudio.com` อยู่ใน Cloudflare account
- ใช้ฐานข้อมูล production (ผ่าน `DATABASE_URL` secret หรือ Hyperdrive) แล้วรัน `npm run db:migrate:remote`

## ความปลอดภัยและข้อมูล
- รหัสผ่านใช้ PBKDF2-SHA256 (100,000 รอบ) เซสชันเก็บเป็น hash ของโทเคน
- คีย์ AI เข้ารหัสด้วย AES-256-GCM ผูกกับผู้ใช้ และไม่ส่งกลับไปที่ไหนอีก
- โทเคน MCP เก็บเป็น SHA-256 เท่านั้น แสดงครั้งเดียวตอนสร้าง
- บันทึกการกระทำสำคัญ (ยกเลิกบิล ส่วนลด ปรับสต็อก ราคา พนักงาน การตั้งค่า AI) อยู่ในตาราง `audit_log`

## ที่ยังไม่รวมในเวอร์ชันนี้
- เข้าสู่ระบบด้วย Google / Facebook / Discord และ Cloudflare Turnstile (ปิดไว้ใน `wrangler.jsonc`)
- เครื่องพิมพ์ความร้อน (ESC/POS) พิมพ์ผ่านเบราว์เซอร์ขนาด 80 มม.
- ตรวจสลิปโอนเงินอัตโนมัติ แคชเชียร์กดยืนยัน PromptPay เอง
- ใบกำกับภาษีเต็มรูปแบบ ใบเสร็จเป็นแบบย่อ ควรให้นักบัญชียืนยันก่อนใช้จริง

## รูปภาพและงานออกแบบที่สร้างด้วย AI
- `public/logo/logo-mark.png` และไอคอนใน `public/icons/` สร้างด้วย Codex (AI) จากคำสั่งที่กำหนดไว้ ไม่ใช่ผลงานของมนุษย์
- โฟลเดอร์ `design/` เป็นภาพต้นแบบหน้าจอที่สร้างด้วย AI ใช้เป็นแนวทางการออกแบบเท่านั้น ไม่ได้ถูกนำไปเสิร์ฟให้ผู้ใช้

## License
[MIT](LICENSE) © 2026 Nisia Studio ใช้ แก้ไข และแจกจ่ายต่อได้ทั้งเชิงพาณิชย์และไม่เชิงพาณิชย์ โดยต้องคงข้อความลิขสิทธิ์และสัญญาอนุญาตไว้ ซอฟต์แวร์ให้มา "ตามสภาพ" ไม่มีการรับประกัน
