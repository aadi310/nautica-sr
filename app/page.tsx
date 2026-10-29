"use client";

/**
 * NAUTICA x RDEP: Smart receipt, "Navy & Sail"
 *
 * Keeps every section of the current Nautica receipt (header with name + QR, invoice / date / total paid,
 * purchase summary, History / Email / Download, rating, profile, exchange, reach us, store finder, store
 * details, registered office) and adds what the Mango and NEXT receipts have: tier chip, coupons,
 * Nautica Club card, video, floating dock, Directions / Call store, copy-code buttons.
 *
 * Thinking behind it
 *  - Brand colour #13406F carries the page. A deeper navy, sail white and sea-mist tints are shades of it.
 *    Signal red is used in two tiny places only: the flag stripe on the header and the discount tags.
 *    The only other colour is the metallic tier foil on the Club card and the small tier chip.
 *  - Nautical details instead of decoration: wave lines in the header and closing block, a chart-ruler tick
 *    edge on the main cards, diamond (square) notches on coupons, a segmented tick bar for Club progress.
 *  - Sharp corners everywhere: cards, buttons, toggles, notches. Nothing is rounded.
 *  - Press feedback: outlined buttons fill with navy while pressed.
 *  - One fixed type scale (12 / 14 / 16 / 20 / 40).
 *
 * Flow: header (name + QR) > pass card with invoice, date, total paid (overlapping header) >
 *       purchase summary > History / Email / Download > navy band with coupons + Club card > rating >
 *       video > profile > exchange > reach us + store finder > store details > closing block > powered by.
 *
 * Phone first: designed at 400px wide. On phones (<= 520px) it is scaled with CSS `zoom` to fill the
 * screen, on larger screens it stays a centred 400px column.
 *
 * FONT: drop the Nautica font files into /public/fonts as "NauticaSans-Regular.ttf" (400) and
 *       "NauticaSans-Bold.ttf" (700). Rename the two paths in FONT_FACES if the files are called something
 *       else. Until they exist the page falls back to Inter (next/font/google).
 * ASSETS: /images/design-mode/nautica-logo.png (same folder as NEXT's logo; dark logo on transparent, used
 *         inverted on navy), /images/design-mode/RDEP-logo.png. Both fall back to text if missing.
 *         Override with `logoSrc` / `rdepLogoSrc`.
 *
 * Usage:  app/nautica-receipt/page.tsx
 *   import NauticaReceipt from "@/components/NauticaReceipt";
 *   export default function Page() { return <NauticaReceipt />; }
 *
 * With real data: <NauticaReceipt receipts={[...]} data={currentReceipt} />
 */

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import Image from "next/image";
import { Inter } from "next/font/google";

const fallbackFont = Inter({ subsets: ["latin"], weight: ["400", "700"], display: "swap", variable: "--font-nt-fallback" });

const BRAND_STACK = `"NauticaSans", var(--font-nt-fallback), Arial, "Helvetica Neue", Helvetica, sans-serif`;

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const FONT_FACES = `
@font-face{font-family:"NauticaSans";font-weight:400;font-style:normal;font-display:swap;src:url("/fonts/NauticaSans-Regular.ttf") format("truetype")}
@font-face{font-family:"NauticaSans";font-weight:700;font-style:normal;font-display:swap;src:url("/fonts/NauticaSans-Bold.ttf") format("truetype")}
.nt-root{font-family:${BRAND_STACK}}
.nt-bold{font-family:${BRAND_STACK};font-weight:700}

/* Phone press feedback: every button and link dips slightly while touched */
.nt-root a,.nt-root button{-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.nt-root a,.nt-root button:not(:disabled){transition:transform .12s ease,background-color .18s ease,color .18s ease,border-color .18s ease,opacity .18s ease}
.nt-root a:active,.nt-root button:not(:disabled):active{transform:scale(.98)}

/* Film grain on the navy blocks */
.nt-grain{position:relative}
.nt-grain::before{content:"";position:absolute;inset:0;pointer-events:none;background-image:${GRAIN};opacity:.1;mix-blend-mode:overlay}

/* Chart-ruler tick edge */
.nt-ruler{height:6px;background:repeating-linear-gradient(90deg,var(--nt-navy) 0 1px,transparent 1px 8px)}
.nt-ruler-major{height:10px;background:
  repeating-linear-gradient(90deg,var(--nt-navy) 0 1px,transparent 1px 40px),
  repeating-linear-gradient(90deg,var(--nt-navy) 0 1px,transparent 1px 8px) bottom/100% 6px no-repeat}

/* Header entrance */
@keyframes nt-rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.nt-rise{opacity:0;animation:nt-rise .7s cubic-bezier(.2,.7,.2,1) forwards}

/* Rating stars flash in a wave until the first tap */
@keyframes nt-star-flash{0%,100%{fill:transparent;transform:scale(1)}45%{fill:#13406F;transform:scale(1.16)}}
.nt-star-flash{animation:nt-star-flash 1.6s ease-in-out infinite}

/* Light sweep across the Club card */
@keyframes nt-sheen{0%,55%{left:-60%}100%{left:130%}}
.nt-sheen{position:relative;overflow:hidden}
.nt-sheen::after{content:"";position:absolute;top:0;bottom:0;left:-60%;width:40%;pointer-events:none;background:linear-gradient(100deg,transparent,rgba(255,255,255,.45),transparent);transform:skewX(-18deg);animation:nt-sheen 5s ease-in-out infinite}

/* Floating dock slides up */
@keyframes nt-dock{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
.nt-dock{animation:nt-dock .35s cubic-bezier(.2,.7,.2,1) both}

/* Closing waves drift */
@keyframes nt-drift{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.nt-wave-a{animation:nt-drift 22s linear infinite}
.nt-wave-b{animation:nt-drift 34s linear infinite reverse}

@media (prefers-reduced-motion:reduce){
  .nt-rise{opacity:1;animation:none}
  .nt-star-flash,.nt-dock,.nt-wave-a,.nt-wave-b{animation:none}
  .nt-sheen::after{animation:none;display:none}
  .nt-root a,.nt-root button:not(:disabled){transition:none}
  .nt-root a:active,.nt-root button:not(:disabled):active{transform:none}
}
`;

/* Navy and its shades. Signal red is for the flag stripe and discount tags only. */
const theme = {
  "--nt-navy": "#13406F",
  "--nt-deep": "#0B2A4A",
  "--nt-abyss": "#071B31",
  "--nt-ink": "#0E1B2A",
  "--nt-slate": "#4A5D72",
  "--nt-mid": "#7F90A3",
  "--nt-fog": "#B9C7D6",
  "--nt-mist": "#E6EDF5",
  "--nt-wash": "#F3F6FA",
  "--nt-signal": "#C8102E",
  "--nt-line": "rgba(19,64,111,0.2)",
} as CSSProperties;

/* Type scale. Everything on the page uses one of these. */
const T_CAPS = "text-[12px] uppercase tracking-[0.12em] leading-snug";
const T_TITLE = "nt-bold text-[20px] uppercase leading-[1.1] tracking-[0.06em]";
const T_BODY = "text-[14px] leading-snug";
const T_SMALL = "text-[12px] leading-snug";
const T_LABEL = "nt-bold text-[14px] leading-snug";
const T_AMOUNT = "nt-bold text-[16px] leading-snug tabular-nums";
const T_BIG = "text-[40px] leading-none tabular-nums tracking-[-0.01em]";

/* Assets + links (override with props) */
const DEFAULT_NAUTICA_LOGO = "/images/design-mode/nautica-logo.png";
const DEFAULT_RDEP_LOGO = "/images/design-mode/RDEP-logo.png";
const DEFAULT_INSTAGRAM_URL = "https://www.instagram.com/nautica/";
const DEFAULT_STORE_LOCATOR_URL = "https://www.robustkommerce.com/stores?brand=nautica";

/* Marketing video: https://youtu.be/-vYYls9wVts */
const MARKETING_VIDEO_ID = "-vYYls9wVts";

/* Club tiers, lowest to highest. `foil` is the metallic gradient on the Club card and the header chip. */
export type TierName = "Silver" | "Gold" | "Platinum";
const TIERS: { name: TierName; foil: string }[] = [
  { name: "Silver", foil: "linear-gradient(120deg,#FFFFFF 0%,#C9CED6 35%,#8D949E 62%,#EEF0F3 100%)" },
  { name: "Gold", foil: "linear-gradient(120deg,#FFF3C4 0%,#E5BD52 38%,#A67C1A 62%,#F7E08F 100%)" },
  { name: "Platinum", foil: "linear-gradient(120deg,#FFFFFF 0%,#D6E2F2 32%,#93A9C9 62%,#F1F6FD 100%)" },
];

/* ------------------------------- types ------------------------------------------- */
export interface NauticaItem {
  name: string;
  size: string;
  sku: string;
  hsn: string;
  qty: number;
  mrp: number;
  discount: number;
}

export interface NauticaCoupon {
  code: string;
  /** Big headline, e.g. "20% OFF" or "₹500 OFF" */
  value: string;
  title: string;
  description: string;
  validTill: string;
}

export interface NauticaClub {
  tier: TierName;
  points: number;
  /** Points still needed for the next tier. null / omitted at the top tier. */
  pointsToNext?: number | null;
  coupons: NauticaCoupon[];
}

export interface NauticaReceiptData {
  invoiceNo: string;
  date: string;
  customer: { name: string; mobile: string; email: string };
  items: NauticaItem[];
  sgst: number;
  cgst: number;
  payment: { mode: string; ref: string };
  store: { name: string; address: string; email: string; phone: string; gstin?: string; associate: string };
  registeredOffice: string;
  exchange: { days: number; points: string[] };
  callTo: string;
  emailTo: string;
  /** Customer tier + coupons. Optional: the coupons band and the header chip are hidden without it. */
  club?: NauticaClub;
}

export interface ProfileValues {
  name: string;
  email: string;
  gender: string;
  birthday: string;
  anniversary: string;
  offers: boolean;
}

export interface FeedbackValues {
  invoiceNo: string;
  overall: number;
  categories: { service: number; product: number; sizes: number; value: number };
  comment: string;
}

export interface NauticaReceiptProps {
  data?: NauticaReceiptData;
  receipts?: NauticaReceiptData[];
  qrSrc?: string;
  logoSrc?: string;
  rdepLogoSrc?: string;
  instagramUrl?: string;
  storeLocatorUrl?: string;
  onDownload?: (receipt: NauticaReceiptData) => void;
  onSendEmail?: (email: string, receipt: NauticaReceiptData) => void;
  onSaveProfile?: (values: ProfileValues) => void;
  onSubmitFeedback?: (values: FeedbackValues) => void;
  onSelectReceipt?: (invoiceNo: string) => void;
}

type IconName =
  | "history" | "mail" | "download" | "phone" | "instagram" | "pin"
  | "close" | "check" | "arrow" | "chevron" | "user" | "directions" | "call"
  | "star" | "ticket" | "qr" | "card" | "anchor";
type ModalId = "history" | "email" | "qr" | null;

interface HistoryRow {
  invoiceNo: string;
  date: string;
  storeName: string;
  amount: number;
  items: number;
  current: boolean;
}

/* ------------------------------- helpers ----------------------------------------- */
const inr = (n: number): string => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const trim = (n: number): string => String(Number(n.toFixed(2)));
const pctText = (n: number): string => String(Math.round(n * 10) / 10);
const round2 = (n: number): number => Math.round(n * 100) / 100;
const netOf = (i: NauticaItem): number => round2(i.mrp * i.qty - i.discount);
const emailOk = (s: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

function totalsOf(r: NauticaReceiptData) {
  const subtotal = round2(r.items.reduce((a, i) => a + i.mrp * i.qty, 0));
  const discount = round2(r.items.reduce((a, i) => a + i.discount, 0));
  return { subtotal, discount, total: round2(subtotal - discount), pieces: r.items.reduce((a, i) => a + i.qty, 0) };
}

function dateValue(d: string): number {
  const [dd, mm, yyyy] = d.split(" ")[0].split("-").map(Number);
  return Date.UTC(yyyy, (mm || 1) - 1, dd || 1);
}

function seeded(seed: string): () => number {
  let s = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    s ^= seed.charCodeAt(i);
    s = Math.imul(s, 16777619);
  }
  s = s || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

/* ---------------------------- downloadable receipt ------------------------------- */
const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function buildReceiptHtml(r: NauticaReceiptData, logoSrc: string, rdepLogoSrc: string): string {
  const abs = (p: string) => (/^(https?:|data:)/.test(p) ? p : `${window.location.origin}${encodeURI(p)}`);
  const t = totalsOf(r);
  const rows = r.items
    .map(
      (i) => `<tr>
      <td><div class="n">${esc(i.name)}</div><div class="s">Size ${esc(i.size)} &middot; SKU ${esc(i.sku)} &middot; HSN ${esc(i.hsn)}</div></td>
      <td class="r">${i.qty}</td><td class="r">${inr(i.mrp)}</td><td class="r">&minus;${inr(i.discount)}</td><td class="r b">${inr(netOf(i))}</td></tr>`,
    )
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nautica Receipt ${esc(r.invoiceNo)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,'Helvetica Neue',sans-serif;font-size:14px;color:#4A5D72;background:#F3F6FA;max-width:760px;margin:0 auto;padding:24px}
.bar{display:flex;justify-content:flex-end;margin-bottom:16px}
.bar button{background:#13406F;color:#fff;border:0;padding:10px 18px;font:700 12px Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;cursor:pointer}
.sheet{background:#fff;border:1px solid rgba(19,64,111,.2);padding:28px}
.head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;padding-bottom:16px;border-bottom:3px solid #13406F}
.head img{height:30px;width:auto}
h1{font-size:20px;color:#13406F;text-transform:uppercase;letter-spacing:.12em;margin-top:12px}
.meta{text-align:right;font-size:12px;line-height:1.8}
table{width:100%;border-collapse:collapse;margin-top:20px}
th{text-align:left;font-size:11px;letter-spacing:.12em;padding:8px;background:#F3F6FA;border-bottom:1px solid #13406F;color:#13406F}
td{padding:12px 8px;border-bottom:1px solid rgba(19,64,111,.2);vertical-align:top;font-size:13px}
.r{text-align:right}.b{font-weight:700;color:#0E1B2A}.n{text-transform:uppercase;font-weight:700;color:#0E1B2A}.s{font-size:11px;margin-top:3px}
.sum{margin:18px 0 0 auto;width:300px}
.row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px}
.total{display:flex;justify-content:space-between;align-items:baseline;border-top:3px solid #13406F;margin-top:10px;padding-top:12px;color:#13406F;font-weight:700}
.total strong{font-size:26px}
.pay{margin-top:18px;background:#13406F;color:#fff;padding:14px 16px;display:flex;justify-content:space-between;font-size:14px}
.store{margin-top:24px;font-size:12px;line-height:1.7;border-top:1px solid rgba(19,64,111,.2);padding-top:14px}
.foot{margin-top:22px;text-align:center;font-size:12px}.foot img{height:20px;vertical-align:middle;margin-left:6px}
@media print{.bar{display:none}body{max-width:none;padding:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="bar"><button onclick="window.print()">Save as PDF</button></div>
<div class="sheet">
<div class="head"><div><img src="${esc(abs(logoSrc))}" alt="NAUTICA" onerror="this.style.display='none'"><h1>Tax invoice</h1></div>
<div class="meta"><div><b>Invoice no:</b> ${esc(r.invoiceNo)}</div><div><b>Date:</b> ${esc(r.date)}</div><div><b>Customer:</b> ${esc(r.customer.name)}</div><div><b>Mobile:</b> ${esc(r.customer.mobile)}</div></div></div>
<table><thead><tr><th style="width:44%">ITEM</th><th class="r">QTY</th><th class="r">UNIT PRICE</th><th class="r">DISCOUNT</th><th class="r">NET AMOUNT</th></tr></thead><tbody>${rows}</tbody></table>
<div class="sum">
<div class="row"><span>Subtotal (MRP)</span><b>&#8377;${inr(t.subtotal)}</b></div>
<div class="row"><span>Discount</span><b>&minus;&#8377;${inr(t.discount)}</b></div>
<div class="row"><span>Includes SGST</span><b>&#8377;${inr(r.sgst)}</b></div>
<div class="row"><span>Includes CGST</span><b>&#8377;${inr(r.cgst)}</b></div>
<div class="total"><span>Total paid</span><strong>&#8377;${inr(t.total)}</strong></div></div>
<div class="pay"><span>Payment method &middot; ${esc(r.payment.mode)} &ndash; ${esc(r.payment.ref)}</span><b>&#8377;${inr(t.total)}</b></div>
<div class="store"><b>${esc(r.store.name)}</b><br>${esc(r.store.address)}<br>${esc(r.store.email)} &middot; ${esc(r.store.phone)}${r.store.gstin ? `<br>GSTIN: ${esc(r.store.gstin)}` : ""}<br>Registered office: ${esc(r.registeredOffice)}</div>
<div class="foot">Thank you for shopping at Nautica<br><br>Powered by <img src="${esc(abs(rdepLogoSrc))}" alt="rdep" onerror="this.style.display='none'"></div>
</div></body></html>`;
}

function downloadReceipt(r: NauticaReceiptData, logoSrc: string, rdepLogoSrc: string) {
  const blob = new Blob([buildReceiptHtml(r, logoSrc, rdepLogoSrc)], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Nautica_Receipt_${r.invoiceNo}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* -------------------------------- Sample Data ----------------------------------- */
const halfTax = (total: number): number => Math.floor(((total - total / 1.18) / 2) * 100) / 100;

/* SAMPLE club data. Replace with the real tier, points and coupons from the Nautica loyalty API. */
const SAMPLE_CLUB: NauticaClub = {
  tier: "Gold",
  points: 3240,
  pointsToNext: 1760,
  coupons: [
    { code: "NAUTICA20", value: "20% OFF", title: "Welcome back offer", description: "On your next purchase of ₹3,999 or more.", validTill: "30 Nov 2026" },
    { code: "GOLD500", value: "₹500 OFF", title: "Gold member reward", description: "On any order above ₹2,999.", validTill: "31 Dec 2026" },
    { code: "FESTIVE10", value: "10% OFF", title: "Festive edit", description: "On new arrivals. One use only.", validTill: "15 Nov 2026" },
  ],
};

const SAMPLE_COMMON = {
  customer: { name: "Deepak", mobile: "9886082728", email: "deepak.s@proenx.com" },
  store: {
    name: "Nautica",
    address: "62, Upper Ground floor, Phoenix Marketcity, Karnataka",
    email: "rema@proenx.com",
    phone: "9790258564",
    associate: "Virat",
  },
  registeredOffice:
    "1/1, 4th Floor, Cabin 1, Vinayaka Towers, Gandhinagar, K. G. Road, Bangalore, Bangalore North, Karnataka, India, 560009",
  exchange: {
    days: 30,
    points: [
      "Items can be exchanged within 30 days of purchase with this receipt.",
      "Products must be unworn, unwashed and carry all original tags.",
      "Exchange is for the same or a higher value item; any price difference is payable.",
      "Items bought during the end of season sale, innerwear and accessories are not exchangeable.",
    ],
  },
  callTo: "+919790258564",
  emailTo: "rema@proenx.com",
  club: SAMPLE_CLUB,
};

export const sampleNauticaReceipts: NauticaReceiptData[] = [
  {
    ...SAMPLE_COMMON,
    invoiceNo: "20260626000185",
    date: "04-08-2026 17:04:04",
    items: [{ name: "SOCCER CREWNECK PERFORMANCE T-SHIRT", size: "M", sku: "KR6635", hsn: "62032090", qty: 1, mrp: 6617.27, discount: 2644.16 }],
    sgst: halfTax(3973.11),
    cgst: halfTax(3973.11),
    payment: { mode: "CASH", ref: "REF98765" },
  },
  {
    ...SAMPLE_COMMON,
    invoiceNo: "20260526000112",
    date: "26-05-2026 18:41:22",
    store: { ...SAMPLE_COMMON.store, name: "Nautica Orion Mall", address: "Orion Mall, Dr Rajkumar Road, Rajajinagar, Bengaluru, Karnataka" },
    items: [
      { name: "CLASSIC FIT OXFORD SHIRT", size: "L", sku: "W41210", hsn: "62052000", qty: 1, mrp: 4999, discount: 1000 },
      { name: "SLIM FIT CHINO", size: "32", sku: "P22318", hsn: "62034200", qty: 1, mrp: 3999, discount: 0 },
    ],
    sgst: halfTax(7998),
    cgst: halfTax(7998),
    payment: { mode: "CARD", ref: "REF40211" },
  },
  {
    ...SAMPLE_COMMON,
    invoiceNo: "20260203000047",
    date: "03-02-2026 14:09:50",
    store: { ...SAMPLE_COMMON.store, name: "Nautica Forum Mall", address: "Forum Mall, Hosur Road, Koramangala, Bengaluru, Karnataka" },
    items: [{ name: "QUILTED PUFFER JACKET", size: "M", sku: "J09877", hsn: "62011390", qty: 1, mrp: 8999, discount: 0 }],
    sgst: halfTax(8999),
    cgst: halfTax(8999),
    payment: { mode: "UPI", ref: "REF77310" },
  },
];

/* -------------------------------- icons ------------------------------------------ */
const STAR_PATH = "m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2-6.2 3.2L7 14.2 2 9.3l6.9-1z";
const PHONE_PATH =
  "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z";
const PATHS: Record<IconName, ReactNode> = {
  history: (<><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 7v5l3 2" /></>),
  mail: (<><rect x="3" y="5" width="18" height="14" /><path d="m3 7 9 6 9-6" /></>),
  download: (<><path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M5 20h14" /></>),
  phone: <path d={PHONE_PATH} />,
  call: <path d={PHONE_PATH} />,
  instagram: (<><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5h.01" /></>),
  pin: (<><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>),
  user: (<><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>),
  directions: <path d="M9 18l6-6-6-6" />,
  star: <path d={STAR_PATH} />,
  ticket: (<><path d="M3 9a2 2 0 0 0 0 6v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a2 2 0 0 1 0-6V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z" /><path d="M9 9h6M9 12h6M9 15h3" /></>),
  qr: (<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M14 14h3v3h-3zM20 14v.01M14 20h3M20 18v3" /></>),
  card: (<><rect x="3" y="5" width="18" height="14" /><path d="M3 10h18M7 15h4" /></>),
  anchor: (<><circle cx="12" cy="5" r="2.5" /><path d="M12 7.5V22" /><path d="M5 12H2a10 10 0 0 0 20 0h-3" /><path d="M8 11h8" /></>),
  close: <path d="M18 6 6 18M6 6l12 12" />,
  check: <path d="m5 12 5 5 9-10" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  chevron: <path d="m6 9 6 6 6-6" />,
};

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

/* ------------------------- placeholder QR ---------------------------------------- */
function PlaceholderQR({ seed }: { seed: string }) {
  const N = 25;
  const cells = useMemo(() => {
    const rnd = seeded(seed);
    const inFinder = (x: number, y: number) => (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8);
    const out: [number, number][] = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!inFinder(x, y) && rnd() > 0.5) out.push([x, y]);
    return out;
  }, [seed]);
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="7" height="7" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
      <rect x={x + 2} y={y + 2} width="3" height="3" />
    </g>
  );
  return (
    <svg viewBox={`-1 -1 ${N + 2} ${N + 2}`} fill="#13406F" shapeRendering="crispEdges" role="img" aria-label="Receipt QR code" className="h-full w-full">
      <rect x="-1" y="-1" width={N + 2} height={N + 2} fill="#fff" />
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />
      ))}
      {finder(0, 0)}
      {finder(N - 7, 0)}
      {finder(0, N - 7)}
    </svg>
  );
}

/* ------------------------------ wave decoration ---------------------------------- */
/** A row of soft wave lines. `periods` repeats of a 200-unit wave across the viewBox. */
function Waves({ lines = 4, gap = 12, width = 400, stroke = "rgba(255,255,255,0.14)", className = "" }: { lines?: number; gap?: number; width?: number; stroke?: string; className?: string }) {
  const h = lines * gap + 24;
  const paths = Array.from({ length: lines }, (_, i) => {
    const y = 14 + i * gap;
    let d = `M0 ${y} Q50 ${y - 10} 100 ${y}`;
    for (let x = 200; x <= width; x += 100) d += ` T${x} ${y}`;
    return d;
  });
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${width} ${h}`} preserveAspectRatio="none" fill="none" stroke={stroke} strokeWidth="1" className={className}>
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

/* --------------------------------- shared ---------------------------------------- */
const focusRing = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--nt-navy)]";
const sheet = "border border-[var(--nt-line)] bg-white";
const pressInvert = "active:bg-[var(--nt-navy)] active:text-white [@media(hover:hover)]:hover:bg-[var(--nt-navy)] [@media(hover:hover)]:hover:text-white";

const fieldInput =
  "w-full border border-[var(--nt-line)] bg-[var(--nt-wash)] px-4 py-3.5 text-base text-[var(--nt-ink)] outline-none transition-colors [-webkit-appearance:none] [appearance:none] rounded-none placeholder:text-[var(--nt-mid)] focus:border-[var(--nt-navy)] focus:bg-white";
const fieldLabel = `${T_CAPS} mb-1.5 block text-[var(--nt-navy)]`;
const solidBtn = `nt-bold flex w-full items-center justify-center gap-2 bg-[var(--nt-navy)] py-4 text-[12px] uppercase tracking-[0.18em] text-white transition-colors active:bg-[var(--nt-deep)] [@media(hover:hover)]:hover:bg-[var(--nt-deep)] motion-reduce:transition-none ${focusRing}`;

const DESIGN_W = 400;
const PHONE_MAX = 520;
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function useFitScale(): number {
  const [scale, setScale] = useState(1);
  useIsoLayoutEffect(() => {
    const update = () => {
      const w = document.documentElement.clientWidth;
      setScale(w <= PHONE_MAX ? w / DESIGN_W : 1);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);
  return scale;
}
const zoomStyle = (scale: number): CSSProperties | undefined => (scale === 1 ? undefined : ({ zoom: scale } as CSSProperties));

/** True while the element is inside the viewport (expanded by `rootMargin`, needs `threshold` visible). */
function useInView<T extends Element>(ref: RefObject<T | null>, rootMargin: string, threshold: number): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin, threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, threshold]);
  return inView;
}

/** Copy-to-clipboard with a short "Copied" flag per code. */
function useCopy() {
  const [copied, setCopied] = useState("");
  const copy = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      /* clipboard blocked: ignore */
    }
  }, []);
  return { copied, copy };
}

function BrandImage({
  src, alt, width, height, className, fallbackClassName, priority = false,
}: {
  src: string; alt: string; width: number; height: number; className: string; fallbackClassName: string; priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className={fallbackClassName}>{alt}</span>;
  return (
    <Image
      ref={(img: HTMLImageElement | null) => {
        if (img && img.complete && img.naturalWidth === 0) setFailed(true);
      }}
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

function Collapse({ open, id, children }: { open: boolean; id: string; children: ReactNode }) {
  return (
    <div
      id={id}
      aria-hidden={!open}
      className={`grid transition-[grid-template-rows,visibility] duration-300 motion-reduce:transition-none ${
        open ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]"
      }`}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

function SectionTitle({ children, sub, light = false }: { children: ReactNode; sub?: string; light?: boolean }) {
  return (
    <div>
      <h2 className={`${T_TITLE} flex items-center gap-2.5 ${light ? "text-white" : "text-[var(--nt-navy)]"}`}>
        <span aria-hidden="true" className={`inline-block h-2.5 w-2.5 shrink-0 ${light ? "bg-white" : "bg-[var(--nt-navy)]"}`} />
        {children}
      </h2>
      {sub && <p className={`mt-1.5 ${T_BODY} ${light ? "text-[var(--nt-fog)]" : "text-[var(--nt-slate)]"}`}>{sub}</p>}
    </div>
  );
}

/** Chart-ruler tick strip used on the top edge of the main cards. */
function Ruler({ major = false }: { major?: boolean }) {
  return <div aria-hidden="true" className={major ? "nt-ruler-major" : "nt-ruler"} />;
}

/* Popups: sharp white sheets with a navy top rule */
function Modal({ title, onClose, scale, children }: { title: string; onClose: () => void; scale: number; children: ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      (previous as HTMLElement | null)?.focus?.();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#071B31]/70 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={theme}
        className={`nt-root ${fallbackFont.variable} max-h-[88vh] w-full overflow-y-auto border-t-4 border-[var(--nt-navy)] bg-white outline-none sm:w-[400px]`}
      >
        <div className="w-full sm:w-[400px]" style={zoomStyle(scale)}>
          <div className="p-6 text-[var(--nt-slate)]">
            <div className="flex items-center justify-between gap-4">
              <h2 id={titleId} className={`${T_TITLE} text-[var(--nt-navy)]`}>
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className={`grid h-10 w-10 shrink-0 place-items-center border border-[var(--nt-navy)] text-[var(--nt-navy)] ${pressInvert} ${focusRing}`}
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ item row (manifest line) ------------------------- */
const MANIFEST_COLS = "grid-cols-[minmax(0,1fr)_92px_88px]";

function ItemRow({ item }: { item: NauticaItem }) {
  const net = netOf(item);
  const gross = item.mrp * item.qty;
  const pct = gross > 0 ? (item.discount / gross) * 100 : 0;
  return (
    <li className="border-t border-[var(--nt-line)] first:border-t-0">
      <div className={`grid ${MANIFEST_COLS} items-start gap-x-3 px-5 py-4`}>
        <div className="min-w-0">
          <p className="nt-bold text-[14px] uppercase leading-snug tracking-[0.03em] text-[var(--nt-ink)]">{item.name}</p>
          <div className={`mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 ${T_SMALL}`}>
            <span className="nt-bold border border-[var(--nt-navy)] px-1.5 py-0.5 uppercase tracking-[0.1em] text-[var(--nt-navy)]">Size {item.size}</span>
            {pct > 0 && <span className="nt-bold bg-[var(--nt-signal)] px-1.5 py-0.5 text-white">{pctText(pct)}% off</span>}
          </div>
          <dl className={`mt-2.5 space-y-0.5 ${T_SMALL} text-[var(--nt-mid)]`}>
            <div className="flex gap-1.5"><dt>SKU</dt><dd className="tabular-nums text-[var(--nt-slate)]">{item.sku}</dd></div>
            <div className="flex gap-1.5"><dt>HSN</dt><dd className="tabular-nums text-[var(--nt-slate)]">{item.hsn}</dd></div>
          </dl>
        </div>
        <div>
          <p className={`${T_AMOUNT} text-[var(--nt-ink)]`}>₹{inr(item.mrp)}</p>
          <p className={`mt-1 ${T_SMALL} text-[var(--nt-mid)]`}>Qty {item.qty}</p>
          {item.discount > 0 && <p className={`${T_SMALL} tabular-nums text-[var(--nt-slate)]`}>Disc −₹{trim(item.discount)}</p>}
        </div>
        <p className={`${T_AMOUNT} text-right text-[var(--nt-navy)]`}>₹{inr(net)}</p>
      </div>
    </li>
  );
}

/* ------------------------------- feedback card ------------------------------------ */
const RATING_WORDS = ["Poor", "Fair", "Good", "Very good", "Excellent"];
const FEEDBACK_CATEGORIES = [
  { key: "service", label: "Service quality" },
  { key: "product", label: "Product offering" },
  { key: "sizes", label: "Sizes availability" },
  { key: "value", label: "Value for money" },
] as const;

function FeedbackCard({ data, onSubmit }: { data: NauticaReceiptData; onSubmit?: (v: FeedbackValues) => void }) {
  const [overall, setOverall] = useState(0);
  const [hover, setHover] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [cats, setCats] = useState({ service: 0, product: 0, sizes: 0, value: 0 });
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const commentId = useId();
  const detailId = useId();
  const shown = hover || overall;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit?.({ invoiceNo: data.invoiceNo, overall, categories: cats, comment: comment.trim() });
    setSubmitted(true);
  };

  return (
    <section aria-label="Rate your visit" className={`${sheet} text-[var(--nt-slate)]`}>
      <Ruler />
      <div className="p-5">
        <SectionTitle sub={`How was your experience at ${data.store.name.split(" ")[0]}?`}>Rate your visit</SectionTitle>

        {submitted ? (
          <div className="mt-5 flex items-start gap-3 bg-[var(--nt-navy)] p-4 text-white" aria-live="polite">
            <span className="grid h-9 w-9 shrink-0 place-items-center bg-white text-[var(--nt-navy)]">
              <Icon name="check" className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className={T_LABEL}>Thank you for rating</p>
              <p className={`mt-0.5 ${T_SMALL} text-white/75`}>
                You gave {overall} {overall === 1 ? "star" : "stars"} ({RATING_WORDS[overall - 1].toLowerCase()}).
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setExpanded(false);
                  setOverall(0);
                }}
                className={`${T_SMALL} nt-bold mt-2 underline underline-offset-4`}
              >
                Edit rating
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <div role="radiogroup" aria-label="Overall rating" className="flex justify-between" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => {
                const on = n <= shown;
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={overall === n}
                    aria-label={`${n} ${n === 1 ? "star" : "stars"}, ${RATING_WORDS[n - 1]}`}
                    onMouseEnter={() => setHover(n)}
                    onClick={() => {
                      setOverall(n);
                      setExpanded(true);
                    }}
                    className={`grid h-14 w-14 place-items-center ${focusRing}`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                      className={`h-9 w-9 stroke-[var(--nt-navy)] ${on ? "fill-[var(--nt-navy)]" : "fill-transparent"} ${!overall && !hover ? "nt-star-flash" : ""}`}
                      style={!overall && !hover ? { animationDelay: `${(n - 1) * 0.18}s` } : undefined}
                    >
                      <path d={STAR_PATH} />
                    </svg>
                  </button>
                );
              })}
            </div>

            {/* segmented scale under the stars */}
            <div aria-hidden="true" className="mt-2 grid grid-cols-5 gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={`block h-1.5 transition-colors duration-200 ${n <= shown ? "bg-[var(--nt-navy)]" : "bg-[var(--nt-mist)]"}`} />
              ))}
            </div>
            <p className={`${T_CAPS} nt-bold mt-2.5 text-[var(--nt-navy)]`}>{overall ? `${RATING_WORDS[overall - 1]}, ${overall} of 5` : "Tap to rate"}</p>

            <Collapse open={expanded} id={detailId}>
              <form onSubmit={submit} noValidate className="space-y-4 pt-4">
                <div className="border-y border-[var(--nt-line)]">
                  {FEEDBACK_CATEGORIES.map((c) => (
                    <div key={c.key} className="flex items-center justify-between border-t border-[var(--nt-line)] py-1.5 first:border-t-0">
                      <span className={`${T_BODY} text-[var(--nt-ink)]`}>{c.label}</span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button key={star} type="button" onClick={() => setCats((p) => ({ ...p, [c.key]: star }))} className="p-1.5" aria-label={`${star} stars for ${c.label}`}>
                            <svg viewBox="0 0 24 24" strokeWidth="1.5" className={`h-[18px] w-[18px] stroke-[var(--nt-navy)] ${star <= cats[c.key] ? "fill-[var(--nt-navy)]" : "fill-transparent"}`}>
                              <path d={STAR_PATH} />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label htmlFor={commentId} className={fieldLabel}>
                    Anything else? (optional)
                  </label>
                  <textarea
                    id={commentId}
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Tell us what you liked or how we can improve"
                    className={`${fieldInput} resize-none`}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button type="submit" className={`${solidBtn} flex-1`}>
                    Send rating
                  </button>
                  <button type="button" onClick={() => setExpanded(false)} className={`nt-bold shrink-0 border border-[var(--nt-navy)] px-5 py-4 text-[12px] uppercase tracking-[0.18em] text-[var(--nt-navy)] ${pressInvert}`}>
                    Cancel
                  </button>
                </div>
              </form>
            </Collapse>
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------- video (framed) ----------------------------------- */
/** YouTube embed that autoplays muted while at least half of it is on screen and pauses when it leaves. */
function VideoBlock() {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const near = useInView(sectionRef, "300px 0px", 0);
  const visible = useInView(sectionRef, "0px", 0.5);

  useEffect(() => {
    if (near) setMounted(true);
  }, [near]);

  const command = useCallback((func: string) => {
    frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args: "" }), "*");
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const func = visible ? "playVideo" : "pauseVideo";
    const timers = [0, 600, 1500].map((ms) => window.setTimeout(() => command(func), ms));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [loaded, visible, command]);

  const src = mounted
    ? `https://www.youtube-nocookie.com/embed/${MARKETING_VIDEO_ID}?enablejsapi=1&mute=1&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=${MARKETING_VIDEO_ID}&origin=${encodeURIComponent(window.location.origin)}`
    : "";

  return (
    <section ref={sectionRef} aria-label="Nautica video" className="border-4 border-[var(--nt-navy)] bg-[var(--nt-navy)]">
      <div className="relative aspect-video w-full bg-[var(--nt-deep)] bg-cover bg-center" style={{ backgroundImage: `url(https://i.ytimg.com/vi/${MARKETING_VIDEO_ID}/hqdefault.jpg)` }}>
        {mounted && (
          <iframe
            ref={frameRef}
            src={src}
            title="Nautica video"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
            onLoad={() => setLoaded(true)}
            className="absolute inset-0 h-full w-full border-0"
          />
        )}
      </div>
      <div className={`flex items-center justify-between gap-3 px-3 py-2.5 ${T_CAPS} nt-bold text-white`}>
        <span className="flex items-center gap-2">
          <Icon name="anchor" className="h-4 w-4" />
          Nautica film
        </span>
        <span className="text-[var(--nt-fog)]">Plays on mute</span>
      </div>
    </section>
  );
}

/* ================================== COUPONS ======================================= */
const BAND = "#0B2A4A";

interface CouponViewProps {
  coupons: NauticaCoupon[];
  copied: string;
  onCopy: (code: string) => void;
}

/* Swipeable tickets with diamond notches. The centred ticket turns white. */
function TicketView({ coupons, copied, onCopy }: CouponViewProps) {
  const [active, setActive] = useState(0);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLUListElement>(null);
  const activeRef = useRef(0);
  const drag = useRef({ down: false, x: 0, left: 0, moved: false });
  const count = coupons.length;

  useEffect(() => {
    const root = trackRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const items = Array.from(root.children);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const i = items.indexOf(e.target);
            if (i >= 0) {
              activeRef.current = i;
              setActive(i);
            }
          }
        });
      },
      { root, rootMargin: "0px -45% 0px -45%", threshold: 0 },
    );
    items.forEach((i) => io.observe(i));
    return () => io.disconnect();
  }, [count]);

  const goTo = useCallback((i: number) => {
    const el = trackRef.current;
    const child = el?.children[i] as HTMLElement | undefined;
    if (!el || !child) return;
    el.scrollTo({ left: child.offsetLeft - (el.clientWidth - child.offsetWidth) / 2, behavior: "smooth" });
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLUListElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = trackRef.current;
    if (!el) return;
    drag.current = { down: true, x: e.clientX, left: el.scrollLeft, moved: false };
    setDragging(true);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLUListElement>) => {
    const d = drag.current;
    const el = trackRef.current;
    if (!d.down || !el) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 5) d.moved = true;
    el.scrollLeft = d.left - dx;
  };
  const endDrag = () => {
    if (!drag.current.down) return;
    drag.current.down = false;
    setDragging(false);
    goTo(activeRef.current);
  };

  return (
    <>
      <ul
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={(e) => {
          if (drag.current.moved) {
            e.preventDefault();
            e.stopPropagation();
            drag.current.moved = false;
          }
        }}
        className={`relative -mx-4 flex select-none gap-3 overflow-x-auto overscroll-x-contain px-4 pb-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          dragging ? "cursor-grabbing snap-none" : "cursor-grab snap-x snap-mandatory"
        }`}
      >
        {coupons.map((c, i) => {
          const on = i === active;
          return (
            <li key={c.code} className={`shrink-0 snap-center ${count > 1 ? "w-[80%]" : "w-full"}`}>
              <div
                className={`relative transition-all duration-300 motion-reduce:transition-none ${
                  on ? "scale-100 bg-white text-[var(--nt-ink)]" : "scale-[0.96] border border-white/25 bg-[var(--nt-navy)] text-white"
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="nt-bold text-[26px] uppercase leading-none tracking-[0.02em]">{c.value}</p>
                    <span className={`grid h-9 w-9 shrink-0 place-items-center ${on ? "bg-[var(--nt-navy)] text-white" : "bg-white/15 text-white"}`}>
                      <Icon name="anchor" className="h-5 w-5" />
                    </span>
                  </div>
                  <p className={`${T_LABEL} mt-3`}>{c.title}</p>
                  <p className={`mt-1 ${T_SMALL} ${on ? "text-[var(--nt-slate)]" : "text-white/75"}`}>{c.description}</p>
                </div>
                <div className="relative">
                  <span aria-hidden="true" className="absolute -left-2 -top-2 h-4 w-4 rotate-45" style={{ background: BAND }} />
                  <span aria-hidden="true" className="absolute -right-2 -top-2 h-4 w-4 rotate-45" style={{ background: BAND }} />
                  <div className={`border-t-2 border-dashed ${on ? "border-[var(--nt-navy)]/30" : "border-white/30"}`} />
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="nt-bold truncate text-[16px] tracking-[0.12em]">{c.code}</p>
                    <p className={`mt-0.5 ${T_SMALL} ${on ? "text-[var(--nt-slate)]" : "text-white/65"}`}>Valid till {c.validTill}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCopy(c.code)}
                    aria-live="polite"
                    className={`nt-bold shrink-0 border px-4 py-2 text-[12px] uppercase tracking-[0.14em] ${
                      on
                        ? "border-[var(--nt-navy)] bg-[var(--nt-navy)] text-white active:bg-white active:text-[var(--nt-navy)]"
                        : "border-white bg-white text-[var(--nt-navy)] active:bg-transparent active:text-white"
                    }`}
                  >
                    {copied === c.code ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {count > 1 && (
        <div className="-mt-1 flex justify-center gap-0.5">
          {coupons.map((c, i) => (
            <button key={c.code} type="button" aria-label={`Show coupon ${i + 1} of ${count}`} aria-current={i === active ? "true" : undefined} onClick={() => goTo(i)} className="grid h-6 w-7 place-items-center">
              <span className={`block h-[3px] transition-all duration-300 ${i === active ? "w-6 bg-white" : "w-2 bg-white/30"}`} />
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function CouponsSection({ coupons }: { coupons: NauticaCoupon[] }) {
  const { copied, copy } = useCopy();
  const count = coupons.length;

  return (
    <section aria-label="Coupons">
      <div className="flex items-center justify-between gap-3">
        <h2 className={`${T_TITLE} flex items-center gap-2.5 text-white`}>
          <span aria-hidden="true" className="inline-block h-2.5 w-2.5 bg-white" />
          Coupons
        </h2>
        <span className={`${T_CAPS} nt-bold border border-white/40 px-2.5 py-1 text-white`}>{count} available</span>
      </div>

      <div className="mt-4">
        {count === 0 ? (
          <div className="flex flex-col items-center border border-dashed border-white/30 px-6 py-7 text-center">
            <Icon name="ticket" className="h-8 w-8 text-white" />
            <p className={`${T_LABEL} mt-2 text-white`}>No coupons available</p>
            <p className={`${T_SMALL} mt-1 text-[var(--nt-fog)]`}>Please check this section later.</p>
          </div>
        ) : (
          <TicketView coupons={coupons} copied={copied} onCopy={copy} />
        )}
      </div>
    </section>
  );
}

/* ------------------------------ Nautica Club: foil card ---------------------------- */
function ClubCard({ club, mobile, sectionRef, logoSrc }: { club: NauticaClub; mobile: string; sectionRef: RefObject<HTMLElement | null>; logoSrc: string }) {
  const idx = Math.max(0, TIERS.findIndex((t) => t.name === club.tier));
  const tier = TIERS[idx];
  const next = TIERS[idx + 1];
  const toNext = club.pointsToNext ?? null;
  const total = toNext != null ? club.points + toNext : club.points;
  const pct = !next || toNext == null || total <= 0 ? 100 : Math.min(100, Math.round((club.points / total) * 100));
  const SEGMENTS = 20;
  const filled = Math.round((pct / 100) * SEGMENTS);

  return (
    <section ref={sectionRef} aria-label="Nautica Club" className="scroll-mt-4">
      <div className="nt-sheen p-4 text-[var(--nt-ink)] shadow-[0_22px_40px_-16px_rgba(0,0,0,0.9)]" style={{ backgroundImage: tier.foil }}>
        <Waves lines={5} gap={14} stroke="rgba(11,42,74,0.16)" className="pointer-events-none absolute inset-x-0 bottom-0 h-20 w-full" />

        <div className="relative flex items-center justify-between gap-3">
          <BrandImage src={logoSrc} alt="NAUTICA" width={320} height={80} className="h-5 w-auto object-contain object-left brightness-0" fallbackClassName="nt-bold text-[16px] uppercase tracking-[0.24em]" />
          <span className={`${T_LABEL} tabular-nums tracking-[0.12em]`}>•••• {mobile.slice(-4)}</span>
        </div>

        <div className="relative mt-3 flex items-end justify-between gap-3">
          <div>
            <p className={`${T_SMALL} text-[rgba(14,27,42,0.75)]`}>Club tier</p>
            <p className="nt-bold text-[26px] uppercase leading-none tracking-[0.08em]">{tier.name}</p>
          </div>
          <div className="text-right">
            <p className="nt-bold text-[26px] leading-none tabular-nums">{club.points.toLocaleString("en-IN")}</p>
            <p className={`${T_SMALL} text-[rgba(14,27,42,0.75)]`}>points</p>
          </div>
        </div>

        <div className="relative mt-3.5">
          <div aria-hidden="true" className="flex gap-[3px]">
            {Array.from({ length: SEGMENTS }, (_, i) => (
              <span key={i} className={`block h-2.5 flex-1 ${i < filled ? "bg-[var(--nt-navy)]" : "bg-[var(--nt-navy)]/20"}`} />
            ))}
          </div>
          <p className={`${T_SMALL} mt-1.5`}>
            {next && toNext != null ? (
              <>
                <span className="nt-bold tabular-nums">{toNext.toLocaleString("en-IN")}</span> more points to <span className="nt-bold">{next.name}</span>
              </>
            ) : (
              "You are at the top tier"
            )}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- profile ----------------------------------------- */
const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];

function Toggle({ checked, onChange, disabled = false, label }: { checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative h-7 w-[52px] shrink-0 border border-[var(--nt-navy)] transition-colors motion-reduce:transition-none ${checked ? "bg-[var(--nt-navy)]" : "bg-white"} ${disabled ? "opacity-60" : ""} ${focusRing}`}
    >
      <span aria-hidden="true" className={`absolute top-[3px] h-[18px] w-[18px] transition-all motion-reduce:transition-none ${checked ? "left-[30px] bg-white" : "left-[3px] bg-[var(--nt-navy)]"}`} />
    </button>
  );
}

function ProfileCard({ data, onSave }: { data: NauticaReceiptData; onSave?: (v: ProfileValues) => void }) {
  const [form, setForm] = useState<ProfileValues>({
    name: data.customer.name,
    email: data.customer.email,
    gender: "",
    birthday: "",
    anniversary: "",
    offers: false,
  });
  const [saved, setSaved] = useState(false);
  const [emailErr, setEmailErr] = useState("");
  const upd = <K extends keyof ProfileValues>(k: K, v: ProfileValues[K]) => {
    setSaved(false);
    setForm((f) => ({ ...f, [k]: v }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (form.email && !emailOk(form.email)) {
      setEmailErr("Enter a valid email address, like name@example.com.");
      return;
    }
    setEmailErr("");
    onSave?.(form);
    setSaved(true);
  };

  return (
    <section aria-label="Your profile" className={`${sheet} text-[var(--nt-slate)]`}>
      <Ruler />
      <div className="p-5">
        <SectionTitle sub="Complete your profile for personalised updates and loyalty program benefits.">Your profile</SectionTitle>
        <form onSubmit={submit} noValidate className="mt-5 space-y-4">
          <div>
            <span className={fieldLabel}>Mobile number</span>
            <p className={`${fieldInput} nt-bold tabular-nums`}>{data.customer.mobile}</p>
          </div>

          <label className="block">
            <span className={fieldLabel}>Full name</span>
            <input className={fieldInput} value={form.name} onChange={(e) => upd("name", e.target.value)} autoComplete="name" />
          </label>

          <label className="block">
            <span className={fieldLabel}>Email address</span>
            <input
              type="email"
              className={fieldInput}
              value={form.email}
              onChange={(e) => {
                setEmailErr("");
                upd("email", e.target.value);
              }}
              autoComplete="email"
              aria-invalid={!!emailErr}
            />
            {emailErr && (
              <span role="alert" className={`${T_LABEL} mt-1.5 block text-[var(--nt-signal)]`}>
                {emailErr}
              </span>
            )}
          </label>

          <fieldset>
            <legend className={fieldLabel}>Gender</legend>
            <div className="grid grid-cols-2 gap-px border border-[var(--nt-line)] bg-[var(--nt-line)]">
              {GENDERS.map((g) => {
                const on = form.gender === g;
                return (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={on}
                    onClick={() => upd("gender", on ? "" : g)}
                    className={`py-3 text-[14px] transition-colors motion-reduce:transition-none ${focusRing} ${on ? "nt-bold bg-[var(--nt-navy)] text-white" : "bg-white text-[var(--nt-slate)] active:bg-[var(--nt-mist)]"}`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            <label className="block min-w-0">
              <span className={fieldLabel}>Birthday</span>
              <input type="date" className={fieldInput} value={form.birthday} onChange={(e) => upd("birthday", e.target.value)} autoComplete="bday" />
              <span className={`mt-1 block ${T_SMALL}`}>For birthday offers</span>
            </label>
            <label className="block min-w-0">
              <span className={fieldLabel}>Anniversary</span>
              <input type="date" className={fieldInput} value={form.anniversary} onChange={(e) => upd("anniversary", e.target.value)} />
              <span className={`mt-1 block ${T_SMALL}`}>Optional</span>
            </label>
          </div>

          <fieldset>
            <legend className={fieldLabel}>Communication preferences</legend>
            <ul className="divide-y divide-[var(--nt-line)] border border-[var(--nt-line)]">
              <li className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className={`${T_LABEL} text-[var(--nt-ink)]`}>Purchase and order updates</p>
                  <p className={`mt-0.5 ${T_SMALL}`}>Receipts and return confirmations. Always on.</p>
                </div>
                <Toggle checked disabled label="Purchase and order updates, always on" />
              </li>
              <li className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className={`${T_LABEL} text-[var(--nt-ink)]`}>New arrivals and offers</p>
                  <p className={`mt-0.5 ${T_SMALL}`}>Collections, member offers and seasonal edits.</p>
                </div>
                <Toggle checked={form.offers} onChange={(v) => upd("offers", v)} label="New arrivals and offers" />
              </li>
            </ul>
          </fieldset>

          <div>
            <button type="submit" className={solidBtn}>
              {saved ? (
                <>
                  <Icon name="check" className="h-4 w-4" /> Details saved
                </>
              ) : (
                "Save details"
              )}
            </button>
            <p className={`mt-3 text-center ${T_SMALL}`}>Your information is used only for purchase communication and personalisation. We never share your data with third parties.</p>
            <span className="sr-only" aria-live="polite">
              {saved ? "Details saved" : ""}
            </span>
          </div>
        </form>
      </div>
    </section>
  );
}

/* ------------------------------ receipt view ------------------------------------- */
interface ReceiptViewProps extends Omit<NauticaReceiptProps, "data" | "receipts" | "onSelectReceipt"> {
  data: NauticaReceiptData;
  history: HistoryRow[];
  onSelect: (invoiceNo: string) => void;
}

function ReceiptView({
  data,
  history,
  onSelect,
  qrSrc,
  logoSrc = DEFAULT_NAUTICA_LOGO,
  rdepLogoSrc = DEFAULT_RDEP_LOGO,
  instagramUrl = DEFAULT_INSTAGRAM_URL,
  storeLocatorUrl = DEFAULT_STORE_LOCATOR_URL,
  onDownload,
  onSendEmail,
  onSaveProfile,
  onSubmitFeedback,
}: ReceiptViewProps) {
  const [modal, setModal] = useState<ModalId>(null);
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [passed, setPassed] = useState(false);
  const closeModal = useCallback(() => setModal(null), []);
  const exchangeId = useId();
  const clubRef = useRef<HTMLElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const scale = useFitScale();

  const { store, exchange, club } = data;
  const t = useMemo(() => totalsOf(data), [data]);
  const firstName = data.customer.name.trim().split(/\s+/)[0] || data.customer.name;
  const nameSize = Math.min(40, Math.max(24, Math.floor(250 / (0.8 * firstName.length))));
  const tier = club ? TIERS.find((x) => x.name === club.tier) ?? TIERS[0] : null;
  const handleDownload = () => (onDownload ? onDownload(data) : downloadReceipt(data, logoSrc, rdepLogoSrc));
  const footerInView = useInView(footerRef, "0px", 0);

  /* the floating dock appears once the action strip has scrolled off the top */
  useEffect(() => {
    const el = actionsRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setPassed(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const actions: { icon: IconName; label: string; onClick: () => void }[] = [
    { icon: "history", label: "History", onClick: () => setModal("history") },
    { icon: "mail", label: "Email", onClick: () => setModal("email") },
    { icon: "download", label: "Download", onClick: handleDownload },
  ];

  return (
    <div
      style={theme}
      onTouchStart={() => {}} /* lets :active press states fire on iOS Safari */
      className={`nt-root ${fallbackFont.variable} min-h-screen overflow-x-hidden bg-[#D5DEE8] text-[var(--nt-slate)] antialiased [-webkit-text-size-adjust:100%] sm:py-8`}
    >
      <style>{FONT_FACES}</style>

      <main style={zoomStyle(scale)} className="mx-auto w-[400px] overflow-hidden bg-[var(--nt-wash)] sm:shadow-[0_28px_64px_-26px_rgba(7,27,49,0.6)]">
        {/* ---------- 1. Header: logo, name, QR ---------- */}
        <header
          className="nt-grain relative overflow-hidden px-5 pb-20 pt-6 text-white"
          style={{ background: "radial-gradient(120% 140% at 100% 0%, #1D5A97 0%, #13406F 48%, #0B2A4A 100%)" }}
        >
          {/* flag stripe */}
          <div aria-hidden="true" className="absolute inset-x-0 top-0 flex h-1.5">
            <span className="flex-1 bg-white" />
            <span className="flex-1 bg-[var(--nt-signal)]" />
            <span className="flex-1 bg-[var(--nt-abyss)]" />
          </div>
          <Waves lines={6} gap={13} className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full" />

          <div className="nt-rise relative flex items-center justify-between gap-4">
            <BrandImage
              src={logoSrc}
              alt="NAUTICA"
              width={320}
              height={80}
              priority
              className="h-6 w-auto max-w-[46%] shrink-0 object-contain object-left brightness-0 invert"
              fallbackClassName="nt-bold inline-block text-[24px] uppercase leading-none tracking-[0.28em] text-white"
            />
            {club && tier && (
              <button
                type="button"
                onClick={() => clubRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                aria-label={`${club.tier} member. View Nautica Club`}
                className="nt-bold inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-[12px] uppercase tracking-[0.14em] text-[var(--nt-ink)]"
                style={{ background: tier.foil }}
              >
                <Icon name="star" className="h-3.5 w-3.5" />
                {club.tier}
              </button>
            )}
          </div>

          <div className="nt-rise relative mt-7 flex items-end justify-between gap-4" style={{ animationDelay: "0.12s" }}>
            <div className="min-w-0">
              <p className={`${T_CAPS} text-[var(--nt-fog)]`}>Thank you,</p>
              <h1 className="mt-2 uppercase leading-[1.02] tracking-[0.1em] [overflow-wrap:anywhere]" style={{ fontSize: nameSize }}>
                {firstName}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setModal("qr")}
              aria-label="View QR code"
              className="relative h-[68px] w-[68px] shrink-0 bg-white p-1.5 text-[var(--nt-navy)]"
            >
              {qrSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrSrc} alt="Receipt QR code" className="h-full w-full object-contain" />
              ) : (
                <PlaceholderQR seed={data.invoiceNo} />
              )}
            </button>
          </div>
        </header>

        {/* ---------- 2. Pass card: invoice, date, total paid (overlaps header) ---------- */}
        <section aria-label="Invoice" className="relative z-10 -mt-12 px-4">
          <div className={`${sheet} shadow-[0_26px_44px_-24px_rgba(7,27,49,0.7)]`}>
            <Ruler major />
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 p-5">
              <div className="min-w-0">
                <p className={`${T_CAPS} text-[var(--nt-mid)]`}>Invoice no</p>
                <p className="nt-bold mt-1 truncate text-[16px] tabular-nums text-[var(--nt-ink)]">{data.invoiceNo}</p>
                <p className={`${T_CAPS} mt-3 text-[var(--nt-mid)]`}>Date</p>
                <p className="mt-1 text-[14px] tabular-nums text-[var(--nt-navy)]">{data.date}</p>
              </div>
              <div className="border-l border-dashed border-[var(--nt-navy)]/40 pl-4 text-right">
                <p className={`${T_CAPS} text-[var(--nt-mid)]`}>Total paid</p>
                <p className="nt-bold mt-1 text-[26px] leading-none tabular-nums text-[var(--nt-navy)]">₹{inr(t.total)}</p>
                {t.discount > 0 && <p className={`mt-2 ${T_SMALL} text-[var(--nt-slate)]`}>You saved ₹{inr(t.discount)}</p>}
              </div>
            </div>
          </div>
        </section>

        {/* ---------- 3. Purchase summary ---------- */}
        <section aria-label="Purchase summary" className="mt-4 px-4">
          <div className={`${sheet} text-[var(--nt-slate)]`}>
            <div className="flex items-center justify-between gap-3 border-b-2 border-[var(--nt-navy)] px-5 py-4">
              <h2 className={`${T_TITLE} flex items-center gap-2.5 text-[var(--nt-navy)]`}>
                <span aria-hidden="true" className="inline-block h-2.5 w-2.5 bg-[var(--nt-navy)]" />
                Purchase summary
              </h2>
              <p className={`${T_CAPS} nt-bold shrink-0 bg-[var(--nt-mist)] px-2.5 py-1 text-[var(--nt-navy)]`}>
                {t.pieces} {t.pieces === 1 ? "item" : "items"}
              </p>
            </div>

            <div aria-hidden="true" className={`grid ${MANIFEST_COLS} gap-x-3 border-b border-[var(--nt-line)] bg-[var(--nt-wash)] px-5 py-2 ${T_CAPS} text-[var(--nt-navy)]`}>
              <span>Item</span>
              <span>Unit price</span>
              <span className="text-right">Net amount</span>
            </div>

            <ul aria-label="Items purchased">
              {data.items.map((item, i) => (
                <ItemRow key={`${item.sku}-${i}`} item={item} />
              ))}
            </ul>

            <dl className="border-t-2 border-[var(--nt-navy)]">
              {(
                [
                  ["Subtotal (MRP)", `₹${inr(t.subtotal)}`],
                  ["Discount", `− ₹${inr(t.discount)}`],
                  ["SGST", `₹${inr(data.sgst)}`],
                  ["CGST", `₹${inr(data.cgst)}`],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 border-t border-[var(--nt-line)] px-5 py-3 first:border-t-0">
                  <dt className={`${T_CAPS} text-[var(--nt-navy)]`}>{label}</dt>
                  <dd className={`${T_AMOUNT} text-[var(--nt-ink)]`}>{value}</dd>
                </div>
              ))}
            </dl>

            <div className="flex items-baseline justify-between gap-3 border-t-2 border-[var(--nt-navy)] px-5 pb-5 pt-4">
              <p className={`${T_CAPS} nt-bold text-[var(--nt-navy)]`}>Total paid</p>
              <p className={`${T_BIG} nt-bold text-[var(--nt-navy)]`}>₹{inr(t.total)}</p>
            </div>

            {/* payment stub */}
            <div className="nt-grain relative mx-5 mb-5 overflow-hidden bg-[var(--nt-navy)] p-4 text-white" style={{ backgroundImage: "radial-gradient(120% 160% at 100% 0%, #1D5A97 0%, #13406F 60%)" }}>
              <Waves lines={3} gap={12} className="pointer-events-none absolute inset-x-0 bottom-0 h-12 w-full" />
              <p className={`relative ${T_CAPS} text-[var(--nt-fog)]`}>Payment method</p>
              <div className="relative mt-2.5 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center bg-white/15">
                    <Icon name="card" className="h-5 w-5" />
                  </span>
                  <p className={`${T_LABEL} truncate`}>
                    {data.payment.mode} &ndash; {data.payment.ref}
                  </p>
                </div>
                <p className={`${T_AMOUNT} shrink-0`}>₹{inr(t.total)}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Action strip ---------- */}
        <div ref={actionsRef} className="mt-4 px-4">
          <div className="grid grid-cols-3 divide-x divide-[var(--nt-navy)] border border-[var(--nt-navy)] bg-white">
            {actions.map((a) => (
              <button key={a.label} type="button" onClick={a.onClick} className={`nt-bold flex items-center justify-center gap-2 py-4 text-[12px] uppercase tracking-[0.14em] text-[var(--nt-navy)] ${pressInvert} ${focusRing}`}>
                <Icon name={a.icon} className="h-[18px] w-[18px]" />
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* ---------- 4. Navy band: coupons + Club card ---------- */}
        {club && (
          <div
            className="nt-grain relative mt-8 overflow-hidden px-4 pb-8 pt-8 text-white"
            style={{ background: `radial-gradient(rgba(255,255,255,0.09) 1px, transparent 1px) 0 0 / 14px 14px, ${BAND}` }}
          >
            <Waves lines={5} gap={14} className="pointer-events-none absolute inset-x-0 top-0 h-24 w-full" stroke="rgba(255,255,255,0.08)" />
            <div className="relative space-y-7">
              <CouponsSection coupons={club.coupons} />
              <ClubCard club={club} mobile={data.customer.mobile} sectionRef={clubRef} logoSrc={logoSrc} />
            </div>
          </div>
        )}

        {/* ---------- 5. Rating ---------- */}
        <div className="mt-8 px-4">
          <FeedbackCard data={data} onSubmit={onSubmitFeedback} />
        </div>

        {/* ---------- 6. Video ---------- */}
        <div className="mt-8 px-4">
          <VideoBlock />
        </div>

        <div className="space-y-6 px-4 pt-8">
          {/* ---------- 7. Profile, exchange ---------- */}
          <ProfileCard data={data} onSave={onSaveProfile} />

          <section aria-label="Exchange" className={`${sheet} text-[var(--nt-ink)]`}>
            <h2>
              <button
                type="button"
                onClick={() => setExchangeOpen((o) => !o)}
                aria-expanded={exchangeOpen}
                aria-controls={exchangeId}
                className={`flex w-full items-center justify-between gap-4 p-5 text-left ${focusRing}`}
              >
                <span>
                  <span className={`${T_TITLE} flex items-center gap-2.5 text-[var(--nt-navy)]`}>
                    <span aria-hidden="true" className="inline-block h-2.5 w-2.5 bg-[var(--nt-navy)]" />
                    Exchange
                  </span>
                  <span className={`mt-1.5 block ${T_BODY} font-normal normal-case tracking-normal text-[var(--nt-slate)]`}>{exchange.days}-day exchange policy</span>
                </span>
                <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center border border-[var(--nt-navy)] text-[var(--nt-navy)]">
                  <Icon name="chevron" className={`h-4 w-4 transition-transform duration-300 ${exchangeOpen ? "rotate-180" : ""}`} />
                </span>
              </button>
            </h2>
            <Collapse open={exchangeOpen} id={exchangeId}>
              <ol className="border-t border-[var(--nt-navy)]">
                {exchange.points.map((p, i) => (
                  <li key={p} className={`flex items-start gap-4 border-t border-[var(--nt-line)] px-5 py-4 first:border-t-0 ${T_BODY} text-[var(--nt-slate)]`}>
                    <span className="nt-bold w-6 shrink-0 text-[14px] tabular-nums text-[var(--nt-navy)]">{String(i + 1).padStart(2, "0")}</span>
                    {p}
                  </li>
                ))}
              </ol>
            </Collapse>
          </section>

          {/* ---------- 8. Reach us + store finder ---------- */}
          <section aria-label="Reach us" className={sheet}>
            <Ruler />
            <div className="p-5">
              <SectionTitle sub="Get in touch or find us online.">Reach us</SectionTitle>
              <div className="mt-4 grid grid-cols-3 divide-x divide-[var(--nt-navy)] border border-[var(--nt-navy)]">
                {(
                  [
                    { icon: "instagram", label: "Instagram", href: instagramUrl, ext: true },
                    { icon: "phone", label: "Call us", href: `tel:${data.callTo}`, ext: false },
                    { icon: "mail", label: "Email us", href: `mailto:${data.emailTo}`, ext: false },
                  ] as { icon: IconName; label: string; href: string; ext: boolean }[]
                ).map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    {...(l.ext ? { target: "_blank", rel: "noopener noreferrer" } : null)}
                    className={`nt-bold flex flex-col items-center gap-2.5 py-5 text-center text-[12px] uppercase tracking-[0.14em] text-[var(--nt-navy)] ${pressInvert} ${focusRing}`}
                  >
                    <Icon name={l.icon} className="h-5 w-5" />
                    {l.label}
                  </a>
                ))}
              </div>

              <a
                href={storeLocatorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="nt-grain relative mt-3 flex items-center justify-between gap-4 overflow-hidden bg-[var(--nt-navy)] p-5 text-white active:bg-[var(--nt-deep)]"
              >
                <Waves lines={3} gap={12} className="pointer-events-none absolute inset-x-0 bottom-0 h-12 w-full" />
                <span className="relative">
                  <span className={`${T_TITLE} block`}>Find a Nautica store</span>
                  <span className={`mt-1.5 block ${T_BODY} text-[var(--nt-fog)]`}>Locate your nearest store in India</span>
                </span>
                <span className="relative grid h-10 w-10 shrink-0 place-items-center bg-white text-[var(--nt-navy)]">
                  <Icon name="arrow" className="h-5 w-5" />
                </span>
              </a>
            </div>
          </section>

          {/* ---------- 9. Store details ---------- */}
          <section aria-label="Store details" className={`${sheet} text-[var(--nt-ink)]`}>
            <Ruler />
            <div className="p-5">
              <SectionTitle>Store details</SectionTitle>
              <p className={`${T_CAPS} mt-4 text-[var(--nt-mid)]`}>You shopped at</p>
              <p className="nt-bold mt-1 text-[16px] uppercase tracking-[0.06em] text-[var(--nt-navy)]">{store.name}</p>
              <p className={`mt-2 flex items-start gap-2.5 ${T_BODY} text-[var(--nt-slate)]`}>
                <Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--nt-navy)]" />
                {store.address}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${store.name}, ${store.address}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nt-bold flex items-center justify-center gap-2 bg-[var(--nt-navy)] py-3.5 text-[12px] uppercase tracking-[0.14em] text-white active:bg-[var(--nt-deep)]"
                >
                  <Icon name="directions" className="h-4 w-4" />
                  Directions
                </a>
                <a href={`tel:${store.phone}`} className={`nt-bold flex items-center justify-center gap-2 border border-[var(--nt-navy)] py-3.5 text-[12px] uppercase tracking-[0.14em] text-[var(--nt-navy)] ${pressInvert}`}>
                  <Icon name="call" className="h-4 w-4" />
                  Call store
                </a>
              </div>

              <div className="mt-4 border border-[var(--nt-line)]">
                <a href={`mailto:${store.email}`} className="flex items-center justify-between gap-3 border-b border-[var(--nt-line)] p-3.5 active:bg-[var(--nt-mist)]">
                  <span className="flex min-w-0 items-center gap-3">
                    <Icon name="mail" className="h-4 w-4 shrink-0 text-[var(--nt-navy)]" />
                    <span className="min-w-0">
                      <span className={`block ${T_SMALL} text-[var(--nt-slate)]`}>Email support</span>
                      <span className={`${T_LABEL} block truncate`}>{store.email}</span>
                    </span>
                  </span>
                  <Icon name="arrow" className="h-4 w-4 shrink-0 text-[var(--nt-navy)]" />
                </a>

                <a href={`tel:${store.phone}`} className="flex items-center justify-between gap-3 border-b border-[var(--nt-line)] p-3.5 active:bg-[var(--nt-mist)]">
                  <span className="flex min-w-0 items-center gap-3">
                    <Icon name="phone" className="h-4 w-4 shrink-0 text-[var(--nt-navy)]" />
                    <span className="min-w-0">
                      <span className={`block ${T_SMALL} text-[var(--nt-slate)]`}>Store phone</span>
                      <span className={`${T_LABEL} block truncate tabular-nums`}>{store.phone}</span>
                    </span>
                  </span>
                  <Icon name="arrow" className="h-4 w-4 shrink-0 text-[var(--nt-navy)]" />
                </a>

                <div className="p-3.5">
                  <p className={`flex items-center gap-1.5 ${T_SMALL} text-[var(--nt-slate)]`}>
                    <Icon name="user" className="h-3.5 w-3.5" /> Sales associate
                  </p>
                  <p className={`${T_LABEL} mt-1`}>{store.associate}</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ---------- 10. Closing: waves, thank you, registered office ---------- */}
        <footer ref={footerRef} className="mt-10">
          <div className="nt-grain relative overflow-hidden bg-[var(--nt-abyss)] text-white" style={{ background: "linear-gradient(180deg,#0B2A4A 0%,#071B31 100%)" }}>
            <div aria-hidden="true" className="relative h-20 overflow-hidden">
              <div className="nt-wave-b absolute inset-x-0 top-0 w-[200%]">
                <Waves lines={4} gap={14} width={800} stroke="rgba(255,255,255,0.1)" className="h-20 w-full" />
              </div>
              <div className="nt-wave-a absolute inset-x-0 top-3 w-[200%]">
                <Waves lines={3} gap={14} width={800} stroke="rgba(255,255,255,0.2)" className="h-16 w-full" />
              </div>
            </div>

            <div className="relative px-5 pb-7 pt-2">
              <BrandImage
                src={logoSrc}
                alt="NAUTICA"
                width={320}
                height={80}
                className="h-7 w-auto max-w-[55%] object-contain object-left brightness-0 invert"
                fallbackClassName="nt-bold inline-block text-[24px] uppercase leading-none tracking-[0.28em] text-white"
              />
              <h2 className={`${T_TITLE} mt-6`}>Thank you</h2>
              <p className={`mt-1.5 ${T_BODY} text-[var(--nt-fog)]`}>For shopping with us. See you in store soon.</p>

              <div className="mt-5 border border-white/20 p-4">
                <h3 className={`${T_CAPS} nt-bold text-white`}>Registered office</h3>
                <p className={`mt-1.5 ${T_SMALL} text-white/75`}>{data.registeredOffice}</p>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  aria-label="Back to top"
                  className={`nt-bold flex items-center gap-1.5 border border-white px-4 py-2.5 text-[12px] uppercase tracking-[0.14em] text-white active:bg-white active:text-[var(--nt-navy)] ${focusRing}`}
                >
                  Top <Icon name="arrow" className="h-3.5 w-3.5 -rotate-90" />
                </button>
              </div>
            </div>
          </div>

          <div className={`flex items-center justify-center gap-2.5 bg-white px-5 py-4 ${T_CAPS} text-[var(--nt-slate)]`}>
            <span>Powered by</span>
            <BrandImage src={rdepLogoSrc} alt="rdep" width={240} height={80} className="h-7 w-auto" fallbackClassName="text-lg font-bold tracking-tight text-[var(--nt-navy)]" />
          </div>
        </footer>
      </main>

      {/* ---------------------------- Floating dock ---------------------------- */}
      {passed && !footerInView && !modal && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center">
          <div style={zoomStyle(scale)} className="w-[400px] px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            <div className="nt-dock pointer-events-auto flex items-center justify-between gap-3 border border-white/25 bg-[#0B2A4A] py-2 pl-4 pr-2 text-white shadow-[0_20px_36px_-12px_rgba(7,27,49,0.85)] backdrop-blur-md">
              <div className="min-w-0">
                <p className={`${T_CAPS} leading-none text-[var(--nt-fog)]`}>Total paid</p>
                <p className={`${T_AMOUNT} mt-1.5 leading-none`}>₹{inr(t.total)}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {actions.map((a) => (
                  <button key={a.label} type="button" onClick={a.onClick} aria-label={a.label} className={`grid h-11 w-11 place-items-center border border-white/30 text-white active:bg-white active:text-[var(--nt-navy)] ${focusRing}`}>
                    <Icon name={a.icon} className="h-[18px] w-[18px]" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------- Transaction History Popup ---------------------------- */}
      {modal === "history" && (
        <Modal title="Transaction history" onClose={closeModal} scale={scale}>
          <div className="mb-4 flex items-center justify-between border border-[var(--nt-line)] p-4">
            <div>
              <p className={`${T_CAPS} text-[var(--nt-slate)]`}>Total receipts</p>
              <p className={`${T_LABEL} mt-1 text-[var(--nt-ink)]`}>{history.length} recorded</p>
            </div>
            <div className="text-right">
              <p className={`${T_CAPS} text-[var(--nt-slate)]`}>Viewing</p>
              <p className={`${T_LABEL} mt-1 tabular-nums text-[var(--nt-ink)]`}>#{data.invoiceNo.slice(-4)}</p>
            </div>
          </div>

          <ol className="space-y-2.5">
            {history.map((h) => (
              <li key={h.invoiceNo}>
                <div
                  className={`flex items-center justify-between gap-3 border p-4 transition-colors ${
                    h.current ? "border-[var(--nt-navy)] bg-[var(--nt-navy)] text-white" : "border-[var(--nt-line)] bg-white text-[var(--nt-ink)] [@media(hover:hover)]:hover:border-[var(--nt-navy)]"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`${T_LABEL} tabular-nums`}>No. {h.invoiceNo}</span>
                      {h.current && <span className="nt-bold bg-white px-1.5 py-0.5 text-[12px] uppercase tracking-[0.1em] text-[var(--nt-navy)]">Current</span>}
                    </div>
                    <p className={`mt-1 truncate ${T_SMALL} ${h.current ? "text-white/75" : "text-[var(--nt-slate)]"}`}>
                      {h.date} &middot; {h.storeName}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <span className={`${T_AMOUNT} block`}>₹{inr(h.amount)}</span>
                      <span className={`block ${T_SMALL} ${h.current ? "text-white/70" : "text-[var(--nt-slate)]"}`}>
                        {h.items} {h.items === 1 ? "piece" : "pieces"}
                      </span>
                    </div>

                    {!h.current && (
                      <button
                        type="button"
                        onClick={() => {
                          closeModal();
                          onSelect(h.invoiceNo);
                        }}
                        aria-label={`Open receipt ${h.invoiceNo}`}
                        className="grid h-10 w-10 shrink-0 place-items-center bg-[var(--nt-navy)] text-white"
                      >
                        <Icon name="arrow" className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Modal>
      )}

      {/* ---------------------------- QR Code Popup ---------------------------- */}
      {modal === "qr" && (
        <Modal title="Receipt QR code" onClose={closeModal} scale={scale}>
          <div className="flex flex-col items-center py-2 text-center">
            <div className="mb-5 flex h-52 w-52 items-center justify-center border-2 border-[var(--nt-navy)] bg-white p-4">
              {qrSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrSrc} alt="Receipt QR code" className="h-full w-full object-contain" />
              ) : (
                <PlaceholderQR seed={data.invoiceNo} />
              )}
            </div>
            <p className={`${T_LABEL} tabular-nums text-[var(--nt-ink)]`}>Invoice #{data.invoiceNo}</p>
            <p className={`mt-1 max-w-[280px] ${T_BODY}`}>Scan this code at the store counter for instant returns or inquiries.</p>
          </div>
        </Modal>
      )}

      {/* ---------------------------- Email Popup ---------------------------- */}
      {modal === "email" && (
        <Modal title="Email this receipt" onClose={closeModal} scale={scale}>
          <form
            className="space-y-5"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!emailOk(email)) {
                setEmailErr("Enter a valid email address, like name@example.com.");
                return;
              }
              setEmailErr("");
              onSendEmail?.(email, data);
              setSentTo(email);
            }}
          >
            <label className="block">
              <span className={fieldLabel}>Email address</span>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setSentTo("");
                  setEmailErr("");
                  setEmail(e.target.value);
                }}
                className={fieldInput}
                autoComplete="email"
                aria-invalid={!!emailErr}
              />
              {emailErr && (
                <span role="alert" className={`${T_LABEL} mt-1.5 block text-[var(--nt-signal)]`}>
                  {emailErr}
                </span>
              )}
            </label>
            <button type="submit" className={solidBtn}>
              Send receipt
            </button>
            <p aria-live="polite" className={sentTo ? `${T_LABEL} flex items-center justify-center gap-1.5 text-[var(--nt-navy)]` : "sr-only"}>
              {sentTo && (
                <>
                  <Icon name="check" className="h-4 w-4" /> Receipt sent to {sentTo}
                </>
              )}
            </p>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* --------------------------------- main ------------------------------------------ */
export default function NauticaReceipt({ data, receipts, onSelectReceipt, ...rest }: NauticaReceiptProps) {
  const list = useMemo(() => {
    const base = receipts ?? (data ? [data] : sampleNauticaReceipts);
    const merged = data && !base.some((r) => r.invoiceNo === data.invoiceNo) ? [data, ...base] : base;
    return [...merged].sort((a, b) => dateValue(b.date) - dateValue(a.date));
  }, [data, receipts]);

  const [currentId, setCurrentId] = useState(data?.invoiceNo ?? list[0].invoiceNo);
  const current = list.find((r) => r.invoiceNo === currentId) ?? list[0];

  const history = useMemo<HistoryRow[]>(
    () =>
      list.map((r) => {
        const t = totalsOf(r);
        return {
          invoiceNo: r.invoiceNo,
          date: r.date.split(" ")[0],
          storeName: r.store.name,
          amount: t.total,
          items: t.pieces,
          current: r.invoiceNo === current.invoiceNo,
        };
      }),
    [list, current.invoiceNo],
  );

  const select = useCallback(
    (invoiceNo: string) => {
      setCurrentId(invoiceNo);
      onSelectReceipt?.(invoiceNo);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [onSelectReceipt],
  );

  return <ReceiptView key={current.invoiceNo} data={current} history={history} onSelect={select} {...rest} />;
}
