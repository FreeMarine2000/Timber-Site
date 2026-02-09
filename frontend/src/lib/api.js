import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API functions
export const getProducts = async (filters = {}) => {
  const params = new URLSearchParams(filters);
  const response = await api.get(`/products/?${params}`);
  return response.data;
};

export const getProduct = async (id) => {
  const response = await api.get(`/products/${id}/`);
  return response.data;
};

export const getCategories = async () => {
  const response = await api.get('/categories/');
  return response.data;
};

export const createOrderSnapshot = async (payload) => {
  const response = await api.post('/orders/', payload);
  return response.data;
};