import type { DealType } from "@prisma/client";

export interface ApartmentWithTransactions {
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
  transactions: TransactionSummary[];
  isWatched?: boolean;
}

export interface TransactionSummary {
  id: string;
  dealType: DealType;
  price: number;
  rentPrice: number | null;
  area: number;
  floor: number;
  dealYear: number;
  dealMonth: number;
  dealDay: number | null;
}

export interface FilterState {
  dealType: DealType | "ALL";
  sido: string;
  sigungu: string;
  dong: string;
  minPrice: number | null;
  maxPrice: number | null;
  minArea: number | null;
  maxArea: number | null;
  minBuildYear: number | null;
  maxBuildYear: number | null;
  minFloor: number | null;
  maxFloor: number | null;
  minUnits: number | null;
  minFloorAreaRatio: number | null;
  maxFloorAreaRatio: number | null;
  minBuildingCoverage: number | null;
  maxBuildingCoverage: number | null;
  heatingType: string | null;
  minParkingRatio: number | null;
  // 투자 지표
  minJeonseRatio: number | null; // 전세가율
  maxGap: number | null; // GAP (매매-전세)
}

export const DEFAULT_FILTERS: FilterState = {
  dealType: "ALL",
  sido: "",
  sigungu: "",
  dong: "",
  minPrice: null,
  maxPrice: null,
  minArea: null,
  maxArea: null,
  minBuildYear: null,
  maxBuildYear: null,
  minFloor: null,
  maxFloor: null,
  minUnits: null,
  minFloorAreaRatio: null,
  maxFloorAreaRatio: null,
  minBuildingCoverage: null,
  maxBuildingCoverage: null,
  heatingType: null,
  minParkingRatio: null,
  minJeonseRatio: null,
  maxGap: null,
};

export interface MapBounds {
  sw: { lat: number; lng: number };
  ne: { lat: number; lng: number };
}

export interface RegionOption {
  code: string;
  name: string;
}
