import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  ShoppingBag, 
  Headphones, 
  MapPin, 
  ChevronRight, 
  Wallet,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CustomerProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customerUser: { phone: string; name?: string } | null;
  onLogout: () => void;
  onOpenLocationModal?: () => void;
}

export const CustomerProfileDrawer: React.FC<CustomerProfileDrawerProps> = ({
  isOpen,
  onClose,
  customerUser,
  onLogout,
  onOpenLocationModal,
}) => {
  const navigate = useNavigate();

  if (!customerUser) return null;

  const displayName = customerUser.name || 'Chara';
  const displayPhone = customerUser.phone.startsWith('+91') 
    ? customerUser.phone 
    : `+91 ${customerUser.phone}`;

  const navItems = [
    {
      id: 'orders',
      label: 'Orders',
      icon: ShoppingBag,
      onClick: () => {
        onClose();
        navigate('/account/orders', { state: { from: 'profile' } });
      },
    },
    {
      id: 'support',
      label: 'Customer Support',
      icon: Headphones,
      onClick: () => {
        onClose();
        navigate('/account/support', { state: { from: 'profile' } });
      },
    },
    {
      id: 'addresses',
      label: 'Saved Addresses',
      icon: MapPin,
      onClick: () => {
        onClose();
        navigate('/account/addresses', { state: { from: 'profile' } });
      },
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      onClick: () => {
        onClose();
        navigate('/account/profile', { state: { from: 'profile' } });
      },
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Dark Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[2000]"
          />

          {/* Right Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[420px] max-w-full bg-white text-gray-900 z-[2001] shadow-2xl flex flex-col h-full overflow-hidden p-6"
          >
            {/* Top Close Button */}
            <div className="flex items-center justify-end mb-2">
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile Header (Avatar + Name + Phone) */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-[#E1BEE7]/60 flex items-center justify-center text-[#8E24AA] shrink-0 shadow-2xs">
                <User size={30} className="fill-[#8E24AA]/20" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-xl font-extrabold text-gray-900 tracking-tight leading-tight">
                  {displayName}
                </h2>
                <span className="text-xs font-semibold text-gray-500 mt-0.5">
                  {displayPhone}
                </span>
              </div>
            </div>

            {/* FreshCart Cash & Gift Card Section */}
            <div className="bg-gray-100/70 border border-gray-200/80 rounded-2xl p-4 mb-6 shadow-2xs">
              {/* Header Line */}
              <div className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#8E24AA] text-white flex items-center justify-center shrink-0">
                    <Wallet size={16} />
                  </div>
                  <span className="text-sm font-extrabold text-gray-900 tracking-tight">
                    FreshCart Cash & Gift Card
                  </span>
                </div>
                <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-700 transition-colors" />
              </div>

              {/* Dashed Divider Line */}
              <div className="border-t border-dashed border-gray-300/80 my-3.5" />

              {/* Bottom Row */}
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-600 font-medium">
                  Available Balance: <strong className="text-gray-900 font-black text-sm">₹0</strong>
                </div>

                <button
                  type="button"
                  onClick={() => alert('Add Balance feature opening...')}
                  className="bg-black hover:bg-gray-800 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer shadow-2xs"
                >
                  Add Balance
                </button>
              </div>
            </div>

            {/* Menu Options List */}
            <div className="flex flex-col gap-1 mb-auto">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={item.onClick}
                    className="flex items-center justify-between py-3.5 px-2 hover:bg-gray-50 rounded-xl transition-colors text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5">
                      <IconComponent size={20} className="text-gray-700 shrink-0" />
                      <span className="text-sm font-bold text-gray-800 group-hover:text-gray-900">
                        {item.label}
                      </span>
                    </div>
                    <ChevronRight size={18} className="text-rose-500 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                );
              })}
            </div>

            {/* Bottom Logout Button & Brand Logo Watermark */}
            <div className="flex flex-col items-center gap-4 mt-auto pt-6 border-t border-gray-100">
              <button
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="w-auto px-8 py-2.5 rounded-xl border border-rose-300 text-rose-500 hover:bg-rose-50 font-extrabold text-xs tracking-wide transition-all cursor-pointer shadow-2xs"
              >
                Log Out
              </button>

              <div className="text-center">
                <span className="text-2xl font-black tracking-tight text-gray-300 font-display select-none">
                  freshcart
                </span>
              </div>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
