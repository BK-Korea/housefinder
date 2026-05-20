/**
 * 서울/경기 아파트 신고가 분석 엑셀 생성기
 *
 * 이재명 정권 출범(2025년 6월) 이후 신고가를 경신한 아파트를
 * 상승률 순으로 정렬하여 Excel 파일로 출력합니다.
 *
 * 사용법: node scripts/singo-analysis.mjs
 * 소요시간: 약 15~30분 (서울 25개 + 경기 39개 시군구 × 최대 30개월)
 */
import "dotenv/config";
import * as XLSX from "xlsx";
import { writeFileSync } from "fs";

const API_KEY = process.env.MOLIT_API_KEY;
if (!API_KEY) {
  console.error("MOLIT_API_KEY가 .env에 없습니다.");
  process.exit(1);
}

// ── 설정 ─────────────────────────────────────────
// 이재명 정권 출범: 2025년 6월 (조정 가능)
const ADMIN_START_YEAR = 2025;
const ADMIN_START_MONTH = 6;
// 비교 기준: 이전 고가 산정을 위한 데이터 시작 시점
const BASELINE_START_YEAR = 2023;
const BASELINE_START_MONTH = 1;

// ── 시군구 코드 ─────────────────────────────────────
const SEOUL_CODES = {
  "11110": "종로구", "11140": "중구", "11170": "용산구", "11200": "성동구",
  "11215": "광진구", "11230": "동대문구", "11260": "중랑구", "11290": "성북구",
  "11305": "강북구", "11320": "도봉구", "11350": "노원구", "11380": "은평구",
  "11410": "서대문구", "11440": "마포구", "11470": "양천구", "11500": "강서구",
  "11530": "구로구", "11545": "금천구", "11560": "영등포구", "11590": "동작구",
  "11620": "관악구", "11650": "서초구", "11680": "강남구", "11710": "송파구",
  "11740": "강동구",
};

const GYEONGGI_CODES = {
  "41111": "수원장안", "41113": "수원권선", "41115": "수원팔달", "41117": "수원영통",
  "41131": "성남수정", "41133": "성남중원", "41135": "성남분당",
  "41150": "의정부시", "41171": "안양만안", "41173": "안양동안",
  "41190": "부천시", "41210": "광명시", "41220": "평택시", "41250": "동두천시",
  "41271": "안산상록", "41273": "안산단원",
  "41281": "고양덕양", "41285": "고양일산동", "41287": "고양일산서",
  "41290": "과천시", "41310": "구리시", "41360": "남양주시",
  "41370": "오산시", "41390": "시흥시", "41410": "군포시", "41430": "의왕시",
  "41450": "하남시",
  "41461": "용인처인", "41463": "용인기흥", "41465": "용인수지",
  "41480": "파주시", "41500": "이천시", "41550": "안성시",
  "41570": "김포시", "41590": "화성시", "41610": "광주시",
  "41630": "양주시", "41650": "포천시", "41670": "여주시",
};

const ALL_CODES = {
  ...Object.fromEntries(Object.entries(SEOUL_CODES).map(([k, v]) => [k, `서울 ${v}`])),
  ...Object.fromEntries(Object.entries(GYEONGGI_CODES).map(([k, v]) => [k, `경기 ${v}`])),
};

// ── API 호출 ─────────────────────────────────────
const API_BASE = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev";

function parseXmlItems(xml) {
  const results = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const obj = {};
    const fieldRegex = /<(\w+)>([\s\S]*?)<\/\1>/g;
    let fm;
    while ((fm = fieldRegex.exec(match[1])) !== null) {
      obj[fm[1]] = fm[2];
    }
    results.push(obj);
  }
  return results;
}

async function fetchTransactions(sggCode, yearMonth) {
  const url = new URL(API_BASE);
  url.searchParams.set("serviceKey", API_KEY);
  url.searchParams.set("LAWD_CD", sggCode);
  url.searchParams.set("DEAL_YMD", yearMonth);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "9999");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const xml = await res.text();
  const code = xml.match(/<resultCode>([^<]+)<\/resultCode>/)?.[1];
  if (code !== "000") {
    const msg = xml.match(/<resultMsg>([^<]+)<\/resultMsg>/)?.[1] ?? "";
    throw new Error(`API ${code}: ${msg}`);
  }
  return parseXmlItems(xml);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── 날짜 유틸 ─────────────────────────────────────
function generateMonths(startYear, startMonth, endYear, endMonth) {
  const months = [];
  let y = startYear, m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    months.push(`${y}${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

// ── 메인 로직 ─────────────────────────────────────
async function main() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // 기준 이전 기간 (baseline)
  const baselineMonths = generateMonths(
    BASELINE_START_YEAR, BASELINE_START_MONTH,
    ADMIN_START_YEAR, ADMIN_START_MONTH - 1
  );

  // 정권 출범 이후 기간
  const postMonths = generateMonths(
    ADMIN_START_YEAR, ADMIN_START_MONTH,
    currentYear, currentMonth
  );

  const allMonths = [...baselineMonths, ...postMonths];
  const sggCodes = Object.keys(ALL_CODES);
  const totalCalls = sggCodes.length * allMonths.length;

  console.log(`\n📊 신고가 분석 시작`);
  console.log(`   시군구: ${sggCodes.length}개 (서울 ${Object.keys(SEOUL_CODES).length} + 경기 ${Object.keys(GYEONGGI_CODES).length})`);
  console.log(`   기간: ${allMonths[0]} ~ ${allMonths[allMonths.length - 1]} (${allMonths.length}개월)`);
  console.log(`   이재명 정권 시작: ${ADMIN_START_YEAR}년 ${ADMIN_START_MONTH}월`);
  console.log(`   총 API 호출: ${totalCalls}회 (예상 ${Math.ceil(totalCalls * 0.4 / 60)}분)\n`);

  // aptKey → { aptName, sggCd, sggName, dong, area, baselineMax, baselineMaxDate, postMax, postMaxDate, postMaxFloor }
  const aptMap = new Map();

  let callCount = 0;
  let errorCount = 0;

  for (const sggCode of sggCodes) {
    const sggName = ALL_CODES[sggCode];

    for (const ym of allMonths) {
      callCount++;
      const isPost = ym >= `${ADMIN_START_YEAR}${String(ADMIN_START_MONTH).padStart(2, "0")}`;

      try {
        const items = await fetchTransactions(sggCode, ym);

        for (const item of items) {
          const aptName = item.aptNm?.trim();
          const dong = item.umdNm?.trim();
          const area = item.excluUseAr?.trim();
          const priceStr = item.dealAmount?.replace(/,/g, "").trim();
          const floor = item.floor?.trim();
          const dealDay = item.dealDay?.trim();
          const cdealType = item.cdealType?.trim();

          if (!aptName || !priceStr || !area) continue;
          // 해제 거래 제외
          if (cdealType && cdealType.length > 0) continue;

          const price = parseInt(priceStr, 10); // 만원 단위
          const dealYear = parseInt(item.dealYear, 10);
          const dealMonth = parseInt(item.dealMonth, 10);
          const dateStr = `${dealYear}.${String(dealMonth).padStart(2, "0")}.${dealDay ? String(parseInt(dealDay)).padStart(2, "0") : "??"}`;

          // 아파트 식별키: 단지명 + 동 + 면적 (같은 단지 내 같은 면적끼리 비교)
          const key = `${sggCode}|${dong}|${aptName}|${area}`;

          if (!aptMap.has(key)) {
            aptMap.set(key, {
              aptName,
              sggCd: sggCode,
              sggName,
              dong,
              area: parseFloat(area),
              baselineMax: 0,
              baselineMaxDate: "",
              baselineMaxFloor: "",
              postMax: 0,
              postMaxDate: "",
              postMaxFloor: "",
              postTransactionCount: 0,
            });
          }

          const apt = aptMap.get(key);

          if (isPost) {
            apt.postTransactionCount++;
            if (price > apt.postMax) {
              apt.postMax = price;
              apt.postMaxDate = dateStr;
              apt.postMaxFloor = floor || "";
            }
          } else {
            if (price > apt.baselineMax) {
              apt.baselineMax = price;
              apt.baselineMaxDate = dateStr;
              apt.baselineMaxFloor = floor || "";
            }
          }
        }

        if (callCount % 50 === 0 || callCount === totalCalls) {
          const pct = ((callCount / totalCalls) * 100).toFixed(1);
          console.log(`  [${pct}%] ${callCount}/${totalCalls} — ${sggName} ${ym} (${items.length}건) | 아파트 ${aptMap.size}개 수집`);
        }
      } catch (err) {
        errorCount++;
        if (errorCount <= 5) {
          console.warn(`  ⚠ ${sggName} ${ym}: ${err.message}`);
        }
        if (err.message.includes("22") || err.message.includes("LIMITED")) {
          console.error("\n❌ 일일 API 호출 한도 초과. 내일 다시 시도하세요.");
          break;
        }
      }

      // rate limiting: 300ms 간격
      await sleep(300);
    }
  }

  console.log(`\n✅ 데이터 수집 완료: ${aptMap.size}개 아파트, 에러 ${errorCount}건`);

  // ── 신고가 계산 ─────────────────────────────────
  const results = [];

  for (const [, apt] of aptMap) {
    // 이전 고가 대비 새 고가가 더 높은 경우만 (신고가 경신)
    if (apt.postMax > apt.baselineMax && apt.baselineMax > 0) {
      const gap = apt.postMax - apt.baselineMax;
      const rate = (gap / apt.baselineMax) * 100;

      results.push({
        "시도/구": apt.sggName,
        "동": apt.dong,
        "아파트명": apt.aptName,
        "전용면적(㎡)": apt.area,
        "이전 최고가(만원)": apt.baselineMax,
        "이전 최고가 일자": apt.baselineMaxDate,
        "이전 최고가 층": apt.baselineMaxFloor,
        "신고가(만원)": apt.postMax,
        "신고가 일자": apt.postMaxDate,
        "신고가 층": apt.postMaxFloor,
        "상승폭(만원)": gap,
        "상승률(%)": Math.round(rate * 100) / 100,
        "이전 최고가(억)": Math.round(apt.baselineMax / 100) / 100,
        "신고가(억)": Math.round(apt.postMax / 100) / 100,
        "상승폭(억)": Math.round(gap / 100) / 100,
        "거래건수(정권후)": apt.postTransactionCount,
      });
    }
  }

  // 상승률 내림차순 정렬
  results.sort((a, b) => b["상승률(%)"] - a["상승률(%)"]);

  console.log(`📈 신고가 경신 아파트: ${results.length}개 / ${aptMap.size}개 중`);

  if (results.length === 0) {
    console.log("⚠ 신고가를 경신한 아파트가 없습니다.");
    return;
  }

  // 상위 10개 미리보기
  console.log("\n🏆 상승률 TOP 10:");
  results.slice(0, 10).forEach((r, i) => {
    console.log(
      `  ${i + 1}. ${r["시도/구"]} ${r["동"]} ${r["아파트명"]} (${r["전용면적(㎡)"]}㎡)` +
      ` | ${r["이전 최고가(억)"]}억 → ${r["신고가(억)"]}억 (+${r["상승폭(억)"]}억, ${r["상승률(%)"]}%)`
    );
  });

  // ── Excel 출력 ──────────────────────────────────
  const ws = XLSX.utils.json_to_sheet(results);

  // 컬럼 너비 설정
  ws["!cols"] = [
    { wch: 14 }, // 시도/구
    { wch: 10 }, // 동
    { wch: 22 }, // 아파트명
    { wch: 12 }, // 전용면적
    { wch: 16 }, // 이전 최고가
    { wch: 14 }, // 이전 최고가 일자
    { wch: 10 }, // 이전 최고가 층
    { wch: 14 }, // 신고가
    { wch: 14 }, // 신고가 일자
    { wch: 10 }, // 신고가 층
    { wch: 14 }, // 상승폭
    { wch: 12 }, // 상승률
    { wch: 14 }, // 이전(억)
    { wch: 12 }, // 신고가(억)
    { wch: 12 }, // 상승폭(억)
    { wch: 14 }, // 거래건수
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "신고가 분석");

  // 요약 시트
  const summary = [
    { "항목": "분석 기간 (기준선)", "값": `${BASELINE_START_YEAR}년 ${BASELINE_START_MONTH}월 ~ ${ADMIN_START_YEAR}년 ${ADMIN_START_MONTH - 1}월` },
    { "항목": "분석 기간 (정권 후)", "값": `${ADMIN_START_YEAR}년 ${ADMIN_START_MONTH}월 ~ ${currentYear}년 ${currentMonth}월` },
    { "항목": "분석 지역", "값": `서울 ${Object.keys(SEOUL_CODES).length}개구 + 경기 ${Object.keys(GYEONGGI_CODES).length}개 시군구` },
    { "항목": "수집 아파트 수", "값": aptMap.size },
    { "항목": "신고가 경신 수", "값": results.length },
    { "항목": "신고가 경신 비율", "값": `${((results.length / aptMap.size) * 100).toFixed(1)}%` },
    { "항목": "최고 상승률", "값": results[0] ? `${results[0]["상승률(%)"]}% (${results[0]["시도/구"]} ${results[0]["아파트명"]})` : "-" },
    { "항목": "생성 일시", "값": new Date().toLocaleString("ko-KR") },
  ];
  const ws2 = XLSX.utils.json_to_sheet(summary);
  ws2["!cols"] = [{ wch: 22 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws2, "요약");

  const filename = `신고가분석_서울경기_${ADMIN_START_YEAR}${String(ADMIN_START_MONTH).padStart(2, "0")}_이후.xlsx`;
  XLSX.writeFile(wb, filename);
  console.log(`\n💾 파일 저장: ${filename}`);
  console.log("✨ 완료!");
}

main().catch((err) => {
  console.error("치명적 에러:", err);
  process.exit(1);
});
