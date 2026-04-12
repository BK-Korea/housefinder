/**
 * 카카오톡 "나에게 보내기" API
 * 사용자의 access_token으로 본인에게 카카오톡 메시지를 전송합니다.
 */

interface KakaoTextMessage {
  objectType: "text";
  text: string;
  link: {
    webUrl?: string;
    mobileWebUrl?: string;
  };
  buttonTitle?: string;
}

export async function sendKakaoMessage(
  accessToken: string,
  apartmentName: string,
  dealType: string,
  price: string,
  area: string,
  floor: number,
  dealDate: string,
  apartmentUrl: string
) {
  const dealTypeKorean =
    dealType === "SALE" ? "매매" : dealType === "JEONSE" ? "전세" : "월세";

  const message: KakaoTextMessage = {
    objectType: "text",
    text: `🏠 새 실거래 알림\n\n${apartmentName}\n${dealTypeKorean} ${price}\n전용 ${area} / ${floor}층\n거래일: ${dealDate}`,
    link: {
      webUrl: apartmentUrl,
      mobileWebUrl: apartmentUrl,
    },
    buttonTitle: "상세보기",
  };

  const response = await fetch(
    "https://kapi.kakao.com/v2/api/talk/memo/default/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        template_object: JSON.stringify(message),
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Kakao message failed: ${JSON.stringify(error)}`);
  }

  return response.json();
}
