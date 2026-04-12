"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_FILTERS, type FilterState, type RegionOption } from "@/types";
import {
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from "lucide-react";

interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  regions: {
    sido: RegionOption[];
    sigungu: RegionOption[];
    dong: RegionOption[];
  };
  onRegionChange: (
    type: "sido" | "sigungu" | "dong",
    value: string
  ) => void;
}

export function FilterPanel({
  filters,
  onFiltersChange,
  regions,
  onRegionChange,
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showInvestment, setShowInvestment] = useState(false);

  const updateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    onFiltersChange(DEFAULT_FILTERS);
  };

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => {
      if (key === "dealType") return value !== "ALL";
      if (typeof value === "string") return value !== "";
      return value !== null;
    }
  ).length;

  return (
    <div className="bg-white border-b shadow-sm">
      {/* 상단 바 - 항상 표시 */}
      <div className="flex items-center gap-2 p-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          필터
          {activeFilterCount > 0 && (
            <Badge variant="default" className="ml-1 h-5 w-5 p-0 justify-center text-[10px]">
              {activeFilterCount}
            </Badge>
          )}
          {isExpanded ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </Button>

        {/* 거래 유형 퀵 필터 */}
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
              variant={filters.dealType === value ? "default" : "outline"}
              size="sm"
              onClick={() => updateFilter("dealType", value)}
              className="text-xs h-8"
            >
              {label}
            </Button>
          ))}
        </div>

        {/* 지역 선택 */}
        <div className="flex gap-1 ml-2">
          <Select
            value={filters.sido}
            onChange={(e) => {
              updateFilter("sido", e.target.value);
              updateFilter("sigungu", "");
              updateFilter("dong", "");
              onRegionChange("sido", e.target.value);
            }}
            className="h-8 text-xs w-28"
          >
            <option value="">시/도</option>
            {regions.sido.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </Select>

          <Select
            value={filters.sigungu}
            onChange={(e) => {
              updateFilter("sigungu", e.target.value);
              updateFilter("dong", "");
              onRegionChange("sigungu", e.target.value);
            }}
            className="h-8 text-xs w-28"
            disabled={!filters.sido}
          >
            <option value="">시/군/구</option>
            {regions.sigungu.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </Select>

          <Select
            value={filters.dong}
            onChange={(e) => {
              updateFilter("dong", e.target.value);
              onRegionChange("dong", e.target.value);
            }}
            className="h-8 text-xs w-28"
            disabled={!filters.sigungu}
          >
            <option value="">읍/면/동</option>
            {regions.dong.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </Select>
        </div>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="gap-1 text-xs text-muted-foreground ml-auto"
          >
            <RotateCcw className="h-3 w-3" />
            초기화
          </Button>
        )}
      </div>

      {/* 확장된 필터 영역 */}
      {isExpanded && (
        <div className="border-t p-4 space-y-4">
          {/* 기본 필터 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <FilterRange
              label="매매가 (만원)"
              minValue={filters.minPrice}
              maxValue={filters.maxPrice}
              onMinChange={(v) => updateFilter("minPrice", v)}
              onMaxChange={(v) => updateFilter("maxPrice", v)}
              minPlaceholder="최소"
              maxPlaceholder="최대"
            />
            <FilterRange
              label="전용면적 (㎡)"
              minValue={filters.minArea}
              maxValue={filters.maxArea}
              onMinChange={(v) => updateFilter("minArea", v)}
              onMaxChange={(v) => updateFilter("maxArea", v)}
              minPlaceholder="최소"
              maxPlaceholder="최대"
            />
            <FilterRange
              label="입주년도"
              minValue={filters.minBuildYear}
              maxValue={filters.maxBuildYear}
              onMinChange={(v) => updateFilter("minBuildYear", v)}
              onMaxChange={(v) => updateFilter("maxBuildYear", v)}
              minPlaceholder="시작"
              maxPlaceholder="끝"
            />
            <FilterRange
              label="층"
              minValue={filters.minFloor}
              maxValue={filters.maxFloor}
              onMinChange={(v) => updateFilter("minFloor", v)}
              onMaxChange={(v) => updateFilter("maxFloor", v)}
              minPlaceholder="최저"
              maxPlaceholder="최고"
            />
          </div>

          {/* 건물 정보 필터 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                최소 세대수
              </label>
              <Input
                type="number"
                value={filters.minUnits ?? ""}
                onChange={(e) =>
                  updateFilter(
                    "minUnits",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                placeholder="예: 300"
                className="h-8 text-xs"
              />
            </div>
            <FilterRange
              label="용적률 (%)"
              minValue={filters.minFloorAreaRatio}
              maxValue={filters.maxFloorAreaRatio}
              onMinChange={(v) => updateFilter("minFloorAreaRatio", v)}
              onMaxChange={(v) => updateFilter("maxFloorAreaRatio", v)}
              minPlaceholder="최소"
              maxPlaceholder="최대"
            />
            <FilterRange
              label="건폐율 (%)"
              minValue={filters.minBuildingCoverage}
              maxValue={filters.maxBuildingCoverage}
              onMinChange={(v) => updateFilter("minBuildingCoverage", v)}
              onMaxChange={(v) => updateFilter("maxBuildingCoverage", v)}
              minPlaceholder="최소"
              maxPlaceholder="최대"
            />
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                난방방식
              </label>
              <Select
                value={filters.heatingType ?? ""}
                onChange={(e) =>
                  updateFilter(
                    "heatingType",
                    e.target.value || null
                  )
                }
                className="h-8 text-xs"
              >
                <option value="">전체</option>
                <option value="지역난방">지역난방</option>
                <option value="중앙난방">중앙난방</option>
                <option value="개별난방">개별난방</option>
              </Select>
            </div>
          </div>

          {/* 투자 지표 */}
          <div>
            <button
              onClick={() => setShowInvestment(!showInvestment)}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              투자 지표 필터
              {showInvestment ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>

            {showInvestment && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    최소 전세가율 (%)
                  </label>
                  <Input
                    type="number"
                    value={filters.minJeonseRatio ?? ""}
                    onChange={(e) =>
                      updateFilter(
                        "minJeonseRatio",
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    placeholder="예: 60"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    최대 GAP (만원)
                  </label>
                  <Input
                    type="number"
                    value={filters.maxGap ?? ""}
                    onChange={(e) =>
                      updateFilter(
                        "maxGap",
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    placeholder="예: 10000"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    최소 주차비율 (대/세대)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    value={filters.minParkingRatio ?? ""}
                    onChange={(e) =>
                      updateFilter(
                        "minParkingRatio",
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    placeholder="예: 1.0"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 범위 입력 헬퍼 컴포넌트
function FilterRange({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  minPlaceholder,
  maxPlaceholder,
}: {
  label: string;
  minValue: number | null;
  maxValue: number | null;
  onMinChange: (v: number | null) => void;
  onMaxChange: (v: number | null) => void;
  minPlaceholder: string;
  maxPlaceholder: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">
        {label}
      </label>
      <div className="flex gap-1 items-center">
        <Input
          type="number"
          value={minValue ?? ""}
          onChange={(e) =>
            onMinChange(e.target.value ? Number(e.target.value) : null)
          }
          placeholder={minPlaceholder}
          className="h-8 text-xs"
        />
        <span className="text-muted-foreground text-xs">~</span>
        <Input
          type="number"
          value={maxValue ?? ""}
          onChange={(e) =>
            onMaxChange(e.target.value ? Number(e.target.value) : null)
          }
          placeholder={maxPlaceholder}
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
}
