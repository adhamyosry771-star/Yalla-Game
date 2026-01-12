
import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { motion, AnimatePresence } from 'framer-motion';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [customBg, setCustomBg] = useState<string | null>(null);
  const [customLogo, setCustomLogo] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "appearance"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCustomBg(data.loginBackground || null);
        setCustomLogo(data.loginLogo || null);
      }
    });
    return unsub;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError("يرجى إدخال البيانات");
      return;
    }
    
    setIsLoading(true);
    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.banUntil) {
            const banDate = new Date(data.banUntil);
            const now = new Date();
            if (banDate > now) {
              await signOut(auth);
              const dateStr = banDate.toLocaleString('ar-EG', { dateStyle: 'long', timeStyle: 'short' });
              setError(`عذراً، تم حظر حسابك. ينتهي الحظر في: ${dateStr}`);
              setIsLoading(false);
              return;
            }
          }
        }
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('البريد أو كلمة المرور غير صحيحة');
      } else {
        setError('حدث خطأ، تأكد من البيانات');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen max-w-md mx-auto bg-[#1a0b2e] flex flex-col justify-center px-6 relative overflow-hidden text-purple-50" dir="rtl">
      
      {/* Background Layers */}
      {customBg ? (
        <div className="absolute inset-0 z-0">
          <img src={customBg} className="w-full h-full object-cover" alt="Background" />
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"></div>
        </div>
      ) : (
        <>
          <div className="absolute top-[-5%] right-[-10%] w-64 h-64 bg-purple-600/10 rounded-full blur-[80px]"></div>
          <div className="absolute bottom-[-5%] left-[-10%] w-64 h-64 bg-pink-600/10 rounded-full blur-[80px]"></div>
        </>
      )}

      {/* Header Section */}
      <div className="z-10 text-center mb-10">
        <div className="w-20 h-20 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-[2.5rem] mx-auto flex items-center justify-center shadow-2xl mb-6 border border-white/10 overflow-hidden">
          {customLogo ? (
            <img src={customLogo} className="w-full h-full object-cover" alt="App Logo" />
          ) : (
            <i className="fas fa-gamepad text-3xl text-white"></i>
          )}
        </div>
        <h1 className="text-4xl font-black mb-2 tracking-tighter bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent italic">
          Yalla Games
        </h1>
        <p className="text-purple-400/60 text-[10px] font-black uppercase tracking-[0.3em]">عالم الترفيه والدردشة</p>
      </div>

      <div className="z-10 w-full max-w-[340px] mx-auto">
        <AnimatePresence mode="wait">
          {!showEmailForm ? (
            <motion.div 
              key="options"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              {/* Email Login Button - Main and Only Button */}
              <button 
                type="button"
                onClick={() => setShowEmailForm(true)}
                className="w-full bg-white/10 backdrop-blur-md border border-white/20 h-14 rounded-full flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all group"
              >
                <i className="fas fa-envelope text-white text-sm"></i>
                <span className="text-white font-black text-sm">تسجيل الدخول بالبريد الإلكتروني</span>
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="form"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white/5 backdrop-blur-2xl border border-white/10 p-6 rounded-[2.5rem] shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <button onClick={() => setShowEmailForm(false)} className="text-white/40 hover:text-white transition-colors">
                  <i className="fas fa-arrow-right"></i>
                </button>
                <h3 className="text-white font-black text-sm">{isLogin ? 'دخول بالبريد' : 'إنشاء حساب جديد'}</h3>
                <div className="w-4"></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-500/10 text-red-400 text-[10px] p-3 rounded-xl text-center font-bold border border-red-500/20">
                    {error}
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black text-purple-400/60 mr-2 uppercase">البريد الإلكتروني</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-full py-3.5 px-6 text-xs text-white outline-none focus:border-purple-500/40 transition-all"
                    placeholder="mail@example.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black text-purple-400/60 mr-2 uppercase">كلمة المرور</label>
                  <div className="relative">
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40 text-xs"
                    >
                      <i className={`fas ${showPassword ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                    </button>
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-full py-3.5 pl-12 pr-6 text-xs text-white outline-none focus:border-purple-500/40 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-4 rounded-full font-black text-xs text-white shadow-lg active:scale-95 transition-all mt-4 border border-white/10"
                >
                  {isLoading ? <i className="fas fa-circle-notch animate-spin"></i> : (isLogin ? 'تسجيل الدخول' : 'إنشاء حساب')}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button 
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-[10px] text-purple-400/60 font-bold hover:text-purple-300 transition-colors"
                >
                  {isLogin ? 'ليس لديك حساب؟ سجل الآن' : 'لديك حساب بالفعل؟ ادخل هنا'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-12 text-center px-10 z-10">
        <p className="text-[9px] font-bold text-purple-300/30 leading-relaxed uppercase tracking-widest">
          من خلال المتابعة، أنت توافق على شروط الخدمة وسياسة الخصوصية
        </p>
      </div>
    </div>
  );
};
