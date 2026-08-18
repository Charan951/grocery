import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Shield, Info, ArrowRight, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: { name: string; email: string; role: string; token: string }) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Admin');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOfflineSandbox, setIsOfflineSandbox] = useState(false);

  const API_URL = '/api';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = isLogin 
      ? { email: email.trim(), password }
      : { name: name.trim(), email: email.trim(), password, role };

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.success) {
        onLoginSuccess({
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          token: data.token
        });
        setLoading(false);
        return;
      } else {
        setError(data.message || 'Authentication failed. Please check credentials.');
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Backend API offline. Verifying against seeded local credentials sandbox.');
      setIsOfflineSandbox(true);
    }

    // Offline Sandbox Validation
    setTimeout(() => {
      setLoading(false);
      
      if (isLogin) {
        // Mock seeder accounts
        const mockAccounts: Record<string, { name: string; role: string; pass: string }> = {
          'admin@freshcart.com': { name: 'FreshCart Admin', role: 'Admin', pass: 'admin123' },
          'manager@freshcart.com': { name: 'FreshCart Manager', role: 'Manager', pass: 'manager123' },
          'employee@freshcart.com': { name: 'FreshCart Employee', role: 'Employee', pass: 'employee123' },
          'delivery@freshcart.com': { name: 'FreshCart Rider', role: 'Delivery', pass: 'delivery123' },
          'customer@freshcart.com': { name: 'FreshCart Customer', role: 'Customer', pass: 'customer123' }
        };

        const match = mockAccounts[email.trim().toLowerCase()];
        if (match && match.pass === password) {
          onLoginSuccess({
            name: match.name,
            email: email.trim().toLowerCase(),
            role: match.role,
            token: 'mock_sandbox_token_123456789'
          });
        } else {
          setError('Invalid email or password. Hint: admin@freshcart.com / admin123');
        }
      } else {
        // Register simulation
        if (!name.trim() || !email.trim()) {
          setError('Please fill in all details.');
          return;
        }
        onLoginSuccess({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: role,
          token: 'mock_sandbox_token_new'
        });
      }
    }, 600);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden font-sans">
      {/* Visual background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[440px] bg-surface/80 backdrop-blur-xl border border-divider rounded-[28px] p-8 shadow-premium z-10 flex flex-col gap-6"
      >
        {/* Brand Logo */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-[18px] bg-primary flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
            F
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-text-primary tracking-tight font-display">FreshCart Control Console</h2>
            <p className="text-xs text-text-secondary font-medium">Enterprise portal sign-in</p>
          </div>
        </div>

        {/* Diagnostic Sandbox Notice */}
        <div className="bg-primary/5 border border-primary/10 p-3.5 rounded-2xl flex gap-3 text-[11px] leading-relaxed text-text-secondary">
          <Info className="text-primary shrink-0 mt-0.5" size={16} />
          <div>
            <span className="font-bold text-text-primary">Admin Credentials Seeding:</span> No registration required. Access with <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">admin@freshcart.com</code> / <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">admin123</code>.
          </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 rounded-2xl bg-error/10 border border-error/20 text-xs font-bold text-error text-center"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col gap-1.5"
              >
                <label className="text-[11px] font-bold text-text-secondary uppercase">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 text-text-secondary" size={15} />
                  <input 
                    type="text" 
                    placeholder="Rohan Murthy"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-divider rounded-xl text-xs bg-background/50 focus:outline-none focus:border-primary text-text-primary font-semibold"
                    required
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-text-secondary uppercase">Corporate Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 text-text-secondary" size={15} />
              <input 
                type="email" 
                placeholder="admin@freshcart.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-divider rounded-xl text-xs bg-background/50 focus:outline-none focus:border-primary text-text-primary font-semibold"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-text-secondary uppercase">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 text-text-secondary" size={15} />
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2 border border-divider rounded-xl text-xs bg-background/50 focus:outline-none focus:border-primary text-text-primary font-semibold font-mono"
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-text-secondary hover:text-text-primary cursor-pointer"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col gap-1.5"
              >
                <label className="text-[11px] font-bold text-text-secondary uppercase">Access Role</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-2.5 text-text-secondary" size={15} />
                  <select 
                    value={role} 
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-divider rounded-xl text-xs bg-background/50 focus:outline-none focus:border-primary text-text-primary font-semibold"
                  >
                    <option value="Admin">Admin (Full Console Access)</option>
                    <option value="Manager">Manager (Dark Store Stock & Orders)</option>
                    <option value="Employee">Employee (Blogs & Support Tickets)</option>
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-white font-bold py-2.5 rounded-full text-xs hover:bg-secondary cursor-pointer transition-all shadow-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : isLogin ? 'Sign In to Console' : 'Register Operator Account'}</span>
            {!loading && <ArrowRight size={14} />}
          </button>
        </form>

        <div className="border-t border-divider pt-4 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-[11px] text-primary hover:underline font-bold cursor-pointer"
          >
            {isLogin ? 'Need operator account? Register here' : 'Already registered? Sign in here'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
export default Login;
