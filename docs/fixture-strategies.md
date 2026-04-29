# Test Data — Fixture Strategies

When a test depends on a prerequisite NS record, avoid hardcoding internal IDs — they break after sandbox refreshes.

**Current PoC approach:** record creation is placed in the Arrange phase directly. Refactor to fixtures once multiple tests share the same prerequisite.

## Option A — Worker-scoped Fixture (fast, shared)

Creates the prerequisite record **once per worker** at startup. All tests in that worker share it.

```typescript
// tests/fixtures/projectFixture.ts
const test = baseTest.extend<{}, { sharedProjectId: string }>({
  sharedProjectId: [async ({ workerContext }, use) => {
    const page = await workerContext.newPage();
    const project = new ProjectRecord(page);
    await project.switchRole(ROLES.egProjectManager);
    await project.navigateToProject();
    await project.save();
    const id = new URL(page.url()).searchParams.get('id')!;
    await page.close();
    await use(id);
  }, { scope: 'worker' }],
});
```

| | |
|---|---|
| **Speed** | Fast — 1 record created per worker per run |
| **Isolation** | Tests share the record — mutation in one test affects others |
| **Use when** | "I need *a* project to create tasks against" |

## Option B — Factory Fixture (flexible, isolated)

Passes a factory function to the test. Each test gets its own fresh record.

```typescript
// tests/fixtures/projectFixture.ts
const test = baseTest.extend<{ createProject: (data: ProjectConfig) => Promise<string> }>({
  createProject: async ({ isolatedPage }, use) => {
    await use(async (data) => {
      const project = new ProjectRecord(isolatedPage);
      await project.switchRole(ROLES.egProjectManager);
      await project.navigateToProject();
      await project.save();
      return new URL(isolatedPage.url()).searchParams.get('id')!;
    });
  },
});
```

```typescript
test('task on Customer Project', async ({ createProject }) => {
  const projectId = await createProject(PROJECT_DATA.customerProject);
});
test('task on Internal Project', async ({ createProject }) => {
  const projectId = await createProject(PROJECT_DATA.internalAdmin);
});
```

| | |
|---|---|
| **Speed** | Slower — 1 record per test |
| **Isolation** | Full — each test gets its own record |
| **Use when** | "I need *this specific* project configuration" |

## Decision Guidance

| Scenario | Pattern |
|---|---|
| Test just needs any valid project | Worker-scoped fixture |
| Test needs a specific project config | Factory fixture |
| Test needs unique names/timestamps | Either pattern + `generateProjectName()` |
