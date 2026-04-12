import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await auth();
  const userId = session?.user?.id;

  const apartment = await prisma.apartment.findUnique({
    where: { id },
    include: {
      transactions: {
        orderBy: [
          { dealYear: "desc" },
          { dealMonth: "desc" },
          { dealDay: "desc" },
        ],
      },
      watchlists: userId
        ? { where: { userId }, select: { id: true } }
        : false,
    },
  });

  if (!apartment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 거래 통계 계산
  const saleTransactions = apartment.transactions.filter(
    (t) => t.dealType === "SALE"
  );
  const jeonseTransactions = apartment.transactions.filter(
    (t) => t.dealType === "JEONSE"
  );

  const latestSale = saleTransactions[0];
  const latestJeonse = jeonseTransactions[0];

  const jeonseRatio =
    latestSale && latestJeonse && latestSale.price > 0
      ? Math.round((latestJeonse.price / latestSale.price) * 100)
      : null;

  const gap =
    latestSale && latestJeonse
      ? latestSale.price - latestJeonse.price
      : null;

  // 연도별 평균 매매가 (차트용)
  const priceByYear = saleTransactions.reduce(
    (acc, tx) => {
      const key = tx.dealYear;
      if (!acc[key]) acc[key] = { total: 0, count: 0 };
      acc[key].total += tx.price;
      acc[key].count += 1;
      return acc;
    },
    {} as Record<number, { total: number; count: number }>
  );

  const yearlyPrices = Object.entries(priceByYear)
    .map(([year, { total, count }]) => ({
      year: Number(year),
      avgPrice: Math.round(total / count),
    }))
    .sort((a, b) => a.year - b.year);

  return NextResponse.json({
    ...apartment,
    watchlists: undefined,
    isWatched:
      "watchlists" in apartment &&
      Array.isArray(apartment.watchlists) &&
      apartment.watchlists.length > 0,
    stats: {
      jeonseRatio,
      gap,
      totalTransactions: apartment.transactions.length,
      yearlyPrices,
    },
  });
}
