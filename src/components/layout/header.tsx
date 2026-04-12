"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Building2, Heart, LogOut, Map, User } from "lucide-react";

export function Header() {
  const { data: session, status } = useSession();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Building2 className="h-6 w-6 text-primary" />
          <span>HouseFinder</span>
        </Link>

        <nav className="flex items-center gap-1 ml-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <Map className="h-4 w-4" />
              지도
            </Button>
          </Link>
          {session && (
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <Heart className="h-4 w-4" />
                관심목록
              </Button>
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {status === "loading" ? (
            <div className="h-8 w-20 animate-pulse rounded bg-muted" />
          ) : session ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{session.user?.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="gap-1"
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => signIn("kakao")}
              className="gap-2 bg-[#FEE500] text-[#191919] hover:bg-[#FDD835]"
            >
              카카오 로그인
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
