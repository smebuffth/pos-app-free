import { formatTHB } from "@/lib/money";
import { PAYMENT_LABEL } from "@/components/pos/types";

export type ReceiptLine = { name: string; qty: number; unitPriceSatang: number; lineDiscountSatang: number; lineTotalSatang: number };

export type ReceiptData = {
  receiptNo: string;
  pending?: boolean;
  voided?: boolean;
  createdAt: Date;
  storeName: string;
  address: string;
  taxId: string;
  cashier: string;
  lines: ReceiptLine[];
  subtotalSatang: number;
  discountSatang: number;
  totalSatang: number;
  vatSatang: number;
  vatMode: "included" | "none";
  payment: keyof typeof PAYMENT_LABEL;
  tenderedSatang: number | null;
  changeSatang: number | null;
  footer: string;
};

const time = (d: Date) =>
  new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" }).format(d);

// The receipt is the same markup on screen, in the print dialog and on the public receipt link.
// It is 80 mm wide when printed (globals.css, @media print).
export function ReceiptView({ data }: { data: ReceiptData }) {
  return (
    <article className="receipt mx-auto w-full max-w-[80mm] bg-white p-3 text-[12px] leading-relaxed text-black">
      <header className="space-y-0.5 text-center">
        <p className="text-sm font-semibold">{data.storeName}</p>
        {data.address ? <p>{data.address}</p> : null}
        {data.taxId ? <p>เลขผู้เสียภาษี {data.taxId}</p> : null}
      </header>
      <div className="my-2 border-t border-dashed border-black" />
      <dl className="grid grid-cols-[auto_1fr] gap-x-2">
        <dt>เลขที่</dt>
        <dd className="text-right">{data.receiptNo}</dd>
        <dt>วันที่</dt>
        <dd className="text-right">{time(data.createdAt)}</dd>
        <dt>พนักงาน</dt>
        <dd className="text-right">{data.cashier}</dd>
      </dl>
      {data.pending ? <p className="mt-1 text-center font-semibold">รอซิงก์เข้าระบบ</p> : null}
      {data.voided ? <p className="mt-1 text-center font-semibold">ยกเลิกแล้ว</p> : null}
      <div className="my-2 border-t border-dashed border-black" />
      <ul className="space-y-1">
        {data.lines.map((line, i) => (
          <li key={i}>
            <p>{line.name}</p>
            <div className="flex justify-between">
              <span>
                {line.qty} x {formatTHB(line.unitPriceSatang)}
              </span>
              <span>{formatTHB(line.lineTotalSatang)}</span>
            </div>
            {line.lineDiscountSatang > 0 ? (
              <div className="flex justify-between">
                <span>ส่วนลดรายการ</span>
                <span>-{formatTHB(line.lineDiscountSatang)}</span>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="my-2 border-t border-dashed border-black" />
      <dl className="space-y-0.5">
        <Row label="รวม" value={formatTHB(data.subtotalSatang)} />
        {data.discountSatang > 0 ? <Row label="ส่วนลด" value={`-${formatTHB(data.discountSatang)}`} /> : null}
        <Row label={data.vatMode === "included" ? "รวม VAT 7%" : "ยอดสุทธิ"} value={formatTHB(data.totalSatang)} strong />
        {data.vatMode === "included" ? <Row label="ภาษีมูลค่าเพิ่มในยอด" value={formatTHB(data.vatSatang)} /> : null}
        <Row label={`ชำระโดย ${PAYMENT_LABEL[data.payment]}`} value={formatTHB(data.totalSatang)} />
        {data.tenderedSatang !== null ? <Row label="รับเงิน" value={formatTHB(data.tenderedSatang)} /> : null}
        {data.changeSatang !== null ? <Row label="เงินทอน" value={formatTHB(data.changeSatang)} /> : null}
      </dl>
      <div className="my-2 border-t border-dashed border-black" />
      {data.footer ? <p className="text-center">{data.footer}</p> : null}
    </article>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 ${strong ? "font-semibold" : ""}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
