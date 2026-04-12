import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  fetchApartmentSaleTransactions,
  parseSaleTransaction,
} from "@/lib/molit-api";

/**
 * Vercel Cron Job - 실거래 데이터 수집 (매매 전용)
 * 매일 2회 실행: 오전 9시, 오후 6시
 */
export async function GET(request: NextRequest) {
  // Cron 시크릿 검증
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

  // 관심 아파트가 있는 지역 코드 수집
  const watchedApartments = await prisma.apartment.findMany({
    where: {
      watchlists: { some: {} },
    },
    select: { regionCode: true },
    distinct: ["regionCode"],
  });

  const regionCodes = watchedApartments.map((a) => a.regionCode);

  if (regionCodes.length === 0) {
    return NextResponse.json({ message: "No watched regions", collected: 0 });
  }

  let totalCollected = 0;
  const newTransactions: {
    apartmentId: string;
    apartmentName: string;
    dealType: string;
    price: number;
    area: number;
    floor: number;
    dealYear: number;
    dealMonth: number;
    dealDay: number | null;
  }[] = [];

  for (const regionCode of regionCodes) {
    try {
      // 매매 데이터 수집
      const saleRaw = await fetchApartmentSaleTransactions(
        regionCode,
        yearMonth
      );

      for (const raw of saleRaw) {
        const parsed = parseSaleTransaction(raw);

        // 해당 아파트 찾기
        const apartment = await prisma.apartment.findFirst({
          where: {
            regionCode: { startsWith: regionCode.substring(0, 5) },
            name: parsed.aptName,
            dong: parsed.dong,
          },
        });

        if (!apartment) continue;

        // 중복 체크 후 삽입
        try {
          await prisma.transaction.create({
            data: {
              apartmentId: apartment.id,
              dealType: "SALE",
              price: parsed.price,
              area: parsed.area,
              floor: parsed.floor,
              dealYear: parsed.dealYear,
              dealMonth: parsed.dealMonth,
              dealDay: parsed.dealDay,
              cancelDealDate: parsed.cancelDealDate,
            },
          });

          totalCollected++;
          newTransactions.push({
            apartmentId: apartment.id,
            apartmentName: apartment.name,
            dealType: "SALE",
            price: parsed.price,
            area: parsed.area,
            floor: parsed.floor,
            dealYear: parsed.dealYear,
            dealMonth: parsed.dealMonth,
            dealDay: parsed.dealDay,
          });
        } catch {
          // unique constraint violation = duplicate, skip
        }
      }

    } catch (error) {
      console.error(`Failed to collect for region ${regionCode}:`, error);
    }
  }

  // 새 거래가 있으면 알림 발송 트리거
  if (newTransactions.length > 0) {
    try {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      await fetch(`${baseUrl}/api/alerts/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({ transactions: newTransactions }),
      });
    } catch (error) {
      console.error("Failed to trigger alerts:", error);
    }
  }

  return NextResponse.json({
    message: "Collection complete",
    collected: totalCollected,
    regions: regionCodes.length,
  });
}
