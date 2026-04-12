import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { Prisma, DealType } from "@prisma/client";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // 지도 bounds
  const swLat = searchParams.get("swLat");
  const swLng = searchParams.get("swLng");
  const neLat = searchParams.get("neLat");
  const neLng = searchParams.get("neLng");

  // 필터 파라미터
  const dealType = searchParams.get("dealType") as DealType | null;
  const sido = searchParams.get("sido");
  const sigungu = searchParams.get("sigungu");
  const dong = searchParams.get("dong");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const minArea = searchParams.get("minArea");
  const maxArea = searchParams.get("maxArea");
  const minBuildYear = searchParams.get("minBuildYear");
  const maxBuildYear = searchParams.get("maxBuildYear");
  const minFloor = searchParams.get("minFloor");
  const maxFloor = searchParams.get("maxFloor");
  const minUnits = searchParams.get("minUnits");
  const minFloorAreaRatio = searchParams.get("minFloorAreaRatio");
  const maxFloorAreaRatio = searchParams.get("maxFloorAreaRatio");
  const heatingType = searchParams.get("heatingType");

  // 아파트 조건 빌드
  const where: Prisma.ApartmentWhereInput = {};

  // 지도 bounds 필터
  if (swLat && swLng && neLat && neLng) {
    where.latitude = {
      gte: parseFloat(swLat),
      lte: parseFloat(neLat),
    };
    where.longitude = {
      gte: parseFloat(swLng),
      lte: parseFloat(neLng),
    };
  }

  // 지역 필터
  if (sido) {
    const region = await prisma.region.findUnique({ where: { code: sido } });
    if (region) where.sido = region.sido;
  }
  if (sigungu) {
    const region = await prisma.region.findUnique({ where: { code: sigungu } });
    if (region) where.sigungu = region.sigungu;
  }
  if (dong) {
    const region = await prisma.region.findUnique({ where: { code: dong } });
    if (region) where.dong = region.dong;
  }

  // 건물 필터
  if (minBuildYear) where.buildYear = { ...((where.buildYear as object) || {}), gte: parseInt(minBuildYear) };
  if (maxBuildYear) where.buildYear = { ...((where.buildYear as object) || {}), lte: parseInt(maxBuildYear) };
  if (minUnits) where.totalUnits = { gte: parseInt(minUnits) };
  if (minFloorAreaRatio) where.floorAreaRatio = { ...((where.floorAreaRatio as object) || {}), gte: parseFloat(minFloorAreaRatio) };
  if (maxFloorAreaRatio) where.floorAreaRatio = { ...((where.floorAreaRatio as object) || {}), lte: parseFloat(maxFloorAreaRatio) };
  if (heatingType) where.heatingType = heatingType;

  // 거래 조건 (하위 필터)
  const txWhere: Prisma.TransactionWhereInput = {};
  if (dealType) txWhere.dealType = dealType;
  if (minPrice) txWhere.price = { ...((txWhere.price as object) || {}), gte: parseInt(minPrice) };
  if (maxPrice) txWhere.price = { ...((txWhere.price as object) || {}), lte: parseInt(maxPrice) };
  if (minArea) txWhere.area = { ...((txWhere.area as object) || {}), gte: parseFloat(minArea) };
  if (maxArea) txWhere.area = { ...((txWhere.area as object) || {}), lte: parseFloat(maxArea) };
  if (minFloor) txWhere.floor = { ...((txWhere.floor as object) || {}), gte: parseInt(minFloor) };
  if (maxFloor) txWhere.floor = { ...((txWhere.floor as object) || {}), lte: parseInt(maxFloor) };

  // 거래 조건이 있으면 해당 거래가 있는 아파트만
  if (Object.keys(txWhere).length > 0) {
    where.transactions = { some: txWhere };
  }

  // 현재 유저의 관심 목록
  const session = await auth();
  const userId = session?.user?.id;

  const apartments = await prisma.apartment.findMany({
    where,
    include: {
      transactions: {
        orderBy: [{ dealYear: "desc" }, { dealMonth: "desc" }, { dealDay: "desc" }],
        take: 5,
        where: Object.keys(txWhere).length > 0 ? txWhere : undefined,
      },
      watchlists: userId
        ? { where: { userId }, select: { id: true } }
        : false,
    },
    take: 200,
    orderBy: { updatedAt: "desc" },
  });

  const result = apartments.map((apt) => ({
    id: apt.id,
    name: apt.name,
    address: apt.address,
    sido: apt.sido,
    sigungu: apt.sigungu,
    dong: apt.dong,
    buildYear: apt.buildYear,
    totalUnits: apt.totalUnits,
    totalFloors: apt.totalFloors,
    parkingSpaces: apt.parkingSpaces,
    floorAreaRatio: apt.floorAreaRatio,
    buildingCoverage: apt.buildingCoverage,
    heatingType: apt.heatingType,
    latitude: apt.latitude,
    longitude: apt.longitude,
    transactions: apt.transactions.map((tx) => ({
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
    isWatched:
      "watchlists" in apt &&
      Array.isArray(apt.watchlists) &&
      apt.watchlists.length > 0,
  }));

  return NextResponse.json(result);
}
