"use client";

import React, { useEffect, useRef, useState } from "react";
import { RegionalBubble } from "@/lib/types";
import { formatPct, formatCrore, RISK_COLORS, RISK_BG } from "@/lib/format";
import {
  MapPin,
  Info,
  Flame,
  CircleDot,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  Building2,
  TrendingDown,
  Landmark,
  Compass,
} from "lucide-react";

interface MapViewProps {
  bubbles: RegionalBubble[];
  selectedRegion?: string;
  onSelectRegion?: (region: string) => void;
  onNavigateToRegister?: (region: string) => void;
}

type MapMode = "heatmap" | "bubbles" | "combined";

// Strict geographic bounding box for India (prevents panning to other continents)
const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [6.5, 68.0],  // South-West corner (Kanyakumari / Lakshadweep / Arabian Sea)
  [37.2, 97.5], // North-East corner (Ladakh / Arunachal Pradesh)
];

// Dispersed geographic nodes around regional centroids for smooth continuous heat mapping across India
const REGIONAL_HEAT_NODES: Record<string, [number, number, number][]> = {
  North: [
    [0, 0, 1.0],        // Delhi NCR / Haryana
    [1.8, -1.2, 0.95],  // Punjab
    [-1.8, -2.5, 0.9],  // Rajasthan (Jaipur)
    [-0.8, 3.2, 0.95],  // UP West / Central (Lucknow)
    [2.4, 0.8, 0.75],   // Himachal Pradesh
    [-2.2, 4.5, 0.88],  // UP East (Varanasi)
    [3.2, -1.5, 0.7],   // Jammu & Kashmir
  ],
  South: [
    [0, 0, 1.0],        // Bangalore / Karnataka South
    [1.4, 1.6, 0.95],   // Andhra / Chennai Corridor
    [-2.4, 0.4, 0.9],   // Tamil Nadu Central (Madurai)
    [-1.6, -2.0, 0.85], // Kerala (Kochi/Trivandrum)
    [3.5, 0.6, 0.95],   // Telangana (Hyderabad)
    [2.2, -3.0, 0.8],   // Karnataka North
  ],
  East: [
    [0, 0, 1.0],        // Jharkhand / Bengal border (Ranchi)
    [-2.4, -1.2, 0.92], // Odisha Coastal (Bhubaneswar)
    [2.2, -1.4, 0.95],  // Bihar (Patna Corridor)
    [-0.4, 2.2, 0.88],  // West Bengal (Kolkata)
    [-3.2, -2.6, 0.78], // Odisha Interior
  ],
  West: [
    [0, 0, 1.0],        // Maharashtra (Mumbai-Pune)
    [2.6, -1.6, 0.95],  // Gujarat (Ahmedabad-Vadodara)
    [1.2, 3.2, 0.86],   // Maharashtra (Nagpur / Vidarbha)
    [-3.0, 0.2, 0.75],  // Goa / Konkan
    [3.2, -3.4, 0.82],  // Gujarat (Saurashtra / Rajkot)
  ],
  Central: [
    [0, 0, 1.0],        // MP (Bhopal)
    [-1.8, 2.4, 0.92],  // Chhattisgarh (Raipur)
    [1.2, -2.0, 0.86],  // MP (Indore)
    [-2.8, 3.0, 0.78],  // Bastar / South Chhattisgarh
    [1.6, 2.0, 0.8],    // MP (Jabalpur / Rewa)
  ],
  Northeast: [
    [0, 0, 1.0],        // Assam (Guwahati Corridor)
    [1.4, 2.0, 0.85],   // Upper Assam (Dibrugarh)
    [-1.2, -1.4, 0.8],  // Meghalaya (Shillong)
    [-2.0, 1.2, 0.75],  // Tripura (Agartala)
  ],
  "Multi-State/National": [
    [0, 0, 0.9],
    [-2.0, -1.0, 0.75],
    [2.0, 1.5, 0.8],
  ],
};

export function MapView({ bubbles, selectedRegion, onSelectRegion, onNavigateToRegister }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const heatLayerRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapMode, setMapMode] = useState<MapMode>("combined");

  // Determine active selected region (defaults to North or highest risk)
  const [activeRegion, setActiveRegion] = useState<string>("North");

  // Filter out 'Unknown' from regional list for clean display
  const validBubbles = bubbles.filter((b) => b.region !== "Unknown");

  const currentRegionData =
    validBubbles.find((b) => b.region === activeRegion) ||
    validBubbles[0] ||
    null;

  // Initialize Map strictly constrained to India
  useEffect(() => {
    let isMounted = true;

    async function initLeaflet() {
      if (typeof window === "undefined" || !mapContainerRef.current) return;

      try {
        const L = (await import("leaflet")).default;
        (window as any).L = L;
        // @ts-ignore
        await import("leaflet.heat");

        if (!isMounted) return;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        // Initialize strictly centered on India with maxBounds constraining to India only
        const map = L.map(mapContainerRef.current, {
          center: [22.0, 78.8],
          zoom: 4.8,
          minZoom: 4.4,
          maxZoom: 7.5,
          maxBounds: INDIA_BOUNDS,
          maxBoundsViscosity: 1.0, // Hard bounceback prevents panning out of India
          scrollWheelZoom: false,
        });

        // Clean high-contrast cartographic tile layer
        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
          {
            attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
            maxZoom: 19,
          }
        ).addTo(map);

        markersGroupRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
        setMapLoaded(true);
      } catch (err) {
        console.error("Leaflet Heatmap initialization fallback:", err);
      }
    }

    initLeaflet();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Heatmap and/or Bubbles layers
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;

    const L = (window as any).L;
    if (!L) return;

    const map = mapInstanceRef.current;

    // 1. Manage Heatmap Layer
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if ((mapMode === "heatmap" || mapMode === "combined") && typeof L.heatLayer === "function") {
      const heatPoints: [number, number, number][] = [];

      validBubbles.forEach((b) => {
        if (!b.lat || !b.lng) return;

        const offsets = REGIONAL_HEAT_NODES[b.region] || [[0, 0, 1.0]];
        const baseIntensity = Math.min(1.0, (b.avg_delay_probability * 0.65) + ((b.high_risk_pct / 100) * 0.35));

        offsets.forEach(([dLat, dLng, weight]) => {
          heatPoints.push([
            b.lat + dLat,
            b.lng + dLng,
            parseFloat((baseIntensity * weight).toFixed(3)),
          ]);
        });
      });

      const heat = L.heatLayer(heatPoints, {
        radius: 38,
        blur: 22,
        maxZoom: 7,
        max: 1.0,
        minOpacity: 0.35,
        gradient: {
          0.2: "#3B82F6", // Low risk: Blue
          0.4: "#06B6D4", // Cyan
          0.6: "#10B981", // Moderate: Green
          0.75: "#F59E0B", // High: Amber
          0.95: "#DC2626", // Critical delay: Red
        },
      });

      heat.addTo(map);
      heatLayerRef.current = heat;
    }

    // 2. Manage Bubbles Layer
    if (markersGroupRef.current) {
      markersGroupRef.current.clearLayers();
    }

    if (mapMode === "bubbles" || mapMode === "combined") {
      validBubbles.forEach((b) => {
        if (!b.lat || !b.lng) return;

        const isSelected = activeRegion === b.region;
        const color = b.high_risk_pct > 65 ? "#DC2626" : b.high_risk_pct >= 35 ? "#D97706" : "#16A34A";
        const fillColor = b.high_risk_pct > 65 ? "#F87171" : b.high_risk_pct >= 35 ? "#FBBF24" : "#4ADE80";
        const radius = Math.max(16, Math.min(44, Math.sqrt(b.total_projects) * 0.88));

        const circle = L.circleMarker([b.lat, b.lng], {
          radius: isSelected ? radius + 4 : radius,
          fillColor: fillColor,
          color: isSelected ? "#0F172A" : color,
          weight: isSelected ? 4 : 2,
          opacity: 0.95,
          fillOpacity: mapMode === "combined" ? 0.35 : 0.65,
        });

        circle.bindTooltip(
          `<div class="p-1 text-xs font-sans">
            <strong class="text-sm font-semibold">${b.region} Zone</strong><br/>
            <span>Total Projects: <b>${b.total_projects}</b></span><br/>
            <span>High Risk (&gt;65%): <b>${b.high_risk_count} (${b.high_risk_pct}%)</b></span><br/>
            <span>Avg Delay Probability: <b>${formatPct(b.avg_delay_probability)}</b></span>
          </div>`,
          { direction: "top", offset: [0, -radius] }
        );

        circle.on("click", () => {
          setActiveRegion(b.region);
        });

        markersGroupRef.current.addLayer(circle);
      });
    }
  }, [validBubbles, mapLoaded, mapMode, activeRegion]);

  // Pan map when active region changes (zone chip click — stays on regional page)
  const handleRegionClick = (region: string) => {
    setActiveRegion(region);
    const bubble = validBubbles.find((b) => b.region === region);
    if (bubble && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([bubble.lat, bubble.lng], 5.2, { duration: 0.8 });
    }
  };

  return (
    <div className="bg-surface dark:bg-[#141D26] border border-line dark:border-[#2A3742] rounded-lg p-5">
      {/* Top Header Strip with Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-teal" />
            <h3 className="font-serif text-lg font-semibold">
              India Regional Land Acquisition Delay Heatmap
            </h3>
          </div>
          <p className="text-xs text-ink/60 dark:text-[#8A9086] mt-0.5">
            Territorial delay likelihood surface &amp; monitoring zone intelligence (constrained to India)
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-paper dark:bg-slate-800 p-1 rounded-lg border border-line dark:border-[#2A3742] text-xs">
          <button
            onClick={() => setMapMode("heatmap")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-all font-medium ${
              mapMode === "heatmap"
                ? "bg-red-600 text-white shadow-sm"
                : "text-ink/70 dark:text-gray-300 hover:text-ink"
            }`}
          >
            <Flame size={13} />
            Heatmap
          </button>

          <button
            onClick={() => setMapMode("bubbles")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-all font-medium ${
              mapMode === "bubbles"
                ? "bg-teal text-white shadow-sm"
                : "text-ink/70 dark:text-gray-300 hover:text-ink"
            }`}
          >
            <CircleDot size={13} />
            Risk Bubbles
          </button>

          <button
            onClick={() => setMapMode("combined")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-all font-medium ${
              mapMode === "combined"
                ? "bg-slate-800 dark:bg-slate-700 text-white shadow-sm"
                : "text-ink/70 dark:text-gray-300 hover:text-ink"
            }`}
          >
            <Layers size={13} />
            Combined
          </button>
        </div>
      </div>

      {/* Main Side-by-Side Layout: Map on Left (7 cols), Regional Data on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Leaflet Map strictly bounded to India */}
        <div className="lg:col-span-7 relative rounded-lg overflow-hidden border border-line dark:border-[#2A3742] h-[480px] bg-slate-100 dark:bg-slate-900">
          <div ref={mapContainerRef} className="h-full w-full z-0" />

          {/* Floating Heatmap Gradient Legend */}
          {(mapMode === "heatmap" || mapMode === "combined") && (
            <div className="absolute bottom-3 left-3 z-10 bg-surface/90 dark:bg-[#141D26]/90 backdrop-blur border border-line dark:border-[#2A3742] px-3 py-2 rounded-lg shadow-md text-[10px] text-ink/70 dark:text-[#B9BEB2] max-w-[260px]">
              <div className="flex items-center justify-between mb-1 font-semibold text-[10px] text-ink dark:text-white">
                <span>Low Risk (&lt;35%)</span>
                <span>Critical (&gt;85%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 via-emerald-500 via-amber-500 to-red-600 shadow-inner" />
              <div className="flex justify-between mt-1 text-[9px] font-mono text-ink/50 dark:text-[#8A9086]">
                <span>Low</span>
                <span>Moderate</span>
                <span>High</span>
                <span>Severe</span>
              </div>
            </div>
          )}

          {/* Map Compass Indicator */}
          <div className="absolute top-3 left-3 z-10 bg-surface/80 dark:bg-slate-800/80 backdrop-blur px-2 py-1 rounded text-[11px] font-mono border border-line dark:border-[#2A3742] flex items-center gap-1">
            <Compass size={13} className="text-teal" />
            <span>India Zone</span>
          </div>
        </div>

        {/* Right Column: Remaining Side Space with Regional Intelligence & Live Data */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          {/* Quick Regional Selector Chips */}
          <div>
            <span className="text-[11px] font-semibold text-ink/60 dark:text-[#8A9086] uppercase tracking-wider block mb-2">
              Select Monitoring Zone:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {validBubbles.map((b) => {
                const isSelected = activeRegion === b.region;
                return (
                  <button
                    key={b.region}
                    onClick={() => handleRegionClick(b.region)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-teal text-white shadow-sm ring-1 ring-teal"
                        : "bg-paper dark:bg-slate-800 text-ink/70 dark:text-gray-300 border border-line dark:border-[#2A3742] hover:border-teal"
                    }`}
                  >
                    {b.region} ({b.total_projects})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Region Deep-Dive Card */}
          {currentRegionData && (
            <div className="bg-paper dark:bg-slate-900/60 p-4 rounded-lg border border-line dark:border-[#2A3742] space-y-4 flex-1">
              <div className="flex items-center justify-between border-b border-line dark:border-[#2A3742] pb-3">
                <div>
                  <h4 className="font-serif text-lg font-bold text-ink dark:text-white">
                    {currentRegionData.region} Region
                  </h4>
                  <span className="text-[11px] text-ink/50 dark:text-[#8A9086]">
                    {currentRegionData.total_projects} Projects Monitored
                  </span>
                </div>

                <span
                  className="px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor:
                      currentRegionData.high_risk_pct > 65
                        ? RISK_BG.High
                        : currentRegionData.high_risk_pct >= 35
                        ? RISK_BG.Medium
                        : RISK_BG.Low,
                    color:
                      currentRegionData.high_risk_pct > 65
                        ? RISK_COLORS.High
                        : currentRegionData.high_risk_pct >= 35
                        ? RISK_COLORS.Medium
                        : RISK_COLORS.Low,
                  }}
                >
                  {currentRegionData.high_risk_pct}% High Risk
                </span>
              </div>

              {/* 4-Stat Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-surface dark:bg-[#141D26] p-2.5 rounded border border-line dark:border-[#2A3742]">
                  <span className="text-[11px] text-ink/50 dark:text-[#8A9086] block">
                    Mean Delay Probability
                  </span>
                  <strong className="text-sm text-ink dark:text-white">
                    {formatPct(currentRegionData.avg_delay_probability)}
                  </strong>
                </div>

                <div className="bg-surface dark:bg-[#141D26] p-2.5 rounded border border-line dark:border-[#2A3742]">
                  <span className="text-[11px] text-ink/50 dark:text-[#8A9086] block">
                    Critical Risk (&ge;85%)
                  </span>
                  <strong className="text-sm text-red-600">
                    {currentRegionData.critical_count || currentRegionData.high_risk_count} Projects
                  </strong>
                </div>

                <div className="bg-surface dark:bg-[#141D26] p-2.5 rounded border border-line dark:border-[#2A3742]">
                  <span className="text-[11px] text-ink/50 dark:text-[#8A9086] block">
                    Total Sanctioned Outlay
                  </span>
                  <strong className="text-sm text-ink dark:text-white">
                    {formatCrore(currentRegionData.total_cost_crore)}
                  </strong>
                </div>

                <div className="bg-surface dark:bg-[#141D26] p-2.5 rounded border border-line dark:border-[#2A3742]">
                  <span className="text-[11px] text-ink/50 dark:text-[#8A9086] block">
                    Avg Land Shortfall Gap
                  </span>
                  <strong className="text-sm text-amber-600">
                    {currentRegionData.avg_land_gap_ha ? `${currentRegionData.avg_land_gap_ha} Ha` : "—"}
                  </strong>
                </div>
              </div>

              {/* Top Regional Bottlenecks */}
              <div>
                <span className="text-[11px] font-semibold text-ink/70 dark:text-[#8A9086] uppercase tracking-wider block mb-1.5">
                  Primary Delay Drivers in this Zone:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(currentRegionData.top_delay_drivers || ["Land Acquisition Gap", "Schedule Risk"]).map(
                    (driver, i) => (
                      <span
                        key={i}
                        className="bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900/40 px-2 py-0.5 rounded text-[11px] flex items-center gap-1"
                      >
                        <ShieldAlert size={11} className="shrink-0" />
                        {driver}
                      </span>
                    )
                  )}
                </div>
              </div>

              {/* Top Sectors in this Region */}
              <div>
                <span className="text-[11px] font-semibold text-ink/70 dark:text-[#8A9086] uppercase tracking-wider block mb-1.5">
                  Dominant Infrastructure Sectors:
                </span>
                <div className="space-y-1.5 text-xs">
                  {Object.entries(currentRegionData.top_sectors || {}).map(([sec, count]) => {
                    const pct = Math.round((count / currentRegionData.total_projects) * 100);
                    return (
                      <div key={sec} className="bg-surface dark:bg-[#141D26] p-2 rounded border border-line dark:border-[#2A3742]">
                        <div className="flex justify-between mb-1 text-[11px]">
                          <span className="font-medium text-ink dark:text-white truncate max-w-[200px]">{sec}</span>
                          <span className="text-ink/60 dark:text-[#8A9086]">{count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-teal rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Action Link to Filter Register */}
          <button
            onClick={() => {
              if (onNavigateToRegister && currentRegionData) {
                onNavigateToRegister(currentRegionData.region);
              }
            }}
            className="w-full py-2 px-3 rounded-lg bg-teal hover:bg-teal/90 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
          >
            <span>View All {currentRegionData?.total_projects} Projects in {currentRegionData?.region} Zone</span>
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>

      {/* Mandatory GIS Data Governance Notice */}
      <div className="mt-4 flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded p-2.5 text-xs text-amber-900 dark:text-amber-200">
        <Info size={16} className="shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
        <div>
          <strong>Spatial Boundary Note:</strong> Map display is geographically constrained strictly to the Republic of India.
          Heat density surface is computed over regional monitoring nodes using trained LightGBM inference likelihoods
          without fabricating street-level GPS coordinates.
        </div>
      </div>
    </div>
  );
}
