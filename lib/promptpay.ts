// PromptPay QR payload (EMVCo merchant-presented QR, Bank of Thailand format). Built here, never sent elsewhere.
const AID = "A000000677010111";

const tlv = (tag: string, value: string) => `${tag}${value.length.toString().padStart(2, "0")}${value}`;

// A mobile number (0812345678), a national or tax ID (13 digits) or an e-Wallet ID (15 digits).
export function promptPayTarget(raw: string): { subTag: "01" | "02" | "03"; value: string } | null {
  const digits = raw.replace(/\D/g, "");
  if (/^0\d{9}$/.test(digits)) return { subTag: "01", value: `0066${digits.slice(1)}` };
  if (/^\d{13}$/.test(digits)) return { subTag: "02", value: digits };
  if (/^\d{15}$/.test(digits)) return { subTag: "03", value: digits };
  return null;
}

// The amount is fixed in the QR (dynamic QR), so the customer cannot change it.
export function promptPayPayload(rawTarget: string, amountSatang: number): string | null {
  const target = promptPayTarget(rawTarget);
  if (!target || amountSatang <= 0) return null;
  const merchant = tlv("00", AID) + tlv(target.subTag, target.value);
  const body =
    tlv("00", "01") + tlv("01", "12") + tlv("29", merchant) + tlv("53", "764") + tlv("54", (amountSatang / 100).toFixed(2)) + tlv("58", "TH");
  return `${body}6304${crc16(`${body}6304`)}`;
}

// CRC-16/CCITT-FALSE, the checksum the QR standard uses.
export function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
