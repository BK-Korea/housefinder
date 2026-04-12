/**
 * 국토교통부_공동주택 단지 목록제공 서비스
 * https://www.data.go.kr/data/15060591/openapi.do
 *
 * End Point: https://apis.data.go.kr/1613000/AptListService3
 * 응답 포맷: JSON (resultCode "00" = 정상)
 *
 * 이 API는 단지 코드(kaptCode)와 단지명만 제공하는 "목록" 서비스입니다.
 * 세대수/주차대수/난방방식/용적률 등 상세 정보는 별도 API 필요:
 *   - 국토교통부_공동주택 단지 기본 정보
 *   - 국토교통부_공동주택 단지 상세 정보
 */

const API_BASE = "https://apis.data.go.kr/1613000/AptListService3";

export interface AptListItem {
  kaptCode: string; // 단지 코드 (예: A10020216)
  kaptName: string; // 단지명
  bjdCode?: string; // 법정동 코드 (10자리)
  as1?: string; // 시도 (예: 서울특별시)
  as2?: string; // 시군구 (예: 강남구)
  as3?: string; // 읍면동 (예: 역삼동)
  as4?: string | null; // 리 (해당 시)
}

interface RawListResponse {
  response: {
    header: { resultCode: string; resultMsg: string };
    body: {
      items: AptListItem[] | AptListItem | "" | null;
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
}

async function fetchAptList(
  operation: string,
  params: Record<string, string>
): Promise<AptListItem[]> {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) throw new Error("MOLIT_API_KEY is not set");

  const url = new URL(`${API_BASE}/${operation}`);
  url.searchParams.set("serviceKey", apiKey);
  url.searchParams.set("_type", "json");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`AptListService3 ${operation} HTTP ${response.status}`);
  }

  const data = (await response.json()) as RawListResponse;
  const header = data?.response?.header;
  if (!header || header.resultCode !== "00") {
    throw new Error(
      `AptListService3 ${operation} error ${header?.resultCode}: ${header?.resultMsg}`
    );
  }

  const items = data.response.body.items;
  if (!items) return [];
  if (typeof items === "string") return [];
  return Array.isArray(items) ? items : [items];
}

/**
 * 법정동코드로 단지 목록 조회
 * @param bjdCode 10자리 법정동 코드 (예: "1168010100" = 서울 강남구 역삼동)
 */
export async function fetchAptListByBjdCode(
  bjdCode: string,
  pageNo = 1,
  numOfRows = 9999
): Promise<AptListItem[]> {
  return fetchAptList("getLegaldongAptList3", {
    bjdCode,
    pageNo: String(pageNo),
    numOfRows: String(numOfRows),
  });
}

/**
 * 시군구코드로 단지 목록 조회
 * @param sigunguCode 5자리 시군구 코드 (예: "11680" = 서울 강남구)
 */
export async function fetchAptListBySigunguCode(
  sigunguCode: string,
  pageNo = 1,
  numOfRows = 9999
): Promise<AptListItem[]> {
  return fetchAptList("getSigunguAptList3", {
    sigunguCode,
    pageNo: String(pageNo),
    numOfRows: String(numOfRows),
  });
}

/**
 * 시도코드로 단지 목록 조회
 * @param sidoCode 2자리 시도 코드 (예: "11" = 서울)
 */
export async function fetchAptListBySidoCode(
  sidoCode: string,
  pageNo = 1,
  numOfRows = 9999
): Promise<AptListItem[]> {
  return fetchAptList("getSidoAptList3", {
    sidoCode,
    pageNo: String(pageNo),
    numOfRows: String(numOfRows),
  });
}

/**
 * 도로명코드로 단지 목록 조회
 */
export async function fetchAptListByRoadnameCode(
  roadCode: string,
  pageNo = 1,
  numOfRows = 9999
): Promise<AptListItem[]> {
  return fetchAptList("getRoadnameAptList3", {
    roadCode,
    pageNo: String(pageNo),
    numOfRows: String(numOfRows),
  });
}

/**
 * 전국 공동주택 단지 목록 (페이지네이션 필수)
 */
export async function fetchAllAptList(
  pageNo = 1,
  numOfRows = 9999
): Promise<AptListItem[]> {
  return fetchAptList("getTotalAptList3", {
    pageNo: String(pageNo),
    numOfRows: String(numOfRows),
  });
}
