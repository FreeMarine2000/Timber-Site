from rest_framework import viewsets
from .models import Category, Product, OrderSnapshot
from .serializers import CategorySerializer, ProductSerializer, OrderSnapshotSerializer

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

class ProductViewSet(viewsets.ModelViewSet):
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


class OrderSnapshotViewSet(viewsets.ModelViewSet):
    queryset = OrderSnapshot.objects.all().order_by('-created_at')
    serializer_class = OrderSnapshotSerializer