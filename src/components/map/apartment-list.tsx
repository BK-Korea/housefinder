"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Building2, Calendar, Layers, ArrowUpDown } from "lucide-react";
import { formatPrice, formatArea } from "@/lib/utils";
import type { ApartmentWithTransactions } from "@/types";

interface ApartmentListProps {
  apartments: ApartmentWithTransactions[];
  onToggleWatch?: (apartmentId: string, isWatched: boolean) => void;
  isLoading?: boolean;
}

export function ApartmentList({
  apartments,
  onToggleWatch,
  isLoading,
}: ApartmentListProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-lg bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (apartments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <Building2 className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm">해당 조건의 아파트가 없습니다.</p>
        <p className="text-xs mt-1">필터 조건을 변경해보세요.</p>
      </div>
    );
  }

  return (
    <div className="divide-y overflow-auto">
      <div className="p-3 bg-muted/30 text-xs text-muted-foreground flex justify-between items-center sticky top-0 bg-white z-10">
        <span>총 {apartments.length}개 단지</span>
        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1">
          <ArrowUpDown className="h-3 w-3" />
          정렬
        </Button>
      </div>

      {apartments.map((apt) => {
        const latestSale = apt.transactions.find(
          (t) => t.dealType === "SALE"
        );
        const latestJeonse = apt.transactions.find(
          (t) => t.dealType === "JEONSE"
        );

        return (
          <div key={apt.id} className="p-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/apartment/${apt.id}`}
                className="flex-1 min-w-0"
              >
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm truncate">
                    {apt.name}
                  </h3>
                  {apt.buildYear && (
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      {apt.buildYear}년
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mb-2">
                  {apt.address}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {latestSale && (
                    <Badge variant="sale" className="text-[10px]">
                      매매 {formatPrice(latestSale.price)}
                    </Badge>
                  )}
                  {latestJeonse && (
                    <Badge variant="jeonse" className="text-[10px]">
                      전세 {formatPrice(latestJeonse.price)}
                    </Badge>
                  )}
                  {latestSale && (
                    <span className="text-[10px] text-muted-foreground">
                      {formatArea(latestSale.area)}
                    </span>
                  )}
                </div>

                <div className="flex gap-3 mt-1.5 text-[10px] text-muted-foreground">
                  {apt.totalUnits && (
                    <span className="flex items-center gap-0.5">
                      <Layers className="h-3 w-3" />
                      {apt.totalUnits}세대
                    </span>
                  )}
                  {apt.totalFloors && (
                    <span className="flex items-center gap-0.5">
                      <Building2 className="h-3 w-3" />
                      {apt.totalFloors}층
                    </span>
                  )}
                  {latestSale && latestJeonse && latestSale.price > 0 && (
                    <span className="text-primary font-medium">
                      전세가율{" "}
                      {Math.round(
                        (latestJeonse.price / latestSale.price) * 100
                      )}
                      %
                    </span>
                  )}
                </div>
              </Link>

              {onToggleWatch && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onToggleWatch(apt.id, !apt.isWatched);
                  }}
                  className="p-1.5 rounded-full hover:bg-muted transition-colors flex-shrink-0"
                >
                  <Heart
                    className={`h-4 w-4 ${
                      apt.isWatched
                        ? "fill-red-500 text-red-500"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
