import React from 'react';
import { useCartWishlist } from '../context/CartWishlistContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { getProductImage } from '../utils/imageUtils';

interface WishlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WishlistDrawer: React.FC<WishlistDrawerProps> = ({ isOpen, onClose }) => {
  const { wishlist, toggleWishlist, addToCart } = useCartWishlist();

  const handleMoveToCart = (product: any) => {
    addToCart(product, 1, product.defaultWeight);
    toggleWishlist(product); // Remove from wishlist after moving to cart
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[1050]"
            onClick={onClose}
          />

          {/* Drawer container */}
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-[400px] bg-surface z-[1060] shadow-premium flex flex-col p-6"
          >
            <div className="flex justify-between items-center pb-4 border-b border-divider mb-4">
              <h3 className="text-lg font-extrabold text-text-primary">My Wishlist ({wishlist.length})</h3>
              <button onClick={onClose} className="text-text-secondary hover:text-primary transition-colors" aria-label="Close wishlist">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-4">
              {wishlist.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                  <Heart size={48} className="text-text-tertiary mb-4 animate-pulse" />
                  <div className="text-base font-bold text-text-primary mb-2">Your Wishlist is Empty</div>
                  <p className="text-sm text-text-secondary mb-6 leading-relaxed">Save your favorite fresh fruits, veggies, and milk here to buy them later.</p>
                  <button onClick={onClose} className="bg-primary text-white font-bold py-2.5 px-6 rounded-full text-sm transition-all hover:bg-secondary active:scale-[0.98]">Explore Products</button>
                </div>
              ) : (
                wishlist.map((product) => (
                  <motion.div 
                    layout
                    key={product.id}
                    className="flex gap-4 p-3 border border-divider rounded-xl bg-background relative overflow-hidden transition-all hover:shadow-card"
                    exit={{ opacity: 0, x: 50 }}
                  >
                    <img src={getProductImage(product)} alt={product.name} className="w-20 h-20 object-cover rounded-md border border-divider" />
                    <div className="flex-1 flex flex-col">
                      <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-0.5">{product.brand}</span>
                      <h4 className="text-sm font-bold text-text-primary mb-1 line-clamp-1">{product.name}</h4>
                      <span className="text-sm font-extrabold text-text-primary mb-2">₹{product.price}</span>
                      
                      <div className="flex items-center gap-2 mt-auto">
                        <button 
                          onClick={() => handleMoveToCart(product)}
                          className="flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-primary hover:text-white transition-colors"
                        >
                          <ShoppingCart size={12} />
                          <span>Add to Cart</span>
                        </button>
                        
                        <button 
                          onClick={() => toggleWishlist(product)}
                          className="flex items-center justify-center p-2 rounded-full text-text-secondary hover:text-error hover:bg-error/10 transition-colors"
                          title="Remove item"
                          aria-label={`Remove ${product.name} from wishlist`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
