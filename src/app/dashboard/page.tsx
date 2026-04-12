"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatPrice, formatArea } from "@/lib/utils";
import {
  Bell,
  BellOff,
  Heart,
  Trash2,
  Building2,
  Settings,
  ExternalLink,
} from "lucide-react";
import type { DealType } from "@prisma/client";

interface WatchlistItem {
  id: string;
  apartmentId: string;
  createdAt: string;
  apartment: {
    id: string;
    name: string;
    address: string;
    sido: string;
    sigungu: string;
    dong: string;
    buildYear: number | null;
    totalUnits: number | null;
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
  };
}

interface AlertSettings {
  id?: string;
  enabled: boolean;
  dealTypes: DealType[];
  minPrice: number | null;
  maxPrice: number | null;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [alertSettings, setAlertSettings] = useState<AlertSettings>({
    enabled: true,
    dealTypes: ["SALE", "JEONSE", "MONTHLY"],
    minPrice: null,
    maxPrice: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!session) return;

    Promise.all([
      fetch("/api/watchlist").then((r) => r.json()),
      fetch("/api/alerts/settings").then((r) => r.json()),
    ]).then(([wl, as]) => {
      setWatchlist(wl);
      setAlertSettings(as);
      setIsLoading(false);
    });
  }, [session]);

  const removeFromWatchlist = async (apartmentId: string) => {
    await fetch("/api/watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apartmentId }),
    });
    setWatchlist((prev) =>
      prev.filter((w) => w.apartmentId !== apartmentId)
    );
  };

  const saveAlertSettings = async () => {
    const res = await fetch("/api/alerts/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(alertSettings),
    });
    const data = await res.json();
    setAlertSettings(data);
    setShowSettings(false);
  };

  if (status === "loading") {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center space-y-4">
        <Heart className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
        <h2 className="text-xl font-semibold">로그인이 필요합니다</h2>
        <p className="text-muted-foreground">
          관심 아파트를 등록하고 실거래 알림을 받으려면 로그인하세요.
        </p>
        <Button
          onClick={() => signIn("kakao")}
          className="bg-[#FEE500] text-[#191919] hover:bg-[#FDD835]"
        >
          카카오 로그인
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">관심 아파트</h1>
          <p className="text-muted-foreground text-sm">
            등록한 아파트에 새 실거래가 등록되면 카카오톡으로 알려드립니다.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          알림 설정
        </Button>
      </div>

      {/* 알림 설정 */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {alertSettings.enabled ? (
                <Bell className="h-4 w-4 text-primary" />
              ) : (
                <BellOff className="h-4 w-4 text-muted-foreground" />
              )}
              알림 설정
            </CardTitle>
            <CardDescription>
              관심 아파트의 새 실거래 등록 시 카카오톡 알림을 보냅니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">알림 활성화</label>
              <button
                onClick={() =>
                  setAlertSettings((prev) => ({
                    ...prev,
                    enabled: !prev.enabled,
                  }))
                }
                className={`w-11 h-6 rounded-full transition-colors ${
                  alertSettings.enabled ? "bg-primary" : "bg-muted"
                } relative`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform ${
                    alertSettings.enabled
                      ? "translate-x-5.5"
                      : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                알림 받을 거래 유형
              </label>
              <div className="flex gap-2">
                {(
                  [
                    { value: "SALE", label: "매매" },
                    { value: "JEONSE", label: "전세" },
                    { value: "MONTHLY", label: "월세" },
                  ] as const
                ).map(({ value, label }) => (
                  <Button
                    key={value}
                    variant={
                      alertSettings.dealTypes.includes(value)
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => {
                      setAlertSettings((prev) => ({
                        ...prev,
                        dealTypes: prev.dealTypes.includes(value)
                          ? prev.dealTypes.filter((d) => d !== value)
                          : [...prev.dealTypes, value],
                      }));
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  최소 금액 (만원)
                </label>
                <Input
                  type="number"
                  value={alertSettings.minPrice ?? ""}
                  onChange={(e) =>
                    setAlertSettings((prev) => ({
                      ...prev,
                      minPrice: e.target.value
                        ? Number(e.target.value)
                        : null,
                    }))
                  }
                  placeholder="제한 없음"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  최대 금액 (만원)
                </label>
                <Input
                  type="number"
                  value={alertSettings.maxPrice ?? ""}
                  onChange={(e) =>
                    setAlertSettings((prev) => ({
                      ...prev,
                      maxPrice: e.target.value
                        ? Number(e.target.value)
                        : null,
                    }))
                  }
                  placeholder="제한 없음"
                />
              </div>
            </div>

            <Button onClick={saveAlertSettings} className="w-full">
              설정 저장
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 관심 목록 */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-lg bg-muted animate-pulse"
            />
          ))}
        </div>
      ) : watchlist.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Heart className="h-12 w-12 text-muted-foreground opacity-30 mb-3" />
            <p className="text-muted-foreground">
              관심 등록한 아파트가 없습니다.
            </p>
            <Link href="/">
              <Button variant="link" className="mt-2">
                지도에서 아파트 찾기
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {watchlist.map((item) => {
            const apt = item.apartment;
            const latestSale = apt.transactions.find(
              (t) => t.dealType === "SALE"
            );
            const latestJeonse = apt.transactions.find(
              (t) => t.dealType === "JEONSE"
            );

            return (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/apartment/${apt.id}`}
                      className="flex-1 min-w-0"
                    >
                      <h3 className="font-semibold hover:text-primary transition-colors">
                        {apt.name}
                        <ExternalLink className="inline h-3 w-3 ml-1 opacity-50" />
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {apt.address}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {latestSale && (
                          <Badge variant="sale" className="text-xs">
                            매매 {formatPrice(latestSale.price)}
                          </Badge>
                        )}
                        {latestJeonse && (
                          <Badge variant="jeonse" className="text-xs">
                            전세 {formatPrice(latestJeonse.price)}
                          </Badge>
                        )}
                        {apt.buildYear && (
                          <span className="text-xs text-muted-foreground">
                            {apt.buildYear}년
                          </span>
                        )}
                        {apt.totalUnits && (
                          <span className="text-xs text-muted-foreground">
                            {apt.totalUnits}세대
                          </span>
                        )}
                      </div>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive flex-shrink-0"
                      onClick={() => removeFromWatchlist(apt.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
