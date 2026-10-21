import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import client from '../api/client';
import { toDMS } from '../utils/geo';

// Puntos del campo. lat/lon reales (Google Earth). `punto` enlaza con el id del
// punto de medición de Producción para mostrar variables en vivo en el popup.
// `prov: true` = posición aproximada (derivada de la imagen) a reemplazar por la
// coordenada exacta cuando se releve.
const PUNTOS = [
  { punto: '02010', nombre: 'Batería 2', lat: -38.04209, lon: -67.76783 },
  { punto: '03010', nombre: 'Batería 3', lat: -37.98916, lon: -67.73636 },
  { punto: '04010', nombre: 'Batería 4', lat: -38.00145, lon: -67.76791 },
  { punto: '05010', nombre: 'Batería 5', lat: -38.14076, lon: -67.56658 },
  { nombre: 'UAM', lat: -37.99149, lon: -67.94211 },
  { nombre: 'PTG', lat: -38.02096, lon: -67.78048 },
  { nombre: 'PTC', lat: -38.03453, lon: -67.80174 },
  { nombre: 'PM-311', lat: -38.05893, lon: -67.94678 },
];

// Variables a mostrar en el popup: [clave en values, etiqueta, unidad].
const POPUP_VARS = [
  ['FQI', 'Caudal', 'm³/h'],
  ['FQH', 'Vol. Hoy', 'm³'],
  ['WCH', 'Corte Agua', '%'],
  ['PI', 'Presión', 'kg/cm²'],
];

// Imagen satelital del campo (cenital, norte arriba), 1478×1007 px.
const CAMPO_IMG = '/mapa-campo.png';
// Bounds [[sur, oeste], [norte, este]] calibrados con UAM (71,187) y Bat 5
// (1305,771) —esquinas opuestas— detectados en la imagen. Afinable con las
// coordenadas de las esquinas de la imagen si se quiere precisión fina.
const CAMPO_BOUNDS = [
  [-38.20108, -67.96372], // esquina SO (abajo-izquierda)
  [-37.94369, -67.51393], // esquina NE (arriba-derecha)
];

export default function Mapa() {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const [clicked, setClicked] = useState(null);
  const [vivos, setVivos] = useState(null); // { punto: fila }

  // Última lectura por punto (Producción).
  const cargar = useCallback(async () => {
    try {
      const { data } = await client.get('/api/produccion/ultimas24h');
      const latest = {};
      for (const r of data.rows) if (!latest[r.punto]) latest[r.punto] = r; // newest-first
      setVivos(latest);
    } catch {
      /* sin datos en vivo; el mapa igual se muestra */
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Inicializa el mapa una sola vez.
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = L.map(containerRef.current, { minZoom: 11, maxZoom: 17 });
    mapRef.current = map;

    // Fondo: imagen satelital del campo georreferenciada (offline, sin tiles).
    L.imageOverlay(CAMPO_IMG, CAMPO_BOUNDS).addTo(map);
    map.fitBounds(CAMPO_BOUNDS);
    map.setMaxBounds(L.latLngBounds(CAMPO_BOUNDS).pad(0.25));

    for (const p of PUNTOS) {
      const m = L.circleMarker([p.lat, p.lon], {
        radius: 9,
        color: '#f59e0b',
        weight: 2,
        fillColor: p.prov ? 'transparent' : '#f59e0b',
        fillOpacity: p.prov ? 0 : 0.85,
        dashArray: p.prov ? '4 3' : null,
      }).addTo(map);
      m.bindTooltip(p.nombre, {
        permanent: true,
        direction: 'right',
        offset: [10, 0],
        className: 'mapa-label',
      });
      m.bindPopup(`<b>${p.nombre}</b>`);
      markersRef.current[p.nombre] = m;
    }

    map.on('click', (e) => setClicked({ lat: e.latlng.lat, lon: e.latlng.lng }));

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
  }, []);

  // Rellena los popups con los datos en vivo cuando llegan.
  useEffect(() => {
    for (const p of PUNTOS) {
      const m = markersRef.current[p.nombre];
      if (!m) continue;
      let html = `<b>${p.nombre}</b>`;
      if (p.prov) html += ` <span style="color:#f59e0b">· pos. aprox.</span>`;
      if (p.punto) {
        html += `<br/><span style="color:#9ca3af">punto ${p.punto}</span>`;
        const r = vivos?.[p.punto];
        if (r) {
          html += `<br/><span style="color:#9ca3af">${r.fecha} ${r.hora}</span><table style="margin-top:4px;border-collapse:collapse">`;
          for (const [k, label, unit] of POPUP_VARS) {
            const v = r.values?.[k];
            const txt = v === null || v === undefined ? '—' : Number(v).toFixed(1);
            html += `<tr><td style="padding-right:10px;color:#9ca3af">${label}</td><td style="text-align:right">${txt} ${unit}</td></tr>`;
          }
          html += `</table>`;
        } else if (vivos) {
          html += `<br/><span style="color:#9ca3af">sin datos</span>`;
        }
      }
      m.setPopupContent(html);
    }
  }, [vivos]);

  return (
    <div className="relative" style={{ height: 'calc(100vh - 56px)' }}>
      <div ref={containerRef} className="h-full w-full" style={{ background: '#0f141b' }} />

      {/* Título de la vista */}
      <div className="pointer-events-none absolute left-3 top-3 z-[1000] rounded border border-line bg-panel-2/90 px-3 py-1.5 text-xs text-gray-300">
        Campo · ubicación de locaciones (clic en un marcador para ver datos)
      </div>

      {/* Helper: coordenada del clic (para relevar/ubicar puntos) */}
      {clicked && (
        <div className="absolute bottom-3 left-3 z-[1000] rounded border border-line bg-panel-2/95 px-3 py-2 text-xs text-gray-200">
          <div className="mb-1 text-gray-500">Coordenada del clic:</div>
          <div>
            Lat {clicked.lat.toFixed(6)} · Lon {clicked.lon.toFixed(6)}
          </div>
          <div className="text-gray-400">
            {toDMS(clicked.lat, true)} · {toDMS(clicked.lon, false)}
          </div>
        </div>
      )}
    </div>
  );
}
