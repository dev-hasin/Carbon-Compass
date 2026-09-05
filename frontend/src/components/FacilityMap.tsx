import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import type { FacilityAnalysis } from '../types';
import { BAND_HEX, BAND_LABELS } from '../utils/risk';

export type MapViewMode = 'pins' | 'heatmap';

interface FacilityMapProps {
  facilities: FacilityAnalysis[];
  mode?: MapViewMode;
  className?: string;
}

/** Labeled pin chip: FACILITY NAME [score], colored by risk band. */
function createLabeledPin(facility: FacilityAnalysis) {
  const color = BAND_HEX[facility.risk_band];
  const label =
    facility.risk_band === 'unknown'
      ? facility.display_name.toUpperCase().slice(0, 18)
      : `${facility.display_name.toUpperCase().slice(0, 18)} [${Math.round(facility.risk_score as number)}]`;

  return L.divIcon({
    className: 'cc-map-pin',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
        <span style="white-space:nowrap;padding:2px 6px;border-radius:4px;background:${color};color:#0A0E14;font:700 9px Inter,sans-serif;letter-spacing:0.03em;box-shadow:0 1px 4px rgba(0,0,0,0.5);">${label}</span>
        <span style="width:8px;height:8px;border-radius:50%;background:${color};border:2px solid #0A0E14;"></span>
      </div>`,
    iconSize: [110, 30],
    iconAnchor: [55, 30],
    popupAnchor: [0, -26],
  });
}

/** Auto-fit the viewport to the displayed facilities. */
function FitBounds({ facilities }: { facilities: FacilityAnalysis[] }) {
  const map = useMap();
  useEffect(() => {
    if (facilities.length === 0) return;
    const bounds = L.latLngBounds(
      facilities.map((f) => [f.latitude, f.longitude] as [number, number])
    );
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 9 });
  }, [map, facilities]);
  return null;
}

/** Aggregated sustainability heatmap layer (SRS FR-13). */
function HeatLayer({ facilities }: { facilities: FacilityAnalysis[] }) {
  const map = useMap();
  const points = useMemo(
    () =>
      facilities
        .filter((f) => f.risk_score !== null)
        .map(
          (f) =>
            [f.latitude, f.longitude, (f.risk_score as number) / 100] as [
              number,
              number,
              number
            ]
        ),
    [facilities]
  );

  useEffect(() => {
    if (points.length === 0) return;
    const layer = L.heatLayer(points, {
      radius: 34,
      blur: 22,
      maxZoom: 10,
      minOpacity: 0.45,
      gradient: {
        0.1: '#22C55E',
        0.35: '#84CC16',
        0.55: '#F59E0B',
        0.75: '#EF4444',
        1.0: '#F87171',
      },
    });
    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, points]);

  return null;
}

export default function FacilityMap({
  facilities,
  mode = 'pins',
  className = '',
}: FacilityMapProps) {
  const navigate = useNavigate();

  return (
    <div
      className={`relative rounded-xl overflow-hidden border border-carbon-700 shadow-card ${className}`}
    >
      <MapContainer
        center={[31.0, 73.5]}
        zoom={6}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <FitBounds facilities={facilities} />

        {mode === 'heatmap' && <HeatLayer facilities={facilities} />}

        {mode === 'pins' &&
          facilities.map((facility) => (
            <Marker
              key={facility.analysis_id}
              position={[facility.latitude, facility.longitude]}
              icon={createLabeledPin(facility)}
              eventHandlers={{
                click: () => navigate(`/facility/${facility.analysis_id}`),
              }}
            >
              <Popup>
                <div className="min-w-[180px]">
                  <p className="font-semibold text-slate-100">{facility.display_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {facility.risk_band === 'unknown'
                      ? 'Insufficient Data — no score computed'
                      : `Score ${facility.risk_score} · ${BAND_LABELS[facility.risk_band]}`}
                  </p>
                  <p className="text-xs text-accent mt-1 font-medium">
                    Click for details
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {/* Mode overlay chip (Figma "HYBRID HEATMAP | LAT ... | LON ..." overlay) */}
      <div className="absolute top-3 right-3 z-[500] px-2.5 py-1.5 rounded-md bg-carbon-950/85 border border-carbon-600 backdrop-blur-sm pointer-events-none">
        <span className="text-[10px] font-bold tracking-widest text-slate-300">
          {mode === 'heatmap' ? 'SUSTAINABILITY HEATMAP' : 'FACILITY PINS'} ·{' '}
          {facilities.length} FACILIT{facilities.length === 1 ? 'Y' : 'IES'}
        </span>
      </div>

      {/* Heatmap legend — always visible (design.md component notes) */}
      {mode === 'heatmap' && (
        <div className="absolute bottom-8 left-3 z-[500] px-2.5 py-2 rounded-md bg-carbon-950/85 border border-carbon-600 backdrop-blur-sm pointer-events-none">
          <div className="flex items-center gap-3">
            {[
              { color: '#22C55E', label: 'Low' },
              { color: '#F59E0B', label: 'Moderate' },
              { color: '#EF4444', label: 'High' },
            ].map((item) => (
              <span key={item.label} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[10px] text-slate-400">{item.label}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
