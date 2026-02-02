import React from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { API_BASE } from '@/lib/api';

interface PayButtonProps {
  onSuccess?: (result: any) => void;
}

const PayButton: React.FC<PayButtonProps> = ({ onSuccess }) => {
  const { token, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handlePayment = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      // 1. Create order on backend - SECURITY FIX: Don't send amount from frontend
      const res = await axios.post(
        `${API_BASE}/razorpay/create-order`,
        { plan: 'premium' }, // Send plan instead of amount to prevent manipulation
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const order = res.data;

      // 2. Open Razorpay Checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount, // Use amount from backend response
        currency: order.currency,
        order_id: order.id,
        handler: async function (response: any) {
          // 3. On success, send all IDs to backend for verification
          try {
            const verifyRes = await axios.post(
              `${API_BASE}/razorpay/verify-payment`,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount: order.amount,
                currency: order.currency,
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (verifyRes.data.success) {
              toast.success('Payment successful! Redirecting to premium dashboard...', { autoClose: 2500 });
              if (onSuccess) onSuccess(verifyRes.data);
              setTimeout(() => navigate('/premium'), 2500);
            } else {
              toast.error('Payment verification failed. Please try again.');
            }
          } catch (err: any) {
            if (err.response?.status === 401) {
              toast.error('Session expired. Please log in again.');
              navigate('/login');
            } else if (err.response?.status === 400) {
              toast.error('Invalid payment request. Please try again.');
            } else {
              toast.error('Payment verification failed. Please try again.');
            }
          }
        },
        prefill: { name: 'Your Name', email: 'email@example.com' },
        theme: { color: '#3399cc' },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      if (err.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
        navigate('/login');
      } else if (err.response?.status === 400) {
        toast.error('Invalid payment request. Please try again.');
      } else {
        toast.error('Payment failed. Please try again.');
      }
    }
  };

  return (
    <>
      <button onClick={handlePayment} className="relative bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 p-[1px] rounded-lg hover:shadow-lg transition-all duration-200 w-full">
        <div className="bg-gray-900 px-6 py-3 rounded-[7px] flex items-center justify-center">
          <span className="text-white font-medium text-base tracking-wide">Buy Now</span>
        </div>
      </button>
      <ToastContainer position="top-center" />
    </>
  );
};

export default PayButton; 