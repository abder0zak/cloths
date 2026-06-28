import React, { useState } from 'react';
import { CartItem, Product, User } from '../types';
import { X, Trash2, ShieldCheck, ShoppingBag, CreditCard, Compass } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  user: User | null;
  onOpenAuth: () => void;
  onOrderSuccess: () => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  user,
  onOpenAuth,
  onOrderSuccess,
}: CartDrawerProps) {
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Premium Card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const total = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!address.trim()) {
      setError('Shipping address is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('ethos_session_token');
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items: cartItems,
          total,
          shippingAddress: address,
          paymentMethod
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place order');

      setAddress('');
      onOrderSuccess();
    } catch (err: any) {
      setError(err.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
      {/* Backdrop Click */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-md bg-[#f0f4f8] dark:bg-[#090d1a] border-l border-slate-200 dark:border-slate-800 h-full flex flex-col p-6 md:p-8 relative text-black dark:text-white shadow-2xl overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} />
            <h3 className="font-display-lg text-lg uppercase tracking-tight font-medium">Your Wardrobe</h3>
          </div>
          <button onClick={onClose} className="text-[#747878] hover:text-black dark:hover:text-white transition-colors" id="close-cart-drawer">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-[#ffdad6] text-[#93000a] text-xs">
            {error}
          </div>
        )}

        {/* Cart items list */}
        <div className="flex-grow overflow-y-auto py-6 space-y-6 hide-scrollbar">
          {cartItems.length === 0 ? (
            <div className="text-center py-16 text-[#747878]">
              <Compass size={36} className="mx-auto mb-4 stroke-1 opacity-50" />
              <p className="text-sm">Your basket is currently empty.</p>
              <button 
                onClick={onClose}
                className="text-xs uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-bold underline mt-2 inline-block hover:text-slate-900 transition-colors"
              >
                Browse Collections
              </button>
            </div>
          ) : (
            cartItems.map((item, index) => (
              <div key={`${item.product.id}-${index}`} className="flex gap-4 pb-6 border-b border-[#eae8e7]/60 dark:border-[#222222]/60">
                <div className="w-20 aspect-[3/4] bg-[#f5f3f3] overflow-hidden flex-shrink-0">
                  <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-grow space-y-1">
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-medium font-display-lg">{item.product.name}</h4>
                    <button 
                      onClick={() => onRemoveItem(index)}
                      className="text-slate-400 hover:text-red-500 p-0.5 transition-colors"
                      title="Remove Piece"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="text-[11px] text-[#747878] uppercase tracking-wider">
                    Curated Editorial
                  </p>
                  <p className="text-xs text-[#444748] dark:text-[#a0a0a0]">
                    Size: {item.selectedSize} / Color: {item.selectedColor}
                  </p>
                  <div className="flex justify-between items-center pt-2">
                    <div className="flex items-center border border-[#c4c7c7] dark:border-[#333]">
                      <button 
                        onClick={() => onUpdateQuantity(index, -1)}
                        className="px-2 py-0.5 text-xs hover:bg-[#eae8e7] dark:hover:bg-[#222]"
                      >
                        -
                      </button>
                      <span className="px-3 text-xs font-mono">{item.quantity}</span>
                      <button 
                        onClick={() => onUpdateQuantity(index, 1)}
                        className="px-2 py-0.5 text-xs hover:bg-[#eae8e7] dark:hover:bg-[#222]"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-xs font-medium">${(item.product.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout Form */}
        {cartItems.length > 0 && (
          <div className="border-t border-[#eae8e7] dark:border-[#222222] pt-6 space-y-6">
            <div className="flex justify-between items-center text-sm font-medium uppercase tracking-wider">
              <span>Subtotal</span>
              <span className="font-bold">${total.toFixed(2)}</span>
            </div>

            <form onSubmit={handleCheckout} className="space-y-4">
              {/* Shipping Address */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#444748] dark:text-[#a0a0a0] mb-1">
                  Shipping Destination
                </label>
                <textarea
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street Address, Penthouse, City, Country"
                  className="w-full border border-[#c4c7c7] dark:border-[#333] bg-transparent text-xs p-3 outline-none focus:border-black dark:focus:border-white transition-colors"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#444748] dark:text-[#a0a0a0] mb-1">
                  Secure Settlement Gateway
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Premium Card')}
                    className={`border py-2 flex items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === 'Premium Card'
                        ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-medium'
                        : 'border-[#c4c7c7] dark:border-[#333] hover:border-black'
                    }`}
                  >
                    <CreditCard size={12} />
                    Premium Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Bespoke Wire')}
                    className={`border py-2 flex items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === 'Bespoke Wire'
                        ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-medium'
                        : 'border-[#c4c7c7] dark:border-[#333] hover:border-black'
                    }`}
                  >
                    Bespoke Wire
                  </button>
                </div>
              </div>

              {/* AES-256 Shield Indicator */}
              <div className="p-3 bg-[#f5f3f3] dark:bg-[#1a1a1a] flex gap-2.5 items-start text-[10px] text-[#444748] dark:text-[#b0b0b0] border border-[#eae8e7] dark:border-[#222222]">
                <ShieldCheck size={18} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 animate-pulse" />
                <span>
                  <strong>AES-256 Secure Channel</strong>: Your delivery coordinates are dynamically encrypted before persistence. Decryptable only under authorized client care audit.
                </span>
              </div>

              {/* Checkout / Auth Trigger Button */}
              {user ? (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-black dark:bg-white text-white dark:text-black py-4 text-xs font-medium uppercase tracking-widest hover:opacity-90 transition-opacity"
                  id="checkout-order-button"
                >
                  {loading ? 'Processing Order...' : 'Place Secure Order'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="w-full bg-indigo-600 text-white py-4 text-xs font-bold uppercase tracking-widest hover:bg-indigo-500 rounded-xl transition-colors shadow-lg shadow-indigo-500/10"
                >
                  Sign in to Finalize Order
                </button>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
