import type { OlxClient } from "../api/client.js";
import type {
  RawSearchResponse,
  RawOfferDetailResponse,
  RawOfferSummary,
  RawParam,
} from "../api/types.js";
import { getCountryConfig } from "../config.js";
import type { Offer, OfferSummary, SearchResult } from "../types/domain.js";

export interface SearchParams {
  query?: string;
  categoryId?: number;
  regionId?: number;
  cityId?: number;
  priceMin?: number;
  priceMax?: number;
  sortBy?: "created_at:desc" | "created_at:asc" | "filter_float_price:asc" | "filter_float_price:desc" | "relevance:desc";
  page?: number;
  limit?: number;
  country?: string;
}

function extractPrice(params: RawParam[]): { price: number | null; currency: string; negotiable: boolean } {
  const priceParam = params.find((p) => p.key === "price");
  return {
    price: priceParam?.value?.value ?? null,
    currency: priceParam?.value?.currency ?? "PLN",
    negotiable: priceParam?.value?.negotiable ?? false,
  };
}

function mapOfferSummary(raw: RawOfferSummary): OfferSummary {
  const { price, currency, negotiable } = extractPrice(raw.params);
  return {
    id: raw.id,
    title: raw.title,
    price,
    currency,
    negotiable,
    url: raw.url,
    cityName: raw.location?.city?.name ?? "",
    regionName: raw.location?.region?.name ?? "",
    categoryId: raw.category?.id ?? 0,
    createdAt: raw.created_time,
    imageUrl: raw.photos?.[0]?.link ?? null,
    isPromoted: raw.promotion?.highlighted || raw.promotion?.top_ad || false,
    isBusiness: raw.business,
  };
}

function mapOffer(raw: RawOfferSummary): Offer {
  const summary = mapOfferSummary(raw);
  return {
    ...summary,
    description: raw.description ?? "",
    params: raw.params
      .filter((p) => p.key !== "price")
      .map((p) => ({
        key: p.key,
        name: p.name,
        value: p.value?.label ?? p.value?.key ?? String(p.value?.value ?? ""),
      })),
    images: raw.photos?.map((p) => p.link) ?? [],
    user: {
      id: raw.user?.id ?? 0,
      name: raw.user?.name ?? "",
      createdAt: raw.user?.created ?? "",
    },
    location: {
      cityName: raw.location?.city?.name ?? "",
      regionName: raw.location?.region?.name ?? "",
      lat: raw.map?.lat ?? null,
      lon: raw.map?.lon ?? null,
    },
  };
}

export async function searchOffers(
  client: OlxClient,
  params: SearchParams,
): Promise<SearchResult> {
  const country = params.country ?? "pl";
  const config = getCountryConfig(country);

  const queryParams: Record<string, string | number | undefined> = {
    offset: ((params.page ?? 1) - 1) * (params.limit ?? 40),
    limit: params.limit ?? 40,
    query: params.query,
    category_id: params.categoryId,
    region_id: params.regionId,
    city_id: params.cityId,
    sort_by: params.sortBy ?? "created_at:desc",
    currency: config.currency,
  };

  if (params.priceMin !== undefined) {
    queryParams["filter_float_price:from"] = params.priceMin;
  }
  if (params.priceMax !== undefined) {
    queryParams["filter_float_price:to"] = params.priceMax;
  }

  const raw = await client.get<RawSearchResponse>("/offers", country, queryParams);

  return {
    offers: raw.data.map(mapOfferSummary),
    totalCount: raw.metadata?.total_elements ?? raw.data.length,
    page: params.page ?? 1,
    hasNextPage: !!raw.links?.next,
  };
}

export async function getOffer(
  client: OlxClient,
  offerId: number,
  country?: string,
): Promise<Offer> {
  const c = country ?? "pl";
  const raw = await client.get<RawOfferDetailResponse>(`/offers/${offerId}`, c);
  return mapOffer(raw.data);
}
