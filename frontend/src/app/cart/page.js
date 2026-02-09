'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, CreditCard } from 'lucide-react';
import { useCart } from '@/Context/CartContext';
import { createOrderSnapshot } from '@/lib/api';

const TEXTURE_BANK = ['/wood1.png', '/wood2.png', '/wood3.png', '/wood4.png'];

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, clearCart, cartTotal } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [orderReference, setOrderReference] = useState('');

  const subtotal = useMemo(() => cartTotal, [cartTotal]);
  const shipping = subtotal > 0 ? 18 : 0;
  const tax = subtotal > 0 ? Math.round(subtotal * 0.07) : 0;
  const grandTotal = subtotal + shipping + tax;

  const getItemImage = (index) => TEXTURE_BANK[index % TEXTURE_BANK.length];

  const handleCheckout = async () => {
    if (cart.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError('');
    setOrderReference('');

    try {
      const payload = {
        payload: {
          items: cart,
        },
        subtotal,
        shipping,
        tax,
        total: grandTotal,
        currency: 'USD',
      };
      const response = await createOrderSnapshot(payload);
      setOrderReference(response.reference || '');
      clearCart();
    } catch (error) {
      console.error('Checkout failed:', error);
      setSubmitError('Checkout failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F6F0] dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors duration-500">
      <header className="sticky top-0 z-30 bg-[#F9F6F0]/90 dark:bg-stone-950/90 backdrop-blur border-b border-stone-200/70 dark:border-stone-800">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold tracking-tight font-serif">
            TimberCraft<span className="text-orange-600">.</span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Continue shopping
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col gap-3 mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">
            <span className="w-8 h-[1px] bg-stone-300 dark:bg-stone-600" />
            Your Cart
          </div>
          <h1 className="text-4xl md:text-5xl font-serif">Ready for the kiln.</h1>
          <p className="text-stone-600 dark:text-stone-400 max-w-2xl">
            Review your slabs, tweak quantities, and lock in your order for premium hardwoods.
          </p>
        </div>

        {cart.length === 0 ? (
          <section className="bg-white dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800 rounded-3xl p-10 md:p-14 shadow-xl">
            <div className="flex flex-col md:flex-row items-center gap-10">
              <div className="w-28 h-28 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                <ShoppingBag className="w-10 h-10 text-stone-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-serif mb-2">Your cart is empty.</h2>
                <p className="text-stone-600 dark:text-stone-400 mb-6">
                  Head back to the inventory to add kiln-dried slabs and custom cuts.
                </p>
                <Link href="/" className="inline-flex items-center gap-2 bg-stone-900 text-white dark:bg-white dark:text-stone-900 px-6 py-3 rounded-lg font-medium hover:bg-black dark:hover:bg-stone-200 transition-colors">
                  Browse inventory
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <section className="lg:col-span-2 space-y-6">
              {cart.map((item, index) => (
                <div key={item.id} className="group bg-white dark:bg-stone-900/70 border border-stone-200/70 dark:border-stone-800 rounded-2xl p-6 shadow-lg">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="relative w-full md:w-36 h-40 md:h-36 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800">
                      <Image src={getItemImage(index)} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start justify-between gap-6">
                        <div>
                          <h3 className="text-xl font-serif text-stone-900 dark:text-white">{item.name}</h3>
                          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                            {item.wood_type || 'Premium hardwood'}
                          </p>
                        </div>
                        <p className="text-lg font-bold text-stone-900 dark:text-white">${item.price}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <div className="inline-flex items-center rounded-full border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="h-10 w-10 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:text-black dark:hover:text-white transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="px-4 text-sm font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="h-10 w-10 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:text-black dark:hover:text-white transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 dark:text-stone-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </section>

            <aside className="bg-stone-900 text-white dark:bg-white dark:text-stone-900 rounded-3xl p-8 shadow-2xl h-fit">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-white/10 dark:bg-stone-100 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60 dark:text-stone-500">Order Summary</p>
                  <h2 className="text-2xl font-serif">Totals</h2>
                </div>
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/70 dark:text-stone-500">Subtotal</span>
                  <span className="font-semibold">${subtotal}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70 dark:text-stone-500">Estimated shipping</span>
                  <span className="font-semibold">${shipping}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70 dark:text-stone-500">Tax</span>
                  <span className="font-semibold">${tax}</span>
                </div>
                <div className="h-px bg-white/10 dark:bg-stone-200/60" />
                <div className="flex items-center justify-between text-lg">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold">${grandTotal}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={isSubmitting}
                className="mt-8 w-full inline-flex items-center justify-center gap-2 bg-white text-stone-900 dark:bg-stone-900 dark:text-white py-3 rounded-xl font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Placing order...' : 'Secure checkout'}
              </button>

              {orderReference && (
                <p className="mt-4 text-xs text-white/70 dark:text-stone-600">
                  Order placed. Reference: {orderReference}
                </p>
              )}

              {submitError && (
                <p className="mt-4 text-xs text-red-300 dark:text-red-600">
                  {submitError}
                </p>
              )}

              <p className="text-xs text-white/60 dark:text-stone-500 mt-4">
                Secure payments and insured freight on all slab orders.
              </p>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
