# Quick Inventory

Система управления складом. Django бэкенд + React.

```
QuickInventory/
├── backend/       ← Django (API, база данных)
├── frontend/      ← React (интерфейс)
└── README.md
```

---

### 1. Бэкенд (Django)

```bash
cd backend

# Создать виртуальное окружение
python -m venv venv

# Активировать:
# Windows:
venv\Scripts\activate

# Установить зависимости
pip install -r requirements.txt

# Применить миграции
python manage.py migrate

# Создать суперпользователя
python manage.py createsuperuser

# Запустить сервер
python manage.py runserver
```

> После запуска зайдите в http://localhost:8000/admin/ и установите поле **role = manager** для своего пользователя.

---

### 2. Фронтенд (React)

Откройте **новый терминал**:

```bash
cd frontend

#Устанавливаем 18ую версию React:
npm install react@18 react-dom@18 

npm install

npm start
```

> Откроется http://localhost:3000

---

## 🔑 Вход

Используйте логин/пароль, созданный командой `createsuperuser`.

---

## 📡 API

Все REST-эндпоинты доступны по `/api/v2/`:

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/v2/auth/login/` | Вход |
| POST | `/api/v2/auth/signup/` | Регистрация |
| GET | `/api/v2/products/` | Товары |
| POST | `/api/v2/sales/` | Записать продажу |
| GET | `/api/v2/dashboard/` | Статистика |
| POST | `/api/v2/sales/close-day/` | Закрыть день |

Старые QrBot-эндпоинты `/api/scans/` тоже работают.

---

## 🌐 Другой IP (локальная сеть)

```bash
# backend — слушать все интерфейсы
python manage.py runserver 0.0.0.0:8000
```

Измените `frontend/.env`:
```
REACT_APP_API_URL=http://192.168.X.X:8000
```
