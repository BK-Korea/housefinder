/**
 * 국토교통부 실거래가 공공 API
 * https://www.data.go.kr/data/15057511/openapi.do
 */

interface MolitTransaction {
  aptName: string; // 아파트명
  dealAmount: string; // 거래금액 (만원)
  buildYear: string; // 건축년도
  dealYear: string; // 거래년도
  dealMonth: string; // 거래월
  dealDay: string; // 거래일
  area: string; // 전용면적
  floor: string; // 층
  jibun: string; // 지번
  dong: string; // 법정동
  regionCode: string; // 지역코드
  cancelDealDate?: string; // 해제사유발생일
}

interface MolitJeonseTransaction {
  aptName: string;
  deposit: string; // 보증금 (만원)
  monthlyRent: string; // 월세 (만원)
  buildYear: string;
  dealYear: string;
  dealMonth: string;
  dealDay: string;
  area: string;
  floor: string;
  jibun: string;
  dong: string;
  regionCode: string;
}

const API_BASE =
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev";
const JEONSE_API_BASE =
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptRent";

function parsePrice(priceStr: string): number {
  return parseInt(priceStr.replace(/,/g, "").trim(), 10);
}

export async function fetchApartmentSaleTransactions(
  regionCode: string,
  dealYearMonth: string // YYYYMM
): Promise<MolitTransaction[]> {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) throw new Error("MOLIT_API_KEY is not set");

  const url = new URL(`${API_BASE}/getRTMSDataSvcAptTradeDev`);
  url.searchParams.set("serviceKey", apiKey);
  url.searchParams.set("LAWD_CD", regionCode.substring(0, 5));
  url.searchParams.set("DEAL_YMD", dealYearMonth);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "9999");
  url.searchParams.set("type", "json");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`MOLIT API error: ${response.status}`);
  }

  const data = await response.json();
  const items = data?.response?.body?.items?.item;

  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

export async function fetchApartmentRentTransactions(
  regionCode: string,
  dealYearMonth: string
): Promise<MolitJeonseTransaction[]> {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) throw new Error("MOLIT_API_KEY is not set");

  const url = new URL(`${JEONSE_API_BASE}/getRTMSDataSvcAptRent`);
  url.searchParams.set("serviceKey", apiKey);
  url.searchParams.set("LAWD_CD", regionCode.substring(0, 5));
  url.searchParams.set("DEAL_YMD", dealYearMonth);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "9999");
  url.searchParams.set("type", "json");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`MOLIT Rent API error: ${response.status}`);
  }

  const data = await response.json();
  const items = data?.response?.body?.items?.item;

  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

export function parseSaleTransaction(raw: MolitTransaction) {
  return {
    aptName: raw.aptName?.trim(),
    price: parsePrice(raw.dealAmount),
    buildYear: parseInt(raw.buildYear, 10),
    dealYear: parseInt(raw.dealYear, 10),
    dealMonth: parseInt(raw.dealMonth, 10),
    dealDay: raw.dealDay ? parseInt(raw.dealDay, 10) : null,
    area: parseFloat(raw.area),
    floor: parseInt(raw.floor, 10),
    jibun: raw.jibun?.trim(),
    dong: raw.dong?.trim(),
    regionCode: raw.regionCode?.trim(),
    cancelDealDate: raw.cancelDealDate?.trim() || null,
  };
}

export function parseRentTransaction(raw: MolitJeonseTransaction) {
  const deposit = parsePrice(raw.deposit);
  const monthlyRent = raw.monthlyRent
    ? parsePrice(raw.monthlyRent)
    : 0;

  return {
    aptName: raw.aptName?.trim(),
    deposit,
    monthlyRent,
    dealType: monthlyRent > 0 ? ("MONTHLY" as const) : ("JEONSE" as const),
    buildYear: parseInt(raw.buildYear, 10),
    dealYear: parseInt(raw.dealYear, 10),
    dealMonth: parseInt(raw.dealMonth, 10),
    dealDay: raw.dealDay ? parseInt(raw.dealDay, 10) : null,
    area: parseFloat(raw.area),
    floor: parseInt(raw.floor, 10),
    jibun: raw.jibun?.trim(),
    dong: raw.dong?.trim(),
    regionCode: raw.regionCode?.trim(),
  };
}
