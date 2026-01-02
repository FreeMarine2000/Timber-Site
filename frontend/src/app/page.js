'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { ShoppingBag, ArrowRight, Loader2, Cuboid, Sun, Moon } from 'lucide-react'; 
import { getProducts } from '@/lib/api';
import { useCart } from '@/Context/CartContext';
import { useTheme } from '@/components/Providers'; // Import Global Theme Hook
import WoodGallery from '@/components/WoodGallery';

// Dynamic Import
const LogConfigurator = dynamic(() => import('@/components/LogConfigurator'), { 
  ssr: false,
  loading: () => (
    <div className="h-[750px] w-full bg-stone-100 dark:bg-stone-900 rounded-3xl flex items-center justify-center text-stone-400">
      <Loader2 className="w-8 h-8 animate-spin" />
      <span className="ml-2">Loading Virtual Sawmill...</span>
    </div>
  )
});

const HERO_IMAGE = "/wood1.png"; 
const TEXTURE_BANK = ["/wood1.png", "/wood2.png", "/wood3.png", "/wood4.png"];

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { cartCount, addToCart } = useCart();
  
  // GLOBAL THEME HOOK
  const { darkMode, toggleTheme } = useTheme();
  
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const fetchData = async () => {
      try {
        const data = await getProducts().catch(() => []);
        setProducts(data || []);
      } catch (err) {
        console.error("Failed to fetch timber:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getProductImage = (index) => TEXTURE_BANK[index % TEXTURE_BANK.length];
  const featuredProduct = products[0];

  return (
    <div className="min-h-screen bg-[#FDFCF8] dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans selection:bg-orange-500 selection:text-white transition-colors duration-500">
      
      {/* Navbar */}
      <nav className="fixed w-full top-0 z-50 bg-[#FDFCF8]/90 dark:bg-stone-950/90 backdrop-blur-md border-b border-stone-100 dark:border-stone-800 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold tracking-tighter font-serif dark:text-white">
            TimberCraft<span className="text-orange-600">.</span>
          </Link>
          
          <div className="flex items-center gap-4">
            
            {/* GLOBAL DARK MODE TOGGLE */}
            <button 
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-stone-600 dark:text-stone-300"
                aria-label="Toggle Dark Mode"
            >
                {/* Prevent Hydration Mismatch by checking isMounted */}
                {isMounted && (darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />)}
                {!isMounted && <Moon className="w-5 h-5 opacity-0" />} 
            </button>

            <Link href="/cart" className="group relative p-3 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors">
              <ShoppingBag className="w-5 h-5 text-stone-600 dark:text-stone-300 group-hover:text-black dark:group-hover:text-white transition-colors" />
              {isMounted && cartCount > 0 && (
                <span className="absolute top-1 right-1 bg-orange-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-in zoom-in">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-12 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-8">
            <div className="inline-flex items-center gap-2 border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-1 rounded-full shadow-sm">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-xs font-bold tracking-wider uppercase text-stone-500 dark:text-stone-400">
                New Kiln Batch Available
              </span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-serif leading-[1.1] text-stone-900 dark:text-white">
              Raw. <br/> Refined. <br/> <span className="text-stone-400 dark:text-stone-600">Ready.</span>
            </h1>
            
            <p className="text-lg text-stone-600 dark:text-stone-400 max-w-md leading-relaxed">
              We source the rarest live-edge slabs and hardwood lumber. Kiln-dried to 8% and surfaced on two sides.
            </p>
            
            <div className="flex gap-4 pt-2">
              <Link href="/products" className="group inline-flex items-center gap-2 bg-stone-900 dark:bg-white dark:text-stone-900 text-white px-8 py-4 rounded-lg font-medium hover:bg-black dark:hover:bg-stone-200 transition-all hover:gap-3 shadow-lg">
                Shop Inventory <ArrowRight className="w-4 h-4"/>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7 relative h-[600px] w-full bg-stone-100 dark:bg-stone-900 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-stone-900/5 dark:ring-white/10">
            {loading ? (
               <div className="w-full h-full flex items-center justify-center text-stone-300 dark:text-stone-700">
                 <Loader2 className="w-10 h-10 animate-spin" />
               </div>
            ) : (
              <>
                <Image src={HERO_IMAGE} alt="Featured Walnut Slab" fill className="object-cover hover:scale-105 transition-transform duration-1000 ease-out" priority />
                {featuredProduct && (
                  <div className="absolute bottom-8 left-8 right-8 md:right-auto md:w-80 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl p-6 rounded-xl shadow-xl border border-white/20 dark:border-stone-700">
                    <p className="text-xs font-bold uppercase tracking-widest text-orange-600 mb-2">Featured Slab</p>
                    <h3 className="text-2xl font-serif text-stone-900 dark:text-white">{featuredProduct.name}</h3>
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-xl font-bold text-stone-900 dark:text-white">${featuredProduct.price}</p>
                      <button onClick={() => addToCart(featuredProduct)} className="text-sm underline underline-offset-4 hover:text-orange-600 dark:text-stone-300 dark:hover:text-orange-500">
                        Add to Cart
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* --- VIRTUAL SAWMILL --- */}
      <section className="py-24 bg-white dark:bg-stone-950 border-t border-stone-100 dark:border-stone-900 transition-colors duration-500">
        <div className="max-w-[1400px] mx-auto px-6">
            <div className="text-center mb-16">
                <div className="inline-flex items-center justify-center p-2 bg-stone-100 dark:bg-stone-800 rounded-xl mb-4 text-stone-600 dark:text-stone-300">
                    <Cuboid className="w-6 h-6" />
                </div>
                <h2 className="text-4xl md:text-5xl font-serif text-stone-900 dark:text-white mb-4">Virtual Sawmill</h2>
                
                <p className="text-stone-500 dark:text-stone-400 max-w-xl mx-auto">
                    Don&apos;t see what you need? Use our interactive 3D tool to visualize a custom cut from our raw teak logs.
                </p>
                
            </div>
            {/* The Configurator will automatically inherit dark mode context */}
            <LogConfigurator />
        </div>
      </section>

      {/* Gallery */}
      <section className="py-20 bg-[#FDFCF8] dark:bg-stone-950 border-y border-stone-100 dark:border-stone-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-serif text-stone-900 dark:text-white">From the Woodshop</h2>
              <p className="text-stone-500 dark:text-stone-400 mt-2">A look at our latest milling process.</p>
            </div>
            <Link href="/gallery" className="text-stone-900 dark:text-stone-300 font-medium border-b border-black dark:border-stone-500 pb-0.5 hover:text-orange-600 hover:border-orange-600 transition-colors">
              View More &rarr;
            </Link>
          </div>
          <WoodGallery />
        </div>
      </section>

      {/* Current Stock */}
      <section className="py-24 px-6 max-w-7xl mx-auto dark:bg-stone-950">
        <h2 className="text-3xl font-serif mb-12 dark:text-white">Current Stock</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1,2,3].map(i => <div key={i} className="h-96 bg-stone-100 dark:bg-stone-900 animate-pulse rounded-2xl"></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 gap-y-12">
            {products.slice(0, 6).map((product, index) => (
              <div key={product.id} className="group cursor-pointer">
                <div className="relative aspect-[3/4] bg-stone-100 dark:bg-stone-800 rounded-xl overflow-hidden mb-5 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                   <Image src={getProductImage(index)} alt={product.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover group-hover:scale-110 transition duration-700 ease-in-out" />
                  <button onClick={(e) => { e.stopPropagation(); addToCart(product); }} className="absolute bottom-4 right-4 bg-white text-black p-3 rounded-full shadow-lg opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:bg-black hover:text-white">
                    <ShoppingBag className="w-5 h-5" />
                  </button>
                  {index % 3 === 0 && <span className="absolute top-4 left-4 bg-black/50 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded">RARE FIND</span>}
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-stone-900 dark:text-white group-hover:underline decoration-orange-600 underline-offset-4 decoration-2">{product.name}</h3>
                  <div className="flex justify-between items-center text-sm">
                    <p className="text-stone-500 dark:text-stone-400 font-medium">{product.wood_type || 'Hardwood'}</p>
                    <p className="text-stone-900 dark:text-white font-bold">${product.price}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}