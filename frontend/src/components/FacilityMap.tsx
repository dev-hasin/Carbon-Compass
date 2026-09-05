import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { useNavigate } from 'react-router-dom';
import type { HeatmapPoint } from '../types';

interface FacilityMapProps {
  points: HeatmapPoint[];
  center?: [number, number];
  zoom?: number;
  className?: string;
}

const pinColors: Record<string, string> = {
  low: '#22C55E',
  medium: '#F59E0B',
  high: '#EF4444',
  unknown: '#9CA3AF',
};

function createPin(band: string) {
  const color = pinColors[band] || pinColors.unknown;
  return L.divIcon({
    className: 'custom-pin',
    html: `<div style="width:24px;height:24px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);position:relative;"><div style="width:8px;height:8px;border-radius:50%;background:white;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(45deg);"></div></div>`,
    iconSize: [24, 34],
    iconAnchor: [12, 34],
    popupAnchor: [0, -34],
  });
}

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

function HeatmapLayer({
  points,
  visible,
}: {
  points: HeatmapPoint[];
  visible: boolean;
}) {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (!map) return;

    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    if (!visible || points.length === 0) return;

    const heatData: [number, number, number][] = points
      .filter((p) => p.risk_score != null)
      .map((p) => [p.latitude, p.longitude, (p.risk_score ?? 0) / 100]);

    const layer = L.heatLayer(heatData, {
      radius: 30,
      blur: 25,
      maxZoom: 18,
      minOpacity: 0.35,
      gradient: {
        0.0: '#22C55E',
        0.3: '#84CC16',
        0.5: '#F59E0B',
        0.7: '#F97316',
        1.0: '#EF4444',
      },
    });

    layer.addTo(map);
    layerRef.current = layer;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, points, visible]);

  return null;
}

export default function FacilityMap({
  points,
  center = [31.0, 73.5],
  zoom = 7,
  className = '',
}: FacilityMapProps) {
  const navigate = useNavigate();
  const [showHeatmap, setShowHeatmap] = useState(false);

  return (
    <div className={`relative rounded-xl overflow-hidden border border-stone-200 dark:border-emerald-900/50 shadow-sm ${className}`}>
      {/* Toggle button */}
      <div className="absolute top-3 right-3 z-[1000] flex rounded-lg shadow-md overflow-hidden border border-stone-300 dark:border-emerald-800">
        <button
          onClick={() => setShowHeatmap(false)}
          className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
            !showHeatmap
              ? 'bg-teal-600 text-white'
              : 'bg-white/90 dark:bg-forest-900/90 text-stone-700 dark:text-stone-300 hover:bg-white dark:hover:bg-forest-900'
          }`}
        >
          Pins
        </button>
        <button
          onClick={() => setShowHeatmap(true)}
          className={`px-3 py-1.5 text-xs font-semibold transition-colors border-l border-stone-300 dark:border-emerald-800 ${
            showHeatmap
              ? 'bg-teal-600 text-white'
              : 'bg-white/90 dark:bg-forest-900/90 text-stone-700 dark:text-stone-300 hover:bg-white dark:hover:bg-forest-900'
          }`}
        >
          Heatmap
        </button>
      </div>

      {/* Always-visible legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 dark:bg-forest-900/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md border border-stone-200 dark:border-emerald-800">
        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
          Risk Level
        </p>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
            <span className="text-stone-600 dark:text-stone-400">Low</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span className="text-stone-600 dark:text-stone-400">Medium</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
            <span className="text-stone-600 dark:text-stone-400">High</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block" />
            <span className="text-stone-600 dark:text-stone-400">Insuff.</span>
          </span>
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater center={center} zoom={zoom} />

        {/* Heatmap layer */}
        <HeatmapLayer points={points} visible={showHeatmap} />

        {/* Pin markers — always rendered so popups work; hidden via opacity when heatmap is on */}
        {points.map((point) => (
          <Marker
            key={point.analysis_id}
            position={[point.latitude, point.longitude]}
            icon={createPin(point.risk_band)}
            opacity={showHeatmap ? 0.3 : 1}
            eventHandlers={{
              click: () => navigate(`/facility/${point.analysis_id}`),
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold text-stone-900">{point.display_name}</p>
                <p className="text-stone-600 text-xs mt-0.5">
                  {point.risk_band === 'unknown'
                    ? 'Insufficient Data'
                    : `Score: ${point.risk_score ?? 'N/A'} — ${point.risk_band.toUpperCase()} RISK`}
                </p>
                <p className="text-teal-600 text-xs mt-1 font-medium">Click for details</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
