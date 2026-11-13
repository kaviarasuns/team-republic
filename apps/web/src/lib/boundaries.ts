/**
 * Tamil Nadu assembly constituency boundaries on the 2008 delimitation, built
 * by `scripts/build-tn-boundaries.sh` from DataMeet `India_AC` (CC BY 2.5
 * India). Each feature carries one property, `ac`, the AC number used to join
 * it to results.
 */

export const BOUNDARIES_URL = "/maps/tn-ac-2008.geojson";

/** The first general election held on the 2008 boundaries. */
export const FIRST_MAP_YEAR = 2011;

export const BOUNDARIES_CREDIT =
  '<a href="https://github.com/datameet/maps/tree/master/assembly-constituencies" target="_blank" rel="noopener noreferrer">DataMeet</a> (CC BY 2.5 IN)';

type Position = readonly [number, number];

export interface SeatFeature {
  readonly type: "Feature";
  readonly properties: { readonly ac: number };
  readonly geometry:
    | { readonly type: "Polygon"; readonly coordinates: readonly (readonly Position[])[] }
    | {
        readonly type: "MultiPolygon";
        readonly coordinates: readonly (readonly (readonly Position[])[])[];
      };
}

export interface SeatCollection {
  readonly type: "FeatureCollection";
  readonly features: readonly SeatFeature[];
}

/** [[west, south], [east, north]] */
export type Bounds = readonly [Position, Position];

/** The whole state, used for the initial view. */
export const TAMIL_NADU_BOUNDS: Bounds = [
  [76.2, 8.05],
  [80.4, 13.6],
];

const isSeatFeature = (value: unknown): value is SeatFeature => {
  if (typeof value !== "object" || value === null) return false;
  const feature = value as { properties?: { ac?: unknown }; geometry?: { type?: unknown } };
  return (
    typeof feature.properties?.ac === "number" &&
    (feature.geometry?.type === "Polygon" || feature.geometry?.type === "MultiPolygon")
  );
};

/** Fetches the boundary file and checks that every feature has an AC number and a polygon. */
export const loadBoundaries = async (signal?: AbortSignal): Promise<SeatCollection> => {
  const response = await fetch(BOUNDARIES_URL, signal === undefined ? {} : { signal });
  if (!response.ok) throw new Error(`Boundaries request failed: HTTP ${response.status}`);
  const body = (await response.json()) as { type?: unknown; features?: unknown };
  if (body.type !== "FeatureCollection" || !Array.isArray(body.features)) {
    throw new Error("Boundaries file is not a GeoJSON FeatureCollection");
  }
  if (!body.features.every(isSeatFeature)) {
    throw new Error("Boundaries file has a feature without an AC number or polygon");
  }
  return { type: "FeatureCollection", features: body.features };
};

/** The bounding box of one seat, or null when the AC number is not in the file. */
export const seatBounds = (collection: SeatCollection, ac: number): Bounds | null => {
  const feature = collection.features.find((item) => item.properties.ac === ac);
  if (feature === undefined) return null;
  const rings =
    feature.geometry.type === "Polygon"
      ? feature.geometry.coordinates
      : feature.geometry.coordinates.flat();
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const ring of rings) {
    for (const [lng, lat] of ring) {
      west = Math.min(west, lng);
      east = Math.max(east, lng);
      south = Math.min(south, lat);
      north = Math.max(north, lat);
    }
  }
  return Number.isFinite(west)
    ? [
        [west, south],
        [east, north],
      ]
    : null;
};
