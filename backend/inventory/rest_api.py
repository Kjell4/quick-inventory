"""
REST API для Quick Inventory — интеграция с React фронтендом
=============================================================
Endpoints:
  POST /api/auth/login/         — вход (возвращает JWT токены)
  POST /api/auth/signup/        — регистрация
  POST /api/auth/refresh/       — обновить access token
  GET  /api/auth/me/            — данные текущего пользователя

  GET  /api/products/           — список товаров
  POST /api/products/           — создать товар (manager only)
  GET  /api/products/<id>/      — один товар
  PUT  /api/products/<id>/      — обновить товар (manager only)
  DELETE /api/products/<id>/    — удалить товар (manager only)

  GET  /api/sales/              — продажи (сегодня по умолчанию)
  POST /api/sales/              — записать продажу
  GET  /api/sales/today/        — сегодняшние продажи
  POST /api/sales/close-day/    — закрыть день

  GET  /api/dashboard/          — статистика для дашборда
  GET  /api/categories/         — список категорий
"""

import json
from datetime import date, timedelta

from django.contrib.auth import authenticate
from django.db.models import F, Sum
from django.http import JsonResponse
from django.utils.timezone import now
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import Category, ClosedDay, CustomUser, DailySale, Product


# ─────────────────────────────────────────────────────────────────
#  JWT helpers  (простая реализация без PyJWT зависимости)
# ─────────────────────────────────────────────────────────────────
import base64
import hashlib
import hmac
import time

SECRET = "quick-inventory-jwt-secret-2024"


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(s: str) -> bytes:
    padding = 4 - len(s) % 4
    return base64.urlsafe_b64decode(s + "=" * padding)


def create_token(user_id: int, exp_seconds: int = 3600 * 24) -> str:
    header = _b64url(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = _b64url(json.dumps({
        "sub": str(user_id),
        "exp": int(time.time()) + exp_seconds,
    }).encode())
    sig_input = f"{header}.{payload}".encode()
    sig = _b64url(hmac.new(SECRET.encode(), sig_input, hashlib.sha256).digest())
    return f"{header}.{payload}.{sig}"


def verify_token(token: str):
    """Returns user_id (int) or raises ValueError."""
    try:
        header, payload, sig = token.split(".")
    except ValueError:
        raise ValueError("Bad token format")

    sig_input = f"{header}.{payload}".encode()
    expected_sig = _b64url(hmac.new(SECRET.encode(), sig_input, hashlib.sha256).digest())
    if not hmac.compare_digest(sig, expected_sig):
        raise ValueError("Invalid signature")

    data = json.loads(_b64url_decode(payload))
    if data["exp"] < time.time():
        raise ValueError("Token expired")
    return int(data["sub"])


def get_user_from_request(request):
    """Extract & verify Bearer token, return CustomUser or None."""
    auth = request.META.get("HTTP_AUTHORIZATION", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[7:]
    try:
        user_id = verify_token(token)
        return CustomUser.objects.get(id=user_id)
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────────
#  CORS + JSON helpers
# ─────────────────────────────────────────────────────────────────
def json_response(data, status=200):
    resp = JsonResponse(data, status=status, json_dumps_params={"ensure_ascii": False})
    resp["Access-Control-Allow-Origin"] = "*"
    resp["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    resp["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return resp


def parse_body(request):
    try:
        return json.loads(request.body)
    except Exception:
        return {}


def require_auth(request):
    """Returns (user, None) or (None, error_response)."""
    user = get_user_from_request(request)
    if not user:
        return None, json_response({"error": "Необходима авторизация"}, 401)
    return user, None


# ─────────────────────────────────────────────────────────────────
#  AUTH
# ─────────────────────────────────────────────────────────────────
@csrf_exempt
def auth_login(request):
    if request.method == "OPTIONS":
        return json_response({})

    if request.method != "POST":
        return json_response({"error": "Только POST"}, 405)

    data = parse_body(request)
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    if not username or not password:
        return json_response({"error": "username и password обязательны"}, 400)

    user = authenticate(request, username=username, password=password)
    if not user:
        return json_response({"error": "Неверный логин или пароль"}, 401)

    access_token = create_token(user.id, 3600 * 24)        # 24 ч
    refresh_token = create_token(user.id, 3600 * 24 * 30)  # 30 дней

    return json_response({
        "access": access_token,
        "refresh": refresh_token,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "first_name": user.first_name,
            "last_name": user.last_name,
        }
    })


@csrf_exempt
def auth_signup(request):
    if request.method == "OPTIONS":
        return json_response({})

    if request.method != "POST":
        return json_response({"error": "Только POST"}, 405)

    data = parse_body(request)
    username   = data.get("username", "").strip()
    password   = data.get("password", "").strip()
    email      = data.get("email", "").strip()
    first_name = data.get("first_name", "").strip()
    last_name  = data.get("last_name", "").strip()
    role       = data.get("role", "seller").lower()

    if not username or not password:
        return json_response({"error": "username и password обязательны"}, 400)

    if CustomUser.objects.filter(username=username).exists():
        return json_response({"error": "Пользователь с таким именем уже существует"}, 409)

    if role not in ("manager", "seller"):
        role = "seller"

    user = CustomUser.objects.create_user(
        username=username,
        password=password,
        email=email,
        first_name=first_name,
        last_name=last_name,
        role=role,
    )

    access_token = create_token(user.id, 3600 * 24)
    refresh_token = create_token(user.id, 3600 * 24 * 30)

    return json_response({
        "access": access_token,
        "refresh": refresh_token,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "first_name": user.first_name,
            "last_name": user.last_name,
        }
    }, 201)


@csrf_exempt
def auth_refresh(request):
    if request.method == "OPTIONS":
        return json_response({})

    if request.method != "POST":
        return json_response({"error": "Только POST"}, 405)

    data = parse_body(request)
    token = data.get("refresh", "")
    try:
        user_id = verify_token(token)
        user = CustomUser.objects.get(id=user_id)
    except Exception:
        return json_response({"error": "Недействительный refresh токен"}, 401)

    new_access = create_token(user.id, 3600 * 24)
    return json_response({"access": new_access})


@csrf_exempt
def auth_me(request):
    if request.method == "OPTIONS":
        return json_response({})

    user, err = require_auth(request)
    if err:
        return err

    return json_response({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "first_name": user.first_name,
        "last_name": user.last_name,
    })


# ─────────────────────────────────────────────────────────────────
#  PRODUCTS
# ─────────────────────────────────────────────────────────────────
def _product_dict(p):
    return {
        "id": p.id,
        "name": p.name,
        "description": p.description or "",
        "category": p.category.name if p.category else "",
        "category_id": p.category_id,
        "quantity": p.quantity,
        "purchase_price": float(p.purchase_price),
        "sale_price": float(p.sale_price),
        "barcode": p.barcode or "",
    }


@csrf_exempt
def products_list(request):
    if request.method == "OPTIONS":
        return json_response({})

    user, err = require_auth(request)
    if err:
        return err

    if request.method == "GET":
        search = request.GET.get("search", "")
        category = request.GET.get("category", "")
        qs = Product.objects.select_related("category").all()
        if search:
            qs = qs.filter(name__icontains=search)
        if category:
            qs = qs.filter(category__name__icontains=category)
        return json_response({"products": [_product_dict(p) for p in qs]})

    if request.method == "POST":
        if user.role != "manager":
            return json_response({"error": "Только менеджеры могут добавлять товары"}, 403)

        data = parse_body(request)
        name           = data.get("name", "").strip()
        category_name  = data.get("category", "").strip()
        quantity       = int(data.get("quantity", 0))
        purchase_price = float(data.get("purchase_price", 0))
        sale_price     = float(data.get("sale_price", 0))
        description    = data.get("description", "")
        barcode        = data.get("barcode", "").strip() or None

        if not name:
            return json_response({"error": "name обязателен"}, 400)
        if not category_name:
            return json_response({"error": "category обязателен"}, 400)

        category, _ = Category.objects.get_or_create(name=category_name)

        if barcode and Product.objects.filter(barcode=barcode).exists():
            return json_response({"error": "Товар с таким баркодом уже существует"}, 409)

        product = Product.objects.create(
            name=name,
            category=category,
            quantity=quantity,
            purchase_price=purchase_price,
            sale_price=sale_price,
            description=description,
            barcode=barcode,
        )
        return json_response(_product_dict(product), 201)

    return json_response({"error": "Метод не поддерживается"}, 405)


@csrf_exempt
def product_detail(request, product_id):
    if request.method == "OPTIONS":
        return json_response({})

    user, err = require_auth(request)
    if err:
        return err

    try:
        product = Product.objects.select_related("category").get(id=product_id)
    except Product.DoesNotExist:
        return json_response({"error": "Товар не найден"}, 404)

    if request.method == "GET":
        return json_response(_product_dict(product))

    if request.method in ("PUT", "PATCH"):
        if user.role != "manager":
            return json_response({"error": "Только менеджеры могут редактировать товары"}, 403)

        data = parse_body(request)

        if "name" in data:
            product.name = data["name"]
        if "description" in data:
            product.description = data["description"]
        if "quantity" in data:
            product.quantity = int(data["quantity"])
        if "purchase_price" in data:
            product.purchase_price = float(data["purchase_price"])
        if "sale_price" in data:
            product.sale_price = float(data["sale_price"])
        if "barcode" in data:
            barcode = data["barcode"].strip() or None
            if barcode and Product.objects.filter(barcode=barcode).exclude(id=product_id).exists():
                return json_response({"error": "Товар с таким баркодом уже существует"}, 409)
            product.barcode = barcode
        if "category" in data:
            cat_name = data["category"].strip()
            if cat_name:
                category, _ = Category.objects.get_or_create(name=cat_name)
                product.category = category

        product.save()
        return json_response(_product_dict(product))

    if request.method == "DELETE":
        if user.role != "manager":
            return json_response({"error": "Только менеджеры могут удалять товары"}, 403)
        product.delete()
        return json_response({"success": True})

    return json_response({"error": "Метод не поддерживается"}, 405)


# ─────────────────────────────────────────────────────────────────
#  SALES
# ─────────────────────────────────────────────────────────────────
def _sale_dict(s):
    return {
        "id": s.id,
        "product_id": s.product_id,
        "product_name": s.product.name,
        "quantity": s.quantity,
        "total_price": float(s.total_price),
        "sale_date": str(s.sale_date),
        "is_closed": s.is_closed,
    }


@csrf_exempt
def sales_list(request):
    if request.method == "OPTIONS":
        return json_response({})

    user, err = require_auth(request)
    if err:
        return err

    if request.method == "GET":
        sale_date_str = request.GET.get("date", str(date.today()))
        try:
            sale_date = date.fromisoformat(sale_date_str)
        except ValueError:
            sale_date = date.today()

        qs = DailySale.objects.select_related("product").filter(sale_date=sale_date)
        sales = [_sale_dict(s) for s in qs]
        total = sum(s["total_price"] for s in sales)
        return json_response({"sales": sales, "total": total, "date": str(sale_date)})

    if request.method == "POST":
        data = parse_body(request)
        product_id = data.get("product_id")
        quantity   = int(data.get("quantity", 1))

        if not product_id:
            return json_response({"error": "product_id обязателен"}, 400)

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return json_response({"error": "Товар не найден"}, 404)

        if product.quantity < quantity:
            return json_response({"error": f"Недостаточно товара. На складе: {product.quantity}"}, 400)

        product.quantity -= quantity
        product.save()

        total = product.sale_price * quantity
        sale = DailySale.objects.create(
            product=product,
            quantity=quantity,
            total_price=total,
            sale_date=date.today(),
        )
        return json_response(_sale_dict(sale), 201)

    return json_response({"error": "Метод не поддерживается"}, 405)


@csrf_exempt
def sales_today(request):
    if request.method == "OPTIONS":
        return json_response({})

    user, err = require_auth(request)
    if err:
        return err

    today = date.today()
    qs = DailySale.objects.select_related("product").filter(sale_date=today, is_closed=False)
    sales = [_sale_dict(s) for s in qs]
    total = sum(s["total_price"] for s in sales)
    return json_response({"sales": sales, "total": total, "date": str(today)})


@csrf_exempt
def sale_delete(request, sale_id):
    if request.method == "OPTIONS":
        return json_response({})

    user, err = require_auth(request)
    if err:
        return err

    if user.role != "manager":
        return json_response({"error": "Только менеджеры могут удалять продажи"}, 403)

    try:
        sale = DailySale.objects.select_related("product").get(id=sale_id)
    except DailySale.DoesNotExist:
        return json_response({"error": "Продажа не найдена"}, 404)

    # Вернуть товар на склад
    sale.product.quantity += sale.quantity
    sale.product.save()
    sale.delete()
    return json_response({"success": True})


@csrf_exempt
def close_day(request):
    if request.method == "OPTIONS":
        return json_response({})

    user, err = require_auth(request)
    if err:
        return err

    if user.role != "manager":
        return json_response({"error": "Только менеджеры могут закрывать день"}, 403)

    if request.method != "POST":
        return json_response({"error": "Только POST"}, 405)

    today = date.today()
    open_sales = DailySale.objects.select_related("product").filter(sale_date=today, is_closed=False)

    if not open_sales.exists():
        return json_response({"error": "Нет открытых продаж за сегодня"}, 400)

    total_income = float(open_sales.aggregate(
        t=Sum(F("quantity") * F("product__sale_price"))
    )["t"] or 0)

    total_cost = float(open_sales.aggregate(
        t=Sum(F("quantity") * F("product__purchase_price"))
    )["t"] or 0)

    total_profit = total_income - total_cost

    closed_day = ClosedDay.objects.create(
        date=today,
        total_income=total_income,
        total_profit=total_profit,
    )

    open_sales.update(is_closed=True, closed_day=closed_day)

    return json_response({
        "success": True,
        "closed_day": {
            "id": closed_day.id,
            "date": str(closed_day.date),
            "total_income": float(closed_day.total_income),
            "total_profit": float(closed_day.total_profit),
        }
    })


# ─────────────────────────────────────────────────────────────────
#  DASHBOARD
# ─────────────────────────────────────────────────────────────────
@csrf_exempt
def dashboard_stats(request):
    if request.method == "OPTIONS":
        return json_response({})

    user, err = require_auth(request)
    if err:
        return err

    today = date.today()
    start_of_month = today.replace(day=1)

    monthly_sales = DailySale.objects.select_related("product").filter(
        sale_date__gte=start_of_month
    )

    total_income = float(monthly_sales.aggregate(
        t=Sum(F("quantity") * F("product__sale_price"))
    )["t"] or 0)

    total_expenses = float(monthly_sales.aggregate(
        t=Sum(F("quantity") * F("product__purchase_price"))
    )["t"] or 0)

    total_profit = total_income - total_expenses

    # Сегодняшние продажи для таблицы
    today_sales = DailySale.objects.select_related("product").filter(
        sale_date=today
    ).order_by("-id")[:10]

    low_stock = Product.objects.filter(quantity__lt=10).count()
    total_products = Product.objects.count()

    return json_response({
        "total_income": total_income,
        "total_expenses": total_expenses,
        "total_profit": total_profit,
        "low_stock_count": low_stock,
        "total_products": total_products,
        "recent_sales": [_sale_dict(s) for s in today_sales],
    })


# ─────────────────────────────────────────────────────────────────
#  CATEGORIES
# ─────────────────────────────────────────────────────────────────
@csrf_exempt
def categories_list(request):
    if request.method == "OPTIONS":
        return json_response({})

    user, err = require_auth(request)
    if err:
        return err

    cats = Category.objects.all().order_by("name")
    return json_response({"categories": [{"id": c.id, "name": c.name} for c in cats]})


# ─────────────────────────────────────────────────────────────────
#  RECEIPTS  (closed days list + detail)
# ─────────────────────────────────────────────────────────────────
@csrf_exempt
def receipts_list(request):
    """GET /api/v2/receipts/ — list of all closed days (receipts)"""
    if request.method == "OPTIONS":
        return json_response({})

    user, err = require_auth(request)
    if err:
        return err

    closed_days = ClosedDay.objects.all().order_by("-date")
    result = []
    for cd in closed_days:
        sales_qs = DailySale.objects.select_related("product__category").filter(closed_day=cd)
        total_cost = float(
            sales_qs.aggregate(t=Sum(F("quantity") * F("product__purchase_price")))["t"] or 0
        )
        result.append({
            "id": cd.id,
            "date": str(cd.date),
            "total_income": float(cd.total_income),
            "total_profit": float(cd.total_profit),
            "total_cost": round(float(cd.total_income) - float(cd.total_profit), 2),
            "items_count": sales_qs.count(),
        })

    return json_response({"receipts": result})


@csrf_exempt
def receipt_detail(request, receipt_id):
    """GET /api/v2/receipts/<id>/ — full receipt with all sold items"""
    if request.method == "OPTIONS":
        return json_response({})

    user, err = require_auth(request)
    if err:
        return err

    try:
        cd = ClosedDay.objects.get(id=receipt_id)
    except ClosedDay.DoesNotExist:
        return json_response({"error": "Чек не найден"}, 404)

    sales_qs = DailySale.objects.select_related("product__category").filter(closed_day=cd)

    items = []
    for s in sales_qs:
        purchase_price = float(s.product.purchase_price)
        sale_price = float(s.product.sale_price)
        qty = s.quantity
        items.append({
            "id": s.id,
            "product_id": s.product_id,
            "product_name": s.product.name,
            "category": s.product.category.name if s.product.category else "",
            "quantity": qty,
            "sale_price": sale_price,
            "purchase_price": purchase_price,
            "total_income": round(sale_price * qty, 2),
            "total_cost": round(purchase_price * qty, 2),
            "profit": round((sale_price - purchase_price) * qty, 2),
        })

    total_cost = round(float(cd.total_income) - float(cd.total_profit), 2)

    return json_response({
        "id": cd.id,
        "date": str(cd.date),
        "total_income": float(cd.total_income),
        "total_profit": float(cd.total_profit),
        "total_cost": total_cost,
        "items": items,
    })
