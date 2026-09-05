import { getSatelliteImageUrl } from '../api';
import { formatDate } from '../utils/format';

interface SatelliteImageProps {
  imageReference: string | null;
  acquisitionDate: string | null;
  /** AI observations rendered as annotation labels over the image (max 3). */
  observations: string[];
  /** Optional live-feed label for the analysis screen. */
  liveLabel?: string;
  className?: string;
}

/**
 * Deterministic annotation placement so the same facility always renders the
 * same layout. Boxes mark areas referenced by AI observations.
 */
const ANNOTATION_POSITIONS = [
  { top: '12%', left: '58%', width: '26%', height: '22%' },
  { top: '55%', left: '18%', width: '30%', height: '26%' },
  { top: '68%', left: '60%', width: '22%', height: '18%' },
];

export default function SatelliteImage({
  imageReference,
  acquisitionDate,
  observations,
  liveLabel,
  className = '',
}: SatelliteImageProps) {
  if (!imageReference) {
    return (
      <div className={`rounded-xl border border-carbon-700 bg-carbon-850 p-8 text-center ${className}`}>
        <p className="text-sm text-slate-400">Satellite imagery unavailable for this facility.</p>
        <p className="text-xs text-slate-600 mt-1">
          The satellite component is flagged Insufficient Data and excluded from the score.
        </p>
      </div>
    );
  }

  const annotations = observations.slice(0, 3);

  return (
    <div className={`relative rounded-xl overflow-hidden border border-carbon-700 bg-carbon-850 ${className}`}>
      <img
        src={getSatelliteImageUrl(imageReference)}
        alt="Sentinel-2 satellite imagery of the facility area"
        className="w-full h-full object-cover"
      />

      {annotations.map((observation, i) => {
        const pos = ANNOTATION_POSITIONS[i % ANNOTATION_POSITIONS.length];
        return (
          <div
            key={i}
            className="absolute pointer-events-none"
            style={pos}
          >
            <div className="w-full h-full border-2 border-risk-red/80 rounded-sm" />
            <span className="absolute -top-0.5 left-0 -translate-y-full mb-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-risk-red/90 text-white whitespace-nowrap">
              [{observation.toUpperCase().slice(0, 42)}{observation.length > 42 ? '…' : ''}]
            </span>
          </div>
        );
      })}

      {liveLabel && (
        <span className="absolute top-3 left-3 px-2 py-1 rounded text-[10px] font-bold tracking-widest bg-accent text-carbon-900">
          {liveLabel}
        </span>
      )}

      <div className="absolute bottom-0 inset-x-0 bg-carbon-950/80 backdrop-blur-sm px-3 py-2 flex items-center justify-between">
        <span className="text-[10px] text-slate-400 tracking-wide">
          SENTINEL-2 L2A · BAND B8A, B4, B3 · 10M/PX
        </span>
        <span className="text-[10px] text-accent font-medium">
          AS OF {formatDate(acquisitionDate)}
        </span>
      </div>
    </div>
  );
}
