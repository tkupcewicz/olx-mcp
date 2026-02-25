import type { AuthenticatedOlxClient } from "../api/authenticated-client.js";
import type { PartnerCategoryAttributesResponse } from "../api/partner-types.js";
import type { AdvertAttribute } from "../types/domain.js";

export async function getAdvertAttributes(
  client: AuthenticatedOlxClient,
  categoryId: number,
  country?: string,
): Promise<AdvertAttribute[]> {
  const c = country ?? "pl";

  const raw = await client.get<PartnerCategoryAttributesResponse>(
    `/categories/${categoryId}/attributes`,
    c,
  );

  return raw.data.map((attr) => ({
    code: attr.code,
    label: attr.label,
    type: attr.type,
    required: attr.required,
    values: attr.values,
    min: attr.validation?.min,
    max: attr.validation?.max,
    unit: attr.unit,
  }));
}
