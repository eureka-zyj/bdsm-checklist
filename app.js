// app.js
(() => {
  const { categories, triedOptions, levelOptions, roleOptions } = window.CHECKLIST_DATA;

  // 视图状态：welcome / basic / category / final
  const state = {
    view: "welcome",
    activeCategoryIndex: 0
  };

  // 注意：这里已经去掉 fillingDate
  const BASIC_FIELDS = [
    { key: "fillerName", label: "填表人" },
    { key: "age", label: "年龄" },
    { key: "sex", label: "生理性别" },
    { key: "orientation", label: "性取向" },
    { key: "relationship", label: "感情状态" },
    { key: "partnerCount", label: "性经历人数" }
  ];

  document.addEventListener("DOMContentLoaded", init);

  // 统一处理标题中“第一大类：束缚”“1. 束缚” → “束缚”
  function getShortTitle(title) {
    return String(title || "")
      .replace(/^第.+?大类[:：]?\s*/, "")
      .replace(/^[0-9]+[.\u3001]?\s*/, "")
      .trim();
  }

  function init() {
    buildTable();
    buildCategoryNav();
    wireBasicInfoInputs();
    wireResultButtons();

    // 自动填今天日期（虽然行是隐藏的，但值会被写进去用于结果输出）
    const fillingDateInput = document.getElementById("fillingDate");
    if (fillingDateInput && !fillingDateInput.value) {
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, "0");
      const d = String(today.getDate()).padStart(2, "0");
      fillingDateInput.value = `${y}-${m}-${d}`;
    }

    const nextBtn = document.getElementById("nextBtn");
    if (nextBtn) nextBtn.addEventListener("click", onNextClick);

    document.addEventListener("click", onOptionButtonClick);
    document.addEventListener("click", onBulkButtonClick);

    setView("welcome");
  }

  // ========== 构建表格 & 导航 ==========

  function buildTable() {
    const tbody = document.getElementById("itemsBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    categories.forEach((category, catIndex) => {
      const catRow = document.createElement("tr");
      catRow.className = "category-row";
      catRow.dataset.categoryIndex = String(catIndex);
      const catCell = document.createElement("td");
      catCell.colSpan = 4;
      catCell.textContent = getShortTitle(category.title);
      catRow.appendChild(catCell);
      tbody.appendChild(catRow);

      category.items.forEach((itemName) => {
        const tr = document.createElement("tr");
        tr.dataset.item = itemName;
        tr.dataset.categoryIndex = String(catIndex);

        const tdName = document.createElement("td");
        tdName.className = "item-name";
        tdName.textContent = itemName;

        const tdTried = document.createElement("td");
        tdTried.appendChild(createBtnGroup("tried", triedOptions));

        const tdLevel = document.createElement("td");
        tdLevel.appendChild(createBtnGroup("level", levelOptions));

        const tdRole = document.createElement("td");
        tdRole.appendChild(createBtnGroup("role", roleOptions));

        tr.appendChild(tdName);
        tr.appendChild(tdTried);
        tr.appendChild(tdLevel);
        tr.appendChild(tdRole);

        tbody.appendChild(tr);
      });
    });
  }

  function createBtnGroup(type, options) {
    const group = document.createElement("div");
    group.className = "btn-group";
    group.dataset.type = type;
    options.forEach((val) => {
      const btn = document.createElement("div");
      btn.className = "option-btn";
      btn.dataset.value = val;
      btn.textContent = val;
      group.appendChild(btn);
    });
    return group;
  }

  function buildCategoryNav() {
    const nav = document.getElementById("categoryNav");
    if (!nav) return;
    nav.innerHTML = "";
    categories.forEach((cat, index) => {
      const btn = document.createElement("button");
      btn.className = "nav-tab";
      const shortLabel = getShortTitle(cat.title);
      btn.textContent = `${index + 1}. ${shortLabel}`;
      btn.dataset.index = String(index);
      btn.addEventListener("click", () => {
        state.activeCategoryIndex = index;
        setView("category");
      });
      nav.appendChild(btn);
    });
  }

  // ========== 基本信息输入联动 ==========

  function wireBasicInfoInputs() {
    const sexSelectEl = document.getElementById("sexSelect");
    const sexCustomEl = document.getElementById("sexCustom");
    if (sexSelectEl && sexCustomEl) {
      sexSelectEl.addEventListener("change", () => {
        if (sexSelectEl.value === "自定义") {
          sexCustomEl.style.display = "inline-block";
          sexCustomEl.focus();
        } else {
          sexCustomEl.style.display = "none";
          sexCustomEl.value = "";
        }
        clearBasicErrors();
        updateBasicInfoVisibility();
      });
    }

    const orientationSelectEl = document.getElementById("orientationSelect");
    const orientationCustomEl = document.getElementById("orientationCustom");
    if (orientationSelectEl && orientationCustomEl) {
      orientationSelectEl.addEventListener("change", () => {
        if (orientationSelectEl.value === "其他") {
          orientationCustomEl.style.display = "inline-block";
          orientationCustomEl.focus();
        } else {
          orientationCustomEl.style.display = "none";
          orientationCustomEl.value = "";
        }
        clearBasicErrors();
        updateBasicInfoVisibility();
      });
    }

    const relationshipSelectEl = document.getElementById("relationshipSelect");
    const relationshipCustomEl = document.getElementById("relationshipCustom");
    if (relationshipSelectEl && relationshipCustomEl) {
      relationshipSelectEl.addEventListener("change", () => {
        if (relationshipSelectEl.value === "其他") {
          relationshipCustomEl.style.display = "inline-block";
          relationshipCustomEl.focus();
        } else {
          relationshipCustomEl.style.display = "none";
          relationshipCustomEl.value = "";
        }
        clearBasicErrors();
        updateBasicInfoVisibility();
      });
    }

    BASIC_FIELDS.forEach((field) => {
      if (["sex", "orientation", "relationship"].includes(field.key)) return;
      const el = document.getElementById(field.key);
      if (el) {
        el.addEventListener("input", () => {
          clearBasicErrors();
          updateBasicInfoVisibility();
        });
      }
    });
  }

  function wireResultButtons() {
    const btnText = document.getElementById("btnTextResult");
    const btnExcel = document.getElementById("btnExcelResult");
    if (btnText) btnText.addEventListener("click", generateTextResult);
    if (btnExcel) btnExcel.addEventListener("click", generateExcelResult);
  }

  // ========== 视图切换 ==========

  function setView(view) {
    state.view = view;
    const header = document.getElementById("appHeader");
    const nav = document.getElementById("categoryNav");
    const basicSection = document.getElementById("basicInfoSection");
    const categorySection = document.getElementById("categorySection");
    const finalSection = document.getElementById("finalSection");
    const nextBtn = document.getElementById("nextBtn");

    clearMessage();

    if (view === "welcome") {
      header.classList.add("app-header--center");
      if (nav) nav.classList.add("hidden");
      activateSection(null);
      if (nextBtn) {
        nextBtn.textContent = "下一步";
        nextBtn.classList.remove("btn-disabled");
        nextBtn.style.display = "inline-block";
      }
    } else if (view === "basic") {
      header.classList.remove("app-header--center");
      if (nav) nav.classList.add("hidden");
      activateSection(basicSection);
      updateBasicInfoVisibility();
      if (nextBtn) {
        nextBtn.textContent = "下一步";
        nextBtn.style.display = "inline-block";
      }
    } else if (view === "category") {
      header.classList.remove("app-header--center");
      if (nav) nav.classList.remove("hidden");
      activateSection(categorySection);
      updateCategoryView();
      if (nextBtn) {
        nextBtn.textContent = "下一步";
        nextBtn.style.display = "inline-block";
        nextBtn.classList.remove("btn-disabled"); // 大类页始终可点
      }
    } else if (view === "final") {
      header.classList.remove("app-header--center");
      if (nav) nav.classList.remove("hidden");
      activateSection(finalSection);
      if (nextBtn) nextBtn.style.display = "none";
    }

    updateNavActiveState();
    updateNextButtonState();
  }

  function activateSection(sectionEl) {
    const sections = document.querySelectorAll(".step-section");
    sections.forEach((sec) => {
      sec.classList.add("hidden");
      sec.classList.remove("visible");
    });
    if (!sectionEl) return;
    sectionEl.classList.remove("hidden");
    void sectionEl.offsetWidth;
    sectionEl.classList.add("visible");
  }

  function updateNavActiveState() {
    const nav = document.getElementById("categoryNav");
    if (!nav) return;
    const tabs = nav.querySelectorAll(".nav-tab");
    tabs.forEach((tab) => {
      const idx = Number(tab.dataset.index);
      tab.classList.toggle(
        "active",
        state.view === "category" && idx === state.activeCategoryIndex
      );
    });

    // 让当前激活标签滚动到可见位置
    const activeTab = nav.querySelector(".nav-tab.active");
    if (activeTab && activeTab.scrollIntoView) {
      activeTab.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }

  function updateCategoryView() {
    const titleEl = document.getElementById("categoryTitle");
    const summaryEl = document.getElementById("basicInfoSummary");
    const catIndex = state.activeCategoryIndex;

    const cat = categories[catIndex];

    if (titleEl) {
      titleEl.textContent = getShortTitle(cat.title);
    }

    if (summaryEl) {
      const info = getBasicInfo();
      summaryEl.innerHTML = `
        <span><strong>填表人：</strong>${info.fillerName}</span>
        <span><strong>日期：</strong>${info.fillingDate}</span>
        <span><strong>年龄：</strong>${info.age}</span>
        <span><strong>生理性别：</strong>${info.sex}</span>
        <span><strong>性取向：</strong>${info.orientation}</span>
        <span><strong>感情状态：</strong>${info.relationship}</span>
        <span><strong>性经历人数：</strong>${info.partnerCount}</span>
      `;
    }

    const rows = document.querySelectorAll("#itemsBody tr");
    rows.forEach((row) => {
      const rowCat = row.dataset.categoryIndex;
      if (rowCat === undefined) return;
      row.style.display = Number(rowCat) === catIndex ? "table-row" : "none";
    });
  }

  // ========== 基本信息逐行解锁 / 校验 ==========

  function updateBasicInfoVisibility() {
    let allowNextRow = true;
    BASIC_FIELDS.forEach((field, index) => {
      const row = document.querySelector(`.basic-row[data-field="${field.key}"]`);
      if (!row) return;
      if (index === 0) {
        row.classList.remove("basic-row--hidden");
        allowNextRow = isBasicFieldFilled(field.key);
      } else {
        if (allowNextRow) {
          row.classList.remove("basic-row--hidden");
          const filled = isBasicFieldFilled(field.key);
          if (!filled) allowNextRow = false;
        } else {
          row.classList.add("basic-row--hidden");
        }
      }
    });
    updateNextButtonState();
  }

  function isBasicFieldFilled(key) {
    switch (key) {
      case "fillerName": {
        const v = document.getElementById("fillerName").value.trim();
        return v.length > 0;
      }
      case "age": {
        const v = document.getElementById("age").value.trim();
        return v !== "";
      }
      case "sex":
        return isSelectFilled("sexSelect", "sexCustom", "自定义");
      case "orientation":
        return isSelectFilled("orientationSelect", "orientationCustom", "其他");
      case "relationship":
        return isSelectFilled("relationshipSelect", "relationshipCustom", "其他");
      case "partnerCount": {
        const v = document.getElementById("partnerCount").value.trim();
        return v !== "";
      }
      default:
        return true;
    }
  }

  function isSelectFilled(selectId, customId, specialValue) {
    const sel = document.getElementById(selectId);
    if (!sel) return false;
    const val = sel.value;
    if (!val) return false;
    if (val === specialValue) {
      const custom = document.getElementById(customId);
      if (!custom) return false;
      return custom.value.trim().length > 0;
    }
    return true;
  }

  // ========== 下一步按钮 & 点击 ==========

  function updateNextButtonState() {
    const nextBtn = document.getElementById("nextBtn");
    if (!nextBtn || state.view === "final") return;
    const complete = isCurrentStepComplete();
    if (complete || state.view === "welcome") {
      nextBtn.classList.remove("btn-disabled");
    } else {
      nextBtn.classList.add("btn-disabled");
    }
  }

  function isCurrentStepComplete() {
    if (state.view === "welcome") return true;
    if (state.view === "basic") {
      return BASIC_FIELDS.every((f) => isBasicFieldFilled(f.key));
    }
    if (state.view === "category") {
      // 大类页不再做必填限制
      return true;
    }
    if (state.view === "final") return true;
    return false;
  }

  function onNextClick() {
    clearMessage();

    if (state.view === "welcome") {
      setView("basic");
      return;
    }

    if (state.view === "basic") {
      const missing = getBasicMissingFields();
      if (missing.length > 0) {
        showBasicMissingMessage(missing);
        return;
      }
      state.activeCategoryIndex = 0;
      setView("category");
      return;
    }

    if (state.view === "category") {
      // 不再校验是否全部填写，直接进入下一大类 / 最后一页
      if (state.activeCategoryIndex < categories.length - 1) {
        state.activeCategoryIndex += 1;
        setView("category");
      } else {
        setView("final");
      }
    }
  }

  function getBasicMissingFields() {
    const missing = [];
    BASIC_FIELDS.forEach((field) => {
      if (!isBasicFieldFilled(field.key)) missing.push(field.label);
    });
    return missing;
  }

  function showBasicMissingMessage(missingFields) {
    BASIC_FIELDS.forEach((field) => {
      const row = document.querySelector(`.basic-row[data-field="${field.key}"]`);
      if (!row) return;
      if (missingFields.includes(field.label)) {
        row.classList.add("field-error");
      } else {
        row.classList.remove("field-error");
      }
    });
    showMessage("以下信息尚未填写完整：" + missingFields.join("，"));
  }

  function clearBasicErrors() {
    document.querySelectorAll(".basic-row.field-error").forEach((row) => {
      row.classList.remove("field-error");
    });
    clearMessage();
  }

  // ========== 选项按钮 & 一键按钮 ==========

  function onOptionButtonClick(e) {
    const btn = e.target.closest(".option-btn");
    if (!btn) return;
    const group = btn.closest(".btn-group");
    if (!group) return;

    group.querySelectorAll(".option-btn").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");

    clearMessage();
  }

  function onBulkButtonClick(e) {
    const btn = e.target.closest(".bulk-btn");
    if (!btn || state.view !== "category") return;
    const type = btn.dataset.bulkType;
    const value = btn.dataset.bulkValue;
    const catIndex = state.activeCategoryIndex;

    const rows = document.querySelectorAll(
      `#itemsBody tr[data-item][data-category-index="${catIndex}"]`
    );
    rows.forEach((row) => {
      const group = row.querySelector(`.btn-group[data-type="${type}"]`);
      if (!group) return;
      const buttons = group.querySelectorAll(".option-btn");
      buttons.forEach((b) => b.classList.remove("selected"));
      buttons.forEach((b) => {
        if (b.dataset.value === value) b.classList.add("selected");
      });
    });

    clearMessage();
  }

  // ========== 读取基本信息 & 汇总结果 ==========

  function getBasicInfo() {
    const fillerName =
      (document.getElementById("fillerName").value || "").trim() || "（未填写）";
    const fillingDate =
      (document.getElementById("fillingDate")?.value || "").trim() || "（未填写）";
    const age =
      (document.getElementById("age").value || "").trim() || "（未填写）";
    const partnerCount =
      (document.getElementById("partnerCount").value || "").trim() || "（未填写）";

    const sex = readSelectWithCustom("sexSelect", "sexCustom", "自定义");
    const orientation = readSelectWithCustom(
      "orientationSelect",
      "orientationCustom",
      "其他"
    );
    const relationship = readSelectWithCustom(
      "relationshipSelect",
      "relationshipCustom",
      "其他"
    );

    return {
      fillerName,
      fillingDate,
      age,
      sex,
      orientation,
      relationship,
      partnerCount
    };
  }

  function readSelectWithCustom(selectId, customId, specialValue) {
    const sel = document.getElementById(selectId);
    const custom = document.getElementById(customId);
    if (!sel) return "（未填写）";
    const val = sel.value;
    if (!val) return "（未填写）";
    if (val === specialValue) {
      const txt = (custom && custom.value.trim()) || "";
      if (txt) return txt;
      return specialValue === "自定义"
        ? "自定义（未填写具体）"
        : "其他（未填写具体）";
    }
    return val;
  }

  function getCategoryItems(catIndex) {
    const result = [];
    const rows = document.querySelectorAll(
      `#itemsBody tr[data-item][data-category-index="${catIndex}"]`
    );
    rows.forEach((row) => {
      const itemName = row.dataset.item;
      const triedBtn = row.querySelector(
        '.btn-group[data-type="tried"] .option-btn.selected'
      );
      const levelBtn = row.querySelector(
        '.btn-group[data-type="level"] .option-btn.selected'
      );
      const roleBtn = row.querySelector(
        '.btn-group[data-type="role"] .option-btn.selected'
      );
      const tried = triedBtn ? triedBtn.dataset.value : "";
      const level = levelBtn ? levelBtn.dataset.value : "";
      const role = roleBtn ? roleBtn.dataset.value : "";
      result.push({ itemName, tried, level, role });
    });
    return result;
  }

  function getAllCategoryResults() {
    return categories.map((cat, idx) => ({
      title: cat.title,
      items: getCategoryItems(idx)
    }));
  }

  // ========== 文字结果（你指定的格式） ==========

  function generateTextResult() {
    const info = getBasicInfo();
    const lines = [];

    lines.push("BDSMchecklist（调查用）结果");
    lines.push("----------------------------");
    lines.push(`填表人：${info.fillerName}`);
    lines.push(`填表日期：${info.fillingDate}`);
    lines.push(`年龄：${info.age}`);
    lines.push(`生理性别：${info.sex}`);
    lines.push(`性取向：${info.orientation}`);
    lines.push(`感情状态：${info.relationship}`);
    lines.push(`性经历人数：${info.partnerCount}`);
    lines.push("");

    const levelTextMap = {
      "1": "非常不喜欢",
      "2": "没有乐趣",
      "3": "一般/还行",
      "4": "喜欢",
      "5": "非常享受"
    };

    const roleTextMap = {
      "主动": "作为主动对象",
      "被动": "作为被动对象",
      "双向": "作为双向角色",
      "都不想": "不想参与该项目"
    };

    const all = getAllCategoryResults();

    all.forEach((cat, idx) => {
      const shortTitle = getShortTitle(cat.title);
      if (idx > 0) lines.push("");
      lines.push(`[${shortTitle}]`);
      cat.items.forEach((item) => {
        const segs = [];
        if (item.tried === "是") segs.push("尝试过");
        else if (item.tried === "否") segs.push("未尝试");
        if (item.level && levelTextMap[item.level]) segs.push(levelTextMap[item.level]);
        if (item.role && roleTextMap[item.role]) segs.push(roleTextMap[item.role]);
        const desc = segs.length ? segs.join("；") : "（未填写）";
        lines.push(`${item.itemName}：${desc}`);
      });
    });

    const textArea = document.getElementById("textResult");
    const container = document.getElementById("textResultContainer");
    if (textArea && container) {
      textArea.value = lines.join("\n");
      container.classList.remove("hidden");
    }
  }

  // ========== “Excel结果”改为 CSV 内容，但文件名为 .xls ==========

  function csvEscape(str) {
    const s = String(str ?? "");
    if (/[",\r\n]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function generateExcelResult() {
    const info = getBasicInfo();
    const all = getAllCategoryResults();

    const rows = [];

    // 标题 + 基本信息
    rows.push(["BDSMchecklist（调查用）结果"]);
    rows.push([]);
    rows.push(["填表人", info.fillerName]);
    rows.push(["填表日期", info.fillingDate]);
    rows.push(["年龄", info.age]);
    rows.push(["生理性别", info.sex]);
    rows.push(["性取向", info.orientation]);
    rows.push(["感情状态", info.relationship]);
    rows.push(["性经历人数", info.partnerCount]);
    rows.push([]);
    // 明细表头
    rows.push(["大类", "项目", "是否尝试过", "喜欢程度", "角色"]);

    // 各大类明细（未填的用“未填写”）
    all.forEach((cat) => {
      const shortTitle = getShortTitle(cat.title);
      cat.items.forEach((item) => {
        const tried = item.tried || "未填写";
        const level = item.level || "未填写";
        const role = item.role || "未填写";
        rows.push([
          shortTitle,
          item.itemName,
          tried,
          level,
          role
        ]);
      });
    });

    const csvContent = rows
      .map((row) => row.map(csvEscape).join(","))
      .join("\r\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "BDSMchecklist_result.xls"; // 扩展名用 .xls，Excel 可以直接打开
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showMessage("Excel（CSV）文件已生成，Excel 打开时如果提示格式与扩展名不符，请选择“是”即可。");
  }

  // ========== 全局消息 ==========

  function showMessage(msg) {
    const el = document.getElementById("message");
    if (!el) return;
    el.textContent = msg || "";
  }

  function clearMessage() {
    showMessage("");
  }
})();
