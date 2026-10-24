# СОВМЕСТНЫЙ ХЭНДОФФ: ANTIGRAVITY ➔ CLINE (DEEPSEEK)
> **Режим взаимодействия:** Antigravity = Анализ, Архитектура, Геометрия, QA, Тесты.  
> **Cline (DeepSeek) = Чистая реализация кода, строгая экономия токенов.**  
> *Инструкция для DeepSeek:* Пиши строго код и точечные диффы. Не трать токены на рассуждения и длинные приветствия. Все координаты, замеры высот и тесты уже посчитаны и проверены Antigravity.

---

## 1. СТАТУС ВЫПОЛНЕНИЯ (СПРИНТ: ПОСАДКА НА РЕЛЬЕФ) — ВСЁ ГОТОВО [100%]

Все 4 целевых файла выверены с точностью $\Delta \le 0.005$ м (норматив $\pm 0.05$ м). Ошибок компиляции 0, тесты 8/8 pass.

1. **`src/three/tractionSubstation110kVCad.ts`**:
   - `GROUND_Y = 6.5;` (высота плато ГПП-110 в `canyonLogic.ts`). Опоры, BESS, порталы сидят на плите $y = 6.50$ м.

2. **`src/three/quarryRoadSignage.ts`**:
   - Сигнатура: `createQuarrySafetySignage(mats, getGroundY?)`.
   - Знаки сдвинуты с проезжей части ($distXZ \ge 6.6$ м при полуширине асфальта 4.7 м).
   - Динамический сэмплер рельефа в цикле: `signGroup.position.set(x, gy, z)`.

3. **`src/three/quarryLightingAndPowerMasts.ts`**:
   - Мачты 6 и 7 смещены с дороги на обочины: `[-11.5, 15.5]` ($y = -13.08$ м) и `[24.5, -42]` ($y = 5.43$ м).
   - Пилоны ЛЭП-110 привязаны к грунту: $(75, -35) \to 16.60$ м, $(62, -12) \to 6.50$ м.
   - Катенария ЛЭП пересчитана от реальных высот `tower1.position.y` и `tower2.position.y`.
   - Салазки КРУН-6кВ перенесены в забой к ЭКГ-15: $(-8, -8) \to -15.46$ м ($distXZ = 18.0$ м).

4. **`src/three/sbsh250DrillingRigCad.ts`**:
   - Сигнатура: `createRealisticDrillingRigSBSH250(mats, position = [-42, -1.2, -26], getGroundY?)`.
   - Опорная плоскость гусениц: `root.position.set(gx, groundY - 0.35, gz)` (подошва тележек точно на грунте).
   - Кучка шлама поднята на уровень грунта: `cuttingsMoundMesh.position.set(0, 0.35, 2.2)`.

5. **`src/three/cadModels.ts`**:
   - Вызовы `createQuarrySafetySignage(mats, getCanyonGroundHeight)` и `createRealisticDrillingRigSBSH250(mats, [-42, -1.2, -26], getCanyonGroundHeight)` обновлены с явной передачей сэмплера.

6. **`src/domain/presentationTour.ts` & `src/App.tsx`**:
   - Исправлен баг «камера под землёй»: все 5 точек кинематического тура приведены к реальным координатам карьера (глубина дна $-15.5$ м, промплощадка $+6.0$ м, плато $+16.6$ м).
   - Внедрён фолбэк `currentTourStep.lookAt ?? currentTourStep.cameraLookAt`.

---

## 2. КОНТРОЛЬНЫЙ ЧЕК-ЛИСТ ДЛЯ СЛЕДУЮЩИХ ЗАДАЧ

Перед любым коммитом Cline достаточно запустить:
```bash
npx tsc --noEmit && npm test -- --run && node .qa/capture.mjs check
```
- `tsc --noEmit` должен выходить с кодом 0.
- `canyonLogic.test.ts` — 8 тестов pass.
- `.qa/check.json` — массив `exceptions` должен быть `[]`.
