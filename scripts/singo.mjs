/**
 * 서울/경기 아파트 신고가 분석 — 단일 파일, 의존성 없음
 *
 * 이재명 정권 출범(2025년 6월) 이후 신고가를 경신한 아파트를
 * 상승률 순으로 정렬하여 CSV(엑셀에서 바로 열림)로 출력합니다.
 *
 * 사용법:
 *   node singo.mjs
 *
 * 출력: 신고가분석_서울경기.csv  (UTF-8 BOM — 엑셀에서 한글 정상 표시)
 */

// ── 설정 ─────────────────────────────────────────
const API_KEY =
  process.env.MOLIT_API_KEY ||
  "e5b247ed3d03817ab6b95c70eebfec85cdf01b5e18476bcd88e049674e401599";

const ADMIN_START = "202506"; // 이재명 정권 출범월 (2025년 6월)
const BASELINE_START = "202401"; // 이전 최고가 산정 시작월
const CONCURRENCY = 6; // 동시 요청 수

// ── 시군구 코드 ─────────────────────────────────────
const SEOUL = {
  "11110": "종로구", "11140": "중구", "11170": "용산구", "11200": "성동구",
  "11215": "광진구", "11230": "동대문구", "11260": "중랑구", "11290": "성북구",
  "11305": "강북구", "11320": "도봉구", "11350": "노원구", "11380": "은평구",
  "11410": "서대문구", "11440": "마포구", "11470": "양천구", "11500": "강서구",
  "11530": "구로구", "11545": "금천구", "11560": "영등포구", "11590": "동작구",
  "11620": "관악구", "11650": "서초구", "11680": "강남구", "11710": "송파구",
  "11740": "강동구",
};

const GYEONGGI = {
  "41111": "수원장안구", "41113": "수원권선구", "41115": "수원팔달구",
  "41117": "수원영통구", "41131": "성남수정구", "41133": "성남중원구",
  "41135": "성남분당구", "41150": "의정부시", "41171": "안양만안구",
  "41173": "안양동안구", "41190": "부천시", "41210": "광명시",
  "41220": "평택시", "41250": "동두천시", "41271": "안산상록구",
  "41273": "안산단원구", "41281": "고양덕양구", "41285": "고양일산동구",
  "41287": "고양일산서구", "41290": "과천시", "41310": "구리시",
  "41360": "남양주시", "41370": "오산시", "41390": "시흥시",
  "41410": "군포시", "41430": "의왕시", "41450": "하남시",
  "41461": "용인처인구", "41463": "용인기흥구", "41465": "용인수지구",
  "41480": "파주시", "41500": "이천시", "41550": "안성시",
  "41570": "김포시", "41590": "화성시", "41610": "광주시",
  "41630": "양주시", "41650": "포천시", "41670": "여주시",
};

const REGIONS = {
  ...Object.fromEntries(Object.entries(SEOUL).map(([k, v]) => [k, `서울 ${v}`])),
  ...Object.fromEntries(
    Object.entries(GYEONGGI).map(([k, v]) => [k, `경기 ${v}`])
  ),
};

const API_BASE =
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev";

// ── 유틸 ─────────────────────────────────────────
function parseXmlItems(xml) {
  const out = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const obj = {};
    const fRe = /<(\w+)>([\s\S]*?)<\/\1>/g;
    let f;
    while ((f = fRe.exec(m[1])) !== null) obj[f[1]] = f[2];
    out.push(obj);
  }
  return out;
}

function genMonths(start, end) {
  const months = [];
  let y = parseInt(start.slice(0, 4), 10);
  let mo = parseInt(start.slice(4), 10);
  const ey = parseInt(end.slice(0, 4), 10);
  const em = parseInt(end.slice(4), 10);
  while (y < ey || (y === ey && mo <= em)) {
    months.push(`${y}${String(mo).padStart(2, "0")}`);
    if (++mo > 12) { mo = 1; y++; }
  }
  return months;
}

function csvCell(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function fetchMonth(sggCode, ym, retry = 1) {
  const url = new URL(API_BASE);
  url.searchParams.set("serviceKey", API_KEY);
  url.searchParams.set("LAWD_CD", sggCode);
  url.searchParams.set("DEAL_YMD", ym);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "9999");

  try {
    const res = await fetch(url.toString());
    const xml = await res.text();
    const code = xml.match(/<resultCode>([^<]+)<\/resultCode>/)?.[1];
    if (code !== "000") {
      const msg = xml.match(/<resultMsg>([^<]+)<\/resultMsg>/)?.[1] ?? "";
      const reason =
        xml.match(/<returnReasonCode>([^<]+)<\/returnReasonCode>/)?.[1] ?? "";
      if (reason === "22" || /LIMITED_NUMBER/.test(xml)) {
        throw new Error("QUOTA_EXCEEDED");
      }
      throw new Error(`API ${code} ${msg}`);
    }
    return parseXmlItems(xml);
  } catch (err) {
    if (err.message === "QUOTA_EXCEEDED") throw err;
    if (retry > 0) {
      await new Promise((r) => setTimeout(r, 800));
      return fetchMonth(sggCode, ym, retry - 1);
    }
    throw err;
  }
}

// ── 메인 ─────────────────────────────────────────
async function main() {
  const now = new Date();
  const curYM = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

  const months = genMonths(BASELINE_START, curYM);
  const sggCodes = Object.keys(REGIONS);
  const tasks = [];
  for (const sgg of sggCodes) {
    for (const ym of months) tasks.push({ sgg, ym });
  }

  console.log("\n📊 서울/경기 아파트 신고가 분석");
  console.log(`   지역: ${sggCodes.length}개 (서울 ${Object.keys(SEOUL).length} + 경기 ${Object.keys(GYEONGGI).length})`);
  console.log(`   기간: ${months[0]} ~ ${months[months.length - 1]} (${months.length}개월)`);
  console.log(`   이재명 정권 출범: ${ADMIN_START.slice(0, 4)}년 ${parseInt(ADMIN_START.slice(4))}월`);
  console.log(`   API 호출: ${tasks.length}회 (동시 ${CONCURRENCY}개)\n`);

  // aptKey -> 집계 데이터
  const aptMap = new Map();
  let done = 0;
  let errors = 0;
  let quotaHit = false;

  function ingest({ sgg, ym }, items) {
    const isPost = ym >= ADMIN_START;
    for (const it of items) {
      const aptName = it.aptNm?.trim();
      const dong = it.umdNm?.trim();
      const area = it.excluUseAr?.trim();
      const priceStr = it.dealAmount?.replace(/,/g, "").trim();
      if (!aptName || !area || !priceStr) continue;
      if (it.cdealType && it.cdealType.trim()) continue; // 해제거래 제외

      const price = parseInt(priceStr, 10);
      if (!price) continue;
      const dy = parseInt(it.dealYear, 10);
      const dm = parseInt(it.dealMonth, 10);
      const dd = it.dealDay ? parseInt(it.dealDay, 10) : 0;
      const dateStr = `${dy}.${String(dm).padStart(2, "0")}.${dd ? String(dd).padStart(2, "0") : "??"}`;
      const floor = it.floor?.trim() || "";

      const key = `${sgg}|${dong}|${aptName}|${area}`;
      let a = aptMap.get(key);
      if (!a) {
        a = {
          region: REGIONS[sgg], dong, aptName, area: parseFloat(area),
          baseMax: 0, baseDate: "", baseFloor: "",
          postMax: 0, postDate: "", postFloor: "", postCount: 0,
        };
        aptMap.set(key, a);
      }
      if (isPost) {
        a.postCount++;
        if (price > a.postMax) {
          a.postMax = price; a.postDate = dateStr; a.postFloor = floor;
        }
      } else {
        if (price > a.baseMax) {
          a.baseMax = price; a.baseDate = dateStr; a.baseFloor = floor;
        }
      }
    }
  }

  // 동시 워커 풀
  let idx = 0;
  async function worker() {
    while (idx < tasks.length && !quotaHit) {
      const task = tasks[idx++];
      try {
        const items = await fetchMonth(task.sgg, task.ym);
        ingest(task, items);
      } catch (err) {
        if (err.message === "QUOTA_EXCEEDED") {
          quotaHit = true;
          console.error("\n❌ 일일 API 호출 한도(10,000) 초과 — 수집된 데이터로 계속 진행합니다.");
          break;
        }
        errors++;
        if (errors <= 5) console.warn(`  ⚠ ${REGIONS[task.sgg]} ${task.ym}: ${err.message}`);
      }
      done++;
      if (done % 100 === 0 || done === tasks.length) {
        const pct = ((done / tasks.length) * 100).toFixed(1);
        console.log(`  [${pct}%] ${done}/${tasks.length} | 수집 아파트 ${aptMap.size}개`);
      }
    }
  }

  const t0 = Date.now();
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  const elapsed = ((Date.now() - t0) / 1000 / 60).toFixed(1);

  console.log(`\n✅ 수집 완료: ${aptMap.size}개 아파트, 에러 ${errors}건, ${elapsed}분 소요`);

  // ── 신고가 계산 ──────────────────────────────────
  const rows = [];
  for (const a of aptMap.values()) {
    if (a.baseMax > 0 && a.postMax > a.baseMax) {
      const gap = a.postMax - a.baseMax;
      const rate = (gap / a.baseMax) * 100;
      rows.push({
        region: a.region, dong: a.dong, aptName: a.aptName, area: a.area,
        baseMax: a.baseMax, baseDate: a.baseDate, baseFloor: a.baseFloor,
        postMax: a.postMax, postDate: a.postDate, postFloor: a.postFloor,
        gap, rate, postCount: a.postCount,
      });
    }
  }
  rows.sort((x, y) => y.rate - x.rate);

  console.log(`📈 신고가 경신: ${rows.length}개 / 수집 ${aptMap.size}개`);

  if (rows.length === 0) {
    console.log("⚠ 신고가 경신 아파트가 없습니다. 기간/지역 설정을 확인하세요.");
    return;
  }

  // ── CSV 작성 ────────────────────────────────────
  const headers = [
    "순위", "시도/구", "동", "아파트명", "전용면적(㎡)",
    "이전최고가(억)", "이전최고가일자", "이전층",
    "신고가(억)", "신고가일자", "신고가층",
    "상승폭(억)", "상승률(%)", "정권후거래건수",
  ];
  const eok = (manwon) => (manwon / 10000).toFixed(2);
  const lines = [headers.join(",")];
  rows.forEach((r, i) => {
    lines.push([
      i + 1, r.region, r.dong, r.aptName, r.area.toFixed(2),
      eok(r.baseMax), r.baseDate, r.baseFloor,
      eok(r.postMax), r.postDate, r.postFloor,
      eok(r.gap), r.rate.toFixed(2), r.postCount,
    ].map(csvCell).join(","));
  });

  const { writeFileSync } = await import("fs");
  const filename = "신고가분석_서울경기.csv";
  writeFileSync(filename, "﻿" + lines.join("\r\n"), "utf-8");

  console.log(`\n💾 저장 완료: ${filename}`);
  console.log("\n🏆 상승률 TOP 15:");
  rows.slice(0, 15).forEach((r, i) => {
    console.log(
      `  ${String(i + 1).padStart(2)}. ${r.region} ${r.dong} ${r.aptName} ` +
      `${r.area}㎡ | ${eok(r.baseMax)}억 → ${eok(r.postMax)}억 ` +
      `(+${eok(r.gap)}억, ${r.rate.toFixed(1)}%)`
    );
  });
  console.log("\n✨ 완료! CSV 파일을 엑셀에서 바로 열 수 있습니다.");
}

main().catch((e) => {
  console.error("치명적 에러:", e);
  process.exit(1);
});
