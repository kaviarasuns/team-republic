import "maplibre-gl/dist/maplibre-gl.css";
import {
  AttributionControl,
  type GeoJSONSourceSpecification,
  Map as MapLibreMap,
  type MapLayerMouseEvent,
  type MapMouseEvent,
  NavigationControl,
} from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import {
  type Bounds,
  seatBounds,
  type SeatCollection,
  TAMIL_NADU_BOUNDS,
} from "../lib/boundaries.ts";
import { HIGHLIGHT_COLOR, NO_RESULT_COLOR, SURFACE_COLOR } from "../lib/map-colors.ts";

const SOURCE = "seats";
const FILL_LAYER = "seat-fill";

export interface SeatHover {
  readonly ac: number;
  /** Pointer position in pixels, relative to the map container. */
  readonly x: number;
  readonly y: number;
}

/**
 * The constituency map. Seats are filled from `fills` (AC number → colour);
 * a seat missing from it gets the no-result colour. There is no basemap: the
 * seats are drawn on a plain surface, so no tile provider or API key is
 * involved.
 */
export function ElectionMap({
  boundaries,
  fills,
  selected,
  focus,
  onSelect,
  onHover,
  attribution,
  label,
}: {
  readonly boundaries: SeatCollection;
  readonly fills: ReadonlyMap<number, string>;
  readonly selected: number | null;
  /** Zooms to this seat whenever `key` changes; null leaves the view alone. */
  readonly focus: { readonly ac: number; readonly key: number } | null;
  readonly onSelect: (ac: number | null) => void;
  readonly onHover: (hover: SeatHover | null) => void;
  /** HTML credit line for the attribution control. */
  readonly attribution: string;
  /** Accessible name of the map region. */
  readonly label: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const callbacks = useRef({ onSelect, onHover });
  callbacks.current = { onSelect, onHover };

  useEffect(() => {
    const element = container.current;
    if (element === null) return;
    const map = new MapLibreMap({
      container: element,
      style: {
        version: 8,
        sources: {},
        layers: [
          { id: "surface", type: "background", paint: { "background-color": SURFACE_COLOR } },
        ],
      },
      bounds: TAMIL_NADU_BOUNDS as unknown as [[number, number], [number, number]],
      fitBoundsOptions: { padding: 16 },
      maxBounds: [
        [72, 5],
        [85, 16.5],
      ],
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      renderWorldCopies: false,
    });
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new AttributionControl({ compact: true, customAttribution: attribution }));
    mapRef.current = map;

    let hovered: number | null = null;
    const setHover = (ac: number | null) => {
      if (hovered !== null) map.setFeatureState({ source: SOURCE, id: hovered }, { hover: false });
      hovered = ac;
      if (ac !== null) map.setFeatureState({ source: SOURCE, id: ac }, { hover: true });
    };

    map.on("load", () => {
      map.addSource(SOURCE, {
        type: "geojson",
        data: boundaries as unknown as GeoJSONSourceSpecification["data"],
        promoteId: "ac",
      });
      map.addLayer({
        id: FILL_LAYER,
        type: "fill",
        source: SOURCE,
        paint: { "fill-color": ["coalesce", ["feature-state", "fill"], NO_RESULT_COLOR] },
      });
      // A hairline of the surface colour separates neighbouring seats.
      map.addLayer({
        id: "seat-borders",
        type: "line",
        source: SOURCE,
        paint: { "line-color": SURFACE_COLOR, "line-width": 0.75 },
      });
      map.addLayer({
        id: "seat-highlight",
        type: "line",
        source: SOURCE,
        paint: {
          "line-color": HIGHLIGHT_COLOR,
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            2.5,
            ["boolean", ["feature-state", "hover"], false],
            1.5,
            0,
          ],
        },
      });
      setReady(true);
    });

    map.on("mousemove", FILL_LAYER, (event: MapLayerMouseEvent) => {
      const id = event.features?.[0]?.id;
      if (typeof id !== "number") return;
      if (id !== hovered) setHover(id);
      map.getCanvas().style.cursor = "pointer";
      callbacks.current.onHover({ ac: id, x: event.point.x, y: event.point.y });
    });
    map.on("mouseleave", FILL_LAYER, () => {
      setHover(null);
      map.getCanvas().style.cursor = "";
      callbacks.current.onHover(null);
    });
    map.on("click", (event: MapMouseEvent) => {
      const id = map.queryRenderedFeatures(event.point, { layers: [FILL_LAYER] })[0]?.id;
      callbacks.current.onSelect(typeof id === "number" ? id : null);
    });

    return () => {
      mapRef.current = null;
      setReady(false);
      map.remove();
    };
    // The map is built once; boundaries and attribution are fixed for its life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || map === null) return;
    for (const feature of boundaries.features) {
      const ac = feature.properties.ac;
      map.setFeatureState({ source: SOURCE, id: ac }, { fill: fills.get(ac) ?? NO_RESULT_COLOR });
    }
  }, [ready, fills, boundaries]);

  const previousSelected = useRef<number | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || map === null) return;
    const previous = previousSelected.current;
    if (previous !== null && previous !== selected) {
      map.setFeatureState({ source: SOURCE, id: previous }, { selected: false });
    }
    if (selected !== null)
      map.setFeatureState({ source: SOURCE, id: selected }, { selected: true });
    previousSelected.current = selected;
  }, [ready, selected]);

  const focusKey = focus?.key;
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || map === null || focus === null) return;
    const bounds: Bounds | null = seatBounds(boundaries, focus.ac);
    if (bounds === null) return;
    map.fitBounds(bounds as unknown as [[number, number], [number, number]], {
      padding: 48,
      maxZoom: 10,
    });
    // Runs when a new focus request arrives, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, focusKey]);

  return <div ref={container} role="region" aria-label={label} className="absolute inset-0" />;
}
