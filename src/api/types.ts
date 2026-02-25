// Raw OLX API response types — mirrors the JSON structure from the internal frontend API

export interface RawSearchResponse {
  data: RawOfferSummary[];
  metadata: {
    total_elements: number;
    visible_total_count: number;
    promoted: number[];
    page: number;
  };
  links?: {
    self?: { href: string };
    next?: { href: string };
  };
}

export interface RawOfferSummary {
  id: number;
  url: string;
  title: string;
  last_refresh_time: string;
  created_time: string;
  valid_to_time: string;
  pushup_time: string | null;
  description: string;
  promotion: {
    highlighted: boolean;
    urgent: boolean;
    top_ad: boolean;
    options: string[];
    b2c_ad_page: boolean;
    premium_ad_page: boolean;
  };
  params: RawParam[];
  key_params: string[];
  business: boolean;
  user: {
    id: number;
    created: string;
    other_ads_enabled: boolean;
    name: string;
    logo: string | null;
    photo: string | null;
    banner_mobile: string;
    banner_desktop: string;
    company_name: string;
    about: string;
    b2c_business_page: boolean;
    is_online: boolean;
    last_seen: string;
  };
  status: string;
  contact: {
    name: string;
    phone: boolean;
    chat: boolean;
    negotiation: boolean;
    courier: boolean;
  };
  map: {
    zoom: number;
    lat: number;
    lon: number;
    radius: number;
    show_detailed: boolean;
  };
  location: {
    city: { id: number; name: string; normalized_name: string };
    region: { id: number; name: string; normalized_name: string };
    district?: { id: number; name: string; normalized_name: string };
  };
  photos: RawPhoto[];
  partner?: {
    code: string;
  };
  category: {
    id: number;
    type: string;
  };
  delivery: {
    rock: {
      offer_id: number | null;
      active: boolean;
      mode: string;
    };
  };
  safedeal: {
    weight: number;
    weight_grams: number;
    status: string;
    safedeal_blocked: boolean;
    allowed_quantity: number[];
  };
  shop: {
    subdomain: string | null;
  };
  offer_type: string;
}

export interface RawParam {
  key: string;
  name: string;
  type: string;
  value: {
    key?: string;
    label?: string;
    value?: number;
    type?: string;
    arranged?: boolean;
    budget?: boolean;
    currency?: string;
    negotiable?: boolean;
    converted_value?: number;
    previous_value?: number;
    converted_currency?: string;
    converted_previous_value?: number;
  };
}

export interface RawPhoto {
  id: number;
  filename: string;
  rotation: number;
  width: number;
  height: number;
  link: string;
}

export interface RawOfferDetailResponse {
  data: RawOfferSummary;
}

export interface RawCategoriesResponse {
  data: RawCategory[];
}

export interface RawCategory {
  id: number;
  name: string;
  parent_id: number | null;
  children: RawCategory[];
}
