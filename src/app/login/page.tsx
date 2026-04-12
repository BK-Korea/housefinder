"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-muted/30">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">HouseFinder 로그인</CardTitle>
          <CardDescription>
            카카오 계정으로 로그인하여 관심 아파트를 등록하고
            실거래 알림을 받아보세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => signIn("kakao", { callbackUrl: "/" })}
            className="w-full bg-[#FEE500] text-[#191919] hover:bg-[#FDD835] font-medium h-12 text-base gap-3"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M9 0.5C4.029 0.5 0 3.588 0 7.393C0 9.81 1.558 11.935 3.931 13.167L2.933 16.74C2.858 17.008 3.163 17.222 3.397 17.068L7.571 14.224C8.04 14.272 8.516 14.297 9 14.297C13.971 14.297 18 11.209 18 7.404C18 3.599 13.971 0.5 9 0.5Z"
                fill="#191919"
              />
            </svg>
            카카오 로그인
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-4">
            로그인 시 카카오톡 메시지 발송 권한에 동의하시면
            실거래 알림을 받을 수 있습니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
