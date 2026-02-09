from rest_framework import serializers
from .models import Category, Product, OrderSnapshot

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description']

class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = Product
        fields = ['id', 'name', 'slug', 'category', 'category_name', 'wood_type', 
                  'description', 'price', 'unit', 'stock', 'image', 'is_featured', 
                  'created_at']


class OrderSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderSnapshot
        fields = ['id', 'reference', 'payload', 'subtotal', 'shipping', 'tax', 'total', 'currency', 'created_at']
        read_only_fields = ['id', 'reference', 'created_at']