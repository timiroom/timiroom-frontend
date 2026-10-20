/**
 * 사업자·문의 정보. 사업자 등록 전에는 비어 있고, 화면은 "등록 후 표시"로 안내한다.
 * 값은 빌드할 때 NEXT_PUBLIC_* 환경 변수로 넣는다(배포 워크플로의 vars).
 */
export const SITE = {
  serviceName: "Align-it",
  operatorName: process.env.NEXT_PUBLIC_BUSINESS_NAME || "",
  representative: process.env.NEXT_PUBLIC_BUSINESS_REPRESENTATIVE || "",
  registrationNumber: process.env.NEXT_PUBLIC_BUSINESS_NUMBER || "",
  mailOrderNumber: process.env.NEXT_PUBLIC_MAIL_ORDER_NUMBER || "",
  address: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || "",
  phone: process.env.NEXT_PUBLIC_BUSINESS_PHONE || "",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
  privacyOfficer: process.env.NEXT_PUBLIC_PRIVACY_OFFICER || "",
};

export const hasBusinessInfo = Boolean(SITE.operatorName && SITE.registrationNumber);

/** 약관 시행일. 내용을 바꾸면 함께 바꾼다. */
export const LEGAL_EFFECTIVE_DATE = "2026년 10월 20일";

export const PENDING = "사업자 등록 후 표시합니다";

export const value = (v) => v || PENDING;
