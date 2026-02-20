import json
from datetime import timedelta
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from urllib import error as urlerror
from urllib import request as urlrequest

from django.conf import settings
from django.utils import timezone
from rest_framework import mixins, permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Category, Product, OrderSnapshot, ExchangeRateCache
from .serializers import CategorySerializer, ProductSerializer, OrderSnapshotSerializer

TWOPLACES = Decimal("0.01")
SIXPLACES = Decimal("0.000001")
WEEKLY_REFRESH = timedelta(days=7)
FX_PAIR = "USD_INR"
FX_URL = "https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR"


def get_default_usd_to_inr_rate():
    raw_rate = getattr(settings, "USD_TO_INR_RATE", "83.00")
    try:
        rate = Decimal(str(raw_rate))
    except (InvalidOperation, ValueError):
        rate = Decimal("83.00")

    if rate <= 0:
        return Decimal("83.00")
    return rate


def fetch_live_usd_to_inr_rate():
    req = urlrequest.Request(FX_URL, headers={"User-Agent": "timber-backend/1.0"})
    with urlrequest.urlopen(req, timeout=5) as response:
        payload = json.loads(response.read().decode("utf-8"))

    rate = payload.get("rates", {}).get("INR")
    if rate is None:
        raise ValueError("INR rate missing in FX response.")
    return Decimal(str(rate)).quantize(SIXPLACES, rounding=ROUND_HALF_UP)


def get_usd_to_inr_rate(force_refresh=False):
    now = timezone.now()
    cached = ExchangeRateCache.objects.filter(pair=FX_PAIR).first()

    if not force_refresh and cached and (now - cached.fetched_at) < WEEKLY_REFRESH:
        return Decimal(cached.rate), False, cached.fetched_at

    try:
        live_rate = fetch_live_usd_to_inr_rate()
        if cached:
            cached.rate = live_rate
            cached.save(update_fields=["rate", "fetched_at"])
        else:
            cached = ExchangeRateCache.objects.create(pair=FX_PAIR, rate=live_rate)
        return live_rate, True, cached.fetched_at
    except (InvalidOperation, ValueError, urlerror.URLError, TimeoutError):
        if cached:
            return Decimal(cached.rate), False, cached.fetched_at

    fallback_rate = get_default_usd_to_inr_rate().quantize(SIXPLACES, rounding=ROUND_HALF_UP)
    return fallback_rate, False, None


def get_effective_rate(currency):
    if currency == OrderSnapshot.Currency.INR:
        rate, _, _ = get_usd_to_inr_rate()
        return rate
    return Decimal("1")


def convert_amount(amount, rate):
    return (Decimal(amount) * rate).quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def convert_payload_prices(payload, rate):
    if not isinstance(payload, dict):
        return payload

    items = payload.get("items")
    if not isinstance(items, list):
        return payload

    converted_items = []
    for item in items:
        if not isinstance(item, dict):
            converted_items.append(item)
            continue

        converted = item.copy()
        if "price" in converted:
            try:
                converted["price"] = str(convert_amount(converted["price"], rate))
            except (InvalidOperation, TypeError, ValueError):
                pass
        converted_items.append(converted)

    updated_payload = payload.copy()
    updated_payload["items"] = converted_items
    return updated_payload


def infer_currency_from_request(request):
    country_code = (request.headers.get('X-Country-Code') or '').strip().upper()
    timezone = (request.headers.get('X-Timezone') or '').strip()
    locale = (request.headers.get('X-Locale') or request.headers.get('Accept-Language') or '').strip().lower()

    if country_code == 'IN':
        return OrderSnapshot.Currency.INR
    if timezone.startswith('Asia/Kolkata'):
        return OrderSnapshot.Currency.INR

    locale_parts = [part.split(';')[0].strip() for part in locale.split(',') if part.strip()]
    if any(part.endswith('-in') or part.endswith('_in') for part in locale_parts):
        return OrderSnapshot.Currency.INR

    return OrderSnapshot.Currency.USD


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    
    def get_queryset(self):
        queryset = Product.objects.all()
        category = self.request.query_params.get('category', None)
        wood_type = self.request.query_params.get('wood_type', None)
        
        if category:
            queryset = queryset.filter(category__slug=category)
        if wood_type:
            queryset = queryset.filter(wood_type=wood_type)
            
        return queryset


class OrderSnapshotViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    queryset = OrderSnapshot.objects.none()
    serializer_class = OrderSnapshotSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        currency = infer_currency_from_request(self.request)
        save_kwargs = {"currency": currency}

        if currency == OrderSnapshot.Currency.INR:
            rate = get_effective_rate(currency)
            data = serializer.validated_data
            save_kwargs.update(
                {
                    "subtotal": convert_amount(data["subtotal"], rate),
                    "shipping": convert_amount(data["shipping"], rate),
                    "tax": convert_amount(data["tax"], rate),
                    "total": convert_amount(data["total"], rate),
                    "payload": convert_payload_prices(data.get("payload"), rate),
                }
            )

        serializer.save(**save_kwargs)


class LocationCurrencyView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        currency = infer_currency_from_request(request)
        if currency == OrderSnapshot.Currency.INR:
            rate, refreshed, fetched_at = get_usd_to_inr_rate()
            return Response(
                {
                    "currency": currency,
                    "rate": str(rate),
                    "refreshed": refreshed,
                    "fetched_at": fetched_at.isoformat() if fetched_at else None,
                }
            )
        return Response({"currency": currency, "rate": "1", "refreshed": False, "fetched_at": None})
