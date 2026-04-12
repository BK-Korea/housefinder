import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");
  const parent = request.nextUrl.searchParams.get("parent");

  if (type === "sido") {
    const regions = await prisma.region.findMany({
      where: { sigungu: "", dong: "" },
      select: { code: true, sido: true },
      distinct: ["sido"],
      orderBy: { sido: "asc" },
    });

    return NextResponse.json(
      regions.map((r) => ({ code: r.code, name: r.sido }))
    );
  }

  if (type === "sigungu" && parent) {
    const parentRegion = await prisma.region.findUnique({
      where: { code: parent },
    });

    if (!parentRegion) {
      return NextResponse.json([]);
    }

    const regions = await prisma.region.findMany({
      where: {
        sido: parentRegion.sido,
        sigungu: { not: "" },
        dong: "",
      },
      select: { code: true, sigungu: true },
      distinct: ["sigungu"],
      orderBy: { sigungu: "asc" },
    });

    return NextResponse.json(
      regions.map((r) => ({ code: r.code, name: r.sigungu }))
    );
  }

  if (type === "dong" && parent) {
    const parentRegion = await prisma.region.findUnique({
      where: { code: parent },
    });

    if (!parentRegion) {
      return NextResponse.json([]);
    }

    const regions = await prisma.region.findMany({
      where: {
        sido: parentRegion.sido,
        sigungu: parentRegion.sigungu,
        dong: { not: "" },
      },
      select: { code: true, dong: true },
      distinct: ["dong"],
      orderBy: { dong: "asc" },
    });

    return NextResponse.json(
      regions.map((r) => ({ code: r.code, name: r.dong }))
    );
  }

  return NextResponse.json([]);
}
