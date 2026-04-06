# 🚀 Google Ads API + MCP: Повний гайд підключення

Ця інструкція проведе вас від створення порожнього акаунта до працюючого AI-агента, який керує рекламою.

## Крок 1: Фундамент (Акаунти)

Звичайний рекламний кабінет не підійде. Потрібен менеджерський хаб.

### Створіть Google Ads Manager Account (MCC)

Перейдіть на [Google Ads Manager Accounts](https://ads.google.com/home/tools/manager-accounts/)

**Важливо:** Запишіть свій 10-значний ID (наприклад, `123-456-7890`). Це ваш `LOGIN_CUSTOMER_ID`.

### Отримайте Developer Token

1. Зайдіть у ваш MCC
2. Перейдіть у **Tools → Settings → API Center**
3. Заповніть анкету
4. Google видасть токен миттєво
5. Це ваш `DEVELOPER_TOKEN`

---

## Крок 2: Google Cloud Console

Створюємо технічну "оболонку" для вашого додатка.

### Створіть проект

[Створити проект у Cloud Console](https://console.cloud.google.com/projectcreate)

### Увімкніть необхідні API

Активуйте ці 4 сервіси в [API Library](https://console.cloud.google.com/apis/library):

- ✅ **Google Ads API**
- ✅ **Google Search Console API**
- ✅ **Google Analytics Data API**
- ✅ **Tag Manager API**

### OAuth Consent Screen

1. Налаштуйте як **"External"**
2. **Критично:** У розділі "Test Users" додайте свій Gmail (без цього буде помилка 403)

### Створіть Credentials

1. Тип: **Web application**
2. URI перенаправлення (Redirect URI): `https://developers.google.com/oauthplayground`
3. Збережіть `CLIENT_ID` та `CLIENT_SECRET`

---

## Крок 3: Магія OAuth 2.0 Playground

Тут ми отримуємо "вічний" доступ (Refresh Token).

1. Зайдіть на [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)

2. Натисніть **⚙️ (Settings)** праворуч:
   - Поставте галочку "Use your own OAuth credentials"
   - Введіть свої Client ID та Client Secret

3. У полі **"Input your own scopes"** (Step 1) вставте через пробіл:
   ```
   https://www.googleapis.com/auth/adwords https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/tagmanager.edit
   ```

4. Натисніть **Authorize APIs** та підтвердіть доступ у вікні Google

5. У Step 2 натисніть **Exchange authorization code for tokens**

6. **Копіюйте Refresh token!** Він починається на `1//...`

---

## Крок 4: Налаштування середовища (.env)

Зберіть усі дані у файлі `.env` у кореня проекту:

```env
GOOGLE_ADS_CLIENT_ID="ваш_ід"
GOOGLE_ADS_CLIENT_SECRET="ваш_секрет"
GOOGLE_ADS_DEVELOPER_TOKEN="ваш_девелопер_токен"
GOOGLE_ADS_REFRESH_TOKEN="ваш_рефреш_токен"
GOOGLE_ADS_LOGIN_CUSTOMER_ID="ваш_mcc_id"
GOOGLE_ADS_CUSTOMER_ID="ід_рекламного_кабінету_сайту"
```

### Відповідність змінних

Ці змінні автоматично зчитуються у `src/config/adsConfig.ts` та валідуються при запуску проекту:

| Змінна | Опис | Обов'язкова |
|--------|------|-----------|
| `GOOGLE_ADS_CLIENT_ID` | OAuth Client ID з Google Cloud | ✅ Так |
| `GOOGLE_ADS_CLIENT_SECRET` | OAuth Client Secret з Google Cloud | ✅ Так |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Developer Token з Google Ads MCC | ✅ Так |
| `GOOGLE_ADS_REFRESH_TOKEN` | Refresh Token з OAuth Playground | ✅ Так |
| `GOOGLE_ADS_CUSTOMER_ID` | ID вашого рекламного кабінету | ✅ Так |
| `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | ID вашого MCC (якщо відрізняється) | ⚠️ Опціонально |

---

## ⚠️ Важливо

Якщо ви змінили будь-який токен, **обов'язково повністю перезапустіть**:
- Claude Desktop, або
- ваш локальний MCP-сервер

Дані кешуються, тому зміни не відбудуться без перезавантаження.

---

## ✅ Перевірка налаштування

Запустіть проект:
```bash
npm start
```

Мають вивести маскировані дані без помилок про відсутні змінні:
```
🔧 Google Ads Config:
   Developer Token : xxxx****xxxx
   Client ID       : xxxx****xxxx
   Client Secret   : xxxx****xxxx
   Refresh Token   : xxxx****xxxx
   Customer ID     : 1234567890
   Login Cust. ID  : (не задано)
```

Якщо бачите помилки, перевірте наявність всіх змінних у `.env` файлі та перезапустіть програму.

---

## 🔗 Корисні посилання

- [Google Ads API Docs](https://developers.google.com/google-ads/api/docs)
- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
- [MCP Documentation](https://modelcontextprotocol.io/)
