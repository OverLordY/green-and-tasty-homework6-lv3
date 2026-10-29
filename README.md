# Green & Tasty — ДЗ №6: Owner групового pre-order

Екран організатора групового бронювання на Angular: учасники та їхні кошики, спільне замовлення, Submit, синхронізація кожні 15 секунд і бонусне видалення гостя. Реалізація підключена до реального Owner API з [ДЗ №5](https://github.com/OverLordY/green-and-tasty-homework5).

## Запуск демо

Потрібні Node.js `^22.22.3` або `^24.15.0` та npm.

```bash
cd frontend/restaurant-frontend-app
npm ci
npm start
```

Відкрийте [демо-екран](http://localhost:4200/reservations/demo-reservation/group-order?demo). Цей режим використовує моки й не потребує AWS або реєстрації.

## Реальний API і стан рівня 3

У `src/environments/environment.development.ts` вказано адресу розгорнутого Owner API. Для реального бронювання екран використовує підписаний Cognito ID token; демо-токен не підходить. Запити Owner надсилають токен на захищені endpoint-и, а запити гостя не отримують токен Owner.

**Обмеження:** у навчальному архіві не було повного бекенду. Створений для ДЗ №5 бекенд підтримує Owner API, але не реалізує штатний вхід через `/signin`, створення бронювання та гостьове оформлення кошика. Тому повний наскрізний сценарій від реєстрації до дій гостя ще не завершено. Live-інтеграцію екрана перевірено на тестовому користувачі Cognito і заздалегідь підготовленій групі в DynamoDB.

## Перевірки

```bash
cd frontend/restaurant-frontend-app
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm run test:hw -- --browsers=ChromeHeadless
```

29.10.2026: 79/79 тестів домашнього завдання пройшли, перевірки TypeScript і production build успішні. Браузерний тест із Cognito, API Gateway, Lambda і DynamoDB підтвердив завантаження даних, оновлення через 15 секунд після видалення тестового гостя та Submit. Докладно — [звіт](docs/HOMEWORK-6-LEVEL-3.md).

## Структура

- `frontend/restaurant-frontend-app/` — застосунок, його тести та оригінальні тести домашнього завдання.
- `homework-frontend.md`, `practice-frontend.md` — умови та практичне завдання.
- `homework-design/` — надані макети.
- `docs/screenshots/` — скриншоти демо-режиму, а не live-інтеграції.
- `agents/` — інструкції для AI-агентів.

Великі JPEG-фотографії в копії для репозиторію оптимізовано для завантаження; оригінали в локальній папці навчального проєкту збережено.

AI допоміг реалізувати функціонал та виконати перевірки. Токени й паролі до репозиторію не додавалися.
