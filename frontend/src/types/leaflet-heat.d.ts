import 'leaflet';

declare module 'leaflet' {
  interface HeatLayerOptions {
    minOpacity?: number;
    maxZoom?: number;
    max?: number;
    radius?: number;
    blur?: number;
    gradient?: Record<number, string>;
  }

  interface HeatLayer extends Layer {
    setLatLngs(latlngs: LatLngExpression[] | LatLngExpression[][]): this;
    addLatLng(latlng: LatLngExpression): this;
    setOptions(options: HeatLayerOptions): this;
  }

  function heatLayer(
    latlngs: LatLngExpression[],
    options?: HeatLayerOptions
  ): HeatLayer;
}

declare module 'leaflet.heat';
