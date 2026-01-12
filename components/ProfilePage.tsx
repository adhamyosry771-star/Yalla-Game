
import React, { useState, useRef, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signOut, updateProfile, deleteUser } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { AdminPanel } from './AdminPanel';

interface ProfilePageProps {
  initialUserData: any;
  forceOpenWallet?: boolean;
  onWalletOpened?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ initialUserData, forceOpenWallet, onWalletOpened }) => {
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [newName, setNewName] = useState(initialUserData?.displayName || '');
  const [newBio, setNewBio] = useState(initialUserData?.bio || '');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);
  
  const user = auth.currentUser;
  const isOfficialAdmin = user?.email === 'admin@yalla.com';
  const isAdmin = isOfficialAdmin || initialUserData?.role === 'admin';

  useEffect(() => {
    setNewName(initialUserData?.displayName || '');
    setNewBio(initialUserData?.bio || '');
  }, [initialUserData]);

  useEffect(() => {
    if (forceOpenWallet) {
      setIsWalletOpen(true);
      if (onWalletOpened) onWalletOpened();
    }
  }, [forceOpenWallet]);

  const handleUserUpdate = async (userId: string, data: any) => {
    try {
      await updateDoc(doc(db, "users", userId), data);
      return true;
    } catch (e) { return false; }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfileData = async () => {
    if (!user) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { displayName: newName, bio: newBio });
      await updateProfile(user, { displayName: newName });
      setIsEditModalOpen(false);
      alert("تم تحديث البيانات");
    } catch (err) { alert("حدث خطأ"); }
    finally { setIsUpdating(false); }
  };

  const userDisplayName = initialUserData?.displayName || user?.displayName || 'المستخدم';
  const userCustomId = isOfficialAdmin ? 'OFFICIAL' : (initialUserData?.customId || user?.uid.substring(0, 8));
  const userCoins = initialUserData?.coins || 0;

  return (
    <div className="flex-1 overflow-y-auto bg-[#1a0b2e] text-purple-50 pb-10" dir="rtl">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, (v) => handleUserUpdate(user!.uid, {photoURL: v}))} />
      <input type="file" ref={headerInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, (v) => handleUserUpdate(user!.uid, {headerURL: v}))} />

      <div className="relative">
        <div className="h-44 w-full overflow-hidden relative group cursor-pointer" onClick={() => headerInputRef.current?.click()}>
          <img src={initialUserData?.headerURL || "https://picsum.photos/600/300?random=45"} className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-all duration-300" alt="Cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#1a0b2e]/60 to-[#1a0b2e]"></div>
        </div>
        <div className="absolute top-6 left-6 z-30">
          <button onClick={() => setIsEditModalOpen(true)} className="w-10 h-10 rounded-2xl bg-white/5 backdrop-blur-xl flex items-center justify-center border border-white/10 shadow-lg text-white"><i className="fas fa-cog"></i></button>
        </div>
        <div className="absolute top-28 right-6 left-6 flex items-end gap-5 z-20">
          <div className="relative flex-shrink-0 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-24 h-24 rounded-full border-[4px] border-[#1a0b2e] shadow-2xl overflow-hidden bg-purple-900">
              <img src={initialUserData?.photoURL || user?.photoURL || "https://picsum.photos/200"} className="w-full h-full object-cover group-hover:opacity-70 transition-all" alt="Profile" />
            </div>
            <div className={`absolute -bottom-1 -right-1 ${isOfficialAdmin ? 'bg-blue-500' : 'bg-yellow-500'} text-white w-7 h-7 rounded-xl border-[3px] border-[#1a0b2e] flex items-center justify-center shadow-lg`}>
              <i className={`fas ${isOfficialAdmin ? 'fa-check-circle' : 'fa-crown'} text-[10px]`}></i>
            </div>
          </div>
          <div className="flex flex-col pb-2 min-w-0 flex-1">
            <h2 className="text-2xl font-black text-white drop-shadow-2xl leading-none mb-2 truncate">{userDisplayName}</h2>
            <span className={`text-[11px] font-black w-fit ${isOfficialAdmin ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-purple-300 bg-white/5 border-white/5'} px-3 py-1 rounded-xl border tracking-wider`}>
              ID: {userCustomId}
            </span>
          </div>
        </div>
      </div>

      <div className="px-6 mt-14 relative z-10">
        <div className="grid grid-cols-3 gap-2 w-full">
          {['friends', 'following', 'followers'].map((type) => (
            <button key={type} className="bg-white/5 border border-white/5 p-3 rounded-2xl flex flex-col items-center">
              <span className="text-lg font-black text-purple-400">0</span>
              <span className="text-[9px] text-purple-300/60 font-black mt-1 uppercase">
                {type === 'friends' ? 'أصدقاء' : type === 'following' ? 'متابعة' : 'متابعين'}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-8 space-y-4">
          <button onClick={() => setIsWalletOpen(true)} className="w-full flex justify-between items-center p-4 bg-white/5 border border-white/5 rounded-2xl active:scale-[0.98] transition-all group hover:bg-white/10">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400"><i className="fas fa-wallet text-lg"></i></div>
              <div className="flex flex-col items-start">
                <span className="font-bold text-sm text-white tracking-wide">المحفظة الإلكترونية</span>
                <span className="text-[10px] text-purple-300/60 font-black">{userCoins.toLocaleString('ar-EG')} <i className="fas fa-coins text-[8px] text-yellow-500"></i></span>
              </div>
            </div>
            <i className="fas fa-chevron-left text-xs text-white/10"></i>
          </button>

          {isAdmin && (
            <button onClick={() => setIsAdminPanelOpen(true)} className="w-full flex justify-between items-center p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl active:scale-[0.98] transition-all hover:bg-yellow-500/20">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-yellow-500/20 flex items-center justify-center text-yellow-500"><i className="fas fa-user-shield text-lg"></i></div>
                <span className="font-bold text-sm text-yellow-100 tracking-wide">لوحة تحكم المسؤول</span>
              </div>
              <i className="fas fa-chevron-left text-xs text-yellow-500/30"></i>
            </button>
          )}
        </div>

        <button onClick={() => signOut(auth)} className="w-full mt-10 mb-10 py-4 bg-red-500/10 text-red-400 font-black rounded-2xl border border-red-500/20 active:bg-red-500 active:text-white transition-all">
          تسجيل الخروج
        </button>
      </div>

      {isWalletOpen && (
        <div className="fixed inset-0 z-[500] bg-[#0d051a]/98 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in">
           <div className="w-full max-w-[320px] flex flex-col gap-5">
              <div className="flex justify-between items-center px-2">
                 <h3 className="text-lg font-black text-white">محفظتي</h3>
                 <button onClick={() => setIsWalletOpen(false)} className="w-9 h-9 rounded-xl bg-white/5 text-white flex items-center justify-center border border-white/10"><i className="fas fa-times text-xs"></i></button>
              </div>
              <div className="relative w-full aspect-[1.7/1] rounded-[2rem] overflow-hidden bg-gradient-to-br from-[#cda34b] via-[#b68e41] to-[#735b2e] shadow-2xl border border-white/10 p-6 flex flex-col justify-between">
                <div className="absolute top-0 left-0 w-full h-[50%] bg-gradient-to-b from-white/5 to-transparent"></div>
                <div className="flex justify-between items-start z-10">
                  <span className="text-[9px] font-black text-[#3d3118] uppercase tracking-[0.2em] opacity-40">Private Wallet</span>
                  <div className="text-[#3d3118] font-black text-sm italic opacity-60">COINS</div>
                </div>
                <div className="flex flex-col items-center z-10">
                  <div className="flex items-center gap-2.5">
                    <i className="fas fa-coins text-[#3d3118] text-2xl opacity-60"></i>
                    <span className="text-3xl font-black text-[#2a2210]">{userCoins.toLocaleString('ar-EG')}</span>
                  </div>
                </div>
                <div className="flex flex-col z-10">
                  <span className="text-[12px] font-black text-[#2a2210] tracking-widest uppercase truncate">{userDisplayName}</span>
                  <span className="text-[9px] font-bold text-[#3d3118] opacity-30">ID {userCustomId}</span>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* استدعاء لوحة التحكم المفصولة */}
      <AdminPanel 
        isOpen={isAdminPanelOpen} 
        onClose={() => setIsAdminPanelOpen(false)} 
        isOfficialAdmin={isOfficialAdmin} 
      />

      {isEditModalOpen && (
        <div className="fixed inset-0 z-[500] bg-[#0d051a]/95 backdrop-blur-xl flex flex-col animate-in fade-in">
          <header className="p-5 flex justify-between items-center border-b border-white/5 bg-[#1a0b2e]">
            <h3 className="text-lg font-black text-white">إعدادات الحساب</h3>
            <button onClick={() => setIsEditModalOpen(false)} className="w-8 h-8 rounded-lg bg-white/5 text-white flex items-center justify-center"><i className="fas fa-times"></i></button>
          </header>
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest mr-2">الاسم المستعار</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-sm text-white outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest mr-2">السيرة الذاتية (Bio)</label>
              <textarea value={newBio} onChange={e => setNewBio(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-sm text-white outline-none h-32" />
            </div>
            <button onClick={handleUpdateProfileData} disabled={isUpdating} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-4 rounded-2xl font-black text-white shadow-lg">
              {isUpdating ? <i className="fas fa-spinner animate-spin"></i> : <span>حفظ التغييرات</span>}
            </button>
            <div className="pt-6 mt-6 border-t border-white/5">
              <button 
                onClick={async () => {
                  if (!confirm("حذف الحساب؟")) return;
                  try {
                    await deleteDoc(doc(db, "users", user!.uid));
                    await deleteUser(user!);
                    alert("تم الحذف");
                  } catch (e) { alert("يجب إعادة تسجيل الدخول للإجراء الأمني"); signOut(auth); }
                }}
                disabled={isUpdating}
                className="w-full py-4 rounded-2xl font-black text-[10px] text-red-500 border border-red-500/20 bg-red-500/5 uppercase tracking-widest"
              >
                حذف الحساب نهائياً
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
