# NetSuite Field Patterns

## Locator Priority

Always prefer stable NetSuite-native attributes that map directly to Field ID:

| Priority | Selector | Example | When |
|---|---|---|---|
| 1 | `[name="fieldId"]` | `[name="entity"]`, `[name="custentity_eg_chain"]` | Editable fields — standard and custom |
| 2 | `[data-field-name="fieldId"]` | `[data-field-name="entitystatus"]` | Read-only fields — wrapper `<div>` in view mode |
| 3 | `[id="fieldId_display"]` | `[id="entitystatus_display"]` | Fallback if `data-field-name` is absent |
| 4 | Text / XPath | `text="Save"` | Last resort — buttons without stable attributes |

- Never use CSS classes — they change on every NS upgrade (precedent: 2026.1)
- Field ID is the source of truth — find it via NS Field Help or NS Field Explorer
- Verify selectors in DevTools before writing a Page Object — do not assume

## Editable Text Fields

```typescript
await this.page.locator('[name="companyname"]').fill(name);
```

## Dropdown / Select / Lookup Fields

Standard `select()` or `fill()` often fails — NS dropdowns are driven by SuiteScript event handlers, not native `<select>` elements. Use `nlapiSetFieldValue` via `page.evaluate()`:

```typescript
async setJobType(value: string): Promise<void> {
  await this.page.evaluate(
    (v) => (globalThis as any).nlapiSetFieldValue('jobtype', v),
    value,
  );
}
```

Use this pattern for: list/record dropdowns (`jobtype`, `customform`), entity select fields (`projectmanager`, `department`), custom entity fields (`custentity_*`).

Always verify the **internal ID value** (not display label) in NS Field Help before passing as the argument.

## Item Sublist Line Population

NS sublist cells do **not** pre-render inputs in the DOM — they only exist when the cell is active. Never wait for or interact with `#item_description`, `#item_quantity`, `#item_rate` etc. as DOM elements.

**Item field** — `nlapiSetCurrentLineItemValue` crashes on `checkvalid` for the item field in certain roles (e.g. Billing Responsible). Use native Playwright type-ahead instead:

```typescript
const itemInput = this.page.locator('#item_item_display');
await itemInput.click();
await itemInput.pressSequentially(itemText, { delay: 50 });
await this.page.waitForLoadState('networkidle');
await this.page.keyboard.press('Tab');
await this.page.waitForFunction(
  () => { try { return !!(globalThis as any).nlapiGetCurrentLineItemValue('item', 'taxcode'); } catch { return false; } },
  { timeout: 15000 },
);
```

**Standard sublist fields** (description, quantity, rate, rev rec dates) — use `nlapiSetCurrentLineItemValue` with `firefieldchanged=true`, but stub `nlapiFieldChanged` first to prevent the SuiteScript `fieldChanged` callback from crashing:

```typescript
await this.page.evaluate((v) => {
  const g = globalThis as any;
  const orig = g.nlapiFieldChanged;
  g.nlapiFieldChanged = () => {};
  try {
    g.nlapiSetCurrentLineItemValue('item', 'quantity', v, true);
  } finally {
    g.nlapiFieldChanged = orig;
  }
}, value);
await this.page.waitForTimeout(1000);
```

**Custom segment fields (`cseg_*`)** — NS generates a global `Sync<fieldName>` function. Set the hidden input's value and `isvalid` flag, then call the Sync function with the stub pattern:

```typescript
await this.page.evaluate(({ field, sync, val }) => {
  const el = (globalThis as any).document.querySelector(`[name="${field}"]`);
  if (el) { el.value = val; el.isvalid = true; }
  const orig = (globalThis as any).nlapiFieldChanged;
  (globalThis as any).nlapiFieldChanged = () => {};
  try { (globalThis as any)[sync](true); }
  finally { (globalThis as any).nlapiFieldChanged = orig; }
}, { field: 'cseg_eg_main_prod', sync: 'Synccseg_eg_main_prod', val: id });
await this.page.waitForTimeout(1000);
```

**Hidden input fields** (e.g. department in the item sublist) — set the value directly and dispatch a `change` event:

```typescript
const el = document.querySelector('#hddn_item_department_fs');
if (el) { el.value = val; el.isvalid = true; el.dispatchEvent(new Event('change', { bubbles: true })); }
```

**`ensureFormInited()`** — must be called after every navigation or reload. Without it `canAddLine()` returns false and the Add button silently refuses to commit the line:

```typescript
await this.page.evaluate(() => (globalThis as any).NS?.form?.setInited?.(true));
```

**Committing the line** — flush pending events, call `ensureFormInited()`, click Add, then confirm via `nlapiGetLineItemCount`:

```typescript
await this.page.waitForLoadState('networkidle');
await this.page.waitForSelector('.ns-loading', { state: 'hidden' }).catch(() => {});
await this.ensureFormInited();
await this.page.locator('[name="item_addedit"]').click();
await this.page.waitForFunction(
  () => { try { return (globalThis as any).nlapiGetLineItemCount('item') >= 1; } catch { return false; } },
  { timeout: 30000 },
);
```

**Timing between setters** — each setter must be followed by `waitForTimeout(1000)`. `waitForLoadState('networkidle')` alone is insufficient because some NS internal callbacks are synchronous and do not generate network traffic.

## Verify Method Naming Convention

| Suffix | Mode | Mechanism | When to use |
|---|---|---|---|
| `verifyXxxPrepopulated` | Edit mode | `nlapiGetFieldValue` via `BasePage.verifyFieldValue` | Before `save()` — checks auto-populated values |
| `verifyXxx` | View mode | `[data-field-name="x"] [data-nsps-type="field_input"]` | After `save()` — checks saved values on read-only record |

Never mix the two. A `verifyXxx` locator will not resolve in edit mode, and `nlapiGetFieldValue` is not available in view mode.

```typescript
// Edit mode
async verifySubsidiaryPrepopulated(expected: string): Promise<void> {
  await this.verifyFieldValue('subsidiary', expected);
}

// View mode
async verifySubsidiary(expected: string): Promise<void> {
  await expect(
    this.page.locator('[data-field-name="subsidiary"] [data-nsps-type="field_input"]')
  ).toHaveText(expected);
}
```

In tests: `verifyXxxPrepopulated` appears in the **Act** phase; `verifyXxx` in the **Assert** phase.
