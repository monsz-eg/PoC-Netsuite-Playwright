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
