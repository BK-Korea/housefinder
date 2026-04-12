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

// 1. 실거래가 API — 강남구(11680) 지난달
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

  try {
    const res = await fetch(url.toString());
    console.log("Status:", res.status);
    const xml = await res.text();

    const resultCode = xml.match(/<resultCode>([^<]+)<\/resultCode>/)?.[1];
    const resultMsg = xml.match(/<resultMsg>([^<]+)<\/resultMsg>/)?.[1];

    if (resultCode !== "000") {
      console.log(`❌ ${resultCode}: ${resultMsg}`);
      console.log(xml.substring(0, 500));
    } else {
      const totalCount = xml.match(/<totalCount>([^<]+)<\/totalCount>/)?.[1];
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
      console.log(`✅ totalCount=${totalCount}, 조회 ${items.length}건`);
      if (items[0]) {
        const f = (k) =>
          items[0][1].match(new RegExp(`<${k}>([^<]*)<\\/${k}>`))?.[1]?.trim();
        console.log("샘플:", {
          아파트명: f("aptNm"),
          거래금액: f("dealAmount") + "만원",
          면적: f("excluUseAr") + "㎡",
          층: f("floor"),
          지역: `${f("sggCd")}/${f("umdCd")} ${f("umdNm")}`,
        });
      }
    }
  } catch (e) {
    console.log("❌ 네트워크 에러:", e.message);
  }
}

// 2. 공동주택 단지 목록 (역삼동 1168010100)
console.log("\n=== 2. 공동주택 단지 목록 (역삼동 1168010100) ===");
{
  const url = new URL(
    "https://apis.data.go.kr/1613000/AptListService3/getLegaldongAptList3"
  );
  url.searchParams.set("serviceKey", apiKey);
  url.searchParams.set("_type", "json");
  url.searchParams.set("bjdCode", "1168010100");
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "3");

  try {
    const res = await fetch(url.toString());
    console.log("Status:", res.status);
    const data = await res.json();
    const code = data?.response?.header?.resultCode;
    const msg = data?.response?.header?.resultMsg;

    if (code !== "00") {
      console.log(`❌ ${code}: ${msg}`);
      console.log(JSON.stringify(data).substring(0, 500));
    } else {
      const body = data.response.body;
      const items = Array.isArray(body.items) ? body.items : [body.items];
      console.log(`✅ totalCount=${body.totalCount}, 조회 ${items.length}개`);
      if (items[0]) {
        console.log("샘플:", {
          단지명: items[0].kaptName,
          kaptCode: items[0].kaptCode,
          위치: `${items[0].as1} ${items[0].as2} ${items[0].as3}`,
        });
      }
    }
  } catch (e) {
    console.log("❌ 네트워크 에러:", e.message);
  }
}

console.log("\n✨ 완료");
