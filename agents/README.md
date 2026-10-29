# Agent workflow — EPAM Marathon #5 and #6

Run these instruction files as separate AI tasks or delegated agents in this repository. They are Markdown task instructions, not executable programs.

1. analyst.md — read requirements and establish contracts.
2. frontend.md — implement practice, levels 1–2; then synchronization and Remove Guest after verification.
3. backend.md — implement workshop #5 against homework-backend.md, using frontend mocks as examples only.
4. tester.md — independently review and execute supplied tests; report evidence and integration gaps.

Source of truth: homework-backend.md, homework-frontend.md, practice-frontend.md and homework-design/README.md. Frontend coding rules: frontend/restaurant-frontend-app/CLAUDE.md. Where generic historical notes conflict with the homework, follow the homework and actual configuration.

Do not add email verification, reminders, guest-cart editing or unrelated features. Do not modify provided homework-tests to make failures pass. Do not deploy, change AWS resources or publish without explicit authorization for that step. Never expose secrets. Keep a factual report of checks and limitations.
