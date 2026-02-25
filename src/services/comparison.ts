import type { OlxClient } from "../api/client.js";
import type { Offer, OfferComparison } from "../types/domain.js";
import { getOffer } from "./offers.js";

export async function compareOffers(
  client: OlxClient,
  offerIds: number[],
  country?: string,
): Promise<OfferComparison> {
  const offers = await Promise.all(
    offerIds.map((id) => getOffer(client, id, country)),
  );

  const prices = offers
    .map((o) => o.price)
    .filter((p): p is number => p !== null);

  const priceRange = {
    min: prices.length > 0 ? Math.min(...prices) : null,
    max: prices.length > 0 ? Math.max(...prices) : null,
    avg:
      prices.length > 0
        ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100
        : null,
  };

  // Find common params (present in all offers) and diffs
  const allParamKeys = new Set<string>();
  for (const offer of offers) {
    for (const param of offer.params) {
      allParamKeys.add(param.key);
    }
  }

  const commonParams: string[] = [];
  const paramDiffs: Record<string, Record<number, string>> = {};

  for (const key of allParamKeys) {
    const values = new Map<number, string>();
    for (const offer of offers) {
      const param = offer.params.find((p) => p.key === key);
      if (param) {
        values.set(offer.id, param.value);
      }
    }

    if (values.size === offers.length) {
      const uniqueValues = new Set(values.values());
      if (uniqueValues.size === 1) {
        commonParams.push(key);
        continue;
      }
    }

    paramDiffs[key] = Object.fromEntries(values);
  }

  return { offers, priceRange, commonParams, paramDiffs };
}
