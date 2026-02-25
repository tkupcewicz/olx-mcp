export interface OfferSummary {
  id: number;
  title: string;
  price: number | null;
  currency: string;
  negotiable: boolean;
  url: string;
  cityName: string;
  regionName: string;
  categoryId: number;
  createdAt: string;
  imageUrl: string | null;
  isPromoted: boolean;
  isBusiness: boolean;
}

export interface OfferParam {
  key: string;
  name: string;
  value: string;
}

export interface Offer extends OfferSummary {
  description: string;
  params: OfferParam[];
  images: string[];
  user: {
    id: number;
    name: string;
    createdAt: string;
  };
  location: {
    cityName: string;
    regionName: string;
    lat: number | null;
    lon: number | null;
  };
}

export interface SearchResult {
  offers: OfferSummary[];
  totalCount: number;
  page: number;
  hasNextPage: boolean;
}

export interface Category {
  id: number;
  name: string;
  parentId: number | null;
  children: Category[];
}

export interface TrackedSearch {
  id: string;
  name: string;
  country: string;
  query: string | null;
  categoryId: number | null;
  regionId: number | null;
  cityId: number | null;
  priceMin: number | null;
  priceMax: number | null;
  filtersJson: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PriceSnapshot {
  id: number;
  trackingId: string;
  snapshotDate: string;
  totalOffers: number;
  avgPrice: number | null;
  medianPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  createdAt: string;
}

export interface SnapshotOffer {
  id: number;
  snapshotId: number;
  offerId: number;
  title: string;
  price: number | null;
  currency: string;
  url: string;
}

export interface PriceHistory {
  trackedSearch: TrackedSearch;
  snapshots: PriceSnapshot[];
}

export interface OfferComparison {
  offers: Offer[];
  priceRange: {
    min: number | null;
    max: number | null;
    avg: number | null;
  };
  commonParams: string[];
  paramDiffs: Record<string, Record<number, string>>;
}

// Partner API types for advert management

export interface Advert {
  id: number;
  status: string;
  url: string;
  title: string;
  description: string;
  categoryId: number;
  price: number | null;
  currency: string;
  location: {
    cityId: number;
    districtId?: number;
    lat: number;
    lon: number;
  };
  images: string[];
  attributes: Record<string, string | number | boolean>;
  createdAt: string;
  validTo: string;
}

export interface AdvertInput {
  title: string;
  description: string;
  categoryId: number;
  price?: number;
  currency?: string;
  cityId: number;
  districtId?: number;
  lat?: number;
  lon?: number;
  images?: string[];
  attributes?: Record<string, string | number | boolean>;
  contact?: {
    name?: string;
    phone?: string;
  };
}

export interface AdvertAttribute {
  code: string;
  label: string;
  type: string;
  required: boolean;
  values?: Array<{ code: string; label: string }>;
  min?: number;
  max?: number;
  unit?: string;
}
