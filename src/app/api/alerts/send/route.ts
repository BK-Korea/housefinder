import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendKakaoMessage } from "@/lib/kakao-message";
import { formatPrice, formatArea } from "@/lib/utils";

interface NewTransaction {
  apartmentId: string;
  apartmentName: string;
  dealType: string;
  price: number;
  area: number;
  floor: number;
  dealYear: number;
  dealMonth: number;
  dealDay: number | null;
}

/**
 * 새 실거래 발생 시 관심 사용자에게 카카오톡 알림 발송
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { transactions } = (await request.json()) as {
    transactions: NewTransaction[];
  };

  let sentCount = 0;

  // 아파트별로 그룹핑
  const byApartment = new Map<string, NewTransaction[]>();
  for (const tx of transactions) {
    const existing = byApartment.get(tx.apartmentId) || [];
    existing.push(tx);
    byApartment.set(tx.apartmentId, existing);
  }

  for (const [apartmentId, txList] of byApartment) {
    // 해당 아파트를 관심 등록한 사용자 조회
    const watchers = await prisma.watchlist.findMany({
      where: { apartmentId },
      include: {
        user: {
          include: {
            accounts: {
              where: { provider: "kakao" },
              select: { access_token: true },
            },
            alertSettings: true,
          },
        },
      },
    });

    for (const watcher of watchers) {
      const user = watcher.user;
      const accessToken = user.accounts[0]?.access_token;
      const alertSetting = user.alertSettings[0];

      // 알림이 비활성화된 경우 스킵
      if (alertSetting && !alertSetting.enabled) continue;

      // 액세스 토큰이 없는 경우 스킵
      if (!accessToken) continue;

      for (const tx of txList) {
        // 거래 유형 필터
        if (
          alertSetting?.dealTypes &&
          !alertSetting.dealTypes.includes(tx.dealType as "SALE" | "JEONSE" | "MONTHLY")
        ) {
          continue;
        }

        // 가격 필터
        if (alertSetting?.minPrice && tx.price < alertSetting.minPrice)
          continue;
        if (alertSetting?.maxPrice && tx.price > alertSetting.maxPrice)
          continue;

        try {
          const baseUrl =
            process.env.NEXTAUTH_URL || "http://localhost:3000";
          const apartmentUrl = `${baseUrl}/apartment/${apartmentId}`;
          const dealDate = `${tx.dealYear}.${String(tx.dealMonth).padStart(2, "0")}${tx.dealDay ? `.${String(tx.dealDay).padStart(2, "0")}` : ""}`;

          await sendKakaoMessage(
            accessToken,
            tx.apartmentName,
            tx.dealType,
            formatPrice(tx.price),
            formatArea(tx.area),
            tx.floor,
            dealDate,
            apartmentUrl
          );

          sentCount++;
        } catch (error) {
          console.error(
            `Failed to send alert to user ${user.id}:`,
            error
          );
        }
      }
    }
  }

  return NextResponse.json({
    message: "Alerts sent",
    sent: sentCount,
  });
}
