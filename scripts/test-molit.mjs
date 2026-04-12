/**
 * MOLIT API 키 동작 확인 스크립트
 * 사용: node scripts/test-molit.mjs
 */
import "dotenv/config";

const apiKey = process.env.MOLIT_API_KEY;
if (!apiKey || apiKey === "placeholder") {
  console.error("❌ MOLIT_API_KEY가 .env에 없습니다.");
  process.exit(1);
}

console.log("🔑 API Key:", apiKey.substring(0, 10) + "...");

// 1. 실거래가 API — 강남구(11680) 최근 월
const lastMonth = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
})();

console.log(`\n=== 1. 아파트 매매 실거래가 (강남구 ${lastMonth}) ===`);
{
  const url = new URL(
    "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev"
  );
  url.searchParams.set("serviceKey", apiKey);
  url.searchParams.set("LAWD_CD", "11680");
  url.searchParams.set("DEAL_YMD", lastMonth);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "3");
  url.searchParams.set("type", "json");

  try {
    const res = await fetch(url.toString());
    console.log("Status:", res.status);
    const text = await res.text();

    // 에러 응답은 XML로 오고, 정상은 JSON
    if (text.startsWith("<")) {
      const errMatch = text.match(/<returnAuthMsg>([^<]+)<\/returnAuthMsg>/);
      const codeMatch = text.match(/<returnReasonCode>([^<]+)<\/returnReasonCode>/);
      console.log("❌ 에러:", errMatch?.[1] ?? "unknown", codeMatch?.[1] ?? "");
      console.log("원문:", text.substring(0, 500));
    } else {
      const data = JSON.parse(text);
      const items = data?.response?.body?.items?.item;
      const list = Array.isArray(items) ? items : items ? [items] : [];
      console.log(`✅ ${list.length}건 조회 성공`);
      if (list[0]) {
        console.log("샘플:", {
          아파트명: list[0].aptName,
          거래금액: list[0].dealAmount,
          면적: list[0].excluUseAr,
          층: list[0].floor,
        });
      }
    }
  } catch (e) {
    console.log("❌ 네트워크 에러:", e.message);
  }
}

// 2. 공동주택 단지 목록 (강남구 역삼동 1168010100)
console.log("\n=== 2. 공동주택 단지 목록 (역삼동 1168010100) ===");
{
  const url = new URL(
    "https://apis.data.go.kr/1613000/AptBasisInfoServiceV3/getLegaldongAptList"
  );
  url.searchParams.set("serviceKey", apiKey);
  url.searchParams.set("bjdCode", "1168010100");
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "3");

  try {
    const res = await fetch(url.toString());
    console.log("Status:", res.status);
    const text = await res.text();
    const errMatch = text.match(/<returnAuthMsg>([^<]+)<\/returnAuthMsg>/);
    if (errMatch && errMatch[1] !== "NORMAL SERVICE.") {
      const codeMatch = text.match(/<returnReasonCode>([^<]+)<\/returnReasonCode>/);
      console.log("❌ 에러:", errMatch[1], codeMatch?.[1] ?? "");
      console.log("원문:", text.substring(0, 500));
    } else {
      const items = [...text.matchAll(/<item>([\s\S]*?)<\/item>/g)];
      console.log(`✅ ${items.length}개 단지 조회 성공`);
      if (items[0]) {
        const name = items[0][1].match(/<kaptName>([^<]+)<\/kaptName>/)?.[1];
        const code = items[0][1].match(/<kaptCode>([^<]+)<\/kaptCode>/)?.[1];
        console.log("샘플:", { 단지명: name, kaptCode: code });
      }
    }
  } catch (e) {
    console.log("❌ 네트워크 에러:", e.message);
  }
}

console.log("\n✨ 완료");
