(() => {
    // 1) Находим GameManager (GM)
    let GM = null;
    for (const s of clicker.scene.scenes) {
        if (s.c && s.c.e) {
            GM = s.c;
            break;
        }
    }
    if (!GM) {
        console.error("[LS-UI] GM не найден");
        return;
    }

    // Если панель уже есть — не дублируем
    if (document.getElementById("ls-cheat-panel")) {
        console.log("[LS-UI] Панель уже существует");
        return;
    }

    // 2) Создаём панель
    const panel = document.createElement("div");
    panel.id = "ls-cheat-panel";
    panel.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 999999;
        background: rgba(10, 10, 20, 0.95);
        color: #fff;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 12px;
        padding: 10px;
        border-radius: 8px;
        box-shadow: 0 0 12px rgba(0,0,0,0.7);
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 170px;
    `;

    const title = document.createElement("div");
    title.textContent = "LS Debug UI";
    title.style.cssText = "font-weight:600;margin-bottom:4px;font-size:12px;text-align:center;";
    panel.appendChild(title);

    function addButton(label, onClick) {
        const btn = document.createElement("button");
        btn.textContent = label;
        btn.style.cssText = `
            padding: 4px 6px;
            border-radius: 4px;
            border: 1px solid #444;
            background: #222;
            color: #fff;
            cursor: pointer;
            font-size: 11px;
            text-align: left;
        `;
        btn.onmouseenter = () => (btn.style.background = "#333");
        btn.onmouseleave = () => (btn.style.background = "#222");
        btn.onclick = onClick;
        panel.appendChild(btn);
        return btn;
    }

    document.body.appendChild(panel);
    console.log("[LS-UI] Панель добавлена");

    // 3) Автокликер
    let autoClickInterval = null;
    addButton("Автоклик ON/OFF", () => {
        if (autoClickInterval) {
            clearInterval(autoClickInterval);
            autoClickInterval = null;
            console.log("[LS-UI] Автоклик выключен");
        } else {
            autoClickInterval = setInterval(() => {
                try {
                    GM.click();
                } catch (e) {
                    console.error("[LS-UI] Ошибка автоклика", e);
                }
            }, 20); // ~50 вызовов/сек
            console.log("[LS-UI] Автоклик включен");
        }
    });

    // 4) Клик x100 (перехват GM.click)
    addButton("Клик x100 ON/OFF", () => {
        if (!GM._origClick) {
            GM._origClick = GM.click.bind(GM);
            GM.click = function () {
                for (let i = 0; i < 100; i++) {
                    GM._origClick();
                }
                return true;
            };
            console.log("[LS-UI] Клик x100 активирован");
        } else {
            GM.click = GM._origClick;
            GM._origClick = null;
            console.log("[LS-UI] Клик x100 отключён (оригинал восстановлен)");
        }
    });

    // Вспомогательная функция: купить все апгрейды определённого типа
    async function buyAllUpgrades(type) {
        try {
            const items = GM.K(type); // type: 'click' | 'autoclick' | 'energy'
            if (!Array.isArray(items)) {
                console.warn("[LS-UI] GM.K вернул что-то странное для типа", type, items);
                return;
            }

            const upgrades = items.filter(it => it.isUpgrade && it.upgrade);
            console.log(`[LS-UI] Нашёл ${upgrades.length} апгрейдов типа '${type}'`);

            for (const item of upgrades) {
                const upg = item.upgrade;
                // Пока можно купить — жмём
                while (GM.n(upg)) {
                    console.log("[LS-UI] Покупаю", type, "lvl", upg.level, "price", upg.price);
                    try {
                        const ok = await GM.p0(upg);
                        if (!ok) break;
                    } catch (e) {
                        console.error("[LS-UI] Ошибка при покупке апгрейда", upg, e);
                        break;
                    }
                }
            }
            console.log(`[LS-UI] Покупка '${type}'-апгрейдов завершена`);
        } catch (e) {
            console.error("[LS-UI] Ошибка buyAllUpgrades(", type, ")", e);
        }
    }

    // 5) Кнопки апгрейдов
    addButton("Макс клики (апгрейды)", () => {
        (async () => {
            await buyAllUpgrades("click");
        })();
    });

    addButton("Макс автоклик (апгрейды)", () => {
        (async () => {
            await buyAllUpgrades("autoclick");
        })();
    });

    addButton("Макс энергия (апгрейды)", () => {
        (async () => {
            await buyAllUpgrades("energy");
        })();
    });

    // 6) Бонусы (легально, через v0)
    async function buyAllBonuses() {
        try {
            const items = GM.K("bonus");
            if (!Array.isArray(items)) {
                console.warn("[LS-UI] GM.K('bonus') вернул что-то странное", items);
                return;
            }
            const bonuses = items.filter(it => it.isBonus && it.bonus);
            console.log(`[LS-UI] Нашёл ${bonuses.length} бонусов`);

            for (const item of bonuses) {
                const bonus = item.bonus;
                // Пока сервер считает, что можно купить — покупаем
                while (GM.D(bonus)) {
                    console.log("[LS-UI] Покупаю бонус", bonus.name, "id", bonus.id);
                    const res = await GM.v0(bonus);
                    if (!res || !res.success) {
                        console.log("[LS-UI] Сервер не дал купить дальше", res);
                        break;
                    }
                }
            }
            console.log("[LS-UI] Покупка бонусов завершена");
        } catch (e) {
            console.error("[LS-UI] Ошибка buyAllBonuses", e);
        }
    }

    addButton("Купить все бонусы", () => {
        (async () => {
            await buyAllBonuses();
        })();
    });

    // 7) Лёгкий локальный буст (чисто пофаниться, может не сохраниться)
    addButton("+100k монет (локально)", () => {
        GM.e.coins += 100000;
        if (GM.emit) GM.emit("coins.changed", GM.e.coins);
        console.log("[LS-UI] Локально добавлено 100k coins, текущее:", GM.e.coins);
    });

})();
