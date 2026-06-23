'use client';

interface BirthdayCoupon {
  name: string;
  couponText: string;
  couponType: number;
  couponValue: string;
  isCanUse: boolean;
  canNotUseReason: string;
  thresholdText?: string;
  beginDate: string;
  endDateDesc: string;
  savings?: number;
  date?: string;
}

interface BirthdayData {
  hotelId: string;
  hasBirthdayBenefit: boolean;
  canUseBirthday: boolean;
  recommendedBirthday: BirthdayCoupon | null;
  birthdayCoupons: BirthdayCoupon[];
  totalCoupons: number;
  usableCount: number;
}

interface BirthdayBenefitProps {
  data: BirthdayData;
  hotelName: string;
  onViewAllCoupons: () => void;
  onBack: () => void;
}

const COUPON_TYPE_LABELS: Record<number, string> = {
  1: '\u6298\u6263\u5238',
  2: '\u7acb\u51cf\u5238',
};

function is90PercentCoupon(coupon: BirthdayCoupon): boolean {
  return (coupon.couponName?.indexOf('\u0039\u6298') ?? -1) !== -1 || (coupon.couponText?.indexOf('\u0039\u6298') ?? -1) !== -1;
}

export default function BirthdayBenefit({ data, hotelName, onViewAllCoupons, onBack }: BirthdayBenefitProps) {
  const { hasBirthdayBenefit, canUseBirthday, recommendedBirthday, birthdayCoupons, usableCount, totalCoupons } = data;

  const highlightedCoupon = birthdayCoupons.filter(Boolean).find(is90PercentCoupon);

  return (
    <div className="bg-white rounded-xl shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <span>{String.fromCodePoint(0x1f382)}</span>
          <span>{'\u4e13\u5c5e\u751f\u65e5\u793c\u9047'}</span>
        </h2>
        <button onClick={onBack} className='text-sm text-blue-500 hover:text-blue-700'>{'\u2190 \u6362\u9152\u5e97'}</button>
      </div>

      <p className='text-sm text-gray-500 mb-4'>{'\u67e5\u8be2'} {hotelName} {'\u7684\u751f\u65e5\u793c\u9047'}</p>

      <div className={'rounded-xl p-5 mb-4 border-2 ' + (
        !hasBirthdayBenefit
          ? 'border-gray-200 bg-gray-50'
          : canUseBirthday
            ? 'border-pink-300 bg-pink-50'
            : 'border-yellow-200 bg-yellow-50'
      )}>
        {!hasBirthdayBenefit ? (
          <div className='text-center'>
            <div className='text-4xl mb-2'>{String.fromCodePoint(0x1f614)}</div>
            <div className='font-semibold text-gray-600'>{'\u8be5\u9152\u5e97\u6682\u65e0\u4e13\u5c5e\u751f\u65e5\u793c\u9047'}</div>
            <div className='text-sm text-gray-400 mt-1'>{'\u53ef\u5c1d\u8bd5\u5176\u4ed6\u9152\u5e97\u6216\u65e5\u671f'}</div>
          </div>
        ) : canUseBirthday ? (
          <div className='text-center'>
            <div className='text-4xl mb-2'>{String.fromCodePoint(0x1f389)}</div>
            <div className='font-semibold text-pink-600 text-lg'>{'\u53ef\u4f7f\u7528\u751f\u65e5\u793c\u9047\uff01'}</div>
            <div className='text-sm text-pink-500 mt-1'>
              {'\u5171'} {totalCoupons} {'\u9879\u751f\u65e5\u4f18\u60e0\uff0c'}{usableCount}{'\u9879\u53ef\u7528'}
            </div>
          </div>
        ) : (
          <div className='text-center'>
            <div className='text-4xl mb-2'>{String.fromCodePoint(0x1f605)}</div>
            <div className='font-semibold text-yellow-700'>{'\u6709\u751f\u65e5\u793c\u9047\u4f46\u5f53\u524d\u4e0d\u53ef\u7528'}</div>
            <div className='text-sm text-yellow-600 mt-1'>
              {'\u5171'} {totalCoupons} {'\u9879\u751f\u65e5\u4f18\u60e0\uff0c\u5747\u4e0d\u53ef\u7528'}
            </div>
          </div>
        )}
      </div>

      {highlightedCoupon && (
        <div className='mb-4'>
          <div className='flex items-center gap-2 mb-2'>
            <span className='text-sm font-bold text-yellow-600'>{String.fromCodePoint(0x2b50)} {'\u63a8\u8350\u751f\u65e5\u4f18\u60e0'}</span>
            <span className='text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full font-bold'>{'\u6700\u4f18\u60e0'}</span>
          </div>
          <NineDiscountCard coupon={highlightedCoupon} />
        </div>
      )}

      {birthdayCoupons.length > 0 && (
        <div>
          <div className='text-sm font-semibold text-gray-600 mb-2'>
            {'\u5168\u90e8\u751f\u65e5\u4f18\u60e0\uff08'}{birthdayCoupons.length}{'\uff09'}
          </div>
          <div className='grid grid-cols-1 gap-3'>
            {birthdayCoupons.map((c, i) =>
              is90PercentCoupon(c) ? null : <CouponCard key={i} coupon={c} />
            )}
          </div>
        </div>
      )}

      <div className='mt-5 flex gap-3'>
        <button onClick={onViewAllCoupons} className='flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition'>{'\u67e5\u770b\u5168\u90e8\u4f18\u60e0\u5238'}</button>
        <button onClick={onBack} className='px-4 py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition'>{'\u6362\u9152\u5e97'}</button>
      </div>
    </div>
  );
}

function NineDiscountCard({ coupon }: { coupon: BirthdayCoupon }) {
  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 via-amber-50 to-yellow-50 p-5 shadow-lg">
      <div className="absolute -top-4 -right-4 w-20 h-20 bg-yellow-300 rounded-full opacity-20" />
      <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-amber-300 rounded-full opacity-20" />

      <div className='relative'>
        <div className='flex items-center gap-1 text-xs text-yellow-700 font-semibold mb-1'>
          <span>{String.fromCodePoint(0x1f389)}</span>
          <span>{'\u751f\u65e5\u4e13\u4eab'}</span>
          <span className='bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded text-[10px]'>{'\u6298\u4e0a\u6298'}</span>
        </div>
        <div className='flex items-start justify-between'>
          <div>
            <div className='font-bold text-gray-800 text-base'>{coupon.couponName}</div>
            <div className='text-3xl font-extrabold mt-1 text-red-500 tracking-tight'>{coupon.couponText}</div>
            {coupon.savings !== undefined && coupon.savings > 0 && (
              <div className='text-base font-semibold text-green-600 mt-1'>{'\u9884\u8ba1\u8282\u7701'} \u00a5{coupon.savings}</div>
            )}
          </div>
          <div className='text-right text-xs text-gray-400 shrink-0'>
            {coupon.beginDate && <div>{coupon.beginDate}</div>}
            <div>{coupon.endDateDesc}</div>
          </div>
        </div>
        <div className='mt-2 flex items-center gap-2 flex-wrap'>
          <span className='text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-medium'>{'\u751f\u65e5\u7279\u6743'}</span>
          {coupon.date && (
            <span className='text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded'>{'\u4f4f'}{coupon.date}</span>
          )}
          {coupon.thresholdText && (
            <span className='text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded'>{coupon.thresholdText}</span>
          )}
        </div>
        {!coupon.isCanUse ? (
          <div className='mt-3 text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 font-medium'>{'\u274c'} {coupon.canNotUseReason || '\u4e0d\u53ef\u7528'}</div>
        ) : (
          <div className='mt-3 flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2 font-semibold'>
            <span>{'\u2705'}</span>
            <span>{'\u53ef\u4f7f\u7528 - \u7ed3\u8d26\u65f6\u81ea\u52a8\u4eab\u53d7\u6298\u6263'}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function CouponCard({ coupon }: { coupon: BirthdayCoupon }) {
  const isHighlight = is90PercentCoupon(coupon);
  if (isHighlight) return null;

  return (
    <div className={'border rounded-lg p-4 ' + (coupon.isCanUse ? 'border-pink-200 bg-pink-50/50' : 'border-gray-200 bg-gray-50 opacity-75')}>
      <div className='flex items-start justify-between'>
        <div>
          <div className='font-semibold text-gray-800'>{coupon.name}</div>
          <div className='text-2xl font-bold mt-1 text-red-500'>{coupon.couponText}</div>
          {coupon.savings !== undefined && coupon.savings > 0 && (
            <div className='text-sm text-green-600 mt-1'>{'\u9884\u8ba1\u8282\u7701'} \u00a5{coupon.savings}</div>
          )}
        </div>
        <div className='text-right text-xs text-gray-400'>
          {coupon.beginDate && <div>{coupon.beginDate}</div>}
          <div>{coupon.endDateDesc}</div>
        </div>
      </div>
      <div className='mt-2 flex items-center gap-2 flex-wrap'>
        <span className='text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded'>{COUPON_TYPE_LABELS[coupon.couponType] || '\u672a\u77e5'}</span>
        {coupon.date && <span className='text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded'>{'\u4f4f'}{coupon.date}</span>}
        {coupon.thresholdText && <span className='text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded'>{coupon.thresholdText}</span>}
      </div>
      {!coupon.isCanUse && <div className='mt-2 text-xs text-red-400'>{'\u274c'} {coupon.canNotUseReason || '\u4e0d\u53ef\u7528'}</div>}
      {coupon.isCanUse && <div className='mt-2 text-xs text-green-500 font-medium'>{'\u2705'} {'\u53ef\u7528'}</div>}
    </div>
  );
}