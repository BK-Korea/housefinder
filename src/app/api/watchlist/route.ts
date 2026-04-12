import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const watchlist = await prisma.watchlist.findMany({
    where: { userId: session.user.id },
    include: {
      apartment: {
        include: {
          transactions: {
            orderBy: [
              { dealYear: "desc" },
              { dealMonth: "desc" },
              { dealDay: "desc" },
            ],
            take: 3,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    watchlist.map((w) => ({
      id: w.id,
      apartmentId: w.apartmentId,
      createdAt: w.createdAt,
      apartment: {
        id: w.apartment.id,
        name: w.apartment.name,
        address: w.apartment.address,
        sido: w.apartment.sido,
        sigungu: w.apartment.sigungu,
        dong: w.apartment.dong,
        buildYear: w.apartment.buildYear,
        totalUnits: w.apartment.totalUnits,
        totalFloors: w.apartment.totalFloors,
        latitude: w.apartment.latitude,
        longitude: w.apartment.longitude,
        transactions: w.apartment.transactions.map((tx) => ({
          id: tx.id,
          dealType: tx.dealType,
          price: tx.price,
          rentPrice: tx.rentPrice,
          area: tx.area,
          floor: tx.floor,
          dealYear: tx.dealYear,
          dealMonth: tx.dealMonth,
          dealDay: tx.dealDay,
        })),
        isWatched: true,
      },
    }))
  );
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { apartmentId } = await request.json();

  const watchlist = await prisma.watchlist.upsert({
    where: {
      userId_apartmentId: {
        userId: session.user.id,
        apartmentId,
      },
    },
    create: {
      userId: session.user.id,
      apartmentId,
    },
    update: {},
  });

  return NextResponse.json(watchlist);
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { apartmentId } = await request.json();

  await prisma.watchlist.deleteMany({
    where: {
      userId: session.user.id,
      apartmentId,
    },
  });

  return NextResponse.json({ success: true });
}
