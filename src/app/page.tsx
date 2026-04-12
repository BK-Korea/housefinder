"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { KakaoMapView } from "@/components/map/kakao-map";
import { ApartmentList } from "@/components/map/apartment-list";
import { FilterPanel } from "@/components/filters/filter-panel";
import {
  DEFAULT_FILTERS,
  type FilterState,
  type MapBounds,
  type ApartmentWithTransactions,
  type RegionOption,
} from "@/types";
import { List, Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const { data: session } = useSession();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [apartments, setApartments] = useState<ApartmentWithTransactions[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [mapLevel, setMapLevel] = useState(8);
  const [showList, setShowList] = useState(true);

  // 지역 옵션
  const [regions, setRegions] = useState<{
    sido: RegionOption[];
    sigungu: RegionOption[];
    dong: RegionOption[];
  }>({ sido: [], sigungu: [], dong: [] });

  // 지역 데이터 로드
  useEffect(() => {
    fetch("/api/regions?type=sido")
      .then((r) => r.json())
      .then((data) => setRegions((prev) => ({ ...prev, sido: data })))
      .catch(() => {});
  }, []);

  const handleRegionChange = useCallback(
    async (type: "sido" | "sigungu" | "dong", value: string) => {
      if (type === "sido" && value) {
        const res = await fetch(`/api/regions?type=sigungu&parent=${value}`);
        const data = await res.json();
        setRegions((prev) => ({ ...prev, sigungu: data, dong: [] }));
      } else if (type === "sigungu" && value) {
        const res = await fetch(`/api/regions?type=dong&parent=${value}`);
        const data = await res.json();
        setRegions((prev) => ({ ...prev, dong: data }));
      }
    },
    []
  );

  // 아파트 목록 조회
  const fetchApartments = useCallback(
    async (bounds?: MapBounds) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();

        if (bounds) {
          params.set("swLat", String(bounds.sw.lat));
          params.set("swLng", String(bounds.sw.lng));
          params.set("neLat", String(bounds.ne.lat));
          params.set("neLng", String(bounds.ne.lng));
        }

        if (filters.dealType !== "ALL") params.set("dealType", filters.dealType);
        if (filters.sido) params.set("sido", filters.sido);
        if (filters.sigungu) params.set("sigungu", filters.sigungu);
        if (filters.dong) params.set("dong", filters.dong);
        if (filters.minPrice) params.set("minPrice", String(filters.minPrice));
        if (filters.maxPrice) params.set("maxPrice", String(filters.maxPrice));
        if (filters.minArea) params.set("minArea", String(filters.minArea));
        if (filters.maxArea) params.set("maxArea", String(filters.maxArea));
        if (filters.minBuildYear) params.set("minBuildYear", String(filters.minBuildYear));
        if (filters.maxBuildYear) params.set("maxBuildYear", String(filters.maxBuildYear));
        if (filters.minFloor) params.set("minFloor", String(filters.minFloor));
        if (filters.maxFloor) params.set("maxFloor", String(filters.maxFloor));
        if (filters.minUnits) params.set("minUnits", String(filters.minUnits));
        if (filters.minFloorAreaRatio) params.set("minFloorAreaRatio", String(filters.minFloorAreaRatio));
        if (filters.maxFloorAreaRatio) params.set("maxFloorAreaRatio", String(filters.maxFloorAreaRatio));
        if (filters.heatingType) params.set("heatingType", filters.heatingType);

        const res = await fetch(`/api/apartments?${params.toString()}`);
        const data = await res.json();
        setApartments(data);
      } catch {
        console.error("Failed to fetch apartments");
      } finally {
        setIsLoading(false);
      }
    },
    [filters]
  );

  // 지도 이동 시
  const handleBoundsChange = useCallback(
    (bounds: MapBounds, level: number) => {
      setMapBounds(bounds);
      setMapLevel(level);
      fetchApartments(bounds);
    },
    [fetchApartments]
  );

  // 필터 변경 시
  useEffect(() => {
    if (mapBounds) {
      fetchApartments(mapBounds);
    }
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // 관심 아파트 토글
  const handleToggleWatch = async (
    apartmentId: string,
    isWatched: boolean
  ) => {
    if (!session) {
      alert("로그인이 필요합니다.");
      return;
    }

    const method = isWatched ? "POST" : "DELETE";
    await fetch("/api/watchlist", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apartmentId }),
    });

    setApartments((prev) =>
      prev.map((apt) =>
        apt.id === apartmentId ? { ...apt, isWatched } : apt
      )
    );
  };

  // 마커 데이터 변환
  const mapMarkers = apartments
    .filter((apt) => apt.latitude && apt.longitude)
    .map((apt) => {
      const latestTx = apt.transactions[0];
      return {
        id: apt.id,
        name: apt.name,
        lat: apt.latitude!,
        lng: apt.longitude!,
        price: latestTx
          ? `${Math.round(latestTx.price / 10000) > 0 ? Math.round(latestTx.price / 10000) + "억" : ""}${latestTx.price % 10000 > 0 ? (latestTx.price % 10000).toLocaleString() : ""}`
          : apt.name,
        dealCount: apt.transactions.length,
      };
    });

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <FilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        regions={regions}
        onRegionChange={handleRegionChange}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* 지도 */}
        <div className="flex-1 relative">
          <KakaoMapView
            markers={mapMarkers}
            onBoundsChange={handleBoundsChange}
            onMarkerClick={(id) => {
              window.location.href = `/apartment/${id}`;
            }}
          />

          {/* 모바일: 목록/지도 토글 */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 md:hidden z-10">
            <Button
              onClick={() => setShowList(!showList)}
              className="shadow-lg gap-2"
              size="sm"
            >
              {showList ? (
                <>
                  <MapIcon className="h-4 w-4" />
                  지도 보기
                </>
              ) : (
                <>
                  <List className="h-4 w-4" />
                  목록 보기
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 사이드바 - 아파트 목록 */}
        <div
          className={`
            ${showList ? "block" : "hidden"} md:block
            w-full md:w-96 border-l bg-white overflow-auto
            absolute md:relative inset-0 md:inset-auto z-10 md:z-auto
          `}
        >
          <ApartmentList
            apartments={apartments}
            onToggleWatch={session ? handleToggleWatch : undefined}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
