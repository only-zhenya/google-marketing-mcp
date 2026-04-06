# ⚡ Швидкий старт за 5 хвилин

Якщо у вас уже є всі Google API токени — цей гайд для вас.

## 1️⃣ Клонуйте репозиторій

```bash
git clone https://github.com/YOUR_USERNAME/google-marketing-mcp.git
cd google-marketing-mcp
```

## 2️⃣ Встановіть залежності

```bash
npm install
```

## 3️⃣ Налаштуйте `.env`

Скопіюйте `.env.example`:
```bash
cp .env.example .env
```

Потім заповніть своїми даними:
```env
GOOGLE_ADS_CLIENT_ID="ваш_ід"
GOOGLE_ADS_CLIENT_SECRET="ваш_секрет"
GOOGLE_ADS_DEVELOPER_TOKEN="ваш_девелопер_токен"
GOOGLE_ADS_REFRESH_TOKEN="ваш_рефреш_токен"
GOOGLE_ADS_CUSTOMER_ID="ваш_customer_id"
GOOGLE_ADS_LOGIN_CUSTOMER_ID="ваш_mcc_id"  # опціонально
```

**Де отримати дані?** → Див. [SETUP_GUIDE.md](./SETUP_GUIDE.md)

## 4️⃣ Запустіть проект

```bash
npm start
```

Мають вивести логи конфігурації:
```
🔧 Google Ads Config:
   Developer Token : xxxx****xxxx
   Client ID       : xxxx****xxxx
   ...
```

✅ **Готово!** Проект працює.

---

## 🔨 Корисні команди

```bash
npm start              # Запуск проекту
npm run dev           # Розробка з автоперезавантаженням
npm run build         # Компіляція TypeScript
npm run lint          # Перевірка синтаксису
```

---

## ⚠️ Типові помилки

### ❌ `GOOGLE_ADS_DEVELOPER_TOKEN not found`
**Рішення:** Перевірте що `.env` файл існує й заповнений. Перезапустіть проект.

### ❌ `oauth2: invalid_grant`
**Рішення:** Refresh Token протерміновано. Отримайте новий через [OAuth Playground](https://developers.google.com/oauthplayground/).

### ❌ Помилка 403 при авторизації
**Рішення:** У Google Cloud Console добавте свій email у "Test Users" (OAuth Consent Screen).

---

## 📚 Далі

- 📖 [Повна документація](./SETUP_GUIDE.md)
- 🤝 [Як внести вклад](./CONTRIBUTING.md)
- 🚀 [Google Ads API Docs](https://developers.google.com/google-ads/api/docs)

---

## 🆘 Потрібна допомога?

1. Прочитайте [SETUP_GUIDE.md](./SETUP_GUIDE.md)
2. Перевірте [Issues на GitHub](https://github.com/YOUR_USERNAME/google-marketing-mcp/issues)
3. Відкрийте новий Issue з описом проблеми

---

**Що далі?** → Інтегруйте з Claude, ChatGPT або іншим AI-агентом через MCP! 🤖
