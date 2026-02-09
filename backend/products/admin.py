from django.contrib import admin
from .models import Category, Product, OrderSnapshot

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'created_at']
    prepopulated_fields = {'slug': ('name',)}

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'wood_type', 'price', 'stock', 'is_featured']
    list_filter = ['category', 'wood_type', 'is_featured']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name', 'description']


@admin.register(OrderSnapshot)
class OrderSnapshotAdmin(admin.ModelAdmin):
    list_display = ['reference', 'total', 'currency', 'created_at']
    search_fields = ['reference']