import { Thermometer, Droplets, MapPin } from "lucide-react";
import { formatNumber } from "@/lib/format";
import {
  DEFAULT_ROOM_META,
  FRIGO_ROOM_ORDER,
  FRIGO_ROOM_SPECS,
  type FrigoPurchaseEntry,
  type FrigoRoomCode,
  type FrigoRoomMeta,
} from "@/lib/frigo-negoce-store";

export interface RoomSummary {
  code: FrigoRoomCode;
  list: FrigoPurchaseEntry[];
  cajousEntres: number;
  poidsNetEntreKg: number;
  totalPayementDA: number;
  cajousSortis: number;
  poidsSortiKg: number;
  cajousRestants: number;
  poidsRestantKg: number;
  capacityCajous: number;
  fillPct: number;
  farmers: string[];
  meta: FrigoRoomMeta;
}

interface Props {
  roomsByCode: Record<FrigoRoomCode, RoomSummary>;
  selectedRoom: FrigoRoomCode | null;
  onSelectRoom: (code: FrigoRoomCode) => void;
  isAr: boolean;
}

export function FrigoBuildingPlan({ roomsByCode, selectedRoom, onSelectRoom, isAr }: Props) {
  // Proportions exactes du bâtiment : 39,24 m (26,24 m gauche + 13 m droite) × 11,12 m
  // Échelle SVG : 1 m = 19 px → Largeur totale 745.6 px, Hauteur totale 211.3 px
  const x0 = 42;
  const y0 = 38;
  const scale = 19;

  const leftW = 26.24 * scale; // 498.56 px
  const rightW = 13.0 * scale; // 247.0 px
  const totalW = leftW + rightW; // 745.56 px
  const totalH = 11.12 * scale; // 211.28 px

  const corridorH = 2.12 * scale; // 40.28 px
  const largeRoomH = 9.0 * scale; // 171.0 px
  const largeRoomW = leftW / 5; // 99.71 px (5,25 m)

  const triageH = 6.94 * scale; // 131.86 px
  const bottomRightH = totalH - triageH; // 79.42 px (4,18 m)
  const sasW = 3.2 * scale; // 60.8 px
  const ch01W = rightW - sasW; // 186.2 px

  const largeCodes: FrigoRoomCode[] = ["G1", "G2", "G3", "G4", "G5"];
  const ch01 = roomsByCode["CH-01"];

  const renderRoomFill = (r: RoomSummary, isSelected: boolean) => {
    const active = r.cajousRestants > 0;
    if (r.code === "CH-01") {
      if (active) return isSelected ? "#c7d2fe" : "#e0e7ff";
      return isSelected ? "#e2e8f0" : "#f1f5f9";
    }
    if (active) return isSelected ? "#bae6fd" : "#dcfce7";
    return isSelected ? "#e2e8f0" : "#f1f5f9";
  };

  const renderRoomStroke = (r: RoomSummary, isSelected: boolean) => {
    if (isSelected) return "#0284c7";
    if (r.cajousRestants > 0) return r.code === "CH-01" ? "#4f46e5" : "#059669";
    return "#94a3b8";
  };

  return (
    <div className="rounded-2xl border-2 border-sky-500/25 bg-card p-3.5 sm:p-4 shadow-xs space-y-3">
      {/* En-tête du plan architectural */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
        <div>
          <h3 className="text-sm font-black text-foreground flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-sky-600 shrink-0" />
            <span>
              {isAr
                ? "المخطط الهندسي التفاعلي لمبنى التبريد (39 م × 11,12 م)"
                : "Plan Architectural Interactif du Bâtiment Frigo (39 m × 11,12 m)"}
            </span>
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {isAr
              ? "انقر على أي غرفة (G1–G5 أو CH-01) لعرض المخزون، تعديل الحرارة وتخطيط رصّ الصناديق بالداخل."
              : "Cliquez sur une chambre (G1–G5 ou CH-01) pour ouvrir son contenu, sa température et le plan intérieur des cajous."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-emerald-800 dark:text-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-600" />
            {isAr ? "غرفة كبيرة نشطة" : "Grande active"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-indigo-800 dark:text-indigo-200">
            <span className="h-2 w-2 rounded-full bg-indigo-600" />
            {isAr ? "غرفة صغيرة نشطة" : "Petite active (CH-01)"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/15 border border-slate-400/40 px-2 py-0.5 text-slate-700 dark:text-slate-300">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            {isAr ? "متاحة" : "Disponible"}
          </span>
        </div>
      </div>

      {/* Plan SVG responsive (scroll horizontal propre sur très petit mobile) */}
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[640px]">
          <svg
            viewBox="0 0 830 286"
            className="w-full h-auto select-none"
            role="img"
            aria-label={isAr ? "مخطط غرف التبريد" : "Plan architectural chambres froides 39m x 11.12m"}
          >
            {/* Cotes extérieures supérieures */}
            <g stroke="#64748b" strokeWidth="1" fill="#475569" fontSize="10" fontWeight="700">
              {/* Cote totale 39 m */}
              <line x1={x0} y1={12} x2={x0 + totalW} y2={12} />
              <line x1={x0} y1={8} x2={x0} y2={16} />
              <line x1={x0 + totalW} y1={8} x2={x0 + totalW} y2={16} />
              <rect x={x0 + totalW / 2 - 26} y={4} width="52" height="14" fill="white" />
              <text x={x0 + totalW / 2} y={14} textAnchor="middle">
                39,00 m
              </text>

              {/* Sous-cotes 26,24 m et 13,00 m */}
              <line x1={x0} y1={28} x2={x0 + leftW} y2={28} strokeDasharray="3 2" />
              <text x={x0 + leftW / 2} y={25} textAnchor="middle" fontSize="9.5">
                26,24 m (5 × 5,25 m)
              </text>
              <line x1={x0 + leftW} y1={28} x2={x0 + totalW} y2={28} strokeDasharray="3 2" />
              <text x={x0 + leftW + rightW / 2} y={25} textAnchor="middle" fontSize="9.5">
                13,00 m
              </text>
            </g>

            {/* Cotes extérieures gauche (11,12 m = 2,12 m + 9 m) */}
            <g stroke="#64748b" strokeWidth="1" fill="#475569" fontSize="9.5" fontWeight="700">
              <line x1={16} y1={y0} x2={16} y2={y0 + totalH} />
              <line x1={12} y1={y0} x2={20} y2={y0} />
              <line x1={12} y1={y0 + totalH} x2={20} y2={y0 + totalH} />
              <text
                x={12}
                y={y0 + totalH / 2}
                textAnchor="middle"
                transform={`rotate(-90 12 ${y0 + totalH / 2})`}
              >
                11,12 m
              </text>

              <text x={36} y={y0 + corridorH / 2 + 3} textAnchor="end" fontSize="8.5">
                2,12m
              </text>
              <text x={36} y={y0 + corridorH + largeRoomH / 2 + 3} textAnchor="end" fontSize="8.5">
                9,00m
              </text>
            </g>

            {/* Cotes extérieures droite (6,94 m + 4,18 m) */}
            <g stroke="#64748b" strokeWidth="1" fill="#475569" fontSize="9" fontWeight="700">
              <line x1={x0 + totalW + 14} y1={y0} x2={x0 + totalW + 14} y2={y0 + triageH} />
              <line x1={x0 + totalW + 10} y1={y0} x2={x0 + totalW + 18} y2={y0} />
              <line x1={x0 + totalW + 10} y1={y0 + triageH} x2={x0 + totalW + 18} y2={y0 + triageH} />
              <text
                x={x0 + totalW + 25}
                y={y0 + triageH / 2}
                textAnchor="middle"
                transform={`rotate(90 ${x0 + totalW + 25} ${y0 + triageH / 2})`}
              >
                6,94 m
              </text>

              <line x1={x0 + totalW + 14} y1={y0 + triageH} x2={x0 + totalW + 14} y2={y0 + totalH} />
              <line x1={x0 + totalW + 10} y1={y0 + totalH} x2={x0 + totalW + 18} y2={y0 + totalH} />
              <text
                x={x0 + totalW + 25}
                y={y0 + triageH + bottomRightH / 2}
                textAnchor="middle"
                transform={`rotate(90 ${x0 + totalW + 25} ${y0 + triageH + bottomRightH / 2})`}
              >
                4,18 m
              </text>
            </g>

            {/* Enveloppe extérieure du bâtiment */}
            <rect
              x={x0}
              y={y0}
              width={totalW}
              height={totalH}
              fill="#f8fafc"
              stroke="#1e293b"
              strokeWidth="2.5"
              rx="4"
            />

            {/* COULOIR EN HAUT À GAUCHE (26,24 m × 2,12 m) */}
            <g>
              <rect
                x={x0 + 1}
                y={y0 + 1}
                width={leftW - 1}
                height={corridorH - 1}
                fill="#e2e8f0"
                stroke="#475569"
                strokeWidth="1.2"
              />
              <text
                x={x0 + leftW / 2}
                y={y0 + corridorH / 2 + 3}
                textAnchor="middle"
                fill="#334155"
                fontSize="10.5"
                fontWeight="800"
                letterSpacing="1"
              >
                {isAr ? "الممر الرئيسي (2,12 م)" : "COULOIR DE SERVICE (2,12 m)"}
              </text>
            </g>

            {/* 5 GRANDES CHAMBRES G1 à G5 (5,25 m × 9 m chacune) */}
            {largeCodes.map((code, idx) => {
              const room = roomsByCode[code];
              const rx = x0 + idx * largeRoomW;
              const ry = y0 + corridorH;
              const isSelected = selectedRoom === code;
              const active = room.cajousRestants > 0;
              const pct = Math.min(100, Math.max(0, room.fillPct));

              return (
                <g
                  key={code}
                  onClick={() => onSelectRoom(code)}
                  className="cursor-pointer transition-opacity hover:opacity-90"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectRoom(code);
                    }
                  }}
                >
                  <rect
                    x={rx + 1}
                    y={ry + 1}
                    width={largeRoomW - 2}
                    height={largeRoomH - 2}
                    fill={renderRoomFill(room, isSelected)}
                    stroke={renderRoomStroke(room, isSelected)}
                    strokeWidth={isSelected ? "2.8" : active ? "2" : "1.2"}
                    rx="2"
                  />

                  {/* Porte d'accès depuis le couloir (arc architectural) */}
                  <line
                    x1={rx + largeRoomW / 2 - 11}
                    y1={ry + 1}
                    x2={rx + largeRoomW / 2 + 11}
                    y2={ry + 1}
                    stroke="#f8fafc"
                    strokeWidth="3"
                  />
                  <path
                    d={`M ${rx + largeRoomW / 2 - 11} ${ry + 1} L ${rx + largeRoomW / 2 - 11} ${ry + 14} A 13 13 0 0 0 ${rx + largeRoomW / 2 + 2} ${ry + 1}`}
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth="1"
                    strokeDasharray="2 1"
                  />

                  {/* Badge code chambre */}
                  <rect
                    x={rx + 8}
                    y={ry + 18}
                    width={32}
                    height={17}
                    rx="4"
                    fill={active ? "#059669" : "#64748b"}
                  />
                  <text
                    x={rx + 24}
                    y={ry + 30}
                    textAnchor="middle"
                    fill="white"
                    fontSize="10.5"
                    fontWeight="900"
                  >
                    {code}
                  </text>

                  {/* Température */}
                  <text
                    x={rx + largeRoomW - 8}
                    y={ry + 30}
                    textAnchor="end"
                    fill={active ? "#0369a1" : "#64748b"}
                    fontSize="9"
                    fontWeight="800"
                  >
                    {room.meta.temperatureC.toFixed(1)}°C
                  </text>

                  {/* Dimensions */}
                  <text
                    x={rx + largeRoomW / 2}
                    y={ry + 48}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="8.5"
                    fontWeight="700"
                  >
                    5,25 × 9 m
                  </text>

                  {active ? (
                    <>
                      {/* Jauge cajous */}
                      <text
                        x={rx + largeRoomW / 2}
                        y={ry + 68}
                        textAnchor="middle"
                        fill="#064e3b"
                        fontSize="10"
                        fontWeight="900"
                      >
                        {formatNumber(room.cajousRestants, 0)} / {formatNumber(room.capacityCajous, 0)}
                      </text>
                      <text
                        x={rx + largeRoomW / 2}
                        y={ry + 80}
                        textAnchor="middle"
                        fill="#047857"
                        fontSize="8.5"
                        fontWeight="800"
                      >
                        cajous ({formatNumber(pct, 1)} %)
                      </text>

                      {/* Barre de remplissage */}
                      <rect
                        x={rx + 10}
                        y={ry + 87}
                        width={largeRoomW - 20}
                        height={7}
                        rx="3.5"
                        fill="#ffffff"
                        stroke="#10b981"
                        strokeWidth="0.8"
                      />
                      <rect
                        x={rx + 10}
                        y={ry + 87}
                        width={((largeRoomW - 20) * pct) / 100}
                        height={7}
                        rx="3.5"
                        fill="#059669"
                      />

                      {/* Poids */}
                      <text
                        x={rx + largeRoomW / 2}
                        y={ry + 111}
                        textAnchor="middle"
                        fill="#0f172a"
                        fontSize="10"
                        fontWeight="900"
                      >
                        {formatNumber(room.poidsRestantKg, 0)} kg
                      </text>

                      {/* Fermiers */}
                      {room.farmers.slice(0, 3).map((farmer, fi) => (
                        <text
                          key={farmer}
                          x={rx + largeRoomW / 2}
                          y={ry + 127 + fi * 12}
                          textAnchor="middle"
                          fill="#1e293b"
                          fontSize="8.5"
                          fontWeight="700"
                        >
                          • {farmer}
                        </text>
                      ))}
                    </>
                  ) : (
                    <>
                      <text
                        x={rx + largeRoomW / 2}
                        y={ry + 84}
                        textAnchor="middle"
                        fill="#64748b"
                        fontSize="10"
                        fontWeight="800"
                      >
                        {isAr ? "متاحة" : "Disponible"}
                      </text>
                      <text
                        x={rx + largeRoomW / 2}
                        y={ry + 99}
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="8.5"
                        fontWeight="700"
                      >
                        0 / 1 890 cajous
                      </text>
                      <text
                        x={rx + largeRoomW / 2}
                        y={ry + 148}
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="8"
                        fontWeight="600"
                      >
                        {isAr ? "انقر للفتح" : "Cliquer pour ouvrir"}
                      </text>
                    </>
                  )}
                </g>
              );
            })}

            {/* CÔTÉ DROIT — SALLE DE TRIAGE (13 m × 6,94 m) */}
            <g>
              <rect
                x={x0 + leftW + 1}
                y={y0 + 1}
                width={rightW - 2}
                height={triageH - 1}
                fill="#fef3c7"
                fillOpacity="0.45"
                stroke="#92400e"
                strokeWidth="1.4"
              />
              {/* Porte vers le couloir à gauche */}
              <line
                x1={x0 + leftW + 1}
                y1={y0 + 10}
                x2={x0 + leftW + 1}
                y2={y0 + 30}
                stroke="#fef3c7"
                strokeWidth="3.5"
              />
              <path
                d={`M ${x0 + leftW + 1} ${y0 + 10} L ${x0 + leftW + 16} ${y0 + 10} A 15 15 0 0 1 ${x0 + leftW + 1} ${y0 + 25}`}
                fill="none"
                stroke="#78350f"
                strokeWidth="1"
                strokeDasharray="2 1"
              />

              {/* Double porte extérieure à droite */}
              <line
                x1={x0 + totalW - 1}
                y1={y0 + triageH / 2 - 18}
                x2={x0 + totalW - 1}
                y2={y0 + triageH / 2 + 18}
                stroke="#fef3c7"
                strokeWidth="4"
              />
              <path
                d={`M ${x0 + totalW - 1} ${y0 + triageH / 2 - 18} L ${x0 + totalW - 18} ${y0 + triageH / 2 - 18} A 17 17 0 0 0 ${x0 + totalW - 1} ${y0 + triageH / 2}`}
                fill="none"
                stroke="#78350f"
                strokeWidth="1.2"
              />
              <path
                d={`M ${x0 + totalW - 1} ${y0 + triageH / 2 + 18} L ${x0 + totalW - 18} ${y0 + triageH / 2 + 18} A 17 17 0 0 1 ${x0 + totalW - 1} ${y0 + triageH / 2}`}
                fill="none"
                stroke="#78350f"
                strokeWidth="1.2"
              />

              <text
                x={x0 + leftW + rightW / 2}
                y={y0 + triageH / 2 - 6}
                textAnchor="middle"
                fill="#78350f"
                fontSize="12"
                fontWeight="900"
                letterSpacing="0.5"
              >
                {isAr ? "قاعة الفرز والتوضيب" : "SALLE DE TRIAGE"}
              </text>
              <text
                x={x0 + leftW + rightW / 2}
                y={y0 + triageH / 2 + 10}
                textAnchor="middle"
                fill="#92400e"
                fontSize="9.5"
                fontWeight="700"
              >
                13,00 m × 6,94 m
              </text>
              <text
                x={x0 + leftW + rightW - 24}
                y={y0 + triageH / 2 + 30}
                textAnchor="end"
                fill="#b45309"
                fontSize="8"
                fontWeight="700"
              >
                {isAr ? "باب مزدوج ⇄" : "Double porte ⇄"}
              </text>
            </g>

            {/* CÔTÉ DROIT BAS — SAS (porte vers salle de triage + accès CH-01) */}
            <g>
              <rect
                x={x0 + leftW + 1}
                y={y0 + triageH + 1}
                width={sasW - 1}
                height={bottomRightH - 2}
                fill="#e2e8f0"
                stroke="#475569"
                strokeWidth="1.3"
              />
              {/* Porte SAS -> Salle de triage */}
              <line
                x1={x0 + leftW + sasW / 2 - 9}
                y1={y0 + triageH + 1}
                x2={x0 + leftW + sasW / 2 + 9}
                y2={y0 + triageH + 1}
                stroke="#e2e8f0"
                strokeWidth="3.5"
              />
              <path
                d={`M ${x0 + leftW + sasW / 2 - 9} ${y0 + triageH + 1} L ${x0 + leftW + sasW / 2 - 9} ${y0 + triageH - 12} A 13 13 0 0 1 ${x0 + leftW + sasW / 2 + 4} ${y0 + triageH + 1}`}
                fill="none"
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray="2 1"
              />
              <text
                x={x0 + leftW + sasW / 2}
                y={y0 + triageH + bottomRightH / 2 + 4}
                textAnchor="middle"
                fill="#334155"
                fontSize="11"
                fontWeight="900"
              >
                SAS
              </text>
            </g>

            {/* CÔTÉ DROIT BAS — CH-01 (Petite Chambre Active) */}
            <g
              onClick={() => onSelectRoom("CH-01")}
              className="cursor-pointer transition-opacity hover:opacity-90"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectRoom("CH-01");
                }
              }}
            >
              <rect
                x={x0 + leftW + sasW + 1}
                y={y0 + triageH + 1}
                width={ch01W - 2}
                height={bottomRightH - 2}
                fill={renderRoomFill(ch01, selectedRoom === "CH-01")}
                stroke={renderRoomStroke(ch01, selectedRoom === "CH-01")}
                strokeWidth={selectedRoom === "CH-01" ? "2.8" : ch01.cajousRestants > 0 ? "2" : "1.2"}
                rx="2"
              />
              {/* Porte SAS -> CH-01 */}
              <line
                x1={x0 + leftW + sasW + 1}
                y1={y0 + triageH + 16}
                x2={x0 + leftW + sasW + 1}
                y2={y0 + triageH + 34}
                stroke="#e0e7ff"
                strokeWidth="3.5"
              />

              {/* Badge CH-01 */}
              <rect
                x={x0 + leftW + sasW + 10}
                y={y0 + triageH + 8}
                width={44}
                height={17}
                rx="4"
                fill={ch01.cajousRestants > 0 ? "#4f46e5" : "#64748b"}
              />
              <text
                x={x0 + leftW + sasW + 32}
                y={y0 + triageH + 20}
                textAnchor="middle"
                fill="white"
                fontSize="10"
                fontWeight="900"
              >
                CH-01
              </text>
              <text
                x={x0 + totalW - 10}
                y={y0 + triageH + 20}
                textAnchor="end"
                fill="#4338ca"
                fontSize="9"
                fontWeight="800"
              >
                {ch01.meta.temperatureC.toFixed(1)}°C
              </text>

              {/* Jauge cajous + poids */}
              <text
                x={x0 + leftW + sasW + ch01W / 2}
                y={y0 + triageH + 39}
                textAnchor="middle"
                fill="#1e1b4b"
                fontSize="10"
                fontWeight="900"
              >
                {formatNumber(ch01.cajousRestants, 0)} / {formatNumber(ch01.capacityCajous, 0)} c. (
                {formatNumber(ch01.fillPct, 1)} %)
              </text>

              {/* Barre de progression CH-01 */}
              <rect
                x={x0 + leftW + sasW + 14}
                y={y0 + triageH + 45}
                width={ch01W - 28}
                height={6}
                rx="3"
                fill="#ffffff"
                stroke="#6366f1"
                strokeWidth="0.8"
              />
              <rect
                x={x0 + leftW + sasW + 14}
                y={y0 + triageH + 45}
                width={((ch01W - 28) * Math.min(100, ch01.fillPct)) / 100}
                height={6}
                rx="3"
                fill="#4f46e5"
              />

              <text
                x={x0 + leftW + sasW + ch01W / 2}
                y={y0 + triageH + 65}
                textAnchor="middle"
                fill="#312e81"
                fontSize="9.5"
                fontWeight="800"
              >
                {formatNumber(ch01.poidsRestantKg, 0)} kg · {ch01.farmers.join(" · ") || (isAr ? "متاحة" : "Disponible")}
              </text>
            </g>

            {/* Légende de bas de plan */}
            <text x={x0} y={y0 + totalH + 20} fill="#64748b" fontSize="9.5" fontWeight="700">
              {isAr
                ? "السعة الإجمالية للمبنى : 5 غرف كبيرة (5 × 1890) + 1 غرفة صغيرة (1323) = 10773 صندوق"
                : "Capacité totale bâtiment : 5 Grandes (5 × 1 890) + 1 Petite CH-01 (1 323) = 10 773 cajous"}
            </text>
          </svg>
        </div>
      </div>

      {/* Boutons d'accès rapide par chambre (idéal mobile 360px) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
        {FRIGO_ROOM_ORDER.map((code) => {
          const room = roomsByCode[code];
          const spec = FRIGO_ROOM_SPECS[code];
          const active = room.cajousRestants > 0;
          const isSelected = selectedRoom === code;
          const meta = room.meta || DEFAULT_ROOM_META[code];

          return (
            <button
              key={code}
              type="button"
              onClick={() => onSelectRoom(code)}
              className={`rounded-xl border p-2 text-start transition cursor-pointer ${
                isSelected
                  ? "border-sky-600 ring-2 ring-sky-500/30 bg-sky-500/10"
                  : active
                    ? code === "CH-01"
                      ? "border-indigo-500/40 bg-indigo-500/5 hover:bg-indigo-500/10"
                      : "border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10"
                    : "border-border bg-muted/20 hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${
                    active
                      ? code === "CH-01"
                        ? "bg-indigo-600 text-white"
                        : "bg-emerald-600 text-white"
                      : "bg-slate-500/20 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {code}
                </span>
                <span dir="ltr" className="text-[10px] font-bold text-muted-foreground flex items-center gap-0.5">
                  <Thermometer className="h-2.5 w-2.5 text-sky-600" />
                  {meta.temperatureC.toFixed(1)}°C
                </span>
              </div>
              <p dir="ltr" className="text-[11px] font-black text-foreground mt-1">
                {formatNumber(room.cajousRestants, 0)} / {formatNumber(spec.capacityCajous, 0)}
              </p>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span dir="ltr">{active ? `${formatNumber(room.fillPct, 1)}%` : isAr ? "متاحة" : "Libre"}</span>
                <span dir="ltr" className="flex items-center gap-0.5">
                  <Droplets className="h-2.5 w-2.5 text-sky-500" />
                  {meta.humidityPct}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
