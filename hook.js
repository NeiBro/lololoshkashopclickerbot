(() => {
    /* -------------------------------------
       1) НАХОДИМ GameManager (GM)
    ------------------------------------- */
    let GM = null;
    for (const s of clicker.scene.scenes) {
        if (s.c && s.c.e) {
            GM = s.c;
            break;
        }
    }
    if (!GM) {
        console.error("[LS-UI] Не удалось найти GameManager");
        return;
    }

    /* -------------------------------------
       2) ПРОВЕРКА: уже создана?
    ------------------------------------- */
    if (window.__LS_UI_ACTIVE__) {
        console.log("[LS-UI] UI уже открыт");
        return;
    }
    window.__LS_UI_ACTIVE__ = true;

    /* -------------------------------------
       3) СОЗДАЁМ ПАНЕЛЬ
    ------------------------------------- */
    const panel = document.createElement("div");
    panel.id = "ls-cheat-panel";
    panel.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 999999;
        background: rgba(10, 10, 20, 0.95);
        color: #fff;
        padding: 10px;
        border-radius: 8px;
        font-size: 12px;
        font-family: system-ui;
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 180px;
        cursor: default;
    `;

    let collapsed = false;

    /* -------------------------------------
       4) ПЕРЕТАСКИВАНИЕ ПАНЕЛИ
    ------------------------------------- */
    panel.onmousedown = (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") return;

        let shiftX = e.clientX - panel.getBoundingClientRect().left;
        let shiftY = e.clientY - panel.getBoundingClientRect().top;
        function move(e) {
            panel.style.left = e.pageX - shiftX + "px";
            panel.style.top = e.pageY - shiftY + "px";
            panel.style.right = "auto";
        }
        document.onmousemove = move;
        document.onmouseup = () => (document.onmousemove = null);
    };

    /* -------------------------------------
       5) СВЕРНУТЬ / РАЗВЕРНУТЬ
    ------------------------------------- */
    const collapseBtn = document.createElement("div");
    collapseBtn.textContent = "LS Debug UI ▼";
    collapseBtn.style.cssText = `
        font-weight: bold;
        text-align: center;
        margin-bottom: 4px;
        cursor: pointer;
    `;
    collapseBtn.onclick = () => {
        collapsed = !collapsed;
        collapseBtn.textContent = collapsed ? "LS Debug UI ▲" : "LS Debug UI ▼";
        content.style.display = collapsed ? "none" : "flex";
    };
    panel.appendChild(collapseBtn);

    const content = document.createElement("div");
    content.style.cssText = "display:flex;flex-direction:column;gap:6px;";
    panel.appendChild(content);

    /* -------------------------------------
       6) ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    ------------------------------------- */
    function addToggle(name, callback) {
        const wrap = document.createElement("div");
        wrap.style = "display:flex;justify-content:space-between;align-items:center;";
        const label = document.createElement("span");
        label.textContent = name;
        const toggle = document.createElement("input");
        toggle.type = "checkbox";
        toggle.onchange = (e) => callback(e.target.checked);
        wrap.appendChild(label);
        wrap.appendChild(toggle);
        content.appendChild(wrap);
        return toggle;
    }

    function addButton(label, onClick) {
        const btn = document.createElement("button");
        btn.textContent = label;
        btn.style.cssText = `
            padding: 4px;
            background:#222;
            color:#fff;
            border:1px solid #444;
            border-radius:4px;
            cursor:pointer;
            text-align:left;
        `;
        btn.onmouseenter = () => (btn.style.background = "#333");
        btn.onmouseleave = () => (btn.style.background = "#222");
        btn.onclick = onClick;
        content.appendChild(btn);
        return btn;
    }

    /* -------------------------------------
       7) Реалтайм статус сверху
    ------------------------------------- */
    const status = document.createElement("div");
    status.style.cssText = `
        background:#111;
        padding:5px;
        border-radius:4px;
        font-size:11px;
        line-height:14px;
        opacity:.9;
    `;
    content.appendChild(status);

    setInterval(() => {
        status.innerHTML = `
            Coins: ${GM.e.coins.toLocaleString()}<br>
            Energy: ${GM.e.energy} / ${GM.e.energyMax}<br>
            Click power: ${GM.e.clickPower}<br>
            Autoclick: ${GM.e.autoclickPower}/s
        `;
    }, 250);

    /* -------------------------------------
       8) АВТОКЛИКЕР
    ------------------------------------- */
    let autoClickInterval = null;
    addToggle("Autoclick", (enabled) => {
        if (enabled) {
            autoClickInterval = setInterval(() => GM.click(), 30);
        } else {
            clearInterval(autoClickInterval);
            autoClickInterval = null;
        }
    });

    /* -------------------------------------
       9) КЛИК ×100 (перехват GM.click)
    ------------------------------------- */
    addToggle("Click ×100", (enabled) => {
        if (enabled) {
            GM.__origClick = GM.click.bind(GM);
            GM.click = () => {
                for (let i = 0; i < 100; i++) GM.__origClick();
                return true;
            };
        } else if (GM.__origClick) {
            GM.click = GM.__origClick;
            GM.__origClick = null;
        }
    });

    /* -------------------------------------
       10) АПГРЕЙДЫ — ФУЛЛ АВТО ПОКУПКА
    ------------------------------------- */
    async function buyAllUpgrades(type) {
        try {
            // 1) Получаем список групп
            const groups = GM.K(type);
    
            if (!Array.isArray(groups)) {
                console.warn("[LS-UI] GM.K(", type, ") не дал группы:", groups);
                return;
            }
    
            console.log("[LS-UI] Найдено групп:", groups.length, "для", type);
    
            // 2) Обходим все группы по одной
            for (const groupItem of groups) {
                if (!groupItem.isUpgradeGroup || !groupItem.upgradeGroup) continue;
    
                const groupId = groupItem.upgradeGroup.id;
    
                // 3) Получаем конкретную группу с её апгрейдами
                const items = GM.K(type, groupId);
    
                const upgrades = items.filter(it => it.isUpgrade && it.upgrade);
    
                console.log(`[LS-UI] Группа ${groupId}: ${upgrades.length} апгрейдов`);
    
                // 4) Покупаем каждый апгрейд
                for (const item of upgrades) {
                    const upg = item.upgrade;
    
                    while (GM.n(upg)) {
                        console.log("[LS-UI] Покупка", type, "lvl", upg.level, "price", upg.price);
    
                        try {
                            const ok = await GM.p0(upg);
                            if (!ok) break;
                        } catch (err) {
                            console.error("[LS-UI] Ошибка при p0()", upg, err);
                            break;
                        }
                    }
                }
            }
    
            console.log("[LS-UI] Полное улучшение", type, "завершено");
    
        } catch (e) {
            console.error("[LS-UI] Ошибка buyAllUpgrades(", type, ")", e);
        }
    }

    addButton("Max Click upgrades", () => buyAllUpgrades("click"));
    addButton("Max Autoclick upgrades", () => buyAllUpgrades("autoclick"));
    addButton("Max Energy upgrades", () => buyAllUpgrades("energy"));

    
    /* -------------------------------------
       11) БОНУСЫ
    ------------------------------------- */
    async function buyAllBonuses() {
        const items = GM.K("bonus");
        const bonuses = items.filter(x => x.isBonus && x.bonus);

        for (const item of bonuses) {
            const bonus = item.bonus;
            while (GM.D(bonus)) {
                const result = await GM.v0(bonus);
                if (!result || !result.success) break;
            }
        }
    }

    addButton("Buy all bonuses", () => buyAllBonuses());

    /* -------------------------------------
       12) ГОТОВО
    ------------------------------------- */
    document.body.appendChild(panel);
    console.log("[LS-UI] Панель загружена");

})();
