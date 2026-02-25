import type { AuthenticatedOlxClient } from "../api/authenticated-client.js";
import type {
  PartnerAdvertListResponse,
  PartnerAdvertDetailResponse,
  PartnerAdvertCreateRequest,
  PartnerAdvertUpdateRequest,
} from "../api/partner-types.js";
import type { Advert, AdvertInput } from "../types/domain.js";

function mapAdvert(raw: PartnerAdvertListResponse["data"][number]): Advert {
  const priceParam = raw.params?.find((p) => p.key === "price");
  const price = typeof priceParam?.value === "object" && priceParam?.value !== null
    ? (priceParam.value as { value?: number }).value ?? null
    : null;
  const currency = typeof priceParam?.value === "object" && priceParam?.value !== null
    ? (priceParam.value as { currency?: string }).currency ?? "PLN"
    : "PLN";

  const attributes: Record<string, string | number | boolean> = {};
  for (const param of raw.params ?? []) {
    if (param.key !== "price") {
      attributes[param.key] = typeof param.value === "object" && param.value !== null
        ? (param.value as { label?: string }).label ?? String(param.value)
        : String(param.value ?? "");
    }
  }

  return {
    id: raw.id,
    status: raw.status,
    url: raw.url,
    title: raw.title,
    description: raw.description,
    categoryId: raw.category_id,
    price,
    currency,
    location: {
      cityId: raw.location?.city_id ?? 0,
      districtId: raw.location?.district_id,
      lat: raw.location?.lat ?? 0,
      lon: raw.location?.lon ?? 0,
    },
    images: (raw.images ?? []).map((img) => img.url),
    attributes,
    createdAt: raw.created_time,
    validTo: raw.valid_to_time,
  };
}

export interface ListAdvertsParams {
  offset?: number;
  limit?: number;
  status?: string;
  country?: string;
}

export async function listMyAdverts(
  client: AuthenticatedOlxClient,
  params: ListAdvertsParams,
): Promise<{ adverts: Advert[]; hasNextPage: boolean }> {
  const country = params.country ?? "pl";
  const queryParams: Record<string, string | number | undefined> = {
    offset: params.offset ?? 0,
    limit: params.limit ?? 20,
  };
  if (params.status) {
    queryParams.status = params.status;
  }

  const raw = await client.get<PartnerAdvertListResponse>(
    "/adverts",
    country,
    queryParams,
  );

  return {
    adverts: raw.data.map(mapAdvert),
    hasNextPage: !!raw.links?.next,
  };
}

export async function createAdvert(
  client: AuthenticatedOlxClient,
  input: AdvertInput,
  country?: string,
): Promise<Advert> {
  const c = country ?? "pl";

  const body: PartnerAdvertCreateRequest = {
    title: input.title,
    description: input.description,
    category_id: input.categoryId,
    advertiser_type: "private",
  };

  if (input.attributes || input.price !== undefined) {
    const params: Record<string, unknown> = { ...input.attributes };
    if (input.price !== undefined) {
      params.price = {
        value: input.price,
        currency: input.currency ?? "PLN",
        negotiable: false,
      };
    }
    body.params = params;
  }

  if (input.images && input.images.length > 0) {
    body.images = input.images.map((url) => ({ url }));
  }

  body.location = {
    city_id: input.cityId,
    district_id: input.districtId,
    lat: input.lat,
    lon: input.lon,
  };

  if (input.contact) {
    body.contact = input.contact;
  }

  const raw = await client.post<PartnerAdvertDetailResponse>("/adverts", c, body);
  return mapAdvert(raw.data);
}

export async function updateAdvert(
  client: AuthenticatedOlxClient,
  advertId: number,
  input: Partial<AdvertInput>,
  country?: string,
): Promise<Advert> {
  const c = country ?? "pl";

  const body: PartnerAdvertUpdateRequest = {};

  if (input.title !== undefined) body.title = input.title;
  if (input.description !== undefined) body.description = input.description;

  if (input.attributes || input.price !== undefined) {
    const params: Record<string, unknown> = { ...input.attributes };
    if (input.price !== undefined) {
      params.price = {
        value: input.price,
        currency: input.currency ?? "PLN",
        negotiable: false,
      };
    }
    body.params = params;
  }

  if (input.images && input.images.length > 0) {
    body.images = input.images.map((url) => ({ url }));
  }

  if (input.cityId !== undefined) {
    body.location = {
      city_id: input.cityId,
      district_id: input.districtId,
      lat: input.lat,
      lon: input.lon,
    };
  }

  if (input.contact) {
    body.contact = input.contact;
  }

  const raw = await client.put<PartnerAdvertDetailResponse>(`/adverts/${advertId}`, c, body);
  return mapAdvert(raw.data);
}

export async function deleteAdvert(
  client: AuthenticatedOlxClient,
  advertId: number,
  country?: string,
): Promise<void> {
  const c = country ?? "pl";
  await client.delete(`/adverts/${advertId}`, c);
}
