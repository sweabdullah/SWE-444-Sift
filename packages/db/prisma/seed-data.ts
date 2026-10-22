/**
 * Development seed data (SFT-11 / T-7). Every record is documented in ../SEED.md.
 *
 * Every figure below was read from the bank's official page or fee schedule on
 * VERIFIED_AT (2026-10-21). The URL each figure came from is the card's `sourceId`
 * unless `figureSources` names a different source. A figure the page does not state
 * is `null` (NULL is never 0). Nothing here is inferred.
 *
 * The only invented values are the dev fixtures that cannot come from a bank page:
 * users, the crawl run counters, and the OLD value of the approved annual-fee change
 * (marked SYNTHETIC below). They are labelled as such in SEED.md.
 */
import type { CardNetwork, CardStatus, RewardType, SpendingCategory } from "@prisma/client";

export const VERIFIED_AT = new Date("2026-10-21T09:00:00.000Z");

// ─── Banks ──────────────────────────────────────────────────────────────────

export interface SeedBank {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  homepageUrl: string;
  entryUrls: string[];
}

export const banks: SeedBank[] = [
  {
    id: "bank_snb",
    slug: "snb",
    nameAr: "البنك الأهلي السعودي",
    nameEn: "Saudi National Bank (SNB)",
    homepageUrl: "https://www.alahli.com/",
    entryUrls: [
      "https://www.alahli.com/en/pages/personal-banking/credit-cards",
      "https://www.alahli.com/ar/pages/personal-banking/credit-cards",
    ],
  },
  {
    id: "bank_riyad",
    slug: "riyad-bank",
    nameAr: "بنك الرياض",
    nameEn: "Riyad Bank",
    homepageUrl: "https://www.riyadbank.com/",
    entryUrls: [
      "https://www.riyadbank.com/personal-banking/credit-cards",
      "https://www.riyadbank.com/ar/personal-banking/credit-cards",
    ],
  },
  {
    id: "bank_sab",
    slug: "sab",
    nameAr: "البنك السعودي الأول",
    nameEn: "Saudi Awwal Bank (SAB)",
    homepageUrl: "https://www.sab.com/",
    entryUrls: [
      "https://www.sab.com/en/personal/compare-credit-cards/",
      "https://www.sab.com/ar/personal/compare-credit-cards/",
    ],
  },
  {
    id: "bank_enbd_ksa",
    slug: "emirates-nbd-ksa",
    nameAr: "بنك الإمارات دبي الوطني - المملكة العربية السعودية",
    nameEn: "Emirates NBD KSA",
    homepageUrl: "https://www.emiratesnbd.com.sa/",
    entryUrls: [
      "https://www.emiratesnbd.com.sa/en/cards/credit-cards",
      "https://www.emiratesnbd.com.sa/ar/cards/credit-cards",
    ],
  },
];

// ─── Sources (one per fetched official document) ────────────────────────────

export interface SeedSource {
  id: string;
  bankId: string;
  url: string;
  sourceType: "html" | "pdf";
}

export const sources: SeedSource[] = [
  // SNB
  {
    id: "src_snb_cashback",
    bankId: "bank_snb",
    sourceType: "html",
    url: "https://www.alahli.com/en/pages/personal-banking/credit-cards/alahli-cashback-credit-card",
  },
  {
    id: "src_snb_cashback_premium",
    bankId: "bank_snb",
    sourceType: "html",
    url: "https://www.alahli.com/en/pages/personal-banking/credit-cards/alahli-cashback-premium-credit-card",
  },
  {
    id: "src_snb_alfursan_platinum",
    bankId: "bank_snb",
    sourceType: "html",
    url: "https://www.alahli.com/en/pages/personal-banking/credit-cards/alfursan-credit-card-platinum",
  },
  {
    id: "src_snb_titanium",
    bankId: "bank_snb",
    sourceType: "html",
    url: "https://www.alahli.com/en/pages/personal-banking/credit-cards/alahli-credit-card-titanium",
  },
  {
    id: "src_snb_fees_pdf",
    bankId: "bank_snb",
    sourceType: "pdf",
    url: "https://www.alahli.com/-/jssmedia/project/snb/snb-web/documents/2026/banking-fees-and-charges-06-may-26.pdf?view=1",
  },
  // Riyad Bank
  {
    id: "src_riyad_cashback_signature",
    bankId: "bank_riyad",
    sourceType: "html",
    url: "https://www.riyadbank.com/personal-banking/credit-cards/cashback-visa-signature",
  },
  {
    id: "src_riyad_titanium",
    bankId: "bank_riyad",
    sourceType: "html",
    url: "https://www.riyadbank.com/personal-banking/credit-cards/titanium-credit-card",
  },
  // SAB
  {
    id: "src_sab_cashback",
    bankId: "bank_sab",
    sourceType: "html",
    url: "https://www.sab.com/en/personal/compare-credit-cards/cashback-visa-credit-card/",
  },
  {
    id: "src_sab_cashback_fees",
    bankId: "bank_sab",
    sourceType: "html",
    url: "https://www.sab.com/en/personal/compare-credit-cards/cashback-visa-credit-card/fees-services/",
  },
  {
    id: "src_sab_my_card",
    bankId: "bank_sab",
    sourceType: "html",
    url: "https://www.sab.com/en/personal/compare-credit-cards/low-limit-credit-cards/sab-my-card-credit-card/",
  },
  // Emirates NBD KSA
  {
    id: "src_enbd_infinite",
    bankId: "bank_enbd_ksa",
    sourceType: "html",
    url: "https://www.emiratesnbd.com.sa/en/cards/credit-cards/infinite-credit-card",
  },
  {
    id: "src_enbd_fees",
    bankId: "bank_enbd_ksa",
    sourceType: "html",
    url: "https://www.emiratesnbd.com.sa/en/cards/credit-cards-fees",
  },
  {
    id: "src_enbd_platinum",
    bankId: "bank_enbd_ksa",
    sourceType: "html",
    url: "https://www.emiratesnbd.com.sa/en/cards/credit-cards/platinum-credit-card",
  },
  {
    id: "src_enbd_mazeed",
    bankId: "bank_enbd_ksa",
    sourceType: "html",
    url: "https://www.emiratesnbd.com.sa/en/cards/credit-cards/mazeed-platinum-credit-card",
  },
];

// ─── Cards ──────────────────────────────────────────────────────────────────

/** Decimal values are strings so 1.5 and 1.50 stay exact. null = not published. */
type Money = string | null;

export interface SeedFee {
  annualFee: Money;
  issuanceFee: Money;
  supplementaryCardFee: Money;
  fxMarkupPct: Money;
  cashAdvanceFee: Money;
  latePaymentFee: Money;
}

export interface SeedText {
  name: string;
  benefitsDescription: string | null;
  rewardConditions: string | null;
  eligibility: string | null;
  feeWaiverCondition: string | null;
}

export interface SeedTier {
  rewardType: RewardType;
  spendingCategory: SpendingCategory;
  rate: string;
  rateUnit: "percent" | "points_per_sar" | "miles_per_sar";
  cap: Money;
  capPeriod: "per_transaction" | "monthly" | "quarterly" | "yearly" | null;
  minSpend: Money;
  condition: { ar: string; en: string };
}

export interface SeedCard {
  id: string;
  bankId: string;
  canonicalUrl: string;
  normalisedName: string;
  status: CardStatus;
  rewardType: RewardType;
  network: CardNetwork | null;
  shariaCompliant: boolean | null;
  minMonthlyIncome: Money;
  /** The card's official page (card.source_id). */
  sourceId: string;
  /** Figures read from a different document than sourceId, keyed by card_field_source.field_name. */
  figureSources: Record<string, string>;
  consecutiveAbsences: number;
  publishedAt: Date | null;
  archivedAt: Date | null;
  fee: SeedFee;
  ar: SeedText;
  en: SeedText;
  tiers: SeedTier[];
}

const PUBLISHED_AT = new Date("2026-10-01T09:00:00.000Z");

export const cards: SeedCard[] = [
  // 1. SNB AlAhli Cashback — explicit 0 annual fee, 3 spend-band tiers.
  {
    id: "card_snb_cashback",
    bankId: "bank_snb",
    canonicalUrl:
      "https://www.alahli.com/en/pages/personal-banking/credit-cards/alahli-cashback-credit-card",
    normalisedName: "alahli cashback credit card",
    status: "published",
    rewardType: "cashback",
    network: "mastercard", // "Mastercard Cashback Credit Card from SNB"
    shariaCompliant: null, // not stated on the page
    minMonthlyIncome: null, // not stated
    sourceId: "src_snb_cashback",
    figureSources: {
      "fee.supplementary_card_fee": "src_snb_fees_pdf",
      "fee.fx_markup_pct": "src_snb_fees_pdf",
    },
    consecutiveAbsences: 0,
    publishedAt: PUBLISHED_AT,
    archivedAt: null,
    fee: {
      annualFee: "0", // page: "pay no annual card fees"; PDF: "First card free"
      issuanceFee: null,
      supplementaryCardFee: "0", // PDF "SNB Cashback Card — Supplementary Card Fees: Free"
      fxMarkupPct: "2", // PDF "Foreign Exchange Conversion Mark Up: 2% of the transaction amount"
      cashAdvanceFee: null, // published as "3%, max SAR 75" — not a flat SAR amount
      latePaymentFee: null, // not stated
    },
    en: {
      name: "AlAhli Cashback Credit Card",
      benefitsDescription:
        "Mastercard cashback card with no annual fee for the first card, travel and lifestyle benefits, and insurance benefits.",
      rewardConditions:
        "Cashback rate depends on total monthly purchases (retail, internet and cash advance inside and outside KSA). SADAD, cash transfers, cash withdrawals and e-wallet payments do not earn cashback. A 20% bonus on earned cashback applies to pickup and delivery apps, food delivery apps, groceries and hypermarkets, and international usage.",
      eligibility: null,
      feeWaiverCondition: "First card is free of annual fees; SAR 100 for a second card.",
    },
    ar: {
      name: "بطاقة كاش باك الأهلي الائتمانية",
      benefitsDescription:
        "بطاقة ماستركارد للاسترداد النقدي بدون رسوم سنوية للبطاقة الأولى، مع مزايا السفر وأسلوب الحياة ومزايا التأمين.",
      rewardConditions:
        "تعتمد نسبة الاسترداد النقدي على إجمالي المشتريات الشهرية (التجزئة والإنترنت والسحب النقدي داخل المملكة وخارجها). لا تحتسب عمليات سداد والتحويلات النقدية والسحب النقدي ومدفوعات المحافظ الإلكترونية. يُضاف 20% على الاسترداد النقدي لتطبيقات التوصيل والاستلام وتوصيل الطعام والبقالة والهايبرماركت والاستخدام الدولي.",
      eligibility: null,
      feeWaiverCondition: "البطاقة الأولى معفاة من الرسوم السنوية؛ 100 ريال للبطاقة الثانية.",
    },
    tiers: [
      {
        rewardType: "cashback",
        spendingCategory: "general",
        rate: "0.5",
        rateUnit: "percent",
        cap: null,
        capPeriod: null,
        minSpend: "500",
        condition: {
          en: "Total monthly purchases of SAR 500 – 4,999.",
          ar: "إجمالي مشتريات شهرية من 500 إلى 4,999 ريال.",
        },
      },
      {
        rewardType: "cashback",
        spendingCategory: "general",
        rate: "1",
        rateUnit: "percent",
        cap: null,
        capPeriod: null,
        minSpend: "5000",
        condition: {
          en: "Total monthly purchases of SAR 5,000 – 9,999.",
          ar: "إجمالي مشتريات شهرية من 5,000 إلى 9,999 ريال.",
        },
      },
      {
        rewardType: "cashback",
        spendingCategory: "general",
        rate: "2",
        rateUnit: "percent",
        cap: "200",
        capPeriod: "monthly",
        minSpend: "10000",
        condition: {
          en: "Total monthly purchases of SAR 10,000 or more; cashback capped at SAR 200 per card per month.",
          ar: "إجمالي مشتريات شهرية 10,000 ريال أو أكثر؛ بحد أقصى 200 ريال استرداد نقدي للبطاقة شهريًا.",
        },
      },
    ],
  },

  // 2. SNB AlAhli Cashback Premium — category tiers with monthly caps.
  {
    id: "card_snb_cashback_premium",
    bankId: "bank_snb",
    canonicalUrl:
      "https://www.alahli.com/en/pages/personal-banking/credit-cards/alahli-cashback-premium-credit-card",
    normalisedName: "alahli cashback premium credit card",
    status: "published",
    rewardType: "cashback",
    network: null, // the page does not name the network
    shariaCompliant: null,
    minMonthlyIncome: null,
    sourceId: "src_snb_cashback_premium",
    figureSources: {
      "fee.annual_fee": "src_snb_fees_pdf",
      "fee.fx_markup_pct": "src_snb_fees_pdf",
    },
    consecutiveAbsences: 0,
    publishedAt: PUBLISHED_AT,
    archivedAt: null,
    fee: {
      annualFee: "200", // PDF "SNB Cashback Card Premium — Annual Fees 200"
      issuanceFee: null,
      supplementaryCardFee: null,
      fxMarkupPct: "2",
      cashAdvanceFee: null, // "3%, max SAR 75"
      latePaymentFee: null,
    },
    en: {
      name: "AlAhli Cashback Premium Credit Card",
      benefitsDescription:
        "Up to 11% cashback on everyday spending, with travel, lifestyle and insurance benefits. Overall monthly cashback is unlimited but cannot exceed the card limit.",
      rewardConditions:
        "Category rates apply by merchant category code (MCC). Gas stations 11% (cap SAR 100/month); restaurants and food delivery, groceries and pharmacies 5% each (cap SAR 200/month each); international spend except Euro 2% and all other spend 0.7% with no cap.",
      eligibility: null,
      feeWaiverCondition: null,
    },
    ar: {
      name: "بطاقة الأهلي الائتمانية للاسترداد النقدي الفئة المميزة",
      benefitsDescription:
        "استرداد نقدي يصل إلى 11% على المصروفات اليومية، مع مزايا السفر وأسلوب الحياة والتأمين. إجمالي الاسترداد الشهري غير محدود بشرط ألا يتجاوز حد البطاقة.",
      rewardConditions:
        "تطبق النسب حسب رمز فئة التاجر (MCC). محطات الوقود 11% (بحد 100 ريال شهريًا)؛ المطاعم وتوصيل الطعام والبقالة والصيدليات 5% لكل فئة (بحد 200 ريال شهريًا لكل فئة)؛ الإنفاق الدولي عدا اليورو 2% وباقي الإنفاق 0.7% بدون حد.",
      eligibility: null,
      feeWaiverCondition: null,
    },
    tiers: [
      {
        rewardType: "cashback",
        spendingCategory: "fuel",
        rate: "11",
        rateUnit: "percent",
        cap: "100",
        capPeriod: "monthly",
        minSpend: null,
        condition: {
          en: "Gas stations (MCC 5541, 5542, 5172).",
          ar: "محطات الوقود (MCC 5541، 5542، 5172).",
        },
      },
      {
        rewardType: "cashback",
        spendingCategory: "dining",
        rate: "5",
        rateUnit: "percent",
        cap: "200",
        capPeriod: "monthly",
        minSpend: null,
        condition: {
          en: "Restaurants and food delivery (MCC 5812, 5813, 5814).",
          ar: "المطاعم وتوصيل الطعام (MCC 5812، 5813، 5814).",
        },
      },
      {
        rewardType: "cashback",
        spendingCategory: "groceries",
        rate: "5",
        rateUnit: "percent",
        cap: "200",
        capPeriod: "monthly",
        minSpend: null,
        condition: {
          en: "Grocery (MCC 5411, 5451, 5422).",
          ar: "البقالة (MCC 5411، 5451، 5422).",
        },
      },
      {
        rewardType: "cashback",
        spendingCategory: "healthcare",
        rate: "5",
        rateUnit: "percent",
        cap: "200",
        capPeriod: "monthly",
        minSpend: null,
        condition: { en: "Pharmacy (MCC 5912).", ar: "الصيدليات (MCC 5912)." },
      },
      {
        rewardType: "cashback",
        spendingCategory: "international",
        rate: "2",
        rateUnit: "percent",
        cap: null,
        capPeriod: null,
        minSpend: null,
        condition: {
          en: "International spend, except in Euro. Unlimited.",
          ar: "الإنفاق الدولي عدا اليورو. غير محدود.",
        },
      },
      {
        rewardType: "cashback",
        spendingCategory: "general",
        rate: "0.7",
        rateUnit: "percent",
        cap: null,
        capPeriod: null,
        minSpend: null,
        condition: { en: "All other purchases. Unlimited.", ar: "باقي المشتريات. غير محدود." },
      },
    ],
  },

  // 3. SNB AlFursan Platinum — miles; 3 consecutive absences => withdrawal request.
  {
    id: "card_snb_alfursan_platinum",
    bankId: "bank_snb",
    canonicalUrl:
      "https://www.alahli.com/en/pages/personal-banking/credit-cards/alfursan-credit-card-platinum",
    normalisedName: "al fursan credit card platinum",
    status: "published",
    rewardType: "miles",
    network: "visa", // earn table: "Visa Platinum"
    shariaCompliant: null,
    minMonthlyIncome: null,
    sourceId: "src_snb_alfursan_platinum",
    figureSources: {
      "fee.annual_fee": "src_snb_fees_pdf",
      "fee.fx_markup_pct": "src_snb_fees_pdf",
    },
    consecutiveAbsences: 3,
    publishedAt: PUBLISHED_AT,
    archivedAt: null,
    fee: {
      annualFee: "350", // PDF "AlFursan Credit Card — Annual Fees — Visa Platinum 350"
      issuanceFee: null,
      supplementaryCardFee: null, // not stated in the AlFursan block
      fxMarkupPct: "2", // PDF "International Transaction Fees: 2% of the transaction amount"
      cashAdvanceFee: null, // "3%, max SAR 75"
      latePaymentFee: null,
    },
    en: {
      name: "Al Fursan Credit Card - Platinum",
      benefitsDescription:
        "Travel card that earns Alfursan miles, deposited automatically into your Alfursan membership. Includes lounge access, travel and lifestyle benefits, and insurance benefits.",
      rewardConditions:
        "1 Alfursan mile for every SAR 3 spent, on both local and international purchases.",
      eligibility: null,
      feeWaiverCondition: null,
    },
    ar: {
      name: "بطاقة الفرسان الائتمانية - بلاتينيوم",
      benefitsDescription:
        "بطاقة للسفر تكسب أميال الفرسان وتودع تلقائيًا في عضوية الفرسان. تشمل دخول صالات المطارات ومزايا السفر وأسلوب الحياة ومزايا التأمين.",
      rewardConditions: "ميل فرسان واحد لكل 3 ريالات تنفق، على المشتريات المحلية والدولية.",
      eligibility: null,
      feeWaiverCondition: null,
    },
    tiers: [
      {
        rewardType: "miles",
        spendingCategory: "general",
        rate: "0.3333",
        rateUnit: "miles_per_sar",
        cap: null,
        capPeriod: null,
        minSpend: null,
        condition: {
          en: "1 mile per SAR 3, local and international purchases.",
          ar: "ميل واحد لكل 3 ريالات، للمشتريات المحلية والدولية.",
        },
      },
    ],
  },

  // 4. Riyad Bank Cashback Visa Signature Islamic — 15 tiers (3 spend bands x 5 categories).
  {
    id: "card_riyad_cashback_signature",
    bankId: "bank_riyad",
    canonicalUrl: "https://www.riyadbank.com/personal-banking/credit-cards/cashback-visa-signature",
    normalisedName: "cashback visa signature islamic credit card",
    status: "published",
    rewardType: "cashback",
    network: "visa",
    shariaCompliant: true, // the bank names the product "Cashback Visa Signature Islamic Credit Card"
    minMonthlyIncome: null,
    sourceId: "src_riyad_cashback_signature",
    figureSources: {},
    consecutiveAbsences: 0,
    publishedAt: PUBLISHED_AT,
    archivedAt: null,
    fee: {
      annualFee: "500",
      issuanceFee: null,
      supplementaryCardFee: "0", // "Annual Membership Fee (Supplementary Credit Card): Free"
      fxMarkupPct: "2", // "Additional fee on international transactions 2.0%"
      cashAdvanceFee: null, // "3% below SAR 2,500, max SAR 75"
      latePaymentFee: "50",
    },
    en: {
      name: "Cashback Visa Signature Islamic Credit Card",
      benefitsDescription:
        "Up to 10% cashback on selected categories, 12 complimentary airport lounge visits a year through Visa Airport Companion, and travel offers.",
      rewardConditions:
        "Rate depends on overall monthly spend (all eligible transactions in the billing month) and applies only to eligible transactions in the cashback categories: groceries, dining, fuel/taxis, entertainment and pharmacies. Caps are per category per month.",
      eligibility:
        "18 years of age or older, and compliant with Riyad Bank's and SIMAH's policies for credit card issuance.",
      feeWaiverCondition: null,
    },
    ar: {
      name: "بطاقة فيزا سيجنتشر الائتمانية الإسلامية باسترداد نقدي",
      benefitsDescription:
        "استرداد نقدي يصل إلى 10% على فئات مختارة، و12 زيارة مجانية سنويًا لصالات المطارات عبر Visa Airport Companion، وعروض سفر.",
      rewardConditions:
        "تعتمد النسبة على إجمالي الإنفاق الشهري (جميع العمليات المؤهلة في شهر الفوترة) وتطبق فقط على العمليات المؤهلة في فئات الاسترداد: البقالة والمطاعم والوقود/سيارات الأجرة والترفيه والصيدليات. الحد الأقصى لكل فئة شهريًا.",
      eligibility:
        "العمر 18 سنة أو أكثر، والالتزام بسياسات بنك الرياض وسمة لإصدار البطاقات الائتمانية.",
      feeWaiverCondition: null,
    },
    tiers: riyadCashbackTiers(),
  },

  // 5. Riyad Bank Titanium Islamic — explicitly "Shari'a compliant card"; in the user's shortlist.
  {
    id: "card_riyad_titanium",
    bankId: "bank_riyad",
    canonicalUrl: "https://www.riyadbank.com/personal-banking/credit-cards/titanium-credit-card",
    normalisedName: "titanium islamic credit card",
    status: "published",
    rewardType: "points", // Hassad Rewards; the earn rate is not published, so no tier rows
    network: "mastercard",
    shariaCompliant: true, // "Shari'a compliant card"
    minMonthlyIncome: null,
    sourceId: "src_riyad_titanium",
    figureSources: {},
    consecutiveAbsences: 0,
    publishedAt: PUBLISHED_AT,
    archivedAt: null,
    fee: {
      annualFee: "290", // "Annual Membership Fee SAR 290" (effective 19/07/2025)
      issuanceFee: null,
      supplementaryCardFee: "0",
      fxMarkupPct: "2",
      cashAdvanceFee: null,
      latePaymentFee: "50",
    },
    en: {
      name: "Titanium Islamic Credit Card",
      benefitsDescription:
        "Shari'a compliant Mastercard Titanium card with free access to selected regional airport lounges, free additional cards for family members, and automatic enrolment in the Hassad Rewards Program (20 points on activation, 400 bonus points when spending SAR 5,000 in the first three months).",
      rewardConditions: null,
      eligibility:
        "18 years of age or older, and compliant with Riyad Bank's and SIMAH's policies for credit card issuance.",
      feeWaiverCondition: null,
    },
    ar: {
      name: "بطاقة تيتانيوم الائتمانية الإسلامية",
      benefitsDescription:
        "بطاقة ماستركارد تيتانيوم متوافقة مع أحكام الشريعة، مع دخول مجاني لصالات مطارات إقليمية مختارة، وبطاقات إضافية مجانية لأفراد العائلة، وتسجيل تلقائي في برنامج حصاد (20 نقطة عند التفعيل و400 نقطة إضافية عند إنفاق 5,000 ريال خلال الأشهر الثلاثة الأولى).",
      rewardConditions: null,
      eligibility:
        "العمر 18 سنة أو أكثر، والالتزام بسياسات بنك الرياض وسمة لإصدار البطاقات الائتمانية.",
      feeWaiverCondition: null,
    },
    tiers: [],
  },

  // 6. SAB Visa Cashback — 6 of 7 fee fields published, three of them explicit 0.
  {
    id: "card_sab_cashback",
    bankId: "bank_sab",
    canonicalUrl: "https://www.sab.com/en/personal/compare-credit-cards/cashback-visa-credit-card/",
    normalisedName: "sab visa cashback credit card",
    status: "published",
    rewardType: "cashback",
    network: "visa",
    shariaCompliant: null,
    minMonthlyIncome: null,
    sourceId: "src_sab_cashback",
    figureSources: {
      "fee.annual_fee": "src_sab_cashback_fees",
      "fee.issuance_fee": "src_sab_cashback_fees",
      "fee.supplementary_card_fee": "src_sab_cashback_fees",
      "fee.fx_markup_pct": "src_sab_cashback_fees",
      "fee.late_payment_fee": "src_sab_cashback_fees",
    },
    consecutiveAbsences: 0,
    publishedAt: PUBLISHED_AT,
    archivedAt: null,
    fee: {
      annualFee: "0", // "Annual Fee Free"; "FREE for Life Card!"
      issuanceFee: "0", // "Issuance fee Free"
      supplementaryCardFee: "0",
      fxMarkupPct: "2", // "International Transaction Fee 2.00%"
      cashAdvanceFee: null, // "3% below SAR 2,500, max SAR 75"
      latePaymentFee: "50",
    },
    en: {
      name: "SAB Visa Cashback Credit Card",
      benefitsDescription:
        "Free for life. 1% unlimited cashback on domestic spend, 2% unlimited cashback on international spend, and up to 10% cashback in three preferred categories.",
      rewardConditions:
        "Category cashback applies once overall monthly spend reaches SAR 2,000 (all eligible transactions in the billing month). Category caps: dining SAR 200, supermarket SAR 100, fuel SAR 100. Other domestic (1%) and international (2%) cashback is unlimited.",
      eligibility: null,
      feeWaiverCondition: "Free for life.",
    },
    ar: {
      name: "بطاقة الأول الائتمانية للاسترداد النقدي",
      benefitsDescription:
        "مجانية مدى الحياة. استرداد نقدي غير محدود 1% على الإنفاق المحلي و2% على الإنفاق الدولي، واسترداد يصل إلى 10% في ثلاث فئات مفضلة.",
      rewardConditions:
        "يطبق الاسترداد على الفئات عند بلوغ إجمالي الإنفاق الشهري 2,000 ريال (جميع العمليات المؤهلة في شهر الفوترة). حدود الفئات: المطاعم 200 ريال، السوبرماركت 100 ريال، الوقود 100 ريال. الاسترداد المحلي (1%) والدولي (2%) غير محدود.",
      eligibility: null,
      feeWaiverCondition: "مجانية مدى الحياة.",
    },
    tiers: sabCashbackTiers(),
  },

  // 7. SAB "My Card" — Shariah compliant, explicit "No minimum income required" (0), no rewards.
  {
    id: "card_sab_my_card",
    bankId: "bank_sab",
    canonicalUrl:
      "https://www.sab.com/en/personal/compare-credit-cards/low-limit-credit-cards/sab-my-card-credit-card/",
    normalisedName: "sab visa my card credit card",
    status: "published",
    rewardType: "none", // "Customers cannot earn ICSAB+ points on purchases made using the My Card card"
    network: "visa",
    shariaCompliant: true, // "SAB's Shariah compliant 'My Card' Credit Card"
    minMonthlyIncome: "0", // "No minimum income required"
    sourceId: "src_sab_my_card",
    figureSources: {},
    consecutiveAbsences: 0,
    publishedAt: PUBLISHED_AT,
    archivedAt: null,
    fee: {
      annualFee: null, // not stated
      issuanceFee: "50", // "One-time processing fee SAR 50"
      supplementaryCardFee: "0", // "a free supplementary SAB Credit Card"
      fxMarkupPct: null,
      cashAdvanceFee: null, // cash withdrawals are not available on this card
      latePaymentFee: null,
    },
    en: {
      name: 'SAB Visa "My Card" Credit Card',
      benefitsDescription:
        "Shariah compliant prepaid-style credit card: you control spending by transferring money from your account to the card. Credit limit SAR 50. Cash withdrawals are not available and purchases do not earn ICSAB+ points.",
      rewardConditions: null,
      eligibility:
        "No employment confirmation letter, employment period verification or bank statement required. No minimum income required.",
      feeWaiverCondition: null,
    },
    ar: {
      name: 'بطاقة الأول فيزا الائتمانية "بطاقتي"',
      benefitsDescription:
        "بطاقة ائتمانية متوافقة مع أحكام الشريعة تتحكم في إنفاقها بتحويل المبلغ من حسابك إلى البطاقة. حد ائتماني 50 ريال. لا يتاح السحب النقدي ولا تكسب المشتريات نقاط ICSAB+.",
      rewardConditions: null,
      eligibility:
        "لا يشترط خطاب تعريف بالراتب أو التحقق من مدة الخدمة أو كشف حساب. لا يشترط حد أدنى للدخل.",
      feeWaiverCondition: null,
    },
    tiers: [],
  },

  // 8. Emirates NBD KSA Infinite — positive minimum income.
  {
    id: "card_enbd_infinite",
    bankId: "bank_enbd_ksa",
    canonicalUrl: "https://www.emiratesnbd.com.sa/en/cards/credit-cards/infinite-credit-card",
    normalisedName: "infinite credit card",
    status: "published",
    rewardType: "points",
    network: "visa",
    shariaCompliant: null,
    // Card page: "Minimum Income required for Infinite cards is 20,000" (last modified 28 Sep 2026).
    // The credit-cards listing page says 30,000. The card's own page is used; see SEED.md.
    minMonthlyIncome: "20000",
    sourceId: "src_enbd_infinite",
    figureSources: {
      "fee.supplementary_card_fee": "src_enbd_fees",
      "fee.fx_markup_pct": "src_enbd_fees",
      "fee.late_payment_fee": "src_enbd_fees",
    },
    consecutiveAbsences: 0,
    publishedAt: PUBLISHED_AT,
    archivedAt: null,
    fee: {
      annualFee: "700",
      issuanceFee: null,
      supplementaryCardFee: "0", // "Supplementary Card (up to 5 cards) Free"
      fxMarkupPct: "2", // "Foreign Currency Transaction Fee 2.00 %"
      cashAdvanceFee: null, // "3% of the withdrawal amount with a maximum of 75"
      latePaymentFee: "50",
    },
    en: {
      name: "Infinite Credit Card",
      benefitsDescription:
        "Visa Infinite card with Plus Points rewards, unlimited airport lounge visits plus one guest per visit, and selected UAE offers.",
      rewardConditions:
        "1 Plus Point for every SAR 1 spent, on all spends except SADAD, cash withdrawals / quasi-cash transactions and wallet payments. Redeem from 10,000 points.",
      eligibility:
        "Minimum income SAR 20,000 for Infinite cards. Card tier and credit limit are subject to the bank's internal policies and review of the customer's credit report.",
      feeWaiverCondition: "Free for the first year.",
    },
    ar: {
      name: "بطاقة إنفينيت الائتمانية",
      benefitsDescription:
        "بطاقة فيزا إنفينيت بنقاط بلس، مع زيارات غير محدودة لصالات المطارات مع ضيف واحد في كل زيارة، وعروض مختارة في الإمارات.",
      rewardConditions:
        "نقطة بلس واحدة لكل ريال، على جميع المشتريات عدا سداد والسحب النقدي والعمليات شبه النقدية ومدفوعات المحافظ. الاستبدال ابتداءً من 10,000 نقطة.",
      eligibility:
        "الحد الأدنى للدخل 20,000 ريال لبطاقات إنفينيت. فئة البطاقة والحد الائتماني يخضعان لسياسات البنك الداخلية ومراجعة التقرير الائتماني.",
      feeWaiverCondition: "مجانية للسنة الأولى.",
    },
    tiers: [
      {
        rewardType: "points",
        spendingCategory: "general",
        rate: "1",
        rateUnit: "points_per_sar",
        cap: null,
        capPeriod: null,
        minSpend: null,
        condition: {
          en: "All spends except SADAD, cash withdrawals / quasi-cash and wallet payments.",
          ar: "جميع المشتريات عدا سداد والسحب النقدي والعمليات شبه النقدية ومدفوعات المحافظ.",
        },
      },
    ],
  },

  // 9. ARCHIVED — SNB AlAhli Titanium. Real card; the archived status is a dev fixture.
  {
    id: "card_snb_titanium_archived",
    bankId: "bank_snb",
    canonicalUrl:
      "https://www.alahli.com/en/pages/personal-banking/credit-cards/alahli-credit-card-titanium",
    normalisedName: "alahli credit card titanium",
    status: "archived",
    rewardType: "points", // Lak Rewards; earn rate not on the page, so no tiers
    network: "mastercard", // PDF "MasterCard Titanium"
    shariaCompliant: null,
    minMonthlyIncome: null,
    sourceId: "src_snb_titanium",
    figureSources: {
      "fee.annual_fee": "src_snb_fees_pdf",
      "fee.supplementary_card_fee": "src_snb_fees_pdf",
      "fee.fx_markup_pct": "src_snb_fees_pdf",
    },
    consecutiveAbsences: 0,
    publishedAt: new Date("2026-06-01T09:00:00.000Z"),
    archivedAt: new Date("2026-10-15T09:00:00.000Z"),
    fee: {
      annualFee: "400", // PDF "Visa Basic | MasterCard Titanium 400"
      issuanceFee: null,
      supplementaryCardFee: "0", // PDF "Credit Cards — Supplementary Card Fees: Free"
      fxMarkupPct: "2",
      cashAdvanceFee: null,
      latePaymentFee: null,
    },
    en: {
      name: "AlAhli Credit Card - Titanium",
      benefitsDescription:
        "Earn Lak Rewards points on every purchase and spend them on travel, partner purchases or cashback. Travel, lifestyle and insurance benefits.",
      rewardConditions: null,
      eligibility: "An SNB current account; 21 years or older.",
      feeWaiverCondition: null,
    },
    ar: {
      name: "بطاقة الأهلي الائتمانية - تيتانيوم",
      benefitsDescription:
        "اكسب نقاط برنامج لك مع كل عملية شراء واستبدلها بالسفر أو المشتريات لدى الشركاء أو استرداد نقدي. مزايا السفر وأسلوب الحياة والتأمين.",
      rewardConditions: null,
      eligibility: "حساب جاري لدى البنك الأهلي السعودي؛ العمر 21 سنة أو أكثر.",
      feeWaiverCondition: null,
    },
    tiers: [],
  },
];

function riyadCashbackTiers(): SeedTier[] {
  const bands = [
    {
      rate: "5",
      cap: "100",
      minSpend: "2500",
      en: "SAR 2,500 – 7,499",
      ar: "من 2,500 إلى 7,499 ريال",
    },
    {
      rate: "7",
      cap: "150",
      minSpend: "7500",
      en: "SAR 7,500 – 14,999",
      ar: "من 7,500 إلى 14,999 ريال",
    },
    {
      rate: "10",
      cap: "200",
      minSpend: "15000",
      en: "SAR 15,000 or more",
      ar: "15,000 ريال أو أكثر",
    },
  ];
  const categories: { cat: SpendingCategory; en: string; ar: string }[] = [
    { cat: "groceries", en: "Groceries", ar: "البقالة" },
    { cat: "dining", en: "Dining", ar: "المطاعم" },
    { cat: "fuel", en: "Fuel / taxis", ar: "الوقود / سيارات الأجرة" },
    { cat: "entertainment", en: "Entertainment", ar: "الترفيه" },
    { cat: "healthcare", en: "Pharmacies", ar: "الصيدليات" },
  ];
  return bands.flatMap((b) =>
    categories.map((c) => ({
      rewardType: "cashback" as const,
      spendingCategory: c.cat,
      rate: b.rate,
      rateUnit: "percent" as const,
      cap: b.cap,
      capPeriod: "monthly" as const,
      minSpend: b.minSpend,
      condition: {
        en: `${c.en}, when overall monthly spend is ${b.en}. Cap SAR ${b.cap} per category per month.`,
        ar: `${c.ar}، عندما يكون إجمالي الإنفاق الشهري ${b.ar}. الحد ${b.cap} ريال لكل فئة شهريًا.`,
      },
    })),
  );
}

function sabCashbackTiers(): SeedTier[] {
  const bands = [
    { rate: "3", minSpend: "2000", en: "SAR 2,000 – 9,999", ar: "من 2,000 إلى 9,999 ريال" },
    { rate: "5", minSpend: "10000", en: "SAR 10,000 – 14,999", ar: "من 10,000 إلى 14,999 ريال" },
    { rate: "10", minSpend: "15000", en: "SAR 15,000 or more", ar: "15,000 ريال أو أكثر" },
  ];
  const categories: { cat: SpendingCategory; cap: string; en: string; ar: string }[] = [
    { cat: "dining", cap: "200", en: "Dining", ar: "المطاعم" },
    { cat: "groceries", cap: "100", en: "Supermarket", ar: "السوبرماركت" },
    { cat: "fuel", cap: "100", en: "Fuel", ar: "الوقود" },
  ];
  const categoryTiers: SeedTier[] = bands.flatMap((b) =>
    categories.map((c) => ({
      rewardType: "cashback" as const,
      spendingCategory: c.cat,
      rate: b.rate,
      rateUnit: "percent" as const,
      cap: c.cap,
      capPeriod: "monthly" as const,
      minSpend: b.minSpend,
      condition: {
        en: `${c.en}, when overall monthly spend is ${b.en}. Cap SAR ${c.cap}.`,
        ar: `${c.ar}، عندما يكون إجمالي الإنفاق الشهري ${b.ar}. الحد ${c.cap} ريال.`,
      },
    })),
  );
  return [
    ...categoryTiers,
    {
      rewardType: "cashback",
      spendingCategory: "general",
      rate: "1",
      rateUnit: "percent",
      cap: null,
      capPeriod: null,
      minSpend: null,
      condition: { en: "Other domestic spend. Unlimited.", ar: "باقي الإنفاق المحلي. غير محدود." },
    },
    {
      rewardType: "cashback",
      spendingCategory: "international",
      rate: "2",
      rateUnit: "percent",
      cap: null,
      capPeriod: null,
      minSpend: null,
      condition: { en: "International spend. Unlimited.", ar: "الإنفاق الدولي. غير محدود." },
    },
  ];
}

// ─── Users ──────────────────────────────────────────────────────────────────

/** DEV-ONLY password for both seeded users. Never use outside a local database. */
export const DEV_PASSWORD = "sift-dev-password";

export const users = [
  {
    id: "user_admin",
    email: "admin@sift.local",
    name: "Sift Admin (dev)",
    role: "admin" as const,
    locale: "en" as const,
    digestOptIn: false,
    unsubscribeToken: "seed-unsubscribe-admin",
  },
  {
    id: "user_registered",
    email: "user@sift.local",
    name: "Sift User (dev)",
    role: "user" as const,
    locale: "ar" as const,
    digestOptIn: true,
    unsubscribeToken: "seed-unsubscribe-user",
  },
];

export const shortlist = [
  { id: "shortlist_user_riyad_titanium", userId: "user_registered", cardId: "card_riyad_titanium" },
  { id: "shortlist_user_sab_cashback", userId: "user_registered", cardId: "card_sab_cashback" },
];

// ─── Pipeline fixtures ──────────────────────────────────────────────────────

export const crawlRun = {
  id: "crawl_enbd_seed",
  bankId: "bank_enbd_ksa",
  trigger: "manual" as const,
  status: "succeeded" as const,
  startedAt: new Date("2026-10-21T08:00:00.000Z"),
  finishedAt: new Date("2026-10-21T08:04:00.000Z"),
  pagesFetched: 6,
  cardsFound: 2,
};

/**
 * Draft payload: a full extracted card. The real shape is owned by @sift/schema's
 * extraction schema; this mirrors the database columns so the review screen has
 * every field to show. Figures are from the Emirates NBD KSA platinum page and the
 * fees page (2026-10-21).
 */
export const newCardPayload = {
  bankSlug: "emirates-nbd-ksa",
  canonicalUrl: "https://www.emiratesnbd.com.sa/en/cards/credit-cards/platinum-credit-card",
  sourceUrl: "https://www.emiratesnbd.com.sa/en/cards/credit-cards/platinum-credit-card",
  sourceType: "html",
  rewardType: "points",
  network: "visa",
  shariaCompliant: null,
  minMonthlyIncome: null,
  fees: {
    annualFee: 300,
    issuanceFee: null,
    supplementaryCardFee: 0,
    fxMarkupPct: 2,
    cashAdvanceFee: null,
    latePaymentFee: 50,
  },
  translations: {
    en: {
      name: "Platinum Credit Card",
      benefitsDescription: "Visa Platinum card with Plus Points rewards and selected UAE offers.",
      rewardConditions:
        "1 Plus Point for every SAR 1 spent, on all spends except SADAD, cash withdrawals / quasi-cash transactions and wallet payments.",
      eligibility: null,
      feeWaiverCondition: "Free for the first year.",
    },
    ar: {
      name: "بطاقة بلاتينوم الائتمانية",
      benefitsDescription: "بطاقة فيزا بلاتينوم بنقاط بلس وعروض مختارة في الإمارات.",
      rewardConditions:
        "نقطة بلس واحدة لكل ريال، على جميع المشتريات عدا سداد والسحب النقدي والعمليات شبه النقدية ومدفوعات المحافظ.",
      eligibility: null,
      feeWaiverCondition: "مجانية للسنة الأولى.",
    },
  },
  rewardTiers: [
    {
      rewardType: "points",
      spendingCategory: "general",
      rate: 1,
      rateUnit: "points_per_sar",
      cap: null,
      capPeriod: null,
      minSpend: null,
      sortOrder: 0,
      condition: {
        en: "All spends except SADAD, cash withdrawals / quasi-cash and wallet payments.",
        ar: "جميع المشتريات عدا سداد والسحب النقدي والعمليات شبه النقدية ومدفوعات المحافظ.",
      },
    },
  ],
  figureSources: {
    "fee.supplementary_card_fee": "https://www.emiratesnbd.com.sa/en/cards/credit-cards-fees",
    "fee.fx_markup_pct": "https://www.emiratesnbd.com.sa/en/cards/credit-cards-fees",
    "fee.late_payment_fee": "https://www.emiratesnbd.com.sa/en/cards/credit-cards-fees",
  },
};

/** A draft that failed validation: missing Arabic name, annual fee extracted as text. */
export const failedPayload = {
  bankSlug: "emirates-nbd-ksa",
  canonicalUrl: "https://www.emiratesnbd.com.sa/en/cards/credit-cards/mazeed-platinum-credit-card",
  sourceUrl: "https://www.emiratesnbd.com.sa/en/cards/credit-cards/mazeed-platinum-credit-card",
  sourceType: "html",
  rewardType: "points",
  network: "visa",
  shariaCompliant: null,
  minMonthlyIncome: null,
  fees: {
    annualFee: "SAR 299",
    issuanceFee: null,
    supplementaryCardFee: null,
    fxMarkupPct: null,
    cashAdvanceFee: null,
    latePaymentFee: null,
  },
  translations: {
    en: {
      name: "Mazeed Platinum Credit Card",
      benefitsDescription: null,
      rewardConditions: null,
      eligibility: null,
      feeWaiverCondition: null,
    },
  },
  rewardTiers: [],
};

export const failedValidationErrors = [
  {
    path: ["fees", "annualFee"],
    code: "invalid_type",
    message: "Expected number, received string",
  },
  {
    path: ["translations", "ar"],
    code: "invalid_type",
    message: "Required: every card needs an Arabic translation",
  },
];

/** SYNTHETIC old value: the bank does not publish its previous fee. Dev fixture only. */
export const approvedChange = {
  fieldName: "fee.annual_fee",
  oldValue: "250.00",
  newValue: "290.00",
};
