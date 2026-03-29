"""
Barcode API для Quick Inventory
================================
Совместимо с QrBot Business Scanner Mode.

QrBot отправляет POST на /api/scans/ с телом:
    content={баркод}&format={тип_кода}

Настройки в QrBot:
    API endpoint URL:  http://192.168.X.X:8000/api/scans/
    HTTP body:         content={code}&format={format}
"""

import json
from arrow import now
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .models import Product, Category, DailySale

# Временный список сканирований в памяти (как в примере QrBot)
# При перезапуске сервера очищается — это нормально
scans = []


def cors_response(data, status=200):
    response = JsonResponse(data, status=status, json_dumps_params={'ensure_ascii': False})
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Content-Type"
    return response


# ─────────────────────────────────────────────────────────────────
#  ГЛАВНЫЙ ENDPOINT — совместимый с QrBot
#  GET  /api/scans/  — показать все сканирования
#  POST /api/scans/  — принять баркод от QrBot
# ─────────────────────────────────────────────────────────────────

@csrf_exempt
def scans_endpoint(request):
    """
    Точная копия логики из примера QrBot, адаптированная под Django.

    QrBot настройки:
        API endpoint URL:  http://192.168.X.X:8000/api/scans/
        HTTP body:         content={code}&format={format}
    """

    if request.method == "OPTIONS":
        return cors_response({})

    # GET — показать все сканирования (для проверки в браузере)
    if request.method == "GET":
        return cors_response({
            "message": "Quick Inventory — список сканирований",
            "scans": scans,
            "total": len(scans)
        })

    # POST — принять баркод от QrBot
    if request.method == "POST":
        content = request.POST.get("content", "")
        fmt = request.POST.get("format", "unknown")

        if not content:
            # Попробуем JSON body
            try:
                body = json.loads(request.body)
                content = body.get("content", "")
                fmt = body.get("format", "unknown")
            except Exception:
                pass

        if not content:
            return cors_response(
                {"error": "Параметр content пустой"},
                status=400
            )

        # Добавляем в список (как в примере QrBot)
        scans.append({"content": content, "format": fmt})

        # Ищем товар в базе по баркоду
        try:
            product = Product.objects.select_related("category").get(barcode=content)
            product_info = {
                "id": product.id,
                "name": product.name,
                "quantity": product.quantity,
                "sale_price": float(product.sale_price),
                "category": product.category.name if product.category else None,
            }
            found = True
        except Product.DoesNotExist:
            product_info = None
            found = False

        # Ответ с Custom заголовками для QrBot (показывают alert в приложении)
        if found:
            title = f"✓ {product_info['name']}"
            message = f"Остаток: {product_info['quantity']} шт. | Цена: {product_info['sale_price']} ₸"
        else:
            title = "Товар не найден"
            message = f"Баркод {content} отсутствует в базе"

        response = cors_response({
            "content": content,
            "format": fmt,
            "found": found,
            "product": product_info,
            "message": message,
        })

        # Заголовки которые QrBot показывает как всплывающее уведомление
        import urllib.parse
        response["Custom-Title"] = urllib.parse.quote_plus(title)
        response["Custom-Message"] = urllib.parse.quote_plus(message)
        response["Custom-Time"] = "4000"  # миллисекунды показа уведомления

        return response

    return cors_response({"error": "Метод не поддерживается"}, status=405)


# ─────────────────────────────────────────────────────────────────
#  ПРОДАЖА через сканирование
#  POST /api/scans/sell/
#  body: content={баркод}&format={format}&quantity=1
# ─────────────────────────────────────────────────────────────────

@csrf_exempt
def scans_sell(request):
    """
    QrBot настройки для продажи:
        API endpoint URL:  http://192.168.X.X:8000/api/scans/sell/
        HTTP body:         content={code}&format={format}&quantity=1
    """
    if request.method == "OPTIONS":
        return cors_response({})

    if request.method != "POST":
        return cors_response({"error": "Только POST"}, status=405)

    content = request.POST.get("content", "")
    quantity = int(request.POST.get("quantity", 1))

    if not content:
        return cors_response({"error": "content пустой"}, status=400)

    try:
        product = Product.objects.get(barcode=content)
    except Product.DoesNotExist:
        response = cors_response({"error": f"Товар не найден: {content}"}, status=404)
        import urllib.parse
        response["Custom-Title"] = urllib.parse.quote_plus("Товар не найден")
        response["Custom-Message"] = urllib.parse.quote_plus(f"Баркод {content} не в базе")
        response["Custom-Time"] = "4000"
        return response

    if product.quantity < quantity:
        import urllib.parse
        response = cors_response({
            "error": f"Недостаточно товара. На складе: {product.quantity}"
        }, status=400)
        response["Custom-Title"] = urllib.parse.quote_plus("Нет на складе")
        response["Custom-Message"] = urllib.parse.quote_plus(f"Осталось только {product.quantity} шт.")
        response["Custom-Time"] = "4000"
        return response

    # Списываем
    product.quantity -= quantity
    product.save()

    total = product.sale_price * quantity
    DailySale.objects.create(product=product, quantity=quantity, total_price=total, sale_date=now().date())

    import urllib.parse
    title = f"✓ Продано: {product.name}"
    message = f"{quantity} шт. × {product.sale_price} ₸ = {float(total)} ₸ | Остаток: {product.quantity}"

    response = cors_response({
        "success": True,
        "product": product.name,
        "sold": quantity,
        "remaining": product.quantity,
        "total_price": float(total),
    })
    response["Custom-Title"] = urllib.parse.quote_plus(title)
    response["Custom-Message"] = urllib.parse.quote_plus(message)
    response["Custom-Time"] = "5000"
    return response


# ─────────────────────────────────────────────────────────────────
#  СОЗДАНИЕ ТОВАРА через сканирование
#  POST /api/scans/create/
#  body: content={баркод}&format={format}&name=Название&sale_price=500
# ─────────────────────────────────────────────────────────────────

@csrf_exempt
def scans_create(request):
    """
    QrBot настройки для создания товара:
        API endpoint URL:  http://192.168.X.X:8000/api/scans/create/
        HTTP body:         content={code}&format={format}&name=Название&sale_price=500&quantity=10
    """
    if request.method == "OPTIONS":
        return cors_response({})

    if request.method != "POST":
        return cors_response({"error": "Только POST"}, status=405)

    import urllib.parse

    content = request.POST.get("content", "")
    name = request.POST.get("name", "").strip()

    if not content:
        return cors_response({"error": "content пустой"}, status=400)
    if not name:
        return cors_response({"error": "name обязателен"}, status=400)

    if Product.objects.filter(barcode=content).exists():
        existing = Product.objects.get(barcode=content)
        response = cors_response({
            "error": f"Товар уже существует: {existing.name}"
        }, status=409)
        response["Custom-Title"] = urllib.parse.quote_plus("Уже существует")
        response["Custom-Message"] = urllib.parse.quote_plus(existing.name)
        response["Custom-Time"] = "4000"
        return response

    try:
        quantity = int(request.POST.get("quantity", 0))
        sale_price = float(request.POST.get("sale_price", 0))
        purchase_price = float(request.POST.get("purchase_price", 0))
    except (ValueError, TypeError):
        return cors_response({"error": "Числовые поля невалидны"}, status=400)

    category = None
    category_name = request.POST.get("category", "").strip()
    if category_name:
        category, _ = Category.objects.get_or_create(name=category_name)

    product = Product.objects.create(
        name=name,
        barcode=content,
        quantity=quantity,
        sale_price=sale_price,
        purchase_price=purchase_price,
        description=request.POST.get("description", ""),
        category=category,
    )

    title = f"✓ Создан: {product.name}"
    message = f"ID: {product.id} | Баркод: {content}"

    response = cors_response({
        "success": True,
        "product": {"id": product.id, "name": product.name, "barcode": content}
    }, status=201)
    response["Custom-Title"] = urllib.parse.quote_plus(title)
    response["Custom-Message"] = urllib.parse.quote_plus(message)
    response["Custom-Time"] = "4000"
    return response


# ─────────────────────────────────────────────────────────────────
#  HEALTH CHECK
# ─────────────────────────────────────────────────────────────────

@csrf_exempt
def ping(request):
    return cors_response({"status": "ok", "message": "Quick Inventory API работает ✓"})

@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def barcode_lookup(request):
    if request.method == "OPTIONS":
        return cors_response({})

    barcode = request.GET.get("code", "").strip()
    if not barcode:
        return cors_response({"error": "Параметр 'code' обязателен"}, status=400)

    try:
        product = Product.objects.select_related("category").get(barcode=barcode)
        return cors_response({
            "found": True,
            "product": {
                "id": product.id,
                "name": product.name,
                "barcode": product.barcode,
                "category": product.category.name if product.category else None,
                "quantity": product.quantity,
                "purchase_price": float(product.purchase_price),
                "sale_price": float(product.sale_price),
            }
        })
    except Product.DoesNotExist:
        return cors_response({"found": False, "barcode": barcode})
