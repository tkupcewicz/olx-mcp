// Partner API request/response types

export interface PartnerAdvertResponse {
  id: number;
  status: string;
  url: string;
  title: string;
  description: string;
  category_id: number;
  advertiser_type: string;
  created_time: string;
  valid_to_time: string;
  last_refresh_time: string;
  params: PartnerParam[];
  images: PartnerImage[];
  location: PartnerLocation;
  contact: PartnerContact;
  salary?: PartnerSalary;
}

export interface PartnerParam {
  key: string;
  name: string;
  type: string;
  value: unknown;
}

export interface PartnerImage {
  url: string;
}

export interface PartnerLocation {
  city_id: number;
  district_id?: number;
  lat: number;
  lon: number;
}

export interface PartnerContact {
  name: string;
  phone?: string;
}

export interface PartnerSalary {
  value: number;
  currency: string;
  negotiable: boolean;
  type: string;
}

export interface PartnerAdvertListResponse {
  data: PartnerAdvertResponse[];
  links?: {
    self?: { href: string };
    next?: { href: string };
  };
}

export interface PartnerAdvertDetailResponse {
  data: PartnerAdvertResponse;
}

export interface PartnerCategoryAttribute {
  code: string;
  label: string;
  type: string;
  required: boolean;
  values?: Array<{ code: string; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    numeric?: boolean;
  };
  unit?: string;
}

export interface PartnerCategoryAttributesResponse {
  data: PartnerCategoryAttribute[];
}

export interface PartnerAdvertCreateRequest {
  title: string;
  description: string;
  category_id: number;
  advertiser_type?: string;
  params?: Record<string, unknown>;
  images?: Array<{ url: string }>;
  location?: {
    city_id: number;
    district_id?: number;
    lat?: number;
    lon?: number;
  };
  contact?: {
    name?: string;
    phone?: string;
  };
}

export interface PartnerAdvertUpdateRequest {
  title?: string;
  description?: string;
  params?: Record<string, unknown>;
  images?: Array<{ url: string }>;
  location?: {
    city_id: number;
    district_id?: number;
    lat?: number;
    lon?: number;
  };
  contact?: {
    name?: string;
    phone?: string;
  };
}

export interface PartnerErrorResponse {
  error: {
    status: number;
    title: string;
    detail: string;
  };
}
