export interface HuazhuHotel {
  hotelId: number;
  hotelName: string;
  hotelNameEn: string;
  hotelAddr: string;
  hotelTel: string;
  cityName: string;
  cityId: number;
  brandName: string;
  starRating: string;
  longitude: string;
  latitude: string;
  facilities: string[];
  imageUrl: string;
  distance: string;
  lowestPrice: number | null;
  commentScore: string;
  commentCount: number;
  [key: string]: unknown;
}

export interface HotelListContent {
  hotels: HuazhuHotel[];
  totalCount: number;
  noResult: boolean;
  noResultMessageBig: string;
  noResultMessageSmall: string;
  [key: string]: unknown;
}