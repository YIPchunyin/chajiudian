export interface HotelRequest {
  activityId: string;
  allowedBenefitsTicket: boolean;
  checkIn: string;
  checkOut: string;
  couponCaller: string;
  hotelId: string;
  isCanUseEcoupon: number;
  isCanUseThresholdCoupon: boolean;
  marketPrices: string;
  orderType: string;
  checkInType: string;
  ratePlanCode: string;
  roomPrices: string;
  needPreCoupon: boolean;
}

export interface CouponItem {
  pKID: number;
  couponName: string;
  couponText: string;
  couponValue: string;
  couponUnit: string;
  couponType: number;
  tiketNo: string;
  tiketType: string;
  isCanUse: boolean;
  canNotUseReason: string;
  canNotUseReasonCode: string;
  threshold: number;
  thresholdText: string;
  savings?: number;
  endDate: string;
  endDateDesc: string;
  beginDate: string;
  couponTag: string[];
  activityFlag: string;
  isDisplay: boolean;
  isFree: boolean;
  isMarketingPrice: boolean;
  isMultiple: boolean;
  isSelfUse: boolean;
  isYs: boolean;
  maxDiscount: boolean;
  orderLimitsType: string;
  preferentialType: string;
  prepayCoupon: boolean;
  prepayPrice: number;
  priceExtraInfo: string;
  thresholdTips: string;
  useUrl: string;
}

export interface BenefitGroup {
  couponType: string;
  name: string;
  icon: string;
  canUseCount: number;
  benefitList: any[];
  selectedText: string;
  useMaxLimit: number;
}

export interface BreakfastDailyPrice {
  date: string;
  breakfastPrice: number;
}

export interface BreakfastInfo {
  breakfastPrice: number;
  packageCode: string;
  maxBreakfastCountPerDay: number;
  tips: string;
  breakfastMaxToast: string;
  breakfastMinToast: string;
  breakfastDailyPrice: BreakfastDailyPrice[];
}

export interface HotelResponse {
  businessCode: string;
  code: number;
  message: string;
  responseDes: string;
  content: {
    benefitGroupList: BenefitGroup[];
    breakfastInfo: BreakfastInfo;
    couponList: Record<string, CouponItem[]>;
    orderCouponList: any[];
    recommendedCoupons: Record<string, CouponItem>;
    thresholdList: CouponItem[];
  };
}
