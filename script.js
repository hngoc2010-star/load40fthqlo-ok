(function () {
  const $ = (id) => document.getElementById(id);

  const thicknessEl = $("thickness");
  const widthEl = $("width");
  const lengthEl = $("length");
  const densityEl = $("density");
  const pcsMinEl = $("pcsMin");
  const pcsMaxEl = $("pcsMax");
  const maxBundleHeightEl = $("maxBundleHeight");
  const bundleModeEl = $("bundleMode");
  const manualBundlesEl = $("manualBundles");
  const manualBundleWrapEl = $("manualBundleWrap");

  const cbmPerPcsEl = $("cbmPerPcs");
  const pcsPerCbmEl = $("pcsPerCbm");
  const bestPlanEl = $("bestPlan");
  const bestInfoEl = $("bestInfo");
  const bundleHeightTopEl = $("bundleHeightTop");
  const bundleHeightSubEl = $("bundleHeightSub");
  const resultTableEl = $("resultTable");
  const resultCountEl = $("resultCount");

  const MIN_CBM = 48;
  const MAX_CBM = 54;
  const MAX_TONS = 32.5;
  const IDEAL_CBM = 51;

  function setRealVH() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
  }

  function num(value) {
    const x = parseFloat(value);
    return Number.isFinite(x) ? x : 0;
  }

  function intNum(value) {
    const x = parseInt(value, 10);
    return Number.isFinite(x) ? x : 0;
  }

  function fmt(value, digits = 0) {
    return Number(value).toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  function updateManualBundleUI() {
    const isManual = bundleModeEl.value === "manual";
    manualBundleWrapEl.style.display = isManual ? "flex" : "none";
  }

  function getNote(totalCbm, totalTons, bundleHeight, maxBundleHeight) {
    const okCbm = totalCbm >= MIN_CBM && totalCbm <= MAX_CBM;
    const okTons = totalTons <= MAX_TONS;
    const okHeight = bundleHeight <= maxBundleHeight;

    if (okCbm && okTons && okHeight) {
      return {
        text: "Đạt",
        cls: "good",
        score: Math.abs(totalCbm - IDEAL_CBM)
      };
    }

    if (!okHeight) {
      return {
        text: "Vượt cao",
        cls: "bad",
        score: 1000 + (bundleHeight - maxBundleHeight) * 2 + Math.abs(totalCbm - IDEAL_CBM)
      };
    }

    if (!okTons) {
      return {
        text: "Vượt tấn",
        cls: "bad",
        score: 2000 + (totalTons - MAX_TONS) * 100 + Math.abs(totalCbm - IDEAL_CBM)
      };
    }

    if (totalCbm < MIN_CBM) {
      return {
        text: "Thiếu cbm",
        cls: "warn",
        score: 3000 + (MIN_CBM - totalCbm) * 10
      };
    }

    return {
      text: "Vượt cbm",
      cls: "warn",
      score: 4000 + (totalCbm - MAX_CBM) * 10
    };
  }

  function renderEmpty(message) {
    cbmPerPcsEl.textContent = "-";
    pcsPerCbmEl.textContent = "-";
    bestPlanEl.textContent = "-";
    bestInfoEl.textContent = "CBM: - | Tấn: - | PCS: -";
    bundleHeightTopEl.textContent = "-";
    bundleHeightSubEl.textContent = "Pcs/bundle × Thickness";
    resultCountEl.textContent = "0";
    resultTableEl.innerHTML = `<tr><td colspan="6" class="empty">${message}</td></tr>`;
  }

  function calculate() {
    const thickness = num(thicknessEl.value);
    const width = num(widthEl.value);
    const length = num(lengthEl.value);
    const density = num(densityEl.value);
    const maxBundleHeight = num(maxBundleHeightEl.value);

    let pcsMin = intNum(pcsMinEl.value);
    let pcsMax = intNum(pcsMaxEl.value);
    let manualBundles = intNum(manualBundlesEl.value);

    const bundleMode = bundleModeEl.value;

    if (thickness <= 0 || width <= 0 || length <= 0 || density <= 0 || maxBundleHeight <= 0) {
      renderEmpty("Nhập đủ Thickness, Width, Length, kg/cbm, Max H/kiện");
      return;
    }

    if (pcsMin <= 0) pcsMin = 1;
    if (pcsMax < pcsMin) pcsMax = pcsMin;
    if (manualBundles <= 0) manualBundles = 1;

    const cbmPerPcs = (thickness / 1000) * (width / 1000) * (length / 1000);
    if (cbmPerPcs <= 0) {
      renderEmpty("Dữ liệu không hợp lệ");
      return;
    }

    const pcsPerCbm = 1 / cbmPerPcs;

    cbmPerPcsEl.textContent = fmt(cbmPerPcs, 3);
    pcsPerCbmEl.textContent = fmt(pcsPerCbm, 3);

    const rows = [];

    for (let pcsPerBundle = pcsMin; pcsPerBundle <= pcsMax; pcsPerBundle++) {
      const bundleHeight = pcsPerBundle * thickness;
      const bundleCbm = pcsPerBundle * cbmPerPcs;
      const bundleKg = bundleCbm * density;

      if (bundleHeight <= 0 || bundleCbm <= 0 || bundleKg <= 0) continue;

      let bundles = 0;

      if (bundleMode === "manual") {
        bundles = manualBundles;
      } else {
        const bundlesByCbm = Math.floor(MAX_CBM / bundleCbm);
        const bundlesByWeight = Math.floor((MAX_TONS * 1000) / bundleKg);
        bundles = Math.min(bundlesByCbm, bundlesByWeight);
      }

      if (bundles <= 0) continue;

      const totalPcs = pcsPerBundle * bundles;
      const totalCbm = totalPcs * cbmPerPcs;
      const totalTons = (totalCbm * density) / 1000;

      const note = getNote(totalCbm, totalTons, bundleHeight, maxBundleHeight);

      rows.push({
        pcsPerBundle,
        bundles,
        totalPcs,
        bundleHeight,
        totalCbm,
        totalTons,
        noteText: note.text,
        noteClass: note.cls,
        score: note.score
      });
    }

    if (!rows.length) {
      renderEmpty("Không có phương án phù hợp");
      return;
    }

    rows.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      if (Math.abs(a.totalCbm - IDEAL_CBM) !== Math.abs(b.totalCbm - IDEAL_CBM)) {
        return Math.abs(a.totalCbm - IDEAL_CBM) - Math.abs(b.totalCbm - IDEAL_CBM);
      }
      return a.bundleHeight - b.bundleHeight;
    });

    const best = rows[0];

    bestPlanEl.textContent = `${best.pcsPerBundle} tấm/kiện · ${best.bundles} kiện`;
    bestInfoEl.textContent = `CBM: ${fmt(best.totalCbm, 3)} | Tấn: ${fmt(best.totalTons, 3)} | PCS: ${best.totalPcs}`;
    bundleHeightTopEl.textContent = `${fmt(best.bundleHeight, 0)} mm`;
    bundleHeightSubEl.textContent = `${best.pcsPerBundle} × ${fmt(thickness, 1)} mm`;

    const topRows = rows.slice(0, 12);
    resultCountEl.textContent = String(topRows.length);

    resultTableEl.innerHTML = topRows.map((row, index) => {
      const highlightStyle = index === 0
        ? 'style="background: rgba(37, 99, 235, 0.06); font-weight: 700;"'
        : "";

      return `
        <tr ${highlightStyle}>
          <td>${row.pcsPerBundle}</td>
          <td>${row.bundles}</td>
          <td>${fmt(row.bundleHeight, 0)} mm</td>
          <td>${fmt(row.totalCbm, 3)}</td>
          <td>${fmt(row.totalTons, 3)}</td>
          <td class="${row.noteClass}">${row.noteText}</td>
        </tr>
      `;
    }).join("");
  }

  function bindEvents() {
    const fields = [
      thicknessEl,
      widthEl,
      lengthEl,
      densityEl,
      pcsMinEl,
      pcsMaxEl,
      maxBundleHeightEl,
      bundleModeEl,
      manualBundlesEl
    ];

    fields.forEach((el) => {
      el.addEventListener("input", () => {
        updateManualBundleUI();
        calculate();
      });

      el.addEventListener("change", () => {
        updateManualBundleUI();
        calculate();
      });
    });
  }

  window.addEventListener("resize", setRealVH);
  window.addEventListener("orientationchange", setRealVH);

  setRealVH();
  updateManualBundleUI();
  bindEvents();
  calculate();
})();
