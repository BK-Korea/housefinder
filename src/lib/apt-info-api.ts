/**
 * 국토교통부_공동주택 단지 기본정보 제공 서비스
 * https://www.data.go.kr/data/15101324/openapi.do
 *
 * 용도: 단지 상세정보 (세대수, 주차대수, 난방방식, 용적률, 건폐율, 건축년도)
 * 단지 식별자: kaptCode (k-apt 코드) — 실거래가 API에는 이 코드가 없으므로
 * 단지명 + 법정동 + 지번으로 단지 목록을 먼저 받아와 매칭해야 함
 */

const API_BASE = "https://apis.data.go.kr/1613000/AptBasisInfoServiceV3";

interface RawAphusBassInfo {
  kaptCode: string; // 단지코드
  kaptName: string; // 단지명
  kaptAddr: string; // 법정동주소
  doroJuso?: string; // 도로명주소
  kaptTarea?: string; // 관리면적
  kaptMarea?: string; // 전용면적합
  kaptUsedate?: string; // 사용승인일 (YYYYMMDD)
  kaptDongCnt?: string; // 동수
  kaptdaCnt?: string; // 세대수
  kaptBcompany?: string; // 시공사
  kaptAcompany?: string; // 시행사
  kaptTel?: string; // 관리사무소 연락처
  codeHeat?: string; // 난방방식 (지역난방/개별난방/중앙난방)
  codeHallNm?: string; // 복도유형 (계단식/복도식/혼합식)
  codeMgrNm?: string; // 관리방식
  codeSaleNm?: string; // 분양형태
  privArea?: string; // 전용면적
  kaptdEcapa?: string; // 계약전력
  kaptdWtimebus?: string; // 버스 소요시간
  kaptdWtimesub?: string; // 지하철 소요시간
  subwayLine?: string; // 지하철호선
  subwayStation?: string; // 지하철역
  convenientFacility?: string;
  educationFacility?: string;
}

interface RawAphusDtlInfo {
  kaptCode: string;
  kaptName: string;
  kaptdPcnt?: string; // 지상주차대수
  kaptdPcntu?: string; // 지하주차대수
  kaptdCccnt?: string; // CCTV대수
  welfareFacility?: string;
  kaptdWtimebus?: string;
  subwayLine?: string;
  subwayStation?: string;
  kaptdWtimesub?: string;
  convenientFacility?: string;
  educationFacility?: string;
  groundElChargerCnt?: string; // 지상 전기차 충전기
  undergroundElChargerCnt?: string; // 지하 전기차 충전기
}

export interface AptBasicInfo {
  kaptCode: string;
  name: string;
  address: string;
  roadAddress?: string;
  buildYear?: number;
  totalDongs?: number; // 동수
  totalUnits?: number; // 세대수
  totalFloorArea?: number; // 연면적
  heatingType?: string;
  corridorType?: string;
  builder?: string;
  developer?: string;
  managementTel?: string;
}

export interface AptDetailInfo {
  kaptCode: string;
  name: string;
  parkingGround?: number;
  parkingUnderground?: number;
  parkingTotal?: number;
  cctvCount?: number;
  evChargerCount?: number;
}

/**
 * 공동주택 단지 기본정보 조회 (kaptCode 필수)
 */
export async function fetchAptBasicInfo(
  kaptCode: string
): Promise<AptBasicInfo | null> {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) throw new Error("MOLIT_API_KEY is not set");

  const url = new URL(`${API_BASE}/getAphusBassInfoV3`);
  url.searchParams.set("serviceKey", apiKey);
  url.searchParams.set("kaptCode", kaptCode);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`AptBasicInfo API error: ${response.status}`);
  }

  const xml = await response.text();
  const item = parseXmlItem<RawAphusBassInfo>(xml);
  if (!item) return null;

  return {
    kaptCode: item.kaptCode,
    name: item.kaptName?.trim(),
    address: item.kaptAddr?.trim(),
    roadAddress: item.doroJuso?.trim(),
    buildYear: item.kaptUsedate
      ? parseInt(item.kaptUsedate.substring(0, 4), 10)
      : undefined,
    totalDongs: item.kaptDongCnt ? parseInt(item.kaptDongCnt, 10) : undefined,
    totalUnits: item.kaptdaCnt ? parseInt(item.kaptdaCnt, 10) : undefined,
    totalFloorArea: item.kaptTarea ? parseFloat(item.kaptTarea) : undefined,
    heatingType: item.codeHeat?.trim(),
    corridorType: item.codeHallNm?.trim(),
    builder: item.kaptBcompany?.trim(),
    developer: item.kaptAcompany?.trim(),
    managementTel: item.kaptTel?.trim(),
  };
}

/**
 * 공동주택 단지 상세정보 조회 (주차/CCTV/편의시설)
 */
export async function fetchAptDetailInfo(
  kaptCode: string
): Promise<AptDetailInfo | null> {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) throw new Error("MOLIT_API_KEY is not set");

  const url = new URL(`${API_BASE}/getAphusDtlInfoV3`);
  url.searchParams.set("serviceKey", apiKey);
  url.searchParams.set("kaptCode", kaptCode);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`AptDetailInfo API error: ${response.status}`);
  }

  const xml = await response.text();
  const item = parseXmlItem<RawAphusDtlInfo>(xml);
  if (!item) return null;

  const parkingGround = item.kaptdPcnt ? parseInt(item.kaptdPcnt, 10) : 0;
  const parkingUnderground = item.kaptdPcntu
    ? parseInt(item.kaptdPcntu, 10)
    : 0;

  return {
    kaptCode: item.kaptCode,
    name: item.kaptName?.trim(),
    parkingGround,
    parkingUnderground,
    parkingTotal: parkingGround + parkingUnderground,
    cctvCount: item.kaptdCccnt ? parseInt(item.kaptdCccnt, 10) : undefined,
    evChargerCount:
      (item.groundElChargerCnt ? parseInt(item.groundElChargerCnt, 10) : 0) +
      (item.undergroundElChargerCnt
        ? parseInt(item.undergroundElChargerCnt, 10)
        : 0),
  };
}

/**
 * 법정동 코드로 단지 목록 조회 (kaptCode 획득용)
 * 실거래가 → kaptCode 매칭할 때 사용
 */
export async function fetchAptListByBjdCode(
  bjdCode: string // 10자리 법정동 코드
): Promise<Array<{ kaptCode: string; kaptName: string; bjdCode: string }>> {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) throw new Error("MOLIT_API_KEY is not set");

  const url = new URL(`${API_BASE}/getLegaldongAptList`);
  url.searchParams.set("serviceKey", apiKey);
  url.searchParams.set("bjdCode", bjdCode);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "9999");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`LegaldongAptList API error: ${response.status}`);
  }

  const xml = await response.text();
  const items = parseXmlItems<{
    kaptCode: string;
    kaptName: string;
    bjdCode: string;
  }>(xml);

  return items.map((i) => ({
    kaptCode: i.kaptCode?.trim(),
    kaptName: i.kaptName?.trim(),
    bjdCode: i.bjdCode?.trim(),
  }));
}

// ---- 간단한 XML 파서 (외부 의존성 없이) ----
function parseXmlItem<T>(xml: string): T | null {
  const items = parseXmlItems<T>(xml);
  return items[0] ?? null;
}

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
