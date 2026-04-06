# 🤝 Внески в проект

Дякуємо, що хочете допомогти! Ось як можна розвивати Google Marketing MCP.

## 🚀 Як почати

1. **Fork репозиторій**
   ```bash
   git clone https://github.com/YOUR_USERNAME/google-marketing-mcp.git
   cd google-marketing-mcp
   ```

2. **Встановіть залежності**
   ```bash
   npm install
   ```

3. **Налаштуйте `.env`**
   - Скопіюйте `.env.example` → `.env`
   - Заповніть свої Google API дані (див. [SETUP_GUIDE.md](./SETUP_GUIDE.md))

4. **Розробляйте**
   ```bash
   npm run dev      # TypeScript з автоперезавантаженням
   npm run lint     # Перевірка синтаксису
   npm run build    # Компіляція для production
   ```

---

## 📋 Процес внесення змін

### 1. Створіть Branch
```bash
git checkout -b feature/описание-功能
# або
git checkout -b fix/opisanie-bagu
```

**Формат назв:**
- `feature/add-x-function` — нова функція
- `fix/resolve-x-bug` — виправлення бага
- `docs/update-readme` — оновлення документації
- `refactor/improve-x-code` — рефакторинг

### 2. Робіть комміти

```bash
git add .
git commit -m "Опис змін (англійською)"
```

**Guldelines для комітів:**
- Використовуйте imperative mood ("add feature" не "added feature")
- Перша строка макс 50 символів
- Деталі у наступних строках (через пустий рядок)

Приклад:
```
Add support for Google Analytics goal tracking

- Implement getGoals() method
- Add goal filtering by type
- Include goal value calculation
```

### 3. Відправте Pull Request

```bash
git push origin feature/ваша-功能
```

Потім на GitHub натисніть "Create Pull Request"

**У PR-описі вказати:**
- ✅ Що змінилось?
- ✅ Як це тестувати?
- ✅ Які проблеми це вирішує?

---

## ✅ Вимоги до коду

### TypeScript
- Весь код повинен бути типобезпечним
- Використовуйте `strict: true` у tsconfig
- Додавайте типи для параметрів функцій і повернень

### Стиль
```typescript
// ✅ ДОБРЕ
async function getCampaignMetrics(campaignId: string): Promise<CampaignMetrics> {
  const campaign = await client.getCampaign(campaignId);
  return campaign.metrics;
}

// ❌ПОГАНО
function getCampaignMetrics(id: any) {
  return client.getCampaign(id).metrics;
}
```

### Перевірка перед отправкою
```bash
npm run lint        # Перевірка синтаксису
npm run build       # Компіляція
```

Не відправляйте PR якщо `npm run lint` показує помилки!

---

## 🐛 Як звітувати про баги

1. **Перевірте чи баг вже не був зареєстрований** — шукайте в Issues
2. **Відкрийте новий Issue** з описом:
   - 🔴 Що саме не працює?
   - 🔄 Як відтворити проблему? (кроки)
   - 📊 Очікуваний результат
   - 💻 Ваше оточення (OS, Node.js версія, тощо)

Приклад:
```markdown
### Проблема
При запуску `npm start` проект вилітає з помилкою: 
"GOOGLE_ADS_CUSTOMER_ID не знайдена"

### Як відтворити
1. Очистити .env
2. Скопіювати .env.example
3. Запустити npm start (без заповнення всіх змінних)

### Очікувано
Програма повинна вивести помилку з указанням яких змінних не вистачає

### Навколишнє середовище
- macOS 14.2
- Node.js 22.1.0
- npm 10.7.0
```

---

## 💡 Ідеї для внесків

### Легкі
- 📝 Поліпшення документації
- 🇺🇦 Переклади та локалізація
- 🎨 Оновлення стилів у HTML гайді
- ✅ Додавання прикладів використання

### Середні
- 🔧 Додавання нових функцій API
- 🧪 Написання тестів
- 📊 Поліпшення обробки помилок
- 🚀 Оптимізація продуктивності

### Складні
- 🏗️ Рефакторинг архітектури
- 📚 Інтеграція з новими Google APIs
- 🔐 Поліпшення системи безпеки
- 🤖 Додавання нових MCP функцій

---

## 🎓 Навчальні ресурси

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Google Ads API Guide](https://developers.google.com/google-ads/api/docs)
- [MCP Specification](https://modelcontextprotocol.io/)
- [Git Workflow](https://git-scm.com/book/en/v2/Git-Branching-Branching-Workflow)

---

## ❤️ Дякуємо!

Кожний внесок — це крок до кращого проекту. Спасибі за вашу допомогу!

Якщо у вас є питання — напишіть в Issues або зв'яжіться з мейнтейнерами.

---

**Made with ❤️ by the Google Marketing MCP community**
