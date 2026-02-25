import type { OlxClient } from "../api/client.js";
import type { RawSearchResponse } from "../api/types.js";
import type { Category } from "../types/domain.js";

/**
 * The /categories API is deprecated across all OLX countries.
 *
 * We maintain a curated map of known category IDs (discovered via API probing).
 * The OLX API does NOT support parent-level filtering — you must use leaf category IDs.
 * For unknown countries, we auto-discover categories from search results.
 */

// Curated PL categories — discovered by probing the search API.
// The OLX API only filters by leaf categories, NOT parent IDs.
const PL_CATEGORIES: Category[] = [
  {
    id: 0, name: "Elektronika", parentId: null, children: [
      { id: 2184, name: "Karty graficzne", parentId: null, children: [] },
      { id: 3102, name: "Komputery / Laptopy", parentId: null, children: [] },
      { id: 2315, name: "Telefony", parentId: null, children: [] },
      { id: 2194, name: "Tablety", parentId: null, children: [] },
      { id: 1201, name: "Monitory", parentId: null, children: [] },
      { id: 2268, name: "Konsole", parentId: null, children: [] },
      { id: 1849, name: "Telewizory", parentId: null, children: [] },
      { id: 1661, name: "Aparaty fotograficzne", parentId: null, children: [] },
      { id: 1973, name: "Słuchawki", parentId: null, children: [] },
      { id: 4928, name: "Smartwatche", parentId: null, children: [] },
    ],
  },
  {
    id: 0, name: "Motoryzacja", parentId: null, children: [
      { id: 81, name: "Samochody osobowe", parentId: null, children: [] },
      { id: 84, name: "Motocykle i skutery", parentId: null, children: [] },
      { id: 82, name: "Części samochodowe", parentId: null, children: [] },
      { id: 80, name: "Przyczepy i naczepy", parentId: null, children: [] },
    ],
  },
  {
    id: 0, name: "Nieruchomości", parentId: null, children: [
      { id: 11, name: "Mieszkania - sprzedaż", parentId: null, children: [] },
      { id: 14, name: "Mieszkania - wynajem", parentId: null, children: [] },
      { id: 15, name: "Domy - sprzedaż", parentId: null, children: [] },
      { id: 16, name: "Domy - wynajem", parentId: null, children: [] },
      { id: 18, name: "Działki", parentId: null, children: [] },
      { id: 20, name: "Biura i lokale", parentId: null, children: [] },
      { id: 22, name: "Garaże i parkingi", parentId: null, children: [] },
      { id: 24, name: "Stancje i pokoje", parentId: null, children: [] },
      { id: 25, name: "Hale i magazyny", parentId: null, children: [] },
    ],
  },
  {
    id: 0, name: "Praca", parentId: null, children: [
      { id: 53, name: "Oferty pracy", parentId: null, children: [] },
      { id: 56, name: "Szukam pracy", parentId: null, children: [] },
      { id: 65, name: "Praca dodatkowa", parentId: null, children: [] },
    ],
  },
  {
    id: 0, name: "Dom i Ogród", parentId: null, children: [
      { id: 87, name: "Meble", parentId: null, children: [] },
      { id: 88, name: "Ogród", parentId: null, children: [] },
      { id: 100, name: "Narzędzia", parentId: null, children: [] },
      { id: 103, name: "Wyposażenie wnętrz", parentId: null, children: [] },
      { id: 138, name: "Rośliny", parentId: null, children: [] },
      { id: 139, name: "Materiały budowlane", parentId: null, children: [] },
      { id: 140, name: "Ogrzewanie", parentId: null, children: [] },
    ],
  },
];

const categoryCache = new Map<string, Category[]>();

export async function getCategories(
  client: OlxClient,
  country?: string,
  parentId?: number,
): Promise<Category[]> {
  const c = country ?? "pl";

  let categories: Category[];
  if (c === "pl") {
    categories = PL_CATEGORIES;
  } else {
    categories = categoryCache.get(c) ?? [];
    if (categories.length === 0) {
      categories = await discoverCategories(client, c);
      if (categories.length > 0) {
        categoryCache.set(c, categories);
      }
    }
  }

  if (parentId !== undefined) {
    // Search in leaf categories (children of virtual parents)
    for (const cat of categories) {
      for (const child of cat.children) {
        if (child.id === parentId) {
          return child.children;
        }
      }
    }
    return [];
  }

  return categories;
}

async function discoverCategories(
  client: OlxClient,
  country: string,
): Promise<Category[]> {
  const seen = new Map<number, string>();

  const queries = ["", "phone", "car", "apartment", "laptop", "furniture"];
  const searches = queries.map(async (query) => {
    try {
      const params: Record<string, string | number | undefined> = {
        limit: 50,
        sort_by: "created_at:desc",
      };
      if (query) params.query = query;

      const raw = await client.get<RawSearchResponse>("/offers", country, params);
      for (const offer of raw.data) {
        if (offer.category?.id) {
          seen.set(offer.category.id, offer.category.type ?? "unknown");
        }
      }
    } catch {
      // Skip failed searches
    }
  });

  await Promise.all(searches);

  // Group by type
  const groups = new Map<string, Category[]>();
  for (const [id, type] of seen) {
    const group = groups.get(type) ?? [];
    group.push({ id, name: `Category ${id}`, parentId: null, children: [] });
    groups.set(type, group);
  }

  return Array.from(groups.entries()).map(([type, children]) => ({
    id: 0,
    name: type,
    parentId: null,
    children,
  }));
}
