"use client";

import React, { useMemo, useState } from "react";

const FT_TO_M = 0.3048;
const DEFAULT_SPARE_PERCENT = 10;
const STANDARD_ASPECTS = [
  { label: "16:9", w: 16, h: 9 },
  { label: "4:3", w: 4, h: 3 },
  { label: "1:1", w: 1, h: 1 },
  { label: "21:9", w: 21, h: 9 },
];

const PANEL_TYPES = {
  angle500: {
    id: "angle500",
    name: "500×500 Angle Panel",
    widthM: 0.5,
    heightM: 0.5,
    resolutionW: 192,
    resolutionH: 192,
    avgW: 39,
    maxW: 115,
    notes: "Rigid 45° / corner-capable panel",
    rates: { day1: 95, day3: 190, week: 285 },
    manual: "/RC indoor standard 500x500 specification（V1.3）-EN20250818.pdf",
  },
  flex500: {
    id: "flex500",
    name: "500×500 Flexible Panel",
    widthM: 0.5,
    heightM: 0.5,
    resolutionW: 192,
    resolutionH: 192,
    avgW: 39,
    maxW: 115,
    notes: "Flexible curved panel",
    rates: { day1: 125, day3: 250, week: 375 },
    manual: "/RC indoor standard 500x500 specification（V1.3）-EN20250819.pdf",
  },
  panel1000Portrait: {
    id: "panel1000Portrait",
    name: "500×1000 Panel (Portrait)",
    widthM: 0.5,
    heightM: 1.0,
    resolutionW: 192,
    resolutionH: 384,
    avgW: 100,
    maxW: 300,
    notes: "Standard 500×1000 portrait orientation",
    rates: { day1: 150, day3: 300, week: 450 },
    manual: "/RC indoor standard 500x1000 specification（V1.3）-EN20250818.pdf",
  },
  panel1000Landscape: {
    id: "panel1000Landscape",
    name: "500×1000 Panel (Landscape)",
    widthM: 1.0,
    heightM: 0.5,
    resolutionW: 384,
    resolutionH: 192,
    avgW: 100,
    maxW: 300,
    notes: "Standard 500×1000 landscape orientation",
    rates: { day1: 150, day3: 300, week: 450 },
    manual: "/RC indoor standard 500x1000 specification（V1.3）-EN20250818.pdf",
  },
} as const;

type PanelId = keyof typeof PANEL_TYPES;
type InputMode = "feet" | "meters" | "panels";
type MainTab = "calculator" | "estimate" | "preview" | "manuals";
type RentalTerm = "day1" | "day3" | "week";

function formatNumber(value: number, digits = 2) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatMoney(value: number) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function gcd(a: number, b: number) {
  let x = Math.round(Math.abs(a));
  let y = Math.round(Math.abs(b));
  while (y) {
    [x, y] = [y, x % y];
  }
  return x || 1;
}

function ratioString(w: number, h: number) {
  if (!w || !h) return "—";
  const g = gcd(w, h);
  return `${Math.round(w / g)}:${Math.round(h / g)}`;
}

function buildQuoteSummary(args: {
  panelName: string;
  builtWidthFt: number;
  builtHeightFt: number;
  builtWidthM: number;
  builtHeightM: number;
  activePanels: number;
  sparePanels: number;
  pricedPanels: number;
  resolutionW: number;
  resolutionH: number;
  totalWatts: number;
  amps: number;
  voltageNum: number;
  circuits: number;
  processorName: string;
  estimateSubtotal: number;
}) {
  return [
    args.panelName,
    `Wall: ${formatNumber(args.builtWidthFt)}' × ${formatNumber(args.builtHeightFt)}' (${formatNumber(args.builtWidthM)}m × ${formatNumber(args.builtHeightM)}m)`,
    `Panels: ${formatNumber(args.activePanels, 0)} active + ${formatNumber(args.sparePanels, 0)} spares`,
    `Priced Panels: ${formatNumber(args.pricedPanels, 0)}`,
    `Resolution: ${formatNumber(args.resolutionW, 0)} × ${formatNumber(args.resolutionH, 0)}`,
    `Power: ${formatNumber(args.totalWatts, 0)}W / ${formatNumber(args.amps)}A @ ${args.voltageNum}V`,
    `Circuits: ${formatNumber(args.circuits, 0)}`,
    `Processor: ${args.processorName}`,
    `Quick estimate: ${formatMoney(args.estimateSubtotal)}`,
  ].join("\n");
}

function MetricCard({
  label,
  value,
  subvalue,
}: {
  label: string;
  value: string;
  subvalue?: string;
}) {
  return (
    <div style={styles.metricCard}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={styles.metricValue}>{value}</div>
      {subvalue ? <div style={styles.metricSubvalue}>{subvalue}</div> : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.row}>
      <div style={styles.rowLabel}>{label}</div>
      <div style={styles.rowValue}>{value}</div>
    </div>
  );
}

function WallLayoutPreview({
  columns,
  rows,
  panelLabel,
  showLabels,
}: {
  columns: number;
  rows: number;
  panelLabel: string;
  showLabels: boolean;
}) {
  const total = columns * rows;
  const cells = Array.from({ length: total }, (_, i) => i);

  return (
    <div style={styles.previewOuter}>
      <div style={styles.previewScroller}>
        <div
          style={{
            ...styles.previewGrid,
            gridTemplateColumns: `repeat(${columns}, minmax(40px, 52px))`,
          }}
        >
          {cells.map((i) => {
            const col = (i % columns) + 1;
            const row = Math.floor(i / columns) + 1;
            return (
              <div key={i} style={styles.previewCell} title={`Row ${row}, Column ${col}`}>
                {showLabels ? (
                  <span style={styles.previewCellLabel}>
                    {col},{row}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div style={styles.previewLegend}>
        <div style={styles.previewLegendItem}>
          <span style={styles.previewLegendSwatch} />
          <span>{panelLabel}</span>
        </div>
      </div>
    </div>
  );
}

export default function LEDWallCalculatorPage() {
  const [panelId, setPanelId] = useState<PanelId>("angle500");
  const [mainTab, setMainTab] = useState<MainTab>("calculator");
  const [inputMode, setInputMode] = useState<InputMode>("feet");
  const [widthFt, setWidthFt] = useState("16");
  const [heightFt, setHeightFt] = useState("9");
  const [widthMInput, setWidthMInput] = useState("4.88");
  const [heightMInput, setHeightMInput] = useState("2.74");
  const [panelColumnsInput, setPanelColumnsInput] = useState("10");
  const [panelRowsInput, setPanelRowsInput] = useState("6");
  const [sparePercent, setSparePercent] = useState(String(DEFAULT_SPARE_PERCENT));
  const [circuitAmps, setCircuitAmps] = useState("20");
  const [voltage, setVoltage] = useState("120");
  const [usableLoadPercent, setUsableLoadPercent] = useState("80");
  const [powerPanelsPerString, setPowerPanelsPerString] = useState("8");
  const [dataPanelsPerRun, setDataPanelsPerRun] = useState("8");
  const [useMaxPower, setUseMaxPower] = useState(true);
  const [snapMode, setSnapMode] = useState("none");
  const [processorCapacityPixels, setProcessorCapacityPixels] = useState("6500000");
  const [processorName, setProcessorName] = useState("MX40 / similar");
  const [supplyType, setSupplyType] = useState("120V single-phase");
  const [showLayoutLabels, setShowLayoutLabels] = useState(false);

  const [rentalTerm, setRentalTerm] = useState<RentalTerm>("day1");
  const [useManualRate, setUseManualRate] = useState(false);
  const [manualPanelRate, setManualPanelRate] = useState("");
  const [includeSparesInPricing, setIncludeSparesInPricing] = useState(true);
  const [transportFee, setTransportFee] = useState("0");
  const [laborHours, setLaborHours] = useState("0");
  const [laborRate, setLaborRate] = useState("75");
  const [workerCount, setWorkerCount] = useState("1");
  const [miscFee, setMiscFee] = useState("0");
  const [processorFee, setProcessorFee] = useState("0");
  const [cableKitFee, setCableKitFee] = useState("0");

  const panel = PANEL_TYPES[panelId];

  const results = useMemo(() => {
    let targetWidthM = 0;
    let targetHeightM = 0;
    let columns = 0;
    let rows = 0;

    if (inputMode === "feet") {
      targetWidthM = (parseFloat(widthFt) || 0) * FT_TO_M;
      targetHeightM = (parseFloat(heightFt) || 0) * FT_TO_M;
    } else if (inputMode === "meters") {
      targetWidthM = parseFloat(widthMInput) || 0;
      targetHeightM = parseFloat(heightMInput) || 0;
    } else {
      columns = Math.max(1, Math.ceil(parseFloat(panelColumnsInput) || 0));
      rows = Math.max(1, Math.ceil(parseFloat(panelRowsInput) || 0));
      targetWidthM = columns * panel.widthM;
      targetHeightM = rows * panel.heightM;
    }

    const sparePct = Math.max(0, parseFloat(sparePercent) || 0);
    const circuitAmpsNum = Math.max(1, parseFloat(circuitAmps) || 20);
    const voltageNum = Math.max(1, parseFloat(voltage) || 120);
    const usableLoadPct = Math.min(100, Math.max(1, parseFloat(usableLoadPercent) || 80));
    const powerPanelsPerStringNum = Math.max(1, Math.floor(parseFloat(powerPanelsPerString) || 1));
    const dataPanelsPerRunNum = Math.max(1, Math.floor(parseFloat(dataPanelsPerRun) || 1));

    if (inputMode !== "panels") {
      const snapTarget = STANDARD_ASPECTS.find((a) => a.label === snapMode);
      if (snapTarget) {
        const targetRatio = snapTarget.w / snapTarget.h;

        const widthDrivenColumns = Math.max(1, Math.ceil(targetWidthM / panel.widthM));
        const widthDrivenRows = Math.max(
          1,
          Math.round((widthDrivenColumns * panel.widthM) / targetRatio / panel.heightM)
        );

        const heightDrivenRows = Math.max(1, Math.ceil(targetHeightM / panel.heightM));
        const heightDrivenColumns = Math.max(
          1,
          Math.round((heightDrivenRows * panel.heightM * targetRatio) / panel.widthM)
        );

        const options = [
          { columns: widthDrivenColumns, rows: widthDrivenRows },
          { columns: heightDrivenColumns, rows: heightDrivenRows },
        ].filter((o) => o.columns > 0 && o.rows > 0);

        const scored = options
          .map((o) => {
            const builtW = o.columns * panel.widthM;
            const builtH = o.rows * panel.heightM;
            const areaDelta = Math.abs(builtW - targetWidthM) + Math.abs(builtH - targetHeightM);
            const ratioDelta = Math.abs(builtW / builtH - targetRatio);
            return { ...o, score: areaDelta + ratioDelta * 3 };
          })
          .sort((a, b) => a.score - b.score);

        columns = scored[0]?.columns ?? Math.ceil(targetWidthM / panel.widthM);
        rows = scored[0]?.rows ?? Math.ceil(targetHeightM / panel.heightM);
      } else {
        columns = Math.max(1, Math.ceil(targetWidthM / panel.widthM));
        rows = Math.max(1, Math.ceil(targetHeightM / panel.heightM));
      }
    }

    const activePanels = columns * rows;
    const sparePanels = Math.ceil(activePanels * (sparePct / 100));
    const totalPanels = activePanels + sparePanels;

    const builtWidthM = columns * panel.widthM;
    const builtHeightM = rows * panel.heightM;
    const builtWidthFt = builtWidthM / FT_TO_M;
    const builtHeightFt = builtHeightM / FT_TO_M;

    const resolutionW = columns * panel.resolutionW;
    const resolutionH = rows * panel.resolutionH;
    const pixelAspect = ratioString(resolutionW, resolutionH);
    const physicalAspect = ratioString(builtWidthM * 1000, builtHeightM * 1000);

    const wattsPerPanel = useMaxPower ? panel.maxW : panel.avgW;
    const totalWatts = activePanels * wattsPerPanel;
    const totalWattsWithSpares = totalPanels * wattsPerPanel;
    const amps = totalWatts / voltageNum;
    const usableCircuitWatts = circuitAmpsNum * voltageNum * (usableLoadPct / 100);
    const circuits = Math.ceil(totalWatts / usableCircuitWatts);

    const powerStrings = Math.ceil(activePanels / powerPanelsPerStringNum);
    const dataRuns = Math.ceil(activePanels / dataPanelsPerRunNum);
    const panelPowerJumpers = Math.max(0, activePanels - powerStrings);
    const panelDataJumpers = Math.max(0, activePanels - dataRuns);

    const wallAreaM2 = builtWidthM * builtHeightM;
    const wallAreaFt2 = builtWidthFt * builtHeightFt;
    const totalPixels = resolutionW * resolutionH;
    const processorCapacity = Math.max(1, parseFloat(processorCapacityPixels) || 6500000);
    const processorLoadPercent = (totalPixels / processorCapacity) * 100;
    const processorWarning = totalPixels > processorCapacity;

    let distroRecommendation = "1 × 20A 120V circuit may be enough for very small walls.";
    if (supplyType === "120V single-phase") {
      distroRecommendation = `${circuits} × 20A 120V circuits recommended.`;
    } else if (supplyType === "208V single-phase") {
      const equivalentCircuits = Math.ceil(
        totalWatts / (208 * circuitAmpsNum * (usableLoadPct / 100))
      );
      distroRecommendation = `${equivalentCircuits} × ${Math.round(
        circuitAmpsNum
      )}A 208V circuits recommended.`;
    } else if (supplyType === "208V three-phase") {
      const threePhaseAmps = totalWatts / (Math.sqrt(3) * 208);
      distroRecommendation = `Approx. ${formatNumber(
        threePhaseAmps
      )}A per leg on 208V 3-phase before derating.`;
    }

    const autoPanelRate = panel.rates[rentalTerm];
    const rateUsed =
      useManualRate && manualPanelRate !== ""
        ? parseFloat(manualPanelRate) || 0
        : autoPanelRate;

    const pricedPanels = includeSparesInPricing ? totalPanels : activePanels;
    const equipmentSubtotal = pricedPanels * rateUsed;
    const laborSubtotal =
      (parseFloat(laborHours) || 0) *
      (parseFloat(laborRate) || 0) *
      (parseFloat(workerCount) || 0);

    const estimateSubtotal =
      equipmentSubtotal +
      laborSubtotal +
      (parseFloat(transportFee) || 0) +
      (parseFloat(miscFee) || 0) +
      (parseFloat(processorFee) || 0) +
      (parseFloat(cableKitFee) || 0);

    const quoteSummary = buildQuoteSummary({
      panelName: panel.name,
      builtWidthFt,
      builtHeightFt,
      builtWidthM,
      builtHeightM,
      activePanels,
      sparePanels,
      pricedPanels,
      resolutionW,
      resolutionH,
      totalWatts,
      amps,
      voltageNum,
      circuits,
      processorName,
      estimateSubtotal,
    });

    return {
      columns,
      rows,
      activePanels,
      sparePanels,
      totalPanels,
      builtWidthM,
      builtHeightM,
      builtWidthFt,
      builtHeightFt,
      resolutionW,
      resolutionH,
      pixelAspect,
      physicalAspect,
      totalWatts,
      totalWattsWithSpares,
      amps,
      circuits,
      powerStrings,
      dataRuns,
      panelPowerJumpers,
      panelDataJumpers,
      wallAreaM2,
      wallAreaFt2,
      wattsPerPanel,
      usableCircuitWatts,
      totalPixels,
      processorLoadPercent,
      processorWarning,
      distroRecommendation,
      autoPanelRate,
      rateUsed,
      pricedPanels,
      equipmentSubtotal,
      laborSubtotal,
      estimateSubtotal,
      quoteSummary,
    };
  }, [
    panel,
    inputMode,
    widthFt,
    heightFt,
    widthMInput,
    heightMInput,
    panelColumnsInput,
    panelRowsInput,
    sparePercent,
    circuitAmps,
    voltage,
    usableLoadPercent,
    powerPanelsPerString,
    dataPanelsPerRun,
    useMaxPower,
    snapMode,
    processorCapacityPixels,
    processorName,
    supplyType,
    rentalTerm,
    useManualRate,
    manualPanelRate,
    includeSparesInPricing,
    transportFee,
    laborHours,
    laborRate,
    workerCount,
    miscFee,
    processorFee,
    cableKitFee,
  ]);

  async function copyQuoteSummary() {
    try {
      await navigator.clipboard.writeText(results.quoteSummary);
      alert("Quote summary copied to clipboard.");
    } catch {
      alert("Could not copy automatically. You can still select and copy the summary text.");
    }
  }

  function printQuoteSummary() {
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      alert("Unable to open print window.");
      return;
    }

    const html = `
      <html>
        <head>
          <title>OP LED Quote</title>
          <style>
            body {
              font-family: Arial, Helvetica, sans-serif;
              padding: 32px;
              color: #0f172a;
            }
            h1 {
              margin: 0 0 8px;
              font-size: 28px;
            }
            p {
              margin: 0 0 18px;
              color: #475569;
            }
            .box {
              border: 1px solid #cbd5e1;
              border-radius: 16px;
              padding: 20px;
              white-space: pre-wrap;
              line-height: 1.55;
              font-size: 15px;
            }
          </style>
        </head>
        <body>
          <h1>OP LED Quote Summary</h1>
          <p>Orlando Production</p>
          <div class="box">${results.quoteSummary.replace(/\n/g, "<br/>")}</div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <div style={styles.headerWrap}>
          <div style={styles.headerBar}>
            <div style={styles.brandRow}>
              <div style={styles.logoWrap}>
                <img
                  src="/op-logo.png"
                  alt="Orlando Production logo"
                  style={styles.logo}
                />
              </div>
              <div>
                <div style={styles.brandTitle}>OP LED Calculator</div>
                <div style={styles.brandSub}>
                  Sizing, power, processor, cables, and quick estimates
                </div>
              </div>
            </div>

            <div style={styles.headerActions}>
              {mainTab === "estimate" ? (
                <>
                  <button
                    type="button"
                    style={styles.primaryButton}
                    onClick={copyQuoteSummary}
                  >
                    Copy Summary
                  </button>
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={printQuoteSummary}
                  >
                    Print / PDF
                  </button>
                </>
              ) : null}
            </div>
          </div>

          <p style={styles.lead}>
            Switch between feet, meters, or panel-count input. Use the Calculator
            tab for technical planning, the Quick Estimate tab for fast ballpark
            quotes, the Preview tab for wall layout visualization, and the Manuals
            tab for PDF access onsite.
          </p>
        </div>

        <div style={styles.tabRow}>
          <button
            type="button"
            style={mainTab === "calculator" ? styles.tabButtonActive : styles.tabButton}
            onClick={() => setMainTab("calculator")}
          >
            Calculator
          </button>
          <button
            type="button"
            style={mainTab === "estimate" ? styles.tabButtonActive : styles.tabButton}
            onClick={() => setMainTab("estimate")}
          >
            Quick Estimate
          </button>
          <button
            type="button"
            style={mainTab === "preview" ? styles.tabButtonActive : styles.tabButton}
            onClick={() => setMainTab("preview")}
          >
            Preview
          </button>
          <button
            type="button"
            style={mainTab === "manuals" ? styles.tabButtonActive : styles.tabButton}
            onClick={() => setMainTab("manuals")}
          >
            Manuals
          </button>
        </div>

        {mainTab === "calculator" ? (
          <div style={styles.grid}>
            <section style={styles.card}>
              <h2 style={styles.sectionTitle}>Inputs</h2>

              <label style={styles.label}>Panel type</label>
              <select
                style={styles.input}
                value={panelId}
                onChange={(e) => setPanelId(e.target.value as PanelId)}
              >
                {Object.values(PANEL_TYPES).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <div style={styles.helper}>{panel.notes}</div>

              <label style={styles.label}>Input mode</label>
              <div style={styles.modeSwitch}>
                <button
                  type="button"
                  style={inputMode === "feet" ? styles.modeButtonActive : styles.modeButton}
                  onClick={() => setInputMode("feet")}
                >
                  Feet
                </button>
                <button
                  type="button"
                  style={inputMode === "meters" ? styles.modeButtonActive : styles.modeButton}
                  onClick={() => setInputMode("meters")}
                >
                  Meters
                </button>
                <button
                  type="button"
                  style={inputMode === "panels" ? styles.modeButtonActive : styles.modeButton}
                  onClick={() => setInputMode("panels")}
                >
                  Panels
                </button>
              </div>

              {inputMode === "feet" ? (
                <div style={styles.twoCol}>
                  <div>
                    <label style={styles.label}>Target width (ft)</label>
                    <input
                      style={styles.input}
                      value={widthFt}
                      onChange={(e) => setWidthFt(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Target height (ft)</label>
                    <input
                      style={styles.input}
                      value={heightFt}
                      onChange={(e) => setHeightFt(e.target.value)}
                    />
                  </div>
                </div>
              ) : inputMode === "meters" ? (
                <div style={styles.twoCol}>
                  <div>
                    <label style={styles.label}>Target width (m)</label>
                    <input
                      style={styles.input}
                      value={widthMInput}
                      onChange={(e) => setWidthMInput(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Target height (m)</label>
                    <input
                      style={styles.input}
                      value={heightMInput}
                      onChange={(e) => setHeightMInput(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div style={styles.twoCol}>
                  <div>
                    <label style={styles.label}>Panels wide</label>
                    <input
                      style={styles.input}
                      value={panelColumnsInput}
                      onChange={(e) => setPanelColumnsInput(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Panels tall</label>
                    <input
                      style={styles.input}
                      value={panelRowsInput}
                      onChange={(e) => setPanelRowsInput(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div style={styles.twoCol}>
                <div>
                  <label style={styles.label}>Spare %</label>
                  <input
                    style={styles.input}
                    value={sparePercent}
                    onChange={(e) => setSparePercent(e.target.value)}
                  />
                </div>
                <div>
                  <label style={styles.label}>Power mode</label>
                  <select
                    style={styles.input}
                    value={useMaxPower ? "max" : "avg"}
                    onChange={(e) => setUseMaxPower(e.target.value === "max")}
                  >
                    <option value="max">Maximum</option>
                    <option value="avg">Average</option>
                  </select>
                </div>
              </div>

              <div style={styles.twoCol}>
                <div>
                  <label style={styles.label}>Aspect snap</label>
                  <select
                    style={styles.input}
                    value={snapMode}
                    onChange={(e) => setSnapMode(e.target.value)}
                    disabled={inputMode === "panels"}
                  >
                    <option value="none">No snap</option>
                    <option value="16:9">16:9</option>
                    <option value="4:3">4:3</option>
                    <option value="1:1">1:1</option>
                    <option value="21:9">21:9</option>
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Power supply mode</label>
                  <select
                    style={styles.input}
                    value={supplyType}
                    onChange={(e) => setSupplyType(e.target.value)}
                  >
                    <option value="120V single-phase">120V single-phase</option>
                    <option value="208V single-phase">208V single-phase</option>
                    <option value="208V three-phase">208V three-phase</option>
                  </select>
                </div>
              </div>

              <div style={styles.threeCol}>
                <div>
                  <label style={styles.label}>Voltage</label>
                  <input
                    style={styles.input}
                    value={voltage}
                    onChange={(e) => setVoltage(e.target.value)}
                  />
                </div>
                <div>
                  <label style={styles.label}>Circuit size</label>
                  <input
                    style={styles.input}
                    value={circuitAmps}
                    onChange={(e) => setCircuitAmps(e.target.value)}
                  />
                </div>
                <div>
                  <label style={styles.label}>Usable load %</label>
                  <input
                    style={styles.input}
                    value={usableLoadPercent}
                    onChange={(e) => setUsableLoadPercent(e.target.value)}
                  />
                </div>
              </div>

              <div style={styles.twoCol}>
                <div>
                  <label style={styles.label}>Panels per power string</label>
                  <input
                    style={styles.input}
                    value={powerPanelsPerString}
                    onChange={(e) => setPowerPanelsPerString(e.target.value)}
                  />
                </div>
                <div>
                  <label style={styles.label}>Panels per data run</label>
                  <input
                    style={styles.input}
                    value={dataPanelsPerRun}
                    onChange={(e) => setDataPanelsPerRun(e.target.value)}
                  />
                </div>
              </div>

              <div style={styles.twoCol}>
                <div>
                  <label style={styles.label}>Processor label</label>
                  <input
                    style={styles.input}
                    value={processorName}
                    onChange={(e) => setProcessorName(e.target.value)}
                  />
                </div>
                <div>
                  <label style={styles.label}>Processor pixel capacity</label>
                  <input
                    style={styles.input}
                    value={processorCapacityPixels}
                    onChange={(e) => setProcessorCapacityPixels(e.target.value)}
                  />
                </div>
              </div>

              <div style={styles.infoBox}>
                <strong>Panel spec loaded:</strong> {panel.name}
                <br />
                Size: {panel.widthM}m × {panel.heightM}m · Resolution: {panel.resolutionW} ×{" "}
                {panel.resolutionH} · Power: {panel.avgW}W avg / {panel.maxW}W max
              </div>
            </section>

            <section style={styles.resultsCol}>
              <div style={styles.metricGrid}>
                <MetricCard
                  label="Active panels"
                  value={formatNumber(results.activePanels, 0)}
                  subvalue={`${results.columns} columns × ${results.rows} rows`}
                />
                <MetricCard
                  label="Built wall size"
                  value={`${formatNumber(results.builtWidthFt)}' × ${formatNumber(
                    results.builtHeightFt
                  )}'`}
                  subvalue={`${formatNumber(results.builtWidthM)}m × ${formatNumber(
                    results.builtHeightM
                  )}m`}
                />
                <MetricCard
                  label="Wall resolution"
                  value={`${formatNumber(results.resolutionW, 0)} × ${formatNumber(
                    results.resolutionH,
                    0
                  )}`}
                  subvalue={`Pixel aspect ${results.pixelAspect}`}
                />
                <MetricCard
                  label="Power load"
                  value={`${formatNumber(results.totalWatts, 0)} W`}
                  subvalue={`${formatNumber(results.amps)} A @ ${voltage}V`}
                />
                <MetricCard
                  label="Circuits needed"
                  value={formatNumber(results.circuits, 0)}
                  subvalue={`${formatNumber(results.usableCircuitWatts, 0)}W usable / circuit`}
                />
              </div>

              <div style={styles.resultGrid2}>
                <div style={styles.card}>
                  <h2 style={styles.sectionTitle}>Wall summary</h2>
                  <Row
                    label="Solved width"
                    value={`${formatNumber(results.builtWidthFt)} ft · ${formatNumber(
                      results.builtWidthM
                    )} m · ${formatNumber(results.columns, 0)} panels`}
                  />
                  <Row
                    label="Solved height"
                    value={`${formatNumber(results.builtHeightFt)} ft · ${formatNumber(
                      results.builtHeightM
                    )} m · ${formatNumber(results.rows, 0)} panels`}
                  />
                  <Row
                    label="Wall area"
                    value={`${formatNumber(results.wallAreaFt2)} ft² · ${formatNumber(
                      results.wallAreaM2
                    )} m²`}
                  />
                  <Row label="Physical aspect ratio" value={results.physicalAspect} />
                  <Row label="Pixel aspect ratio" value={results.pixelAspect} />
                  <Row label="Active panels" value={formatNumber(results.activePanels, 0)} />
                  <Row label="Spare panels" value={formatNumber(results.sparePanels, 0)} />
                  <Row
                    label="Total panels with spares"
                    value={formatNumber(results.totalPanels, 0)}
                  />
                </div>

                <div style={styles.card}>
                  <h2 style={styles.sectionTitle}>Power + circuits</h2>
                  <Row
                    label="Power mode"
                    value={useMaxPower ? "Maximum (full white / 100%)" : "Average"}
                  />
                  <Row label="Watts per panel" value={`${formatNumber(results.wattsPerPanel, 0)} W`} />
                  <Row label="Total wall power" value={`${formatNumber(results.totalWatts, 0)} W`} />
                  <Row
                    label="Total incl. spares"
                    value={`${formatNumber(results.totalWattsWithSpares, 0)} W`}
                  />
                  <Row label="Estimated amps" value={`${formatNumber(results.amps)} A @ ${voltage}V`} />
                  <Row
                    label="Usable watts per circuit"
                    value={`${formatNumber(results.usableCircuitWatts, 0)} W`}
                  />
                  <Row label="Recommended circuits" value={formatNumber(results.circuits, 0)} />
                </div>
              </div>

              <div style={styles.resultGrid2}>
                <div style={styles.card}>
                  <h2 style={styles.sectionTitle}>Processor + distro checks</h2>
                  <Row label="Processor" value={processorName} />
                  <Row label="Total pixels" value={formatNumber(results.totalPixels, 0)} />
                  <Row
                    label="Processor capacity"
                    value={formatNumber(parseFloat(processorCapacityPixels) || 0, 0)}
                  />
                  <Row
                    label="Capacity used"
                    value={`${formatNumber(results.processorLoadPercent)}%`}
                  />
                  <Row label="Supply type" value={supplyType} />
                  <Row label="Distro recommendation" value={results.distroRecommendation} />
                  <div style={results.processorWarning ? styles.warnBox : styles.okBox}>
                    {results.processorWarning
                      ? "This wall exceeds the processor capacity entered."
                      : "This wall fits within the processor capacity entered."}
                  </div>
                </div>

                <div style={styles.card}>
                  <h2 style={styles.sectionTitle}>Data + power cable estimate</h2>
                  <Row label="Power strings needed" value={formatNumber(results.powerStrings, 0)} />
                  <Row label="Data runs needed" value={formatNumber(results.dataRuns, 0)} />
                  <Row
                    label="Inter-panel power jumpers"
                    value={formatNumber(results.panelPowerJumpers, 0)}
                  />
                  <Row
                    label="Inter-panel data jumpers"
                    value={formatNumber(results.panelDataJumpers, 0)}
                  />
                  <div style={styles.infoBox}>
                    These cable counts are planning estimates based on your chosen
                    panels-per-string and panels-per-run values. These inputs stay
                    editable so you can match the calculator to the way you actually
                    deploy each wall.
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : mainTab === "estimate" ? (
          <div style={styles.gridEstimate}>
            <section style={styles.card}>
              <h2 style={styles.sectionTitle}>Quick Estimate Inputs</h2>

              <div style={styles.twoCol}>
                <div>
                  <label style={styles.label}>Rental term</label>
                  <select
                    style={styles.input}
                    value={rentalTerm}
                    onChange={(e) => setRentalTerm(e.target.value as RentalTerm)}
                  >
                    <option value="day1">1 Day</option>
                    <option value="day3">3 Day</option>
                    <option value="week">Weekly</option>
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Auto panel rate</label>
                  <input style={styles.input} value={formatMoney(results.autoPanelRate)} readOnly />
                </div>
              </div>

              <div style={styles.twoCol}>
                <div>
                  <label style={styles.label}>Use manual panel rate?</label>
                  <select
                    style={styles.input}
                    value={useManualRate ? "yes" : "no"}
                    onChange={(e) => setUseManualRate(e.target.value === "yes")}
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Manual panel rate</label>
                  <input
                    style={styles.input}
                    value={manualPanelRate}
                    onChange={(e) => setManualPanelRate(e.target.value)}
                    placeholder="Optional override"
                  />
                </div>
              </div>

              <div style={styles.twoCol}>
                <div>
                  <label style={styles.label}>Include spares in pricing?</label>
                  <select
                    style={styles.input}
                    value={includeSparesInPricing ? "yes" : "no"}
                    onChange={(e) => setIncludeSparesInPricing(e.target.value === "yes")}
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Priced panels</label>
                  <input style={styles.input} value={String(results.pricedPanels)} readOnly />
                </div>
              </div>

              <div style={styles.threeCol}>
                <div>
                  <label style={styles.label}>Labor hours</label>
                  <input
                    style={styles.input}
                    value={laborHours}
                    onChange={(e) => setLaborHours(e.target.value)}
                  />
                </div>
                <div>
                  <label style={styles.label}>Labor rate</label>
                  <input
                    style={styles.input}
                    value={laborRate}
                    onChange={(e) => setLaborRate(e.target.value)}
                  />
                </div>
                <div>
                  <label style={styles.label}>Worker count</label>
                  <input
                    style={styles.input}
                    value={workerCount}
                    onChange={(e) => setWorkerCount(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={styles.label}>Transport fee</label>
                <input
                  style={styles.input}
                  value={transportFee}
                  onChange={(e) => setTransportFee(e.target.value)}
                />
              </div>

              <div style={styles.threeCol}>
                <div>
                  <label style={styles.label}>Processor fee</label>
                  <input
                    style={styles.input}
                    value={processorFee}
                    onChange={(e) => setProcessorFee(e.target.value)}
                  />
                </div>
                <div>
                  <label style={styles.label}>Cable kit fee</label>
                  <input
                    style={styles.input}
                    value={cableKitFee}
                    onChange={(e) => setCableKitFee(e.target.value)}
                  />
                </div>
                <div>
                  <label style={styles.label}>Misc / markup</label>
                  <input
                    style={styles.input}
                    value={miscFee}
                    onChange={(e) => setMiscFee(e.target.value)}
                  />
                </div>
              </div>
            </section>

            <section style={styles.resultsCol}>
              <div style={styles.metricGridEstimate}>
                <MetricCard
                  label="Panel rate used"
                  value={formatMoney(results.rateUsed)}
                  subvalue={useManualRate ? "Manual override" : "Auto from panel type"}
                />
                <MetricCard
                  label="Equipment subtotal"
                  value={formatMoney(results.equipmentSubtotal)}
                  subvalue={`${results.pricedPanels} priced panels`}
                />
                <MetricCard
                  label="Labor subtotal"
                  value={formatMoney(results.laborSubtotal)}
                  subvalue={`${laborHours} hrs × ${workerCount} workers`}
                />
                <MetricCard
                  label="Quick estimate"
                  value={formatMoney(results.estimateSubtotal)}
                  subvalue={
                    rentalTerm === "day1"
                      ? "1 day quote"
                      : rentalTerm === "day3"
                      ? "3 day quote"
                      : "weekly quote"
                  }
                />
              </div>

              <div style={styles.totalBanner}>
                <div>
                  <div style={styles.totalBannerLabel}>Estimated Quote Total</div>
                  <div style={styles.totalBannerSub}>
                    {panel.name} · {formatNumber(results.builtWidthFt)}' ×{" "}
                    {formatNumber(results.builtHeightFt)}'
                  </div>
                </div>
                <div style={styles.totalBannerValue}>
                  {formatMoney(results.estimateSubtotal)}
                </div>
              </div>

              <div style={styles.resultGrid2}>
                <div style={styles.card}>
                  <h2 style={styles.sectionTitle}>Estimate breakdown</h2>
                  <Row label="Panel type" value={panel.name} />
                  <Row
                    label="Wall size"
                    value={`${formatNumber(results.builtWidthFt)}' × ${formatNumber(
                      results.builtHeightFt
                    )}'`}
                  />
                  <Row
                    label="Equipment subtotal"
                    value={formatMoney(results.equipmentSubtotal)}
                  />
                  <Row label="Labor subtotal" value={formatMoney(results.laborSubtotal)} />
                  <Row
                    label="Transport fee"
                    value={formatMoney(parseFloat(transportFee) || 0)}
                  />
                  <Row
                    label="Processor fee"
                    value={formatMoney(parseFloat(processorFee) || 0)}
                  />
                  <Row
                    label="Cable kit fee"
                    value={formatMoney(parseFloat(cableKitFee) || 0)}
                  />
                  <Row label="Misc / markup" value={formatMoney(parseFloat(miscFee) || 0)} />
                  <Row label="Estimated total" value={formatMoney(results.estimateSubtotal)} />
                </div>

                <div style={styles.card}>
                  <h2 style={styles.sectionTitle}>Quote summary</h2>
                  <textarea style={styles.textarea} readOnly value={results.quoteSummary} />
                  <div style={styles.buttonRow}>
                    <button type="button" style={styles.primaryButton} onClick={copyQuoteSummary}>
                      Copy Summary
                    </button>
                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={printQuoteSummary}
                    >
                      Print / PDF
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : mainTab === "preview" ? (
          <div style={styles.previewPageWrap}>
            <section style={styles.card}>
              <div style={styles.previewHeader}>
                <div>
                  <h2 style={styles.sectionTitleNoMargin}>Wall Layout Preview</h2>
                  <div style={styles.previewSub}>
                    Visual cabinet layout based on the solved wall dimensions
                  </div>
                </div>
                <div style={styles.previewStats}>
                  {formatNumber(results.columns, 0)} × {formatNumber(results.rows, 0)}
                </div>
              </div>

              <div style={styles.previewToggleRow}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={showLayoutLabels}
                    onChange={(e) => setShowLayoutLabels(e.target.checked)}
                    style={styles.checkbox}
                  />
                  Show panel coordinates in layout preview
                </label>
              </div>

              <WallLayoutPreview
                columns={results.columns}
                rows={results.rows}
                panelLabel={panel.name}
                showLabels={showLayoutLabels}
              />

              <div style={styles.previewSummaryGrid}>
                <div style={styles.previewSummaryItem}>
                  <div style={styles.previewSummaryLabel}>Cabinet Count</div>
                  <div style={styles.previewSummaryValue}>
                    {formatNumber(results.activePanels, 0)}
                  </div>
                </div>
                <div style={styles.previewSummaryItem}>
                  <div style={styles.previewSummaryLabel}>Layout</div>
                  <div style={styles.previewSummaryValue}>
                    {formatNumber(results.columns, 0)} wide × {formatNumber(results.rows, 0)} tall
                  </div>
                </div>
                <div style={styles.previewSummaryItem}>
                  <div style={styles.previewSummaryLabel}>Wall Size</div>
                  <div style={styles.previewSummaryValue}>
                    {formatNumber(results.builtWidthFt)}' × {formatNumber(results.builtHeightFt)}'
                  </div>
                </div>
                <div style={styles.previewSummaryItem}>
                  <div style={styles.previewSummaryLabel}>Resolution</div>
                  <div style={styles.previewSummaryValue}>
                    {formatNumber(results.resolutionW, 0)} × {formatNumber(results.resolutionH, 0)}
                  </div>
                </div>
                <div style={styles.previewSummaryItem}>
                  <div style={styles.previewSummaryLabel}>Circuits</div>
                  <div style={styles.previewSummaryValue}>
                    {formatNumber(results.circuits, 0)}
                  </div>
                </div>
                <div style={styles.previewSummaryItem}>
                  <div style={styles.previewSummaryLabel}>Panel Type</div>
                  <div style={styles.previewSummaryValue}>{panel.name}</div>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div style={styles.manualsWrap}>
            <section style={styles.card}>
              <h2 style={styles.sectionTitle}>Panel Manuals</h2>
              <p style={styles.lead}>
                Open the manual you need for onsite reference, setup, specs, or troubleshooting.
              </p>

              <div style={styles.infoBox}>
                The 500×1000 manual covers both portrait and landscape panel use.
              </div>

              <div style={styles.manualsGrid}>
                <a
                  href={PANEL_TYPES.angle500.manual}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.manualCard}
                >
                  <div style={styles.manualCardTitle}>500×500 Angle Panel</div>
                  <div style={styles.manualCardSub}>Rigid 45° / corner-capable panel</div>
                  <div style={styles.manualCardLink}>Open Manual</div>
                </a>

                <a
                  href={PANEL_TYPES.flex500.manual}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.manualCard}
                >
                  <div style={styles.manualCardTitle}>500×500 Flexible Panel</div>
                  <div style={styles.manualCardSub}>Flexible curved panel</div>
                  <div style={styles.manualCardLink}>Open Manual</div>
                </a>

                <a
                  href={PANEL_TYPES.panel1000Portrait.manual}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.manualCard}
                >
                  <div style={styles.manualCardTitle}>500×1000 Panel</div>
                  <div style={styles.manualCardSub}>Portrait and landscape spec reference</div>
                  <div style={styles.manualCardLink}>Open Manual</div>
                </a>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    color: "#0f172a",
    fontFamily: "Arial, Helvetica, sans-serif",
    padding: "24px",
  },
  container: {
    maxWidth: "1400px",
    margin: "0 auto",
  },
  headerWrap: {
    marginBottom: "20px",
  },
  headerBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    marginBottom: "12px",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "20px",
    padding: "16px 18px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    flexWrap: "wrap",
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  logoWrap: {
    flex: "0 0 auto",
  },
  logo: {
    maxWidth: "90px",
    height: "auto",
    display: "block",
  },
  brandTitle: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: "2px",
  },
  brandSub: {
    fontSize: "13px",
    color: "#64748b",
  },
  lead: {
    fontSize: "15px",
    color: "#475569",
    maxWidth: "900px",
    margin: 0,
  },
  tabRow: {
    display: "flex",
    gap: "10px",
    marginBottom: "18px",
    flexWrap: "wrap",
  },
  tabButton: {
    padding: "10px 16px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    background: "#fff",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
  },
  tabButtonActive: {
    padding: "10px 16px",
    borderRadius: "12px",
    border: "1px solid #0f172a",
    background: "#0f172a",
    color: "#fff",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(320px, 380px) 1fr",
    gap: "24px",
    alignItems: "start",
  },
  gridEstimate: {
    display: "grid",
    gridTemplateColumns: "minmax(340px, 420px) 1fr",
    gap: "24px",
    alignItems: "start",
  },
  resultsCol: {
    display: "grid",
    gap: "24px",
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "20px",
    padding: "20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  sectionTitle: {
    fontSize: "20px",
    marginTop: 0,
    marginBottom: "16px",
  },
  sectionTitleNoMargin: {
    fontSize: "20px",
    margin: 0,
  },
  label: {
    display: "block",
    fontSize: "13px",
    marginBottom: "6px",
    fontWeight: 600,
    color: "#334155",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    marginBottom: "14px",
    background: "#fff",
  },
  helper: {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "-8px",
    marginBottom: "14px",
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
  },
  threeCol: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "12px",
  },
  modeSwitch: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "8px",
    marginBottom: "14px",
  },
  modeButton: {
    padding: "10px 12px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    background: "#fff",
    cursor: "pointer",
    fontSize: "14px",
  },
  modeButtonActive: {
    padding: "10px 12px",
    borderRadius: "12px",
    border: "1px solid #0f172a",
    background: "#0f172a",
    color: "#fff",
    cursor: "pointer",
    fontSize: "14px",
  },
  metricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: "14px",
  },
  metricGridEstimate: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: "14px",
  },
  metricCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "16px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  metricLabel: {
    fontSize: "13px",
    color: "#64748b",
    marginBottom: "8px",
  },
  metricValue: {
    fontSize: "28px",
    fontWeight: 700,
    lineHeight: 1.1,
  },
  metricSubvalue: {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "8px",
  },
  resultGrid2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "24px",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "16px",
    padding: "10px 0",
    borderBottom: "1px solid #e2e8f0",
  },
  rowLabel: {
    color: "#64748b",
    fontSize: "14px",
  },
  rowValue: {
    color: "#0f172a",
    fontSize: "14px",
    fontWeight: 600,
    textAlign: "right",
  },
  infoBox: {
    marginTop: "14px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "12px",
    fontSize: "13px",
    color: "#475569",
    lineHeight: 1.5,
  },
  warnBox: {
    marginTop: "14px",
    background: "#fef3c7",
    border: "1px solid #fcd34d",
    borderRadius: "14px",
    padding: "12px",
    fontSize: "13px",
    color: "#92400e",
  },
  okBox: {
    marginTop: "14px",
    background: "#dcfce7",
    border: "1px solid #86efac",
    borderRadius: "14px",
    padding: "12px",
    fontSize: "13px",
    color: "#166534",
  },
  textarea: {
    width: "100%",
    minHeight: "220px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    padding: "12px",
    fontSize: "14px",
    fontFamily: "Arial, Helvetica, sans-serif",
    resize: "vertical",
  },
  buttonRow: {
    display: "flex",
    gap: "10px",
    marginTop: "14px",
    flexWrap: "wrap",
  },
  primaryButton: {
    padding: "10px 16px",
    borderRadius: "12px",
    border: "1px solid #0f172a",
    background: "#0f172a",
    color: "#fff",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
    textDecoration: "none",
  },
  secondaryButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 16px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#0f172a",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
    textDecoration: "none",
  },
  totalBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    background: "#0f172a",
    color: "#ffffff",
    borderRadius: "20px",
    padding: "20px 22px",
    boxShadow: "0 6px 18px rgba(15,23,42,0.12)",
    flexWrap: "wrap",
  },
  totalBannerLabel: {
    fontSize: "13px",
    opacity: 0.8,
    marginBottom: "6px",
  },
  totalBannerSub: {
    fontSize: "14px",
    opacity: 0.9,
  },
  totalBannerValue: {
    fontSize: "32px",
    fontWeight: 700,
    lineHeight: 1,
    whiteSpace: "nowrap",
  },
  manualsWrap: {
    display: "grid",
    gap: "24px",
  },
  manualsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "18px",
    marginTop: "18px",
  },
  manualCard: {
    display: "block",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "20px",
    textDecoration: "none",
    color: "#0f172a",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  manualCardTitle: {
    fontSize: "18px",
    fontWeight: 700,
    marginBottom: "8px",
  },
  manualCardSub: {
    fontSize: "14px",
    color: "#64748b",
    marginBottom: "16px",
    lineHeight: 1.5,
  },
  manualCardLink: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#0f172a",
    textDecoration: "underline",
  },
  previewPageWrap: {
    display: "grid",
    gap: "24px",
  },
  previewToggleRow: {
    marginBottom: "16px",
  },
  checkboxLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "14px",
    color: "#334155",
    fontWeight: 600,
  },
  checkbox: {
    width: "16px",
    height: "16px",
  },
  previewHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "16px",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
  previewSub: {
    fontSize: "13px",
    color: "#64748b",
    marginTop: "6px",
  },
  previewStats: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#0f172a",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "999px",
    padding: "8px 12px",
  },
  previewOuter: {
    display: "grid",
    gap: "14px",
  },
  previewScroller: {
    overflowX: "auto",
    paddingBottom: "6px",
  },
  previewGrid: {
    display: "grid",
    gap: "6px",
    width: "max-content",
  },
  previewCell: {
    width: "52px",
    height: "52px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    background: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#0f172a",
    fontWeight: 700,
    boxSizing: "border-box",
  },
  previewCellLabel: {
    fontSize: "11px",
    color: "#1e293b",
  },
  previewLegend: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  previewLegendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    color: "#475569",
  },
  previewLegendSwatch: {
    width: "16px",
    height: "16px",
    borderRadius: "4px",
    border: "1px solid #cbd5e1",
    background: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)",
    display: "inline-block",
  },
  previewSummaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    marginTop: "8px",
  },
  previewSummaryItem: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "12px",
  },
  previewSummaryLabel: {
    fontSize: "12px",
    color: "#64748b",
    marginBottom: "6px",
  },
  previewSummaryValue: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#0f172a",
  },
};