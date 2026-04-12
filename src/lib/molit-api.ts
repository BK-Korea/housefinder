/**
 * 국토교통부 실거래가 공공 API (아파트 매매)
 * https://www.data.go.kr/data/15057511/openapi.do
 *
 * 엔드포인트: apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev
 * 응답형식: XML (type=json 파라미터는 무시됨)
 */

// API 원본 응답 필드 (XML 요소명 그대로)
interface RawMolitSaleTransaction {
  aptNm?: string; // 아파트명
  aptSeq?: string; // 단지 시퀀스 (sgg-seq)
  dealAmount?: string; // 거래금액 (만원, 쉼표 포함)
  buildYear?: string;
  dealYear?: string;
  dealMonth?: string;
  dealDay?: string;
  excluUseAr?: string; // 전용면적 (m2)
  floor?: string;
  jibun?: string;
  umdNm?: string; // 법정동명
  umdCd?: string; // 읍면동 코드 (5자리)
  sggCd?: string; // 시군구 코드 (5자리)
  roadNm?: string; // 도로명
  cdealDay?: string; // 해제일 (YYYYMMDD, 해제된 거래만)
  cdealType?: string; // 해제여부 (O/공백)
  dealingGbn?: string; // 거래유형 (중개거래/직거래)
}

export interface ParsedSaleTransaction {
  aptName: string;
  aptSeq: string | null;
  price: number; // 거래금액 (만원 단위 정수)
  buildYear: number | null;
  dealYear: number;
  dealMonth: number;
  dealDay: number | null;
  area: number; // 전용면적 (m2)
  floor: number;
  jibun: string | null;
  dong: string; // 법정동명
  regionCode: string; // 10자리 법정동코드 (sggCd + umdCd)
  cancelDealDate: string | null; // YYYYMMDD or null
  dealingGbn: string | null;
}

const API_BASE = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev";

function parsePrice(priceStr: string | undefined): number {
  if (!priceStr) return 0;
  return parseInt(priceStr.replace(/,/g, "").trim(), 10);
}

export async function fetchApartmentSaleTransactions(
  regionCode: string,
  dealYearMonth: string // YYYYMM
): Promise<RawMolitSaleTransaction[]> {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) throw new Error("MOLIT_API_KEY is not set");

  const url = new URL(`${API_BASE}/getRTMSDataSvcAptTradeDev`);
  url.searchParams.set("serviceKey", apiKey);
  url.searchParams.set("LAWD_CD", regionCode.substring(0, 5));
  url.searchParams.set("DEAL_YMD", dealYearMonth);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "9999");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`MOLIT API error: ${response.status}`);
  }

  const xml = await response.text();

  // resultCode 체크 (에러 본문도 XML로 내려옴)
  const resultCode = xml.match(/<resultCode>([^<]+)<\/resultCode>/)?.[1];
  if (resultCode && resultCode !== "000") {
    const msg = xml.match(/<resultMsg>([^<]+)<\/resultMsg>/)?.[1] ?? "unknown";
    throw new Error(`MOLIT API returned ${resultCode}: ${msg}`);
  }

  return parseXmlItems<RawMolitSaleTransaction>(xml);
}

export function parseSaleTransaction(
  raw: RawMolitSaleTransaction
): ParsedSaleTransaction {
  const sggCd = raw.sggCd?.trim() ?? "";
  const umdCd = raw.umdCd?.trim() ?? "";
  const cdealDay = raw.cdealDay?.trim();
  const cdealType = raw.cdealType?.trim();

  return {
    aptName: raw.aptNm?.trim() ?? "",
    aptSeq: raw.aptSeq?.trim() || null,
    price: parsePrice(raw.dealAmount),
    buildYear: raw.buildYear ? parseInt(raw.buildYear, 10) : null,
    dealYear: parseInt(raw.dealYear ?? "0", 10),
    dealMonth: parseInt(raw.dealMonth ?? "0", 10),
    dealDay: raw.dealDay ? parseInt(raw.dealDay, 10) : null,
    area: parseFloat(raw.excluUseAr ?? "0"),
    floor: parseInt(raw.floor ?? "0", 10),
    jibun: raw.jibun?.trim() || null,
    dong: raw.umdNm?.trim() ?? "",
    regionCode: sggCd + umdCd,
    cancelDealDate: cdealType && cdealDay ? cdealDay : null,
    dealingGbn: raw.dealingGbn?.trim() || null,
  };
}

// ---- 간단한 XML 파서 (외부 의존성 없이) ----
function parseXmlItems<T>(xml: string): T[] {
  const results: T[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const obj: Record<string, string> = {};
    const fieldRegex = /<(\w+)>([\s\S]*?)<\/\1>/g;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(itemXml)) !== null) {
      obj[fieldMatch[1]] = fieldMatch[2];
    }
    results.push(obj as T);
  }
  return results;
}
