import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, MapPin, ArrowRight, ShieldCheck, Bike } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useNavigate } from 'react-router-dom';

interface OrderSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  totalAmount: number;
  deliveryAddress: string;
  itemCount: number;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  isOpen,
  onClose,
  orderNumber,
  totalAmount,
  deliveryAddress,
}) => {
  const navigate = useNavigate();
  const [secondsLeft, setSecondsLeft] = useState(600); // 10 minutes countdown

  useEffect(() => {
    if (isOpen) {
      confetti({
        particleCount: 180,
        spread: 80,
        origin: { y: 0.5 },
      });

      const timer = setInterval(() => {
        setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const handleTrackOrders = () => {
    onClose();
    navigate('/account/orders');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden border border-gray-100"
        >
          {/* Top Decorative Background Glow */}
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500" />

          {/* Success Icon */}
          <div className="w-20 h-20 rounded-full bg-emerald-50 text-[#00A86B] flex items-center justify-center mb-4 shadow-sm border border-emerald-100/80">
            <CheckCircle2 size={48} className="animate-bounce" />
          </div>

          <h2 className="text-2xl font-black text-gray-900 font-display tracking-tight">
            Order Placed Successfully!
          </h2>
          <p className="text-xs text-gray-500 font-semibold mt-1">
            Order ID: <span className="text-gray-800 font-bold">#{orderNumber}</span>
          </p>

          {/* Delivery Countdown Timer Box */}
          <div className="w-full bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-4 my-5 flex flex-col items-center justify-center gap-1.5">
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-black uppercase tracking-wider">
              <Bike size={18} className="text-[#00A86B]" />
              <span>Delivering In 10 Minutes</span>
            </div>
            <div className="text-3xl font-black text-emerald-950 font-mono tracking-tight">
              {timeFormatted}
            </div>
            <span className="text-[11px] text-emerald-700 font-medium">
              Rider assigned at Indiranagar fulfillment center
            </span>
          </div>

          {/* Details Card */}
          <div className="w-full bg-gray-50 rounded-2xl p-4 text-left flex flex-col gap-2.5 border border-gray-200/60 mb-6 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-gray-200/80">
              <span className="text-gray-500 font-medium">Paid via Razorpay</span>
              <span className="font-black text-gray-900 text-sm">₹{totalAmount}</span>
            </div>
            <div className="flex items-start gap-2 text-gray-600 font-medium">
              <MapPin size={15} className="text-gray-400 shrink-0 mt-0.5" />
              <span className="line-clamp-2 leading-tight">{deliveryAddress || 'Selected Address'}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500 font-medium pt-1">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Contactless 10-Min Delivery Guaranteed</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-2.5">
            <button
              onClick={handleTrackOrders}
              className="w-full bg-[#00A86B] hover:bg-[#00915c] text-white font-extrabold text-sm py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Track Live Order Status</span>
              <ArrowRight size={16} />
            </button>
            <button
              onClick={onClose}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
