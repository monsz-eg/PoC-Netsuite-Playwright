# CI/CD — Session Generation in GitHub Actions

Session files are gitignored and must be generated dynamically on every CI run.

## Steps to Implement

1. Add `NSTEST1_PASSWORD`, `NSTEST2_PASSWORD`, `NSTEST3_PASSWORD` as **GitHub Secrets** (repo Settings → Secrets and variables → Actions).

2. Create a `global-setup.ts` that runs the `setup-auth.ts` logic before the test suite.

3. Register it in `playwright.config.ts`:
   ```typescript
   globalSetup: './scripts/setup-auth.ts'
   ```

4. In `.github/workflows/playwright.yml`, expose the secrets as environment variables:
   ```yaml
   env:
     NSTEST1_PASSWORD: ${{ secrets.NSTEST1_PASSWORD }}
     NSTEST2_PASSWORD: ${{ secrets.NSTEST2_PASSWORD }}
     NSTEST3_PASSWORD: ${{ secrets.NSTEST3_PASSWORD }}
   ```
