import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { Button } from '@/components/ui/button';
import { MapPin, Trash2, Info, PenTool, Layers } from 'lucide-react';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MAP_LAYERS = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 19,
    subdomains: undefined as string | undefined,
  },
  standard: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd' as string | undefined,
    maxZoom: 20,
  }
};

function createTileLayer(settings: typeof MAP_LAYERS[keyof typeof MAP_LAYERS]): L.TileLayer {
  const opts: L.TileLayerOptions = {
    attribution: settings.attribution,
    maxZoom: settings.maxZoom,
  };
  if (settings.subdomains) {
    opts.subdomains = settings.subdomains;
  }
  return L.tileLayer(settings.url, opts);
}

interface LatLng {
  lat: number;
  lng: number;
}

interface GISLandMapProps {
  onBoundaryChange: (boundary: LatLng[], area: number) => void;
  initialBoundary?: LatLng[];
  readOnly?: boolean;
  className?: string;
  /** GEE NDVI tile URL template (contains {z}/{x}/{y}) */
  ndviTileUrl?: string | null;
  /** Polygon to highlight after MRV completion – [[lat,lng], ...] */
  ndviPolygon?: LatLng[] | null;
  /** Additional overlay tile URLs keyed by layer id */
  overlayTileUrls?: Record<string, string | null | undefined>;
}

function calculatePolygonArea(coords: LatLng[]): number {
  if (!Array.isArray(coords) || coords.length < 3) return 0;

  const toRadians = (deg: number) => (deg * Math.PI) / 180;
  const earthRadius = 6371000;

  let total = 0;
  const n = coords.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const xi = toRadians(coords[i].lng);
    const yi = toRadians(coords[i].lat);
    const xj = toRadians(coords[j].lng);
    const yj = toRadians(coords[j].lat);

    total += (xj - xi) * (2 + Math.sin(yi) + Math.sin(yj));
  }

  const areaM2 = Math.abs((total * earthRadius * earthRadius) / 2);
  const areaHectares = areaM2 / 10000;

  return Math.round(areaHectares * 100) / 100;
}

export default function GISLandMap({ onBoundaryChange, initialBoundary, readOnly = false, className = '', ndviTileUrl, ndviPolygon, overlayTileUrls }: GISLandMapProps) {
  const [boundary, setBoundary] = useState<LatLng[]>(initialBoundary || []);
  const [area, setArea] = useState<number>(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mapType, setMapType] = useState<'satellite' | 'standard'>('satellite');
  const [overlayOpacity, setOverlayOpacity] = useState(0.75);
  const [enabledOverlays, setEnabledOverlays] = useState<Record<string, boolean>>({ ndvi_latest: true });
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const drawnLayerRef = useRef<L.FeatureGroup | null>(null);
  const ndviLayerRef = useRef<L.TileLayer | null>(null);
  const overlayLayerRefs = useRef<Record<string, L.TileLayer>>({});
  const ndviPolygonLayerRef = useRef<L.Polygon | null>(null);
  const isInitializedRef = useRef(false);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const onBoundaryChangeRef = useRef(onBoundaryChange);
  useEffect(() => {
    onBoundaryChangeRef.current = onBoundaryChange;
  }, [onBoundaryChange]);

  // Sync boundary state with initialBoundary prop
  useEffect(() => {
    if (initialBoundary && Array.isArray(initialBoundary) && initialBoundary.length > 0) {
      setBoundary(initialBoundary);
      const calculatedArea = calculatePolygonArea(initialBoundary);
      setArea(calculatedArea);
    }
  }, [initialBoundary]);

  // Map Initialization + ResizeObserver (handles hidden containers & dialogs)
  useEffect(() => {
    let isMounted = true;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    const initMap = () => {
      if (!isMounted || !mapContainerRef.current || isInitializedRef.current) return;

      const rect = mapContainerRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      isInitializedRef.current = true;

      const map = L.map(mapContainerRef.current, {
        center: [0, 0],
        zoom: 2,
        scrollWheelZoom: true,
        preferCanvas: true,
      });

      const baseLayer = createTileLayer(MAP_LAYERS[mapType]).addTo(map);
      tileLayerRef.current = baseLayer;

      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);
      drawnLayerRef.current = drawnItems;
      mapRef.current = map;

      if (!readOnly) {
        const drawControl = new (L.Control as any).Draw({
          position: 'topright',
          draw: {
            polygon: {
              allowIntersection: false,
              drawError: {
                color: '#e1e1e1',
                message: '<strong>Error:</strong> Shape edges cannot cross!',
              },
              shapeOptions: {
                color: '#10b981',
                fillColor: '#10b981',
                fillOpacity: 0.3,
                weight: 2,
              },
            },
            rectangle: false,
            circle: false,
            circlemarker: false,
            marker: false,
            polyline: false,
          },
          edit: false,
        });
        map.addControl(drawControl);

        map.on((L as any).Draw.Event.CREATED, (e: any) => {
          const layer = e.layer;
          drawnItems.clearLayers();
          drawnItems.addLayer(layer);

          const latLngsRing = layer.getLatLngs()[0];
          if (!latLngsRing) return;

          const latLngs = latLngsRing as L.LatLng[];
          const coords = latLngs.map((ll: L.LatLng) => ({ lat: ll.lat, lng: ll.lng }));

          setBoundary(coords);
          const calculatedArea = calculatePolygonArea(coords);
          setArea(calculatedArea);
          onBoundaryChangeRef.current(coords, calculatedArea);
          setIsDrawing(false);
        });

        map.on((L as any).Draw.Event.DRAWSTART, () => setIsDrawing(true));
        map.on((L as any).Draw.Event.DRAWSTOP, () => setIsDrawing(false));
      }

      if (initialBoundary && Array.isArray(initialBoundary) && initialBoundary.length > 0) {
        const latLngs = initialBoundary.map(p => [p?.lat, p?.lng] as [number, number]);
        const polygon = L.polygon(latLngs, {
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.3,
          weight: 2,
        });
        drawnItems.addLayer(polygon);

        const bounds = L.latLngBounds(latLngs);
        setTimeout(() => {
          if (isMounted && mapRef.current) {
            map.fitBounds(bounds, { padding: [50, 50] });
          }
        }, 100);
      }

      // Ensure proper sizing after render
      setTimeout(() => {
        if (isMounted && mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 0);
    };

    // Setup ResizeObserver to handle visibility changes
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === mapContainerRef.current) {
          const { width, height } = entry.contentRect;
          const hasSize = width > 0 && height > 0;

          if (hasSize && !isInitializedRef.current) {
            // Container just became visible with size - try to init
            initMap();
          } else if (hasSize && mapRef.current) {
            // Container resized - invalidate map size
            setTimeout(() => {
              if (mapRef.current) mapRef.current.invalidateSize();
            }, 100);
          }
        }
      }
    });

    // Initial attempt
    initMap();

    // Set up observer with ref
    if (mapContainerRef.current) {
      observer.observe(mapContainerRef.current);
      resizeObserverRef.current = observer;

      // Also check initial size (in case ResizeObserver doesn't fire for initial size)
      const rect = mapContainerRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        retryTimeout = setTimeout(initMap, 500);
      }
    }

    return () => {
      isMounted = false;
      observer.disconnect();
      resizeObserverRef.current = null;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      isInitializedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, initialBoundary, mapType]);

  // Handle Layer Toggle
  useEffect(() => {
    if (mapRef.current && tileLayerRef.current) {
      const map = mapRef.current;
      map.removeLayer(tileLayerRef.current);

      const newLayer = createTileLayer(MAP_LAYERS[mapType]).addTo(map);

      tileLayerRef.current = newLayer;
    }
  }, [mapType]);

  // ── NDVI tile overlay ─────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove previous NDVI layers
    if (ndviLayerRef.current) {
      map.removeLayer(ndviLayerRef.current);
      ndviLayerRef.current = null;
    }
    if (ndviPolygonLayerRef.current) {
      map.removeLayer(ndviPolygonLayerRef.current);
      ndviPolygonLayerRef.current = null;
    }

    if (ndviTileUrl && enabledOverlays.ndvi_latest !== false) {
      const ndviLayer = L.tileLayer(ndviTileUrl, {
        opacity: overlayOpacity,
        attribution: 'NDVI © Google Earth Engine',
        maxZoom: 18,
        crossOrigin: true,
      });
      ndviLayer.addTo(map);
      ndviLayerRef.current = ndviLayer;
    }

    for (const [key, layer] of Object.entries(overlayLayerRefs.current)) {
      map.removeLayer(layer);
      delete overlayLayerRefs.current[key];
    }

    const overlays = overlayTileUrls ?? {};
    Object.entries(overlays).forEach(([layerId, tileUrl]) => {
      if (!tileUrl || !enabledOverlays[layerId]) return;
      const layer = L.tileLayer(tileUrl, {
        opacity: overlayOpacity,
        maxZoom: 18,
        crossOrigin: true,
      });
      layer.addTo(map);
      overlayLayerRefs.current[layerId] = layer;
    });

    if (ndviPolygon && ndviPolygon.length > 0) {
      const latLngs = ndviPolygon.map(p => [p.lat, p.lng] as [number, number]);
      const poly = L.polygon(latLngs, {
        color: '#facc15',
        weight: 3,
        fillOpacity: 0.08,
        dashArray: '6 4',
      });
      poly.addTo(map);
      ndviPolygonLayerRef.current = poly;
      const bounds = L.latLngBounds(latLngs);
      setTimeout(() => { if (mapRef.current) mapRef.current.fitBounds(bounds, { padding: [40, 40] }); }, 150);
    }
  }, [ndviTileUrl, ndviPolygon, overlayTileUrls, enabledOverlays, overlayOpacity]);

  const clearBoundary = useCallback(() => {
    if (drawnLayerRef.current) {
      drawnLayerRef.current.clearLayers();
    }
    setBoundary([]);
    setArea(0);
    onBoundaryChange([], 0);
  }, [onBoundaryChange]);

  const toggleMapType = () => {
    setMapType(prev => prev === 'satellite' ? 'standard' : 'satellite');
  };

  const availableOverlays = Object.keys(overlayTileUrls ?? {});
  const toggleOverlay = (layerId: string) => {
    setEnabledOverlays((prev) => ({ ...prev, [layerId]: !prev[layerId] }));
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>{readOnly ? 'Land boundary visualization' : 'Draw your land boundary on the map'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleMapType}
            className="shadow-sm"
          >
            <Layers className="w-4 h-4 mr-1 text-primary" />
            {mapType === 'satellite' ? 'Map View' : 'Satellite'}
          </Button>
          {!readOnly && (boundary?.length ?? 0) > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={clearBoundary}>
              <Trash2 className="w-4 h-4 mr-1 text-red-500" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {(ndviTileUrl || availableOverlays.length > 0) && (
        <div className="rounded-lg border p-3 bg-muted/10 space-y-2">
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Raster Overlay Controls</p>
          <div className="flex flex-wrap gap-2">
            {ndviTileUrl && (
              <Button
                type="button"
                size="sm"
                variant={enabledOverlays.ndvi_latest !== false ? 'default' : 'outline'}
                onClick={() => toggleOverlay('ndvi_latest')}
              >
                NDVI Latest
              </Button>
            )}
            {availableOverlays.map((layerId) => (
              <Button
                key={layerId}
                type="button"
                size="sm"
                variant={enabledOverlays[layerId] ? 'default' : 'outline'}
                onClick={() => toggleOverlay(layerId)}
              >
                {layerId.replaceAll('_', ' ')}
              </Button>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Overlay opacity</span>
            <input
              type="range"
              min={0.2}
              max={1}
              step={0.05}
              value={overlayOpacity}
              onChange={(e) => setOverlayOpacity(Number(e.target.value))}
              className="w-48"
            />
          </div>
        </div>
      )}

      <div
        ref={mapContainerRef}
        className="relative rounded-lg overflow-hidden border shadow-inner"
        style={{ height: '450px', width: '100%', zIndex: 0 }}
      />

      {area > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-primary" />
            <span className="font-semibold text-primary">Calculated Land Area</span>
          </div>
          <p className="text-2xl font-bold text-primary">{area.toLocaleString()} <span className="text-sm font-normal">hectares</span></p>
          <p className="text-xs text-muted-foreground mt-1">
            Area automatically calculated from GIS polygon boundaries
          </p>
        </div>
      )}

      {!readOnly && (boundary?.length ?? 0) === 0 && !isDrawing && (
        <div className="bg-muted/50 border rounded-lg p-4 text-center border-dashed">
          <div className="flex items-center justify-center gap-2 mb-2 text-primary">
            <PenTool className="w-4 h-4" />
            <span className="font-medium">Define Carbon Territory:</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Activate the polygon tool in the top-right corner to outline project boundaries.
          </p>
        </div>
      )}
    </div>
  );
}
