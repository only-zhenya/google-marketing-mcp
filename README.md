# 🚀 Google Marketing MCP

**Комплексний MCP-агент для управління Google Ads, Google Analytics та Search Console.**

Дозволяє AI-агентам керувати рекламними кампаніями, аналізувати дані та оптимізувати маркетингові стратегії через Model Context Protocol (MCP).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
![Node.js](https://img.shields.io/badge/Node.js-22%2B-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7%2B-blue)

## 📋 Швидкий старт

### 1. Встановлення залежностей
```bash
npm install
```

### 2. Налаштування конфігурації

Див. детальну інструкцію: **[SETUP_GUIDE.md](./SETUP_GUIDE.md)**

Кратко:
- Створіть Google Ads Manager Account (MCC)
- Отримайте Developer Token
- Налаштуйте OAuth в Google Cloud Console
- Отримайте Refresh Token через OAuth Playground
- Заповніть файл `.env` з усіма змінними

### 3. Запуск проекту
```bash
npm start
```

---

## 📚 Документація

| Файл | Описання |
|------|---------|
| [SETUP_GUIDE.md](./SETUP_GUIDE.md) | Повний крок за кроком гайд налаштування Google Ads API |
| [SETUP_GUIDE.html](./SETUP_GUIDE.html) | HTML-версія гайду |
| [src/config/adsConfig.ts](./src/config/adsConfig.ts) | Конфігурація та валідація змінних середовища |

---

## 🔧 Вимоги до середовища

Створіть файл `.env` у кореня проекту з наступними змінними:

```env
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_REFRESH_TOKEN=
GOOGLE_ADS_CUSTOMER_ID=
GOOGLE_ADS_LOGIN_CUSTOMER_ID=
```

**Де отримати:**
- `CLIENT_ID` / `CLIENT_SECRET` → Google Cloud Console
- `DEVELOPER_TOKEN` → Google Ads Manager Account (MCC)
- `REFRESH_TOKEN` → OAuth 2.0 Playground
- `CUSTOMER_ID` → ваш рекламний кабінет
- `LOGIN_CUSTOMER_ID` → ваш MCC (опціонально)

---

## ⚠️ Важливо

Після зміни будь-якої змінної в `.env`, **перезапустіть** проект. Дані кешуються!

```bash
npm start
```

---

## ✨ Можливості

- ✅ **Google Ads API** — управління кампаніями, оголошеннями та бюджетами
- ✅ **Google Analytics (GA4)** — аналіз даних про відвідування та конверсії
- ✅ **Search Console API** — моніторинг пошукових запитів та впливу на індекс
- ✅ **Tag Manager API** — управління тегами та відстеженням
- ✅ **Model Context Protocol** — інтеграція з AI-агентами (Claude, інші)
- ✅ **Type-Safe** — весь код написаний на TypeScript
- ✅ **Environment Validation** — автоматична перевірка всіх змінних при запуску

---

## 📦 Структура проекту

```
google-marketing-mcp/
├── src/
│   ├── config/              # Конфігурація та середовище
│   ├── types/              # TypeScript типи
│   ├── services/           # API сервіси (Ads, Analytics, GSC)
│   └── main.ts            # Точка входу
├── dist/                   # Скомпільований код
├── .env.example           # Шаблон змінних середовища
├── SETUP_GUIDE.md         # Повна інструкція налаштування
├── SETUP_GUIDE.html       # HTML версія гайду
├── package.json
└── tsconfig.json
```

---

## 🛠️ Технічний стек

- **Runtime**: Node.js 22+
- **Language**: TypeScript 5.7+
- **APIs**: 
  - Google Ads API v17
  - Google Analytics Admin API
  - Google Search Console API
  - Google Tag Manager API
- **Protocol**: Model Context Protocol (MCP)
- **Validation**: Zod
- **Auth**: OAuth 2.0

---

## 🔐 Безпека

⚠️ **ВАЖЛИВО:**
- Ніколи не публікуйте `.env` файл з реальними токенами
- Використовуйте `.env.example` як шаблон
- Усі секретні дані повинні зберігатись тільки локально
- `.gitignore` автоматично захищає від закомітування `.env`

---

## 🤝 Внески

Якщо ви знайшли баг або маєте ідеї для покращення — відкрийте Issue або Pull Request!

---

## 📄 Ліцензія

MIT License — див. [LICENSE](./LICENSE)

---

## 🚀 Корисні посилання

- [Google Ads API Documentation](https://developers.google.com/google-ads/api/docs)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
- [Google Analytics Documentation](https://developers.google.com/analytics/devguides)
- [Search Console API](https://developers.google.com/webmaster-tools/search-console-api)

---

## ❓ Проблеми?

1. **Перевірте [SETUP_GUIDE.md](./SETUP_GUIDE.md)** — там детальна інструкція
2. **Запустіть `npm run lint`** — перевірка синтаксису
3. **Перезапустіть проект** — після змін у `.env` дані кешуються
4. **Відкрийте Issue** — якщо ви знайшли баг

---

Made with ❤️ for AI-driven marketing automation
