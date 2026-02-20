from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, ProductViewSet, OrderSnapshotViewSet, LocationCurrencyView

router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'products', ProductViewSet)
router.register(r'orders', OrderSnapshotViewSet)

urlpatterns = [
    path('location/currency/', LocationCurrencyView.as_view(), name='location-currency'),
    path('', include(router.urls)),
]
