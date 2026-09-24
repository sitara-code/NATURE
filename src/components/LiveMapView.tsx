import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers, Eye, ShieldAlert, ZoomIn, ZoomOut, RotateCcw, AlertTriangle, Compass, MapPin } from 'lucide-react';
import { Zoo, Observation, RiskAnalysis, Alert } from '../types';

interface LiveMapViewProps {
  zoos: Zoo[];
  observations: Observation[];
  riskAnalysis: RiskAnalysis | null;
  alerts: Alert[];
  onSelectObservation?: (obs: Observation) => void;
}

export const LiveMapView: React.FC<LiveMapViewProps> = ({
  zoos,
  observations,
  riskAnalysis,
  alerts,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Layer groups refs
  const zoosLayerRef = useRef<L.LayerGroup | null>(null);
  const geofencesLayerRef = useRef<L.LayerGroup | null>(null);
  const observationsLayerRef = useRef<L.LayerGroup | null>(null);
  const riskZoneLayerRef = useRef<L.LayerGroup | null>(null);
  const alertsLayerRef = useRef<L.LayerGroup | null>(null);
  const zooMarkersRef = useRef<Map<string, L.Marker>>(new Map());

  // Layer visibility toggles
  const [showZoos, setShowZoos] = useState(true);
  const [showGeofences, setShowGeofences] = useState(true);
  const [showObservations, setShowObservations] = useState(true);
  const [showRiskZone, setShowRiskZone] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [selectedZooId, setSelectedZooId] = useState('');

  // Current logged-in user's GPS location captured during login.
  const [currentUserLocation, setCurrentUserLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null>(null);

  // Load the current user's location captured during login.
  useEffect(() => {
    try {
      const stored = localStorage.getItem('currentUserLocation');

      if (stored) {
        const parsed = JSON.parse(stored);

        if (
          typeof parsed.latitude === 'number' &&
          typeof parsed.longitude === 'number'
        ) {
          setCurrentUserLocation({
            latitude: parsed.latitude,
            longitude: parsed.longitude,
            accuracy: parsed.accuracy,
          });
        }
      }
    } catch {
      // Ignore invalid/missing stored location.
    }
  }, [currentUserLocation, zoos]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Prefer the logged-in user's current GPS location.
    // Fall back to the first zoo, then global view.
    const initialLat = currentUserLocation?.latitude ?? (zoos.length > 0 ? zoos[0].latitude : 20);
    const initialLng = currentUserLocation?.longitude ?? (zoos.length > 0 ? zoos[0].longitude : 0);
    const initialZoom = currentUserLocation ? 13 : (zoos.length > 0 ? 5 : 2);

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: true,
    });

    // Clean OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors | Zoo Sentinel',
    }).addTo(map);

    // Current logged-in user's location marker.
    if (currentUserLocation) {
      const userIcon = L.divIcon({
        className: 'custom-user-location',
        html: `
          <div style="
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #2563eb;
            border: 3px solid white;
            box-shadow: 0 0 0 6px rgba(37,99,235,0.22), 0 2px 8px rgba(0,0,0,0.35);
          "></div>
        `,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      const userMarker = L.marker(
        [currentUserLocation.latitude, currentUserLocation.longitude],
        { icon: userIcon }
      );

      userMarker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
          <strong style="color: #2563eb;">YOUR CURRENT LOCATION</strong><br/>
          <span>Latitude: ${currentUserLocation.latitude.toFixed(6)}</span><br/>
          <span>Longitude: ${currentUserLocation.longitude.toFixed(6)}</span><br/>
          ${
            currentUserLocation.accuracy
              ? `<span>GPS Accuracy: ±${Math.round(currentUserLocation.accuracy)}m</span>`
              : ''
          }
        </div>
      `);

      userMarker.addTo(map);
    }

    // Zoom control in top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Initialize LayerGroups
    const zoosLayer = L.layerGroup().addTo(map);
    const geofencesLayer = L.layerGroup().addTo(map);
    const observationsLayer = L.layerGroup().addTo(map);
    const riskZoneLayer = L.layerGroup().addTo(map);
    const alertsLayer = L.layerGroup().addTo(map);

    zoosLayerRef.current = zoosLayer;
    geofencesLayerRef.current = geofencesLayer;
    observationsLayerRef.current = observationsLayer;
    riskZoneLayerRef.current = riskZoneLayer;
    alertsLayerRef.current = alertsLayer;

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Zoos & Geofences
  useEffect(() => {
    if (!mapRef.current || !zoosLayerRef.current || !geofencesLayerRef.current) return;

    zoosLayerRef.current.clearLayers();
    geofencesLayerRef.current.clearLayers();
    zooMarkersRef.current.clear();

    if (showZoos) {
      for (const zoo of zoos) {
        // Institution Icon
        const zooIcon = L.divIcon({
          className: 'custom-zoo-marker',
          html: `<div style="background-color: #0284c7; color: white; width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4);">🏛️</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([zoo.latitude, zoo.longitude], { icon: zooIcon });
        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
            <strong style="color: #0284c7; font-size: 13px;">${zoo.name}</strong><br/>
            <span style="color: #64748b;">Code: <b>${zoo.identifier}</b> | ${zoo.city}, ${zoo.country}</span><br/>
            <span style="color: #059669;">Verified Institution Status: ${zoo.verified ? '✓ Verified' : 'Pending'}</span><br/>
            <span>Truth Rating: <b>${zoo.truthRating}%</b></span><br/>
            <span>Geofence Perimeter: <b>${zoo.geofenceRadiusMeters}m</b></span>
          </div>
        `);
        zooMarkersRef.current.set(zoo.id, marker);
        zoosLayerRef.current.addLayer(marker);
      }
    }

    if (showGeofences) {
      for (const zoo of zoos) {
        if (zoo.geofencePolygon && zoo.geofencePolygon.length >= 3) {
          const poly = L.polygon(zoo.geofencePolygon, {
            color: '#0284c7',
            weight: 2,
            dashArray: '4, 4',
            fillColor: '#38bdf8',
            fillOpacity: 0.12,
          });
          poly.bindTooltip(`${zoo.name} Geofence`, { sticky: true });
          geofencesLayerRef.current.addLayer(poly);
        }
      }
    }
  }, [zoos, showZoos, showGeofences]);

  // Update Observations Layer
  useEffect(() => {
    if (!mapRef.current || !observationsLayerRef.current) return;
    observationsLayerRef.current.clearLayers();

    if (!showObservations) return;

    for (const obs of observations) {
      const isVerified = obs.verificationStatus === 'VERIFIED_IN_GEOFENCE';
      const color =
        obs.severity >= 4 ? '#e11d48' : obs.severity === 3 ? '#f59e0b' : '#10b981';

      const obsIcon = L.divIcon({
        className: 'custom-obs-marker',
        html: `<div style="background-color: ${color}; width: 18px; height: 18px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 0 8px ${color}; display: flex; align-items: center; justify-content: center; color: white; font-size: 9px; font-weight: bold;">!</div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      const marker = L.marker([obs.latitude, obs.longitude], { icon: obsIcon });
      const mediaSnippet = obs.mediaUrl
        ? obs.mediaType === 'video'
          ? `<video src="${obs.mediaUrl}" controls style="width: 100%; max-height: 120px; border-radius: 4px; margin-top: 6px;"></video>`
          : `<img src="${obs.mediaUrl}" alt="Media" style="width: 100%; max-height: 120px; object-fit: cover; border-radius: 4px; margin-top: 6px;" />`
        : '';

      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; max-width: 240px;">
          <div style="font-weight: bold; color: ${color}; font-size: 13px; text-transform: uppercase;">
            ${obs.species}
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">
            <b>Category:</b> ${obs.behaviourCategory}
          </div>
          <div style="background: #f8fafc; border-left: 3px solid ${color}; padding: 4px 6px; margin: 4px 0; font-size: 11px; color: #1e293b;">
            "${obs.description}"
          </div>
          <div style="font-size: 11px; color: #64748b;">
            <b>Severity:</b> Level ${obs.severity}/5<br/>
            <b>Institution:</b> ${obs.zooName}<br/>
            <b>Keeper:</b> ${obs.zookeeperName}<br/>
            <b>GPS Accuracy:</b> ±${Math.round(obs.gpsAccuracy)}m<br/>
            <b>Observed:</b> ${new Date(obs.observedAt).toLocaleString()}
          </div>
          ${mediaSnippet}
        </div>
      `);

      observationsLayerRef.current.addLayer(marker);
    }
  }, [observations, showObservations]);

  // Update Risk Zones & Clustering
  useEffect(() => {
    if (!mapRef.current || !riskZoneLayerRef.current) return;
    riskZoneLayerRef.current.clearLayers();

    if (!showRiskZone || !riskAnalysis || riskAnalysis.observationCount < 2) return;

    // Draw estimated affected radius circle
    const dangerCircle = L.circle([riskAnalysis.centerLatitude, riskAnalysis.centerLongitude], {
      radius: riskAnalysis.estimatedRadiusKm * 1000,
      color: riskAnalysis.riskScore >= 60 ? '#dc2626' : '#d97706',
      fillColor: riskAnalysis.riskScore >= 60 ? '#ef4444' : '#f59e0b',
      fillOpacity: 0.18,
      weight: 2,
      dashArray: '6, 6',
    });

    dangerCircle.bindPopup(`
      <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
        <strong style="color: #dc2626; font-size: 13px;">BIOLOGICAL ANOMALY RISK ZONE</strong><br/>
        <b>Potential Event:</b> ${riskAnalysis.eventType}<br/>
        <b>Model-Estimated Risk:</b> ${riskAnalysis.riskScore}% (${riskAnalysis.confidence} Confidence)<br/>
        <b>Estimated Radius:</b> ${riskAnalysis.estimatedRadiusKm} km<br/>
        <b>Estimated Window:</b> ${riskAnalysis.estimatedTimeWindow}<br/>
        <div style="margin-top: 4px; font-size: 11px; color: #64748b;">
          Calculated from ${riskAnalysis.observationCount} verified observation(s) across ${riskAnalysis.zooCount} zoo(s).
        </div>
      </div>
    `);

    riskZoneLayerRef.current.addLayer(dangerCircle);

    // Center icon
    const centerIcon = L.divIcon({
      className: 'custom-risk-center',
      html: `<div style="background-color: #dc2626; color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border: 2px solid white; box-shadow: 0 0 10px #dc2626;">⚠</div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    const centerMarker = L.marker([riskAnalysis.centerLatitude, riskAnalysis.centerLongitude], {
      icon: centerIcon,
    });
    centerMarker.bindTooltip(`Risk Epicenter: ${riskAnalysis.eventType}`, { permanent: false });
    riskZoneLayerRef.current.addLayer(centerMarker);
  }, [riskAnalysis, showRiskZone]);

  // Update Active Alerts Polygons
  useEffect(() => {
    if (!mapRef.current || !alertsLayerRef.current) return;
    alertsLayerRef.current.clearLayers();

    if (!showAlerts) return;

    for (const alert of alerts) {
      if (alert.polygon && alert.polygon.length >= 3) {
        const poly = L.polygon(alert.polygon, {
          color: '#e11d48',
          weight: 3,
          fillColor: '#f43f5e',
          fillOpacity: 0.22,
        });

        poly.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
            <div style="font-weight: bold; color: #e11d48; font-size: 13px;">
              ${alert.title}
            </div>
            <div style="font-size: 11px; color: #475569; margin: 4px 0;">
              <b>Targeted Citizens in Zone:</b> ${alert.targetedCitizensCount}<br/>
              <b>Emergency SMS:</b> ${alert.smsDispatchStatus}<br/>
              <b>Radius:</b> ${alert.radiusKm} km<br/>
              <b>Timestamp:</b> ${new Date(alert.createdAt).toLocaleTimeString()}
            </div>
            <div style="font-size: 10px; color: #64748b; font-style: italic;">
              ${alert.message.replace(/\n/g, '<br/>')}
            </div>
          </div>
        `);

        alertsLayerRef.current.addLayer(poly);
      }
    }
  }, [alerts, showAlerts]);

  // Fit view helper
  const handleFitToData = () => {
    if (!mapRef.current) return;

    const bounds = L.latLngBounds([]);

    // Include current logged-in user's location
    if (currentUserLocation) {
      bounds.extend([currentUserLocation.latitude, currentUserLocation.longitude]);
    }

    // Include zoos
    for (const zoo of zoos) {
      bounds.extend([zoo.latitude, zoo.longitude]);
    }

    // Include observations
    for (const obs of observations) {
      bounds.extend([obs.latitude, obs.longitude]);
    }

    if (riskAnalysis) {
      bounds.extend([riskAnalysis.centerLatitude, riskAnalysis.centerLongitude]);
    }

    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  };

  const handleFlyToZoo = (zooId: string) => {
    setSelectedZooId(zooId);
    if (!zooId || !mapRef.current) return;
    const target = zoos.find((z) => z.id === zooId);
    if (!target) return;
    mapRef.current.flyTo([target.latitude, target.longitude], 15, { animate: true, duration: 1.2 });
    const marker = zooMarkersRef.current.get(target.id);
    if (marker) {
      setTimeout(() => {
        marker.openPopup();
      }, 1200);
    }
  };

  const handleFlyToRegion = (region: 'india' | 'global') => {
    if (!mapRef.current) return;
    if (region === 'india') {
      mapRef.current.flyTo([21.0, 78.5], 5, { animate: true, duration: 1.2 });
    } else {
      mapRef.current.flyTo([20, 20], 2, { animate: true, duration: 1.2 });
    }
  };

  return (
    <div className="relative w-full h-[650px] rounded-3xl overflow-hidden border border-teal-200 dark:border-emerald-950 shadow-xs bg-slate-100 dark:bg-[#060e0a]">
      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Floating Control Deck */}
      <div className="absolute top-3 left-3 z-10 bg-white/95 dark:bg-[#0c1a14]/95 backdrop-blur-md border border-teal-200 dark:border-emerald-950 rounded-2xl p-3.5 shadow-md text-xs space-y-2 text-blue-950 dark:text-slate-300 w-72">
        <div className="flex items-center justify-between border-b border-teal-200 dark:border-emerald-950 pb-2 font-mono font-bold text-blue-950 dark:text-white">
          <span className="flex items-center space-x-1.5">
            <Layers className="w-4 h-4 text-teal-700 dark:text-emerald-400" />
            <span>MAP INTELLIGENCE</span>
          </span>
          <button
            onClick={handleFitToData}
            className="text-[10px] text-teal-800 dark:text-sky-400 hover:text-teal-900 dark:hover:text-sky-300 font-bold flex items-center space-x-0.5"
            title="Fit to active data"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset View</span>
          </button>
        </div>

        {currentUserLocation && (
          <div className="border-b border-teal-200 dark:border-emerald-950/80 pb-2 mb-2 text-[10px] text-teal-800 dark:text-sky-400">
            <span className="font-bold">● LIVE USER LOCATION</span>
            {currentUserLocation.accuracy
              ? ` • ±${Math.round(currentUserLocation.accuracy)}m`
              : ''}
          </div>
        )}

        {/* Quick Region Focus & Zoo Selector */}
        <div className="border-b border-teal-200 dark:border-emerald-950/80 pb-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-violet-950 dark:text-slate-300">
            <span className="flex items-center space-x-1">
              <Compass className="w-3 h-3 text-teal-700 dark:text-emerald-400" />
              <span>QUICK REGION NAVIGATOR</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              id="btn-focus-india"
              type="button"
              onClick={() => handleFlyToRegion('india')}
              className="px-2 py-1.5 rounded-lg bg-orange-100 hover:bg-orange-200 dark:bg-orange-950/40 dark:hover:bg-orange-900/60 border border-orange-300 dark:border-orange-800 text-[10px] font-bold text-orange-900 dark:text-orange-300 flex items-center justify-center space-x-1 transition-all"
            >
              <span>🇮🇳 India ({zoos.filter((z) => z.country === 'India').length})</span>
            </button>
            <button
              id="btn-focus-global"
              type="button"
              onClick={() => handleFlyToRegion('global')}
              className="px-2 py-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 dark:bg-sky-950/40 dark:hover:bg-sky-900/60 border border-sky-300 dark:border-sky-800 text-[10px] font-bold text-sky-900 dark:text-sky-300 flex items-center justify-center space-x-1 transition-all"
            >
              <span>🌎 Global View</span>
            </button>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-violet-950 dark:text-slate-300 mb-1 flex items-center space-x-1">
              <MapPin className="w-2.5 h-2.5 text-teal-700 dark:text-emerald-400" />
              <span>Inspect Zoo Perimeter:</span>
            </label>
            <select
              id="select-jump-zoo"
              value={selectedZooId}
              onChange={(e) => handleFlyToZoo(e.target.value)}
              className="w-full bg-sky-50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-xl px-2 py-1 text-[11px] text-blue-950 dark:text-white focus:outline-none focus:border-teal-500 font-medium"
            >
              <option value="">Select a zoo to fly to...</option>
              <optgroup label="🇮🇳 India Zoos (18 Major Zoos)">
                {zoos
                  .filter((z) => z.country === 'India')
                  .map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} ({z.city})
                    </option>
                  ))}
              </optgroup>
              <optgroup label="🌐 Global Zoos">
                {zoos
                  .filter((z) => z.country !== 'India')
                  .map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} ({z.country})
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>
        </div>

        <div className="space-y-2 text-[11px]">
          <label className="flex items-center justify-between cursor-pointer hover:text-blue-950 dark:hover:text-white">
            <span className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded bg-sky-500" />
              <span className="font-bold">Registered Zoos ({zoos.length})</span>
            </span>
            <input
              type="checkbox"
              checked={showZoos}
              onChange={(e) => setShowZoos(e.target.checked)}
              className="rounded accent-teal-600 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer hover:text-blue-950 dark:hover:text-white">
            <span className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 border border-sky-500 border-dashed rounded" />
              <span className="font-bold">Zoo Geofence Boundaries</span>
            </span>
            <input
              type="checkbox"
              checked={showGeofences}
              onChange={(e) => setShowGeofences(e.target.checked)}
              className="rounded accent-teal-600 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer hover:text-blue-950 dark:hover:text-white">
            <span className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="font-bold">Verified Observations ({observations.length})</span>
            </span>
            <input
              type="checkbox"
              checked={showObservations}
              onChange={(e) => setShowObservations(e.target.checked)}
              className="rounded accent-teal-600 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer hover:text-blue-950 dark:hover:text-white">
            <span className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-400" />
              <span className="font-bold">Anomaly Risk Zone</span>
            </span>
            <input
              type="checkbox"
              checked={showRiskZone}
              onChange={(e) => setShowRiskZone(e.target.checked)}
              className="rounded accent-amber-600 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer hover:text-blue-950 dark:hover:text-white">
            <span className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded border border-rose-500 bg-rose-500/30" />
              <span className="font-bold">Active Alert Polygons ({alerts.length})</span>
            </span>
            <input
              type="checkbox"
              checked={showAlerts}
              onChange={(e) => setShowAlerts(e.target.checked)}
              className="rounded accent-rose-600 cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* Bottom Status Legend */}
      <div className="absolute bottom-3 left-3 right-3 z-10 pointer-events-none flex flex-wrap items-center justify-between gap-2">
        <div className="pointer-events-auto bg-white/95 dark:bg-[#0c1a14]/95 backdrop-blur-md border border-teal-200 dark:border-emerald-950 rounded-2xl px-4 py-2.5 text-[11px] text-blue-950 dark:text-slate-300 flex items-center space-x-3 shadow-md">
          <span className="font-bold text-blue-950 dark:text-white">Severity Legend:</span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="font-bold">1-2 (Mild)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="font-bold">3 (Marked)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
            <span className="font-bold">4-5 (Acute Panic)</span>
          </span>
        </div>

        {riskAnalysis && (
          <div className="pointer-events-auto bg-white/95 dark:bg-[#0c1a14]/95 backdrop-blur-md border border-amber-300 dark:border-amber-800 rounded-2xl px-4 py-2.5 text-xs text-amber-950 dark:text-amber-200 flex items-center space-x-2 shadow-md">
            <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
            <span>
              Active Threat Epicenter: <b className="text-blue-950 dark:text-white font-bold">{riskAnalysis.eventType}</b> ({riskAnalysis.estimatedRadiusKm} km radius)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
