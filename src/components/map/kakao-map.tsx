"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { MapBounds } from "@/types";

declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void;
        Map: new (
          container: HTMLElement,
          options: { center: unknown; level: number }
        ) => KakaoMap;
        LatLng: new (lat: number, lng: number) => KakaoLatLng;
        LatLngBounds: new () => KakaoLatLngBounds;
        Marker: new (options: {
          position: KakaoLatLng;
          map?: KakaoMap;
        }) => KakaoMarker;
        InfoWindow: new (options: {
          content: string;
          removable?: boolean;
        }) => KakaoInfoWindow;
        CustomOverlay: new (options: {
          content: string;
          position: KakaoLatLng;
          yAnchor?: number;
          map?: KakaoMap;
        }) => KakaoCustomOverlay;
        MarkerClusterer: new (options: {
          map: KakaoMap;
          averageCenter: boolean;
          minLevel: number;
        }) => KakaoMarkerClusterer;
        event: {
          addListener: (
            target: unknown,
            type: string,
            callback: () => void
          ) => void;
        };
      };
    };
  }
}

interface KakaoLatLng {
  getLat: () => number;
  getLng: () => number;
}

interface KakaoLatLngBounds {
  getSouthWest: () => KakaoLatLng;
  getNorthEast: () => KakaoLatLng;
  extend: (latlng: KakaoLatLng) => void;
}

interface KakaoMap {
  getCenter: () => KakaoLatLng;
  getLevel: () => number;
  getBounds: () => KakaoLatLngBounds;
  setCenter: (latlng: KakaoLatLng) => void;
  setLevel: (level: number) => void;
  panTo: (latlng: KakaoLatLng) => void;
}

interface KakaoMarker {
  setMap: (map: KakaoMap | null) => void;
  getPosition: () => KakaoLatLng;
}

interface KakaoInfoWindow {
  open: (map: KakaoMap, marker: KakaoMarker) => void;
  close: () => void;
}

interface KakaoCustomOverlay {
  setMap: (map: KakaoMap | null) => void;
}

interface KakaoMarkerClusterer {
  addMarkers: (markers: KakaoMarker[]) => void;
  clear: () => void;
}

interface ApartmentMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  price?: string;
  dealCount?: number;
}

interface KakaoMapProps {
  markers?: ApartmentMarker[];
  onBoundsChange?: (bounds: MapBounds, level: number) => void;
  onMarkerClick?: (id: string) => void;
  center?: { lat: number; lng: number };
  level?: number;
}

export function KakaoMapView({
  markers = [],
  onBoundsChange,
  onMarkerClick,
  center = { lat: 37.5665, lng: 126.978 }, // 서울 시청
  level = 8,
}: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const markersRef = useRef<KakaoMarker[]>([]);
  const overlaysRef = useRef<KakaoCustomOverlay[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 지도 초기화
  useEffect(() => {
    const script = document.createElement("script");
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JS_KEY}&autoload=false&libraries=clusterer`;
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      window.kakao.maps.load(() => {
        if (!containerRef.current) return;

        const map = new window.kakao.maps.Map(containerRef.current, {
          center: new window.kakao.maps.LatLng(center.lat, center.lng),
          level,
        });

        mapRef.current = map;
        setIsLoaded(true);

        // 지도 이동/줌 시 bounds 변경 이벤트
        const handleBoundsChange = () => {
          if (!mapRef.current || !onBoundsChange) return;
          const bounds = mapRef.current.getBounds();
          const sw = bounds.getSouthWest();
          const ne = bounds.getNorthEast();
          onBoundsChange(
            {
              sw: { lat: sw.getLat(), lng: sw.getLng() },
              ne: { lat: ne.getLat(), lng: ne.getLng() },
            },
            mapRef.current.getLevel()
          );
        };

        window.kakao.maps.event.addListener(map, "idle", handleBoundsChange);

        // 초기 bounds 전달
        setTimeout(handleBoundsChange, 500);
      });
    };

    return () => {
      document.head.removeChild(script);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 마커 업데이트
  const updateMarkers = useCallback(
    (newMarkers: ApartmentMarker[]) => {
      if (!mapRef.current || !isLoaded) return;

      // 기존 마커/오버레이 제거
      markersRef.current.forEach((m) => m.setMap(null));
      overlaysRef.current.forEach((o) => o.setMap(null));
      markersRef.current = [];
      overlaysRef.current = [];

      newMarkers.forEach((item) => {
        const position = new window.kakao.maps.LatLng(item.lat, item.lng);

        // 커스텀 오버레이 (가격 표시)
        const content = `
          <div
            style="
              padding: 4px 8px;
              background: #2563eb;
              color: white;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              white-space: nowrap;
              cursor: pointer;
              box-shadow: 0 2px 8px rgba(0,0,0,0.15);
              transform: translateY(-100%);
            "
            data-apartment-id="${item.id}"
            class="apartment-marker"
          >
            ${item.price || item.name}
            ${item.dealCount ? `<span style="opacity:0.8;font-size:10px"> (${item.dealCount})</span>` : ""}
          </div>
        `;

        const overlay = new window.kakao.maps.CustomOverlay({
          content,
          position,
          yAnchor: 1.3,
          map: mapRef.current!,
        });

        overlaysRef.current.push(overlay);

        // 히든 마커 (클릭 이벤트용)
        const marker = new window.kakao.maps.Marker({
          position,
          map: mapRef.current!,
        });
        marker.setMap(null); // 안 보이게

        markersRef.current.push(marker);
      });

      // 오버레이 클릭 이벤트 (이벤트 위임)
      const container = containerRef.current;
      if (container) {
        container.onclick = (e) => {
          const target = (e.target as HTMLElement).closest(
            ".apartment-marker"
          ) as HTMLElement | null;
          if (target && onMarkerClick) {
            const id = target.dataset.apartmentId;
            if (id) onMarkerClick(id);
          }
        };
      }
    },
    [isLoaded, onMarkerClick]
  );

  useEffect(() => {
    updateMarkers(markers);
  }, [markers, updateMarkers]);

  return (
    <div ref={containerRef} className="w-full h-full" />
  );
}
