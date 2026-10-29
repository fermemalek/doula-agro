import { useMemo } from "react";
import { useNavigate } from "@/lib/router-compat";
import { useParcels } from "@/lib/parcel-store";
import { useAlerts, useAdminIds } from "@/lib/cloud/alerts";
import { useRecommendations } from "@/lib/cloud/recommendations";
import { useRole } from "@/lib/role";
import { useConfig } from "@/lib/config-store";
import { useDisplayRole } from "@/lib/display-role";

const SIZE = 440;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R_OUTER = 180;
const R_INNER = 78;
const R_RING_IN = R_OUTER + 12;
const R_RING_OUT = R_OUTER + 34;
const N = 12;
const ANGLE = (2 * Math.PI) / N;
const GAP = 0.045; // bigger gap between sectors

function polar(cx: number, cy: number, r: number, a: number) {
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
}

function sectorPath(i: number, rIn = R_INNER, rOut = R_OUTER, gap = GAP) {
  const a0 = -Math.PI / 2 + i * ANGLE + gap / 2;
  const a1 = -Math.PI / 2 + (i + 1) * ANGLE - gap / 2;
  const [x1, y1] = polar(CX, CY, rOut, a0);
  const [x2, y2] = polar(CX, CY, rOut, a1);
  const [x3, y3] = polar(CX, CY, rIn, a1);
  const [x4, y4] = polar(CX, CY, rIn, a0);
  return `M ${x1} ${y1} A ${rOut} ${rOut} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${rIn} ${rIn} 0 0 0 ${x4} ${y4} Z`;
}

function midAngle(i: number) {
  return -Math.PI / 2 + i * ANGLE + ANGLE / 2;
}

function labelPos(i: number, rIn = R_INNER, rOut = R_OUTER) {
  const a = midAngle(i);
  const r = (rOut + rIn) / 2;
  return polar(CX, CY, r, a);
}

function gradientIdFor(p: { type: string; status: string }) {
  if (p.status === "alerte") return "grad-alert";
  if (p.status === "intervention") return "grad-danger";
  if (p.type === "olivier") return "grad-olive-dark";
  if (p.type === "nectarine") return "grad-olive-mid";
  if (p.type === "pommier") return "grad-olive-light";
  return "grad-empty";
}

export function ParcelWheel() {
  const navigate = useNavigate();
  const allParcels = useParcels();
  const { data: alerts = [] } = useAlerts();
  const { data: adminIds = new Set() } = useAdminIds();
  const { userId } = useRole();
  const cfg = useConfig();
  const role = useDisplayRole();
  const uiExecutant = cfg.configured && cfg.role === "executant";
  const openAlerts = alerts.filter(
    (a) => a.status !== "resolu" && a.status !== "validee",
  );
  const execOpenAlerts = openAlerts.filter((a) => {
    if (!a.created_by) return false;
    if (a.source_role === "executant") return true;
    if (a.source_role == null) {
      const isAdminCreator = adminIds?.has(a.created_by) ?? false;
      if (!isAdminCreator) return true;
      // Include current admin's own alerts when UI is in "executant" mode (test scenario)
      return uiExecutant && a.created_by === userId;
    }
    return false;
  });
  const anomalyCount = execOpenAlerts.length;
  const hasAnomalies = anomalyCount > 0;
  const { data: recos = [] } = useRecommendations();
  const recoCount = recos.filter((r) => r.status === "envoyee").length;
  const hasRecos = recoCount > 0;

  const parcelRecoStyles = useMemo(() => {
    const styles: Record<string, { stroke: string; strokeWidth: number; hasReco: boolean }> = {};
    const pendingRecos = recos.filter((r) => r.status === "envoyee");

    const parcelMatchesCropGroup = (parcelItem: any, group: string) => {
      if (group === "oliviers") return parcelItem.type === "olivier";
      if (group === "pommiers") return parcelItem.type === "pommier";
      if (group === "nectarinier") return parcelItem.type === "nectarine";
      if (group === "redix25") return parcelItem.id === "redix25";
      if (group === "nablara") return parcelItem.id === "nablara";
      if (group === "casuarina") return parcelItem.name.toUpperCase().includes("CASUARINA") || parcelItem.id === "brisevent";
      if (group === "p9") return parcelItem.id === "p9";
      if (group === "p10") return parcelItem.id === "p10";
      if (group === "p11") return parcelItem.id === "p11";
      if (group === "p12") return parcelItem.id === "p12";
      return false;
    };

    for (const p of allParcels) {
      const recosForParcel = pendingRecos.filter((r) => {
        if (r.parcel_ids?.includes(p.id)) return true;
        const payload = (r.payload ?? {}) as any;
        const groups = Array.isArray(payload.crop_group)
          ? payload.crop_group
          : payload.crop_group
          ? [payload.crop_group]
          : [];
        return groups.some((g: string) => parcelMatchesCropGroup(p, g));
      });

      const hasPhyto = recosForParcel.some(r => r.kind === "phytosanitaire");
      const hasFert = recosForParcel.some(r => r.kind === "fertilisation");
      const hasPulv = recosForParcel.some(r => r.payload?.method === "pulverisation" || r.payload?.program?.kind === "pulverisation");
      const isDual = hasPhyto && (hasFert || hasPulv);

      const hasAny = recosForParcel.length > 0;

      let stroke = "oklch(1 0 0 / 0.55)";
      let strokeWidth = 1.25;

      if (p.id === "brisevent") {
        stroke = "none";
        strokeWidth = 0;
      }

      if (hasAny) {
        strokeWidth = 3.5;
        if (isDual) {
          stroke = "double-border";
        } else if (hasPhyto) {
          stroke = "oklch(0.60 0.22 28)"; // red
        } else {
          stroke = "oklch(0.80 0.16 85)"; // yellow/gold
        }
      }

      styles[p.id] = { stroke, strokeWidth, hasReco: hasAny, isDual };
    }

    return styles;
  }, [recos, allParcels]);

  const countByParcel = new Map<string, number>();
  for (const a of execOpenAlerts) {
    countByParcel.set(a.parcel_id, (countByParcel.get(a.parcel_id) ?? 0) + 1);
  }
  const brise = allParcels.find((p) => p.id === "brisevent");
  const parcels = allParcels.filter((p) => p.id !== "brisevent").slice(0, N);

  return (
    <div className="mx-auto flex w-full max-w-[680px] justify-center">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-auto w-full select-none">
        <defs>
          <radialGradient id="grad-olive-dark" cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="oklch(0.62 0.10 142)" />
            <stop offset="60%" stopColor="oklch(0.46 0.09 142)" />
            <stop offset="100%" stopColor="oklch(0.30 0.07 142)" />
          </radialGradient>
          <radialGradient id="grad-olive-mid" cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="oklch(0.74 0.13 140)" />
            <stop offset="60%" stopColor="oklch(0.58 0.13 140)" />
            <stop offset="100%" stopColor="oklch(0.42 0.12 140)" />
          </radialGradient>
          <radialGradient id="grad-olive-light" cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="oklch(0.92 0.11 135)" />
            <stop offset="60%" stopColor="oklch(0.80 0.13 135)" />
            <stop offset="100%" stopColor="oklch(0.66 0.13 135)" />
          </radialGradient>
          <radialGradient id="grad-empty" cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="oklch(0.92 0.005 250)" />
            <stop offset="60%" stopColor="oklch(0.80 0.008 250)" />
            <stop offset="100%" stopColor="oklch(0.62 0.012 250)" />
          </radialGradient>
          <radialGradient id="grad-alert" cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="oklch(0.88 0.15 70)" />
            <stop offset="60%" stopColor="oklch(0.72 0.17 55)" />
            <stop offset="100%" stopColor="oklch(0.55 0.18 45)" />
          </radialGradient>
          <radialGradient id="grad-danger" cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="oklch(0.78 0.18 28)" />
            <stop offset="60%" stopColor="oklch(0.60 0.21 28)" />
            <stop offset="100%" stopColor="oklch(0.42 0.22 28)" />
          </radialGradient>

          {/* Outer brise-vent ring gradient (turquoise blue, bevelled) */}
          <radialGradient id="grad-brise" cx="50%" cy="50%" r="55%">
            <stop offset="80%" stopColor="oklch(0.78 0.13 195)" />
            <stop offset="100%" stopColor="oklch(0.55 0.14 200)" />
          </radialGradient>

          {/* Top highlight gloss for sectors */}
          <linearGradient id="sector-gloss" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="oklch(1 0 0)" stopOpacity="0.45" />
            <stop offset="50%" stopColor="oklch(1 0 0)" stopOpacity="0.05" />
            <stop offset="100%" stopColor="oklch(0 0 0)" stopOpacity="0.28" />
          </linearGradient>

          {/* Per-sector lift shadow (gives the height/elevation feel) */}
          <filter id="sector-lift" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.35" />
          </filter>
          <filter id="ring-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodOpacity="0.30" />
          </filter>
          <radialGradient id="grad-anomaly-3d" cx="50%" cy="30%" r="65%">
            <stop offset="0%" stopColor="oklch(0.82 0.18 28)" />
            <stop offset="55%" stopColor="oklch(0.60 0.22 28)" />
            <stop offset="100%" stopColor="oklch(0.38 0.18 28)" />
          </radialGradient>
          <radialGradient id="grad-ras-3d" cx="50%" cy="30%" r="65%">
            <stop offset="0%" stopColor="oklch(0.82 0.16 142)" />
            <stop offset="55%" stopColor="oklch(0.62 0.17 142)" />
            <stop offset="100%" stopColor="oklch(0.38 0.13 142)" />
          </radialGradient>
          <radialGradient id="grad-reco-3d" cx="50%" cy="30%" r="65%">
            <stop offset="0%" stopColor="oklch(0.78 0.15 260)" />
            <stop offset="55%" stopColor="oklch(0.55 0.18 260)" />
            <stop offset="100%" stopColor="oklch(0.35 0.15 260)" />
          </radialGradient>
          <filter id="anomaly-lift" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="5" stdDeviation="4" floodOpacity="0.55" />
          </filter>
          <filter id="center-bubble-lift" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.45" />
          </filter>
          <radialGradient id="grad-exec-bubble" cx="50%" cy="28%" r="75%">
            <stop offset="0%" stopColor="oklch(0.86 0.18 30)" />
            <stop offset="55%" stopColor="oklch(0.62 0.22 28)" />
            <stop offset="100%" stopColor="oklch(0.36 0.17 28)" />
          </radialGradient>
          <radialGradient id="grad-exec-bubble-ok" cx="50%" cy="28%" r="75%">
            <stop offset="0%" stopColor="oklch(0.86 0.16 142)" />
            <stop offset="55%" stopColor="oklch(0.62 0.17 142)" />
            <stop offset="100%" stopColor="oklch(0.36 0.13 142)" />
          </radialGradient>
          <radialGradient id="grad-inge-bubble" cx="50%" cy="28%" r="75%">
            <stop offset="0%" stopColor="oklch(0.84 0.16 260)" />
            <stop offset="55%" stopColor="oklch(0.58 0.19 260)" />
            <stop offset="100%" stopColor="oklch(0.34 0.15 260)" />
          </radialGradient>
          <linearGradient id="grad-stroke-yellow-red" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="50%" stopColor="oklch(0.80 0.16 85)" />
            <stop offset="50%" stopColor="oklch(0.60 0.22 28)" />
          </linearGradient>
        </defs>

        {/* Outer brise-vent ring */}
        {brise && (
          <g
            className="cursor-pointer"
            onClick={() => navigate({ to: "/parcelle/$id", params: { id: brise.id } })}
            filter="url(#ring-shadow)"
          >
            {/* Base circle for fill */}
            <circle
              cx={CX}
              cy={CY}
              r={R_RING_OUT}
              fill="url(#grad-brise)"
              stroke="none"
            />
            {/* Stroke for brise vent */}
            {(() => {
              const style = parcelRecoStyles[brise.id];
              if (!style) return null;
              if (style.isDual) {
                return (
                  <>
                    <circle
                      cx={CX}
                      cy={CY}
                      r={R_RING_OUT}
                      fill="none"
                      stroke="oklch(0.80 0.16 85)"
                      strokeWidth={2.5}
                    />
                    <circle
                      cx={CX}
                      cy={CY}
                      r={R_RING_OUT - 3.5}
                      fill="none"
                      stroke="oklch(0.60 0.22 28)"
                      strokeWidth={2.5}
                    />
                  </>
                );
              }
              if (style.stroke === "url(#grad-stroke-yellow-red)") {
                return (
                  <>
                    <path
                      d={`M ${CX - R_RING_OUT} ${CY} A ${R_RING_OUT} ${R_RING_OUT} 0 0 1 ${CX + R_RING_OUT} ${CY}`}
                      fill="none"
                      stroke="oklch(0.80 0.16 85)"
                      strokeWidth={3.5}
                    />
                    <path
                      d={`M ${CX + R_RING_OUT} ${CY} A ${R_RING_OUT} ${R_RING_OUT} 0 0 1 ${CX - R_RING_OUT} ${CY}`}
                      fill="none"
                      stroke="oklch(0.60 0.22 28)"
                      strokeWidth={3.5}
                    />
                  </>
                );
              }
              return (
                <circle
                  cx={CX}
                  cy={CY}
                  r={R_RING_OUT}
                  fill="none"
                  stroke={style.stroke}
                  strokeWidth={style.strokeWidth}
                />
              );
            })()}
            <circle cx={CX} cy={CY} r={R_RING_IN} fill="oklch(0.98 0 0)" />
            {/* inner highlight stroke */}
            {(() => {
              const style = parcelRecoStyles[brise.id];
              if (!style) return null;
              if (style.isDual) return null;
              if (style.stroke === "url(#grad-stroke-yellow-red)") {
                const r = R_RING_OUT - 1;
                return (
                  <>
                    <path
                      d={`M ${CX - r} ${CY} A ${r} ${r} 0 0 1 ${CX + r} ${CY}`}
                      fill="none"
                      stroke="oklch(0.80 0.16 85)"
                      strokeWidth={3}
                    />
                    <path
                      d={`M ${CX + r} ${CY} A ${r} ${r} 0 0 1 ${CX - r} ${CY}`}
                      fill="none"
                      stroke="oklch(0.60 0.22 28)"
                      strokeWidth={3}
                    />
                  </>
                );
              }
              return (
                <circle
                  cx={CX}
                  cy={CY}
                  r={R_RING_OUT - 1}
                  fill="none"
                  stroke={style.hasReco ? style.stroke : "oklch(1 0 0 / 0.4)"}
                  strokeWidth={style.hasReco ? 3 : 1.2}
                />
              );
            })()}
            <circle
              cx={CX}
              cy={CY}
              r={R_RING_IN + 1}
              fill="none"
              stroke="oklch(0 0 0 / 0.25)"
              strokeWidth={1}
            />
            <path
              id="brise-text-path"
              fill="none"
              stroke="none"
              d={`M ${CX - (R_RING_IN + R_RING_OUT) / 2} ${CY} a ${(R_RING_IN + R_RING_OUT) / 2} ${(R_RING_IN + R_RING_OUT) / 2} 0 1 1 ${(R_RING_IN + R_RING_OUT)} 0 a ${(R_RING_IN + R_RING_OUT) / 2} ${(R_RING_IN + R_RING_OUT) / 2} 0 1 1 -${(R_RING_IN + R_RING_OUT)} 0`}
            />
            <path
              id="brise-text-path-bottom"
              fill="none"
              stroke="none"
              d={`M ${CX + (R_RING_IN + R_RING_OUT) / 2} ${CY} a ${(R_RING_IN + R_RING_OUT) / 2} ${(R_RING_IN + R_RING_OUT) / 2} 0 1 1 -${(R_RING_IN + R_RING_OUT)} 0 a ${(R_RING_IN + R_RING_OUT) / 2} ${(R_RING_IN + R_RING_OUT) / 2} 0 1 1 ${(R_RING_IN + R_RING_OUT)} 0`}
            />
            <text
              className="pointer-events-none"
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 4,
                fill: "oklch(1 0 0)",
              }}
            >
              <textPath href="#brise-text-path" startOffset="25%" textAnchor="middle">
                {brise.name}
              </textPath>
              <textPath href="#brise-text-path-bottom" startOffset="25%" textAnchor="middle">
                {brise.name}
              </textPath>
            </text>
          </g>
        )}

        {/* Sectors with elevation */}
        <g>
          {parcels.map((p, i) => {
            const path = sectorPath(i);
            const [lx, ly] = labelPos(i);
            const mid = midAngle(i);
            let rot = (mid * 180) / Math.PI;
            if (Math.cos(mid) < 0) rot += 180;
            const isEmpty = p.type === "vide";
            const badgeCount = countByParcel.get(p.id) ?? 0;
            // Mini-badge placed near outer arc of the sector
            const [bx, by] = polar(CX, CY, R_OUTER - 18, mid);
            return (
              <g
                key={p.id}
                className="cursor-pointer transition-transform hover:opacity-95"
                onClick={() => navigate({ to: "/parcelle/$id", params: { id: p.id } })}
              >
                <g filter="url(#sector-lift)">
                  {parcelRecoStyles[p.id]?.isDual ? (
                    <>
                      {/* Outer yellow border */}
                      <path
                        d={sectorPath(i, R_INNER - 1, R_OUTER + 1)}
                        fill={`url(#${gradientIdFor(p)})`}
                        stroke="oklch(0.80 0.16 85)"
                        strokeWidth={1.8}
                        strokeLinejoin="round"
                      />
                      {/* Inner red border */}
                      <path
                        d={sectorPath(i, R_INNER + 1.5, R_OUTER - 1.5)}
                        fill="none"
                        stroke="oklch(0.60 0.22 28)"
                        strokeWidth={1.8}
                        strokeLinejoin="round"
                      />
                    </>
                  ) : (
                    <path
                      d={path}
                      fill={`url(#${gradientIdFor(p)})`}
                      stroke={parcelRecoStyles[p.id]?.stroke}
                      strokeWidth={parcelRecoStyles[p.id]?.strokeWidth}
                      strokeLinejoin="round"
                    />
                  )}
                  <path d={path} fill="url(#sector-gloss)" pointerEvents="none" />
                </g>
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${rot} ${lx} ${ly})`}
                  className="pointer-events-none"
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    fill: isEmpty ? "oklch(0.28 0 0)" : "oklch(1 0 0)",
                    paintOrder: "stroke",
                    stroke: "oklch(0 0 0 / 0.25)",
                    strokeWidth: 0.6,
                  }}
                >
                  {p.name}
                </text>
                {badgeCount > 0 && (
                  <g pointerEvents="none">
                    <g filter="url(#anomaly-lift)">
                      <circle
                        cx={bx}
                        cy={by}
                        r={11}
                        fill="url(#grad-anomaly-3d)"
                        stroke="oklch(1 0 0 / 0.85)"
                        strokeWidth={1.2}
                      />
                      <ellipse
                        cx={bx}
                        cy={by - 4}
                        rx={7}
                        ry={2.6}
                        fill="oklch(1 0 0 / 0.4)"
                      />
                    </g>
                    <text
                      x={bx}
                      y={by + 0.5}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{
                        fontSize: 11,
                        fontWeight: 900,
                        fill: "oklch(0.94 0.16 95)",
                        paintOrder: "stroke",
                        stroke: "oklch(0 0 0 / 0.55)",
                        strokeWidth: 0.8,
                        filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.6))",
                      }}
                    >
                      {badgeCount}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>

        {/* Inner badge — check role to show either split bubble (admin) or single bubble (engineer) */}
        {(() => {
          const R = 54;
          
          if (role === "ingenieur") {
            // SINGLE BUBBLE (exécutant anomalies only)
            const fill = hasAnomalies ? "url(#grad-exec-bubble)" : "url(#grad-exec-bubble-ok)";
            return (
              <g>
                <circle
                  cx={CX}
                  cy={CY}
                  r={R_INNER}
                  fill="oklch(0.99 0.003 140)"
                  stroke="oklch(0.85 0.01 140)"
                  strokeWidth={1}
                />
                <g
                  className="cursor-pointer transition-transform hover:opacity-95"
                  onClick={() => navigate({ to: "/anomalies" })}
                >
                  <g filter="url(#center-bubble-lift)">
                    <circle
                      cx={CX}
                      cy={CY}
                      r={R}
                      fill={fill}
                      stroke="oklch(1 0 0 / 0.9)"
                      strokeWidth={2}
                    />
                    <ellipse
                      cx={CX}
                      cy={CY - R * 0.52}
                      rx={R * 0.65}
                      ry={R * 0.22}
                      fill="oklch(1 0 0 / 0.32)"
                      pointerEvents="none"
                    />
                  </g>
                  <text
                    x={CX}
                    y={CY - 3}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="pointer-events-none select-none"
                    style={{
                      fontSize: 26,
                      fontWeight: 900,
                      fill: "oklch(0.97 0.05 95)",
                      paintOrder: "stroke",
                      stroke: "oklch(0 0 0 / 0.55)",
                      strokeWidth: 1.4,
                    }}
                  >
                    {hasAnomalies ? anomalyCount : "✓"}
                  </text>
                  <text
                    x={CX}
                    y={CY + 22}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="pointer-events-none select-none"
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: 1.5,
                      fill: "oklch(0.97 0.05 95)",
                      paintOrder: "stroke",
                      stroke: "oklch(0 0 0 / 0.5)",
                      strokeWidth: 0.8,
                    }}
                  >
                    EXÉCUTANT
                  </text>
                </g>
              </g>
            );
          } else {
            // SPLIT BUBBLE (admin role: left executant anomalies, right engineer recommendations)
            const GAP_HALF = 5; // half-width of the empty space at center
            const leftCx = CX - GAP_HALF;
            const rightCx = CX + GAP_HALF;
            const leftPath = `M ${leftCx} ${CY - R} A ${R} ${R} 0 0 0 ${leftCx} ${CY + R} Z`;
            const rightPath = `M ${rightCx} ${CY - R} A ${R} ${R} 0 0 1 ${rightCx} ${CY + R} Z`;
            const leftFill = hasAnomalies ? "url(#grad-exec-bubble)" : "url(#grad-exec-bubble-ok)";
            const rightFill = hasRecos ? "url(#grad-inge-bubble)" : "url(#grad-inge-bubble-ok)";
            const leftGloss = `M ${leftCx - R * 0.78} ${CY - R * 0.28} Q ${leftCx - R * 0.45} ${CY - R * 0.95} ${leftCx} ${CY - R * 0.7} L ${leftCx} ${CY - R * 0.18} Z`;
            const rightGloss = `M ${rightCx} ${CY - R * 0.7} Q ${rightCx + R * 0.45} ${CY - R * 0.95} ${rightCx + R * 0.78} ${CY - R * 0.28} L ${rightCx} ${CY - R * 0.18} Z`;
            return (
              <g>
                <circle
                  cx={CX}
                  cy={CY}
                  r={R_INNER}
                  fill="oklch(0.99 0.003 140)"
                  stroke="oklch(0.85 0.01 140)"
                  strokeWidth={1}
                />
                {/* Left half-bubble - executant anomalies */}
                <g
                  className="cursor-pointer transition-transform hover:opacity-95"
                  onClick={() => navigate({ to: "/anomalies" })}
                >
                  <g filter="url(#center-bubble-lift)">
                    <path
                      d={leftPath}
                      fill={leftFill}
                      stroke="oklch(1 0 0 / 0.9)"
                      strokeWidth={2}
                      strokeLinejoin="round"
                    />
                    <path
                      d={leftPath}
                      fill="none"
                      stroke="oklch(1 0 0 / 0.35)"
                      strokeWidth={1}
                      transform={`translate(0 1)`}
                      pointerEvents="none"
                    />
                    <path d={leftGloss} fill="oklch(1 0 0 / 0.32)" pointerEvents="none" />
                  </g>
                  <text
                    x={leftCx - R / 2.4}
                    y={CY - 4}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="pointer-events-none select-none"
                    style={{
                      fontSize: 26,
                      fontWeight: 900,
                      fill: "oklch(0.97 0.05 95)",
                      paintOrder: "stroke",
                      stroke: "oklch(0 0 0 / 0.55)",
                      strokeWidth: 1.4,
                    }}
                  >
                    {hasAnomalies ? anomalyCount : "✓"}
                  </text>
                  <text
                    x={leftCx - R / 2.4}
                    y={CY + 20}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="pointer-events-none select-none"
                    style={{
                      fontSize: 8,
                      fontWeight: 800,
                      letterSpacing: 1.2,
                      fill: "oklch(0.97 0.05 95)",
                      paintOrder: "stroke",
                      stroke: "oklch(0 0 0 / 0.5)",
                      strokeWidth: 0.8,
                    }}
                  >
                    EXÉC.
                  </text>
                </g>
                {/* Right half-bubble - engineer recommendations */}
                <g
                  className="cursor-pointer transition-transform hover:opacity-95"
                  onClick={() => navigate({ to: "/recommandations" })}
                >
                  <g filter="url(#center-bubble-lift)">
                    <path
                      d={rightPath}
                      fill={rightFill}
                      stroke="oklch(1 0 0 / 0.9)"
                      strokeWidth={2}
                      strokeLinejoin="round"
                    />
                    <path
                      d={rightPath}
                      fill="none"
                      stroke="oklch(1 0 0 / 0.35)"
                      strokeWidth={1}
                      transform={`translate(0 1)`}
                      pointerEvents="none"
                    />
                    <path d={rightGloss} fill="oklch(1 0 0 / 0.32)" pointerEvents="none" />
                  </g>
                  <text
                    x={rightCx + R / 2.4}
                    y={CY - 4}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="pointer-events-none select-none"
                    style={{
                      fontSize: 26,
                      fontWeight: 900,
                      fill: hasRecos ? "oklch(0.85 0.19 90)" : "oklch(0.98 0.05 260)",
                      paintOrder: "stroke",
                      stroke: "oklch(0 0 0 / 0.55)",
                      strokeWidth: 1.4,
                    }}
                  >
                    {hasRecos ? recoCount : "✓"}
                  </text>
                  <text
                    x={rightCx + R / 2.4}
                    y={CY + 20}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="pointer-events-none select-none"
                    style={{
                      fontSize: 8,
                      fontWeight: 800,
                      letterSpacing: 1.2,
                      fill: hasRecos ? "oklch(0.85 0.19 90)" : "oklch(0.98 0.05 260)",
                      paintOrder: "stroke",
                      stroke: "oklch(0 0 0 / 0.5)",
                      strokeWidth: 0.8,
                    }}
                  >
                    INGÉ.
                  </text>
                </g>
              </g>
            );
          }
        })()}
      </svg>
    </div>
  );
}
