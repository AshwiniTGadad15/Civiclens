import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { LocateFixed, Map as MapIcon } from 'lucide-react';
import { CATEGORY_COLOR_MAP, formatShortDate } from '../../lib/constants';
import type { CivicIssue, ProjectRecord } from '../../types/civic';

interface CivicMapProps {
  center: [number, number]; // [lng, lat]
  zoom?: number;
  issues?: CivicIssue[];
  projects?: ProjectRecord[];
  showProjects?: boolean;
  heightClass?: string;
  interactivePinMode?: boolean;
  selectedPin?: { lat: number; lng: number } | null;
  onPinSelect?: (coords: { lat: number; lng: number }) => void;
  onIssueSelect?: (issue: CivicIssue) => void;
  onProjectSelect?: (project: ProjectRecord) => void;
}

const DARK_RASTER_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    },
  },
  layers: [
    {
      id: 'carto-dark-layer',
      type: 'raster',
      source: 'carto-dark',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export function CivicMap({
  center,
  zoom = 11,
  issues = [],
  projects = [],
  showProjects = true,
  heightClass = 'h-[520px]',
  interactivePinMode = false,
  selectedPin = null,
  onPinSelect,
  onIssueSelect,
  onProjectSelect,
}: CivicMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const pinMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);

  const onPinSelectRef = useRef(onPinSelect);
  const onIssueSelectRef = useRef(onIssueSelect);
  const onProjectSelectRef = useRef(onProjectSelect);
  onPinSelectRef.current = onPinSelect;
  onIssueSelectRef.current = onIssueSelect;
  onProjectSelectRef.current = onProjectSelect;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    try {
      const map = new maplibregl.Map({
        container: el,
        style: DARK_RASTER_STYLE,
        center,
        zoom,
        attributionControl: { compact: true },
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

      map.on('error', () => {
        // Non-fatal tile errors should not crash map, only warn if map failed to load
      });

      if (interactivePinMode) {
        map.getCanvas().style.cursor = 'crosshair';
        map.on('click', (e: maplibregl.MapMouseEvent) => {
          onPinSelectRef.current?.({
            lat: Number(e.lngLat.lat.toFixed(6)),
            lng: Number(e.lngLat.lng.toFixed(6)),
          });
        });
      }

      mapRef.current = map;

      return () => {
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];
        pinMarkerRef.current?.remove();
        pinMarkerRef.current = null;
        map.remove();
        mapRef.current = null;
      };
    } catch (err) {
      console.error('MapLibre initialization error:', err);
      setMapError('Interactive WebGL map could not initialize in this browser context. Use the list view to browse all locations and issues.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactivePinMode]);

  // Smoothly fly when center/zoom props change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center, zoom, duration: 750, essential: true });
  }, [center[0], center[1], zoom]);

  // Render issue & project markers using safe DOM nodes (no unsafe innerHTML strings)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    issues.forEach((issue) => {
      const color = CATEGORY_COLOR_MAP[issue.category] || '#19C98A';
      const markerEl = document.createElement('button');
      markerEl.type = 'button';
      markerEl.setAttribute('aria-label', `${issue.title} (${issue.category})`);
      markerEl.style.width = '18px';
      markerEl.style.height = '18px';
      markerEl.style.borderRadius = '9999px';
      markerEl.style.background = color;
      markerEl.style.border = '2.5px solid #07111F';
      markerEl.style.boxShadow = `0 0 0 2px ${color}55, 0 4px 10px rgba(0,0,0,0.6)`;
      markerEl.style.cursor = 'pointer';

      const popupNode = document.createElement('div');
      popupNode.className = 'p-3.5 max-w-[260px]';

      const kicker = document.createElement('div');
      kicker.className = 'text-[11px] font-medium text-[#9AABBB] mb-1';
      kicker.textContent = `${issue.category} · ${issue.status}`;

      const title = document.createElement('div');
      title.className = 'text-sm font-semibold text-[#F4F8FC] leading-snug';
      title.textContent = issue.title;

      const meta = document.createElement('div');
      meta.className = 'mt-1.5 text-xs text-[#9AABBB]';
      meta.textContent = `${issue.locality}, ${issue.city} · ${formatShortDate(issue.createdAt)}`;

      const verify = document.createElement('div');
      verify.className = 'mt-1 text-[11px] text-[#48E6B0]';
      verify.textContent = `${issue.verificationStatus}${issue.isDemo ? ' · Demonstration Record' : ''}`;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'mt-3 w-full rounded-md bg-[#19C98A] px-3 py-1.5 text-xs font-semibold text-[#07111F] hover:bg-[#48E6B0] transition-colors cursor-pointer';
      btn.textContent = 'View Issue Details';
      btn.addEventListener('click', () => {
        onIssueSelectRef.current?.(issue);
      });

      popupNode.append(kicker, title, meta, verify, btn);

      const popup = new maplibregl.Popup({ offset: 14, closeButton: true }).setDOMContent(popupNode);
      const marker = new maplibregl.Marker({ element: markerEl })
        .setLngLat([issue.longitude, issue.latitude])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });

    if (showProjects) {
      projects.forEach((proj) => {
        const markerEl = document.createElement('button');
        markerEl.type = 'button';
        markerEl.setAttribute('aria-label', `Project: ${proj.name}`);
        markerEl.style.width = '18px';
        markerEl.style.height = '18px';
        markerEl.style.transform = 'rotate(45deg)';
        markerEl.style.borderRadius = '3px';
        markerEl.style.background = '#36C5D9';
        markerEl.style.border = '2px solid #07111F';
        markerEl.style.boxShadow = '0 0 0 2px rgba(54,197,217,0.45), 0 4px 10px rgba(0,0,0,0.6)';
        markerEl.style.cursor = 'pointer';

        const popupNode = document.createElement('div');
        popupNode.className = 'p-3.5 max-w-[260px]';

        const kicker = document.createElement('div');
        kicker.className = 'text-[11px] font-medium text-[#36C5D9] mb-1';
        kicker.textContent = `Development Project · ${proj.status}`;

        const title = document.createElement('div');
        title.className = 'text-sm font-semibold text-[#F4F8FC] leading-snug';
        title.textContent = proj.name;

        const meta = document.createElement('div');
        meta.className = 'mt-1.5 text-xs text-[#9AABBB]';
        meta.textContent = `${proj.departmentName} · ${proj.progressPercent}% documented progress`;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className =
          'mt-3 w-full rounded-md bg-[#142B40] border border-[#20364A] px-3 py-1.5 text-xs font-semibold text-[#F4F8FC] hover:border-[#36C5D9] transition-colors cursor-pointer';
        btn.textContent = 'Inspect Project';
        btn.addEventListener('click', () => {
          onProjectSelectRef.current?.(proj);
        });

        popupNode.append(kicker, title, meta, btn);

        const popup = new maplibregl.Popup({ offset: 14, closeButton: true }).setDOMContent(popupNode);
        const marker = new maplibregl.Marker({ element: markerEl })
          .setLngLat([proj.longitude, proj.latitude])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      });
    }
  }, [issues, projects, showProjects]);

  // Render pin selector marker when in interactivePinMode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (pinMarkerRef.current) {
      pinMarkerRef.current.remove();
      pinMarkerRef.current = null;
    }
    if (selectedPin) {
      const el = document.createElement('div');
      el.style.width = '22px';
      el.style.height = '22px';
      el.style.borderRadius = '9999px';
      el.style.background = '#19C98A';
      el.style.border = '3px solid #F4F8FC';
      el.style.boxShadow = '0 0 0 4px rgba(25,201,138,0.35)';
      pinMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([selectedPin.lng, selectedPin.lat])
        .addTo(map);
    }
  }, [selectedPin]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setGeoStatus('Geolocation is not supported by your browser.');
      return;
    }
    setGeoStatus('Requesting location permission...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        };
        setGeoStatus(null);
        mapRef.current?.flyTo({ center: [coords.lng, coords.lat], zoom: 14, duration: 900 });
        if (interactivePinMode) {
          onPinSelectRef.current?.(coords);
        }
      },
      () => {
        setGeoStatus('Location permission declined. You can search or click on the map manually.');
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

  if (mapError) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-xl border border-[#20364A] bg-[#0B1929] p-8 text-center ${heightClass}`}
      >
        <MapIcon className="h-8 w-8 text-[#19C98A]" />
        <p className="mt-3 max-w-md text-sm text-[#F4F8FC]">{mapError}</p>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-xl border border-[#20364A] bg-[#0B1929] ${heightClass}`}>
      <div ref={containerRef} className="h-full w-full" />

      {/* Consent-gated location button */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-col items-start gap-1.5">
        <button
          type="button"
          onClick={handleLocateMe}
          className="flex items-center gap-1.5 rounded-lg border border-[#20364A] bg-[#07111F]/90 px-3 py-1.5 text-xs font-medium text-[#F4F8FC] shadow-lg transition-colors hover:border-[#19C98A]"
        >
          <LocateFixed className="h-3.5 w-3.5 text-[#19C98A]" />
          <span>Use Current Location</span>
        </button>
        {geoStatus && (
          <div className="rounded-md border border-[#20364A] bg-[#07111F]/95 px-2.5 py-1 text-[11px] text-[#9AABBB]">
            {geoStatus}
          </div>
        )}
      </div>
    </div>
  );
}
