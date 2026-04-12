import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    {
      id: "kakao",
      name: "Kakao",
      type: "oauth",
      authorization: {
        url: "https://kauth.kakao.com/oauth/authorize",
        params: {
          scope: "profile_nickname profile_image talk_message",
        },
      },
      token: "https://kauth.kakao.com/oauth/token",
      userinfo: "https://kapi.kakao.com/v2/user/me",
      clientId: process.env.KAKAO_CLIENT_ID,
      clientSecret: process.env.KAKAO_CLIENT_SECRET,
      profile(profile) {
        const kakaoId = String(profile.id);
        return {
          id: kakaoId,
          name: profile.kakao_account?.profile?.nickname ?? `user_${kakaoId}`,
          // 개인 카카오 앱은 이메일 권한이 없으므로 kakaoId 기반 가상 이메일 생성
          email: profile.kakao_account?.email ?? `${kakaoId}@kakao.user`,
          image: profile.kakao_account?.profile?.thumbnail_image_url,
          kakaoId,
        };
      },
    },
  ],
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
