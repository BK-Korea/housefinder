"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice, formatArea, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Heart,
  Layers,
  Car,
  Flame,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import type { DealType } from "@prisma/client";

interface ApartmentDetail {
  id: string;
  name: string;
  address: string;
  sido: string;
  sigungu: string;
  dong: string;
  buildYear: number | null;
  totalUnits: number | null;
  totalFloors: number | null;
  parkingSpaces: number | null;
  floorAreaRatio: number | null;
  buildingCoverage: number | null;
  heatingType: string | null;
  latitude: number | null;
  longitude: number | null;
  isWatched: boolean;
  transactions: {
    id: string;
    dealType: DealType;
    price: number;
    rentPrice: number | null;
    area: number;
    floor: number;
    dealYear: number;
    dealMonth: number;
    dealDay: number | null;
  }[];
  stats: {
    jeonseRatio: number | null;
    gap: number | null;
    totalTransactions: number;
    yearlyPrices: { year: number; avgPrice: number }[];
  };
}

export default function ApartmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [apartment, setApartment] = useState<ApartmentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDealType, setSelectedDealType] = useState<
    "ALL" | DealType
  >("ALL");

  useEffect(() => {
    fetch(`/api/apartments/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setApartment(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [id]);

  const handleToggleWatch = async () => {
    if (!session || !apartment) return;
    const method = apartment.isWatched ? "DELETE" : "POST";
    await fetch("/api/watchlist", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apartmentId: apartment.id }),
    });
    setApartment((prev) =>
      prev ? { ...prev, isWatched: !prev.isWatched } : null
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!apartment) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <p className="text-muted-foreground">아파트를 찾을 수 없습니다.</p>
        <Link href="/">
          <Button variant="link" className="mt-2">
            지도로 돌아가기
          </Button>
        </Link>
      </div>
    );
  }

  const filteredTransactions =
    selectedDealType === "ALL"
      ? apartment.transactions
      : apartment.transactions.filter(
          (t) => t.dealType === selectedDealType
        );

  const dealTypeLabel = (type: DealType) => {
    switch (type) {
      case "SALE":
        return "매매";
      case "JEONSE":
        return "전세";
      case "MONTHLY":
        return "월세";
    }
  };

  const maxPrice = Math.max(
    ...apartment.stats.yearlyPrices.map((p) => p.avgPrice),
    1
  );

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            지도로 돌아가기
          </Link>
          <h1 className="text-2xl font-bold">{apartment.name}</h1>
          <p className="text-muted-foreground">{apartment.address}</p>
        </div>
        {session && (
          <Button
            variant={apartment.isWatched ? "default" : "outline"}
            onClick={handleToggleWatch}
            className="gap-2 flex-shrink-0"
          >
            <Heart
              className={`h-4 w-4 ${apartment.isWatched ? "fill-white" : ""}`}
            />
            {apartment.isWatched ? "관심 등록됨" : "관심 등록"}
          </Button>
        )}
      </div>

      {/* 기본 정보 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <InfoCard
          icon={<Calendar className="h-4 w-4" />}
          label="건축년도"
          value={apartment.buildYear ? `${apartment.buildYear}년` : "-"}
        />
        <InfoCard
          icon={<Layers className="h-4 w-4" />}
          label="세대수 / 층수"
          value={`${apartment.totalUnits || "-"}세대 / ${apartment.totalFloors || "-"}층`}
        />
        <InfoCard
          icon={<Car className="h-4 w-4" />}
          label="주차대수"
          value={
            apartment.parkingSpaces
              ? `${apartment.parkingSpaces}대`
              : "-"
          }
        />
        <InfoCard
          icon={<Flame className="h-4 w-4" />}
          label="난방방식"
          value={apartment.heatingType || "-"}
        />
      </div>

      {/* 투자 지표 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <InfoCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="전세가율"
          value={
            apartment.stats.jeonseRatio
              ? `${apartment.stats.jeonseRatio}%`
              : "-"
          }
          highlight
        />
        <InfoCard
          icon={<BarChart3 className="h-4 w-4" />}
          label="매매-전세 GAP"
          value={
            apartment.stats.gap !== null
              ? formatPrice(apartment.stats.gap)
              : "-"
          }
          highlight
        />
        <InfoCard
          icon={<Building2 className="h-4 w-4" />}
          label="용적률"
          value={
            apartment.floorAreaRatio
              ? `${apartment.floorAreaRatio}%`
              : "-"
          }
        />
        <InfoCard
          icon={<Building2 className="h-4 w-4" />}
          label="건폐율"
          value={
            apartment.buildingCoverage
              ? `${apartment.buildingCoverage}%`
              : "-"
          }
        />
      </div>

      {/* 연도별 평균 매매가 차트 (심플 바 차트) */}
      {apartment.stats.yearlyPrices.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">연도별 평균 매매가</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {apartment.stats.yearlyPrices.map(({ year, avgPrice }) => (
                <div key={year} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-12">
                    {year}
                  </span>
                  <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{
                        width: `${(avgPrice / maxPrice) * 100}%`,
                        minWidth: "60px",
                      }}
                    >
                      <span className="text-[10px] text-primary-foreground font-medium">
                        {formatPrice(avgPrice)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 실거래 내역 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              실거래 내역 ({apartment.stats.totalTransactions}건)
            </CardTitle>
            <div className="flex gap-1">
              {(
                [
                  { value: "ALL", label: "전체" },
                  { value: "SALE", label: "매매" },
                  { value: "JEONSE", label: "전세" },
                  { value: "MONTHLY", label: "월세" },
                ] as const
              ).map(({ value, label }) => (
                <Button
                  key={value}
                  variant={
                    selectedDealType === value ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setSelectedDealType(value)}
                  className="text-xs h-7"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left py-2 font-medium">거래일</th>
                  <th className="text-left py-2 font-medium">유형</th>
                  <th className="text-right py-2 font-medium">거래금액</th>
                  <th className="text-right py-2 font-medium">면적</th>
                  <th className="text-right py-2 font-medium">층</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b last:border-0">
                    <td className="py-2 text-xs">
                      {tx.dealYear}.{String(tx.dealMonth).padStart(2, "0")}
                      {tx.dealDay
                        ? `.${String(tx.dealDay).padStart(2, "0")}`
                        : ""}
                    </td>
                    <td className="py-2">
                      <Badge
                        variant={
                          tx.dealType === "SALE"
                            ? "sale"
                            : tx.dealType === "JEONSE"
                              ? "jeonse"
                              : "monthly"
                        }
                        className="text-[10px]"
                      >
                        {dealTypeLabel(tx.dealType)}
                      </Badge>
                    </td>
                    <td className="py-2 text-right font-medium">
                      {formatPrice(tx.price)}
                      {tx.rentPrice ? ` / ${tx.rentPrice}만` : ""}
                    </td>
                    <td className="py-2 text-right text-xs text-muted-foreground">
                      {formatArea(tx.area)}
                    </td>
                    <td className="py-2 text-right text-xs">
                      {tx.floor}층
                    </td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-muted-foreground"
                    >
                      거래 내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${highlight ? "border-primary/30 bg-primary/5" : ""}`}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <p
        className={`font-semibold text-sm ${highlight ? "text-primary" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
