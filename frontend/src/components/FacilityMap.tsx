import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
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

export default function FacilityMap({
  points,
  center = [31.0, 73.5],
  zoom = 7,
  className = '',
}: FacilityMapProps) {
  const navigate = useNavigate();

  return (
    <div className={`relative rounded-xl overflow-hidden border border-stone-200 dark:border-emerald-900/50 shadow-sm ${className}`}>
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
        {points.map((point) => (
          <Marker
            key={point.analysis_id}
            position={[point.latitude, point.longitude]}
            icon={createPin(point.risk_band)}
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
