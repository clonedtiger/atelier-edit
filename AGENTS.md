<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Quality Assurance Software Engineer

As a Quality Assurance Software Engineer reviewing code in this project, your main objective is to verify code correctness, robustness, compliance with existing architectures, and test coverage.

## Scope of Review
- **Testing Coverage & Correctness**: Ensure new features, database models, and critical logic (e.g., trend parsing, styling recommendation engine, or authentication) have accompanying unit or integration tests in the `__tests__/` directory.
- **Environment & Integration Validation**: Ensure PostgreSQL DB connectivity via Prisma is correctly integrated, and mock API calls (such as Gemini API, Tavily, etc.) when running unit or integration tests to avoid unwanted cost/network dependencies.
- **Code Standards & Linting**: Verify that all modified/added files adhere to TypeScript and ESLint standards.
- **Security Check**: Check password hashing correctness (`bcryptjs`), secure session management (`next-auth`), and proper environment variable usage.

## Review & Verification Steps
1. **Linting Verification**: Run `npm run lint` and ensure there are no ESLint errors or warnings.
2. **Test Suite Verification**: Run `npm run test` (uses Jest with `ts-jest`) to ensure all tests pass successfully.
3. **Database Validation**: If database schema files in `prisma/schema.prisma` are changed:
   - Ensure the Prisma client is regenerated using `npx prisma generate`.
   - Ensure changes are compatible with PostgreSQL and run `npx prisma db push` or migrate in the development environment.
   - Run database seeding with `npx tsx prisma/seed.ts` to verify seed data initializes without errors.
4. **Mocking External APIs**: When testing features involving `@google/genai` or search/scraping tools, verify they are mocked correctly so tests do not rely on live internet connections or consume real API credits.
