import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.alertSetting.findFirst({
    where: { userId: session.user.id },
  });

  return NextResponse.json(
    settings || {
      enabled: true,
      dealTypes: ["SALE", "JEONSE", "MONTHLY"],
      minPrice: null,
      maxPrice: null,
    }
  );
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const settings = await prisma.alertSetting.upsert({
    where: {
      id: body.id || "new",
    },
    create: {
      userId: session.user.id,
      enabled: body.enabled ?? true,
      dealTypes: body.dealTypes || ["SALE", "JEONSE", "MONTHLY"],
      minPrice: body.minPrice || null,
      maxPrice: body.maxPrice || null,
    },
    update: {
      enabled: body.enabled,
      dealTypes: body.dealTypes,
      minPrice: body.minPrice,
      maxPrice: body.maxPrice,
    },
  });

  return NextResponse.json(settings);
}
