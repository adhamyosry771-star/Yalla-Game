
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { 
  doc, updateDoc, collection, query, limit, deleteDoc, addDoc, 
  serverTimestamp, orderBy, onSnapshot, setDoc, deleteField 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isOfficialAdmin: boolean;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, isOfficialAdmin }) => {
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [searchId, setSearchId] = useState('');
  const [allBanners, setAllBanners] = useState<any[]>([]);
  const [allRoomBgs, setAllRoomBgs] = useState<any[]>([]);
  const [allNews, setAllNews] = useState<any[]>([]);
  const [allRooms, setAllRooms] = useState<any[]>([]);
  const [adminTab, setAdminTab] = useState<'users' | 'news' | 'banners' | 'bgs' | 'rooms' | 'design'>('users');
  
  const [showChargePopup, setShowChargePopup] = useState<string | null>(null);
  const [showIdPopup, setShowIdPopup] = useState<string | null>(null);
  const [showBanPopup, setShowBanPopup] = useState<string | null>(null);
  const [chargeAmount, setChargeAmount] = useState('');
  const [newCustomId, setNewCustomId] = useState('');

  const [newsTitle, setNewsTitle] = useState('');
  const [newsDesc, setNewsDesc] = useState('');
  const [newsImage, setNewsImage] = useState<string | null>(null);
  
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerImage, setBannerImage] = useState<string | null>(null);

  const [roomBgImage, setRoomBgImage] = useState<string | null>(null);
  const [loginBgImage, setLoginBgImage] = useState<string | null>(null);
  const [loginLogoImage, setLoginLogoImage] = useState<string | null>(null);

  // أيقونات المايكات المخصصة
  const [micOpenIcon, setMicOpenIcon] = useState<string | null>(null);
  const [micLockedIcon, setMicLockedIcon] = useState<string | null>(null);
  const [micOccupiedBg, setMicOccupiedBg] = useState<string | null>(null);

  const newsInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const roomBgInputRef = useRef<HTMLInputElement>(null);
  const loginBgInputRef = useRef<HTMLInputElement>(null);
  const loginLogoInputRef = useRef<HTMLInputElement>(null);
  const micOpenInputRef = useRef<HTMLInputElement>(null);
  const micLockedInputRef = useRef<HTMLInputElement>(null);
  const micOccupiedInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const unsubUsers = onSnapshot(query(collection(db, "users"), limit(500)), (snap) => {
      setAllUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubNews = onSnapshot(query(collection(db, "news"), orderBy("createdAt", "desc")), (snap) => {
      setAllNews(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubBanners = onSnapshot(query(collection(db, "banners"), orderBy("createdAt", "desc")), (snap) => {
      setAllBanners(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubBgs = onSnapshot(query(collection(db, "roomBackgrounds"), orderBy("createdAt", "desc")), (snap) => {
      setAllRoomBgs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubRooms = onSnapshot(query(collection(db, "rooms"), orderBy("createdAt", "desc")), (snap) => {
      setAllRooms(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubDesign = onSnapshot(doc(db, "settings", "design"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setMicOpenIcon(data.micOpenIcon || null);
        setMicLockedIcon(data.micLockedIcon || null);
        setMicOccupiedBg(data.micOccupiedBg || null);
      }
    });

    return () => {
      unsubUsers(); unsubNews(); unsubBanners(); unsubBgs(); unsubRooms(); unsubDesign();
    };
  }, [isOpen]);

  const handleUserUpdate = async (userId: string, data: any) => {
    try {
      await updateDoc(doc(db, "users", userId), data);
      return true;
    } catch (e) { 
      alert("خطأ في التحديث"); 
      return false;
    }
  };

  const handleChargeSubmit = async () => {
    if (!showChargePopup || !chargeAmount) return;
    const targetUser = allUsers.find(u => u.id === showChargePopup);
    if (targetUser) {
      const success = await handleUserUpdate(showChargePopup, { 
        coins: (targetUser.coins || 0) + parseInt(chargeAmount) 
      });
      if (success) { setShowChargePopup(null); setChargeAmount(''); }
    }
  };

  const handleIdUpdateSubmit = async () => {
    if (!showIdPopup || !newCustomId) return;
    const success = await handleUserUpdate(showIdPopup, { customId: newCustomId });
    if (success) { setShowIdPopup(null); setNewCustomId(''); }
  };

  const handleBanSubmit = async (days: number | 'permanent') => {
    if (!showBanPopup) return;
    let banUntil = days === 'permanent' ? '2099-01-01T00:00:00Z' : new Date(Date.now() + days * 86400000).toISOString();
    if (await handleUserUpdate(showBanPopup, { banUntil })) {
      setShowBanPopup(null);
      alert("تم الحظر بنجاح");
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const saveDesignSettings = async () => {
    try {
      await setDoc(doc(db, "settings", "design"), {
        micOpenIcon,
        micLockedIcon,
        micOccupiedBg
      }, { merge: true });
      alert("تم حفظ إعدادات التصميم");
    } catch (e) {
      alert("خطأ في الحفظ");
    }
  };

  const filteredUsers = searchId.trim() 
    ? allUsers.filter(u => u.customId?.toLowerCase().includes(searchId.toLowerCase()))
    : allUsers;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[600] bg-[#1a0b2e] flex flex-col animate-in slide-in-from-bottom" dir="rtl">
      <input type="file" ref={newsInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setNewsImage)} />
      <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setBannerImage)} />
      <input type="file" ref={roomBgInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setRoomBgImage)} />
      <input type="file" ref={loginBgInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setLoginBgImage)} />
      <input type="file" ref={loginLogoInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setLoginLogoImage)} />
      
      <input type="file" ref={micOpenInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setMicOpenIcon)} />
      <input type="file" ref={micLockedInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setMicLockedIcon)} />
      <input type="file" ref={micOccupiedInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setMicOccupiedBg)} />

      <header className="p-4 border-b border-white/10 flex flex-col bg-[#0d051a] sticky top-0 z-50">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white font-black text-lg">لوحة المسؤول</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white"><i className="fas fa-times"></i></button>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {['users', 'rooms', 'news', 'banners', 'bgs', 'design'].map((tab) => (
            <button key={tab} onClick={() => setAdminTab(tab as any)} className={`flex-shrink-0 px-4 py-2 text-[10px] font-black rounded-xl transition-all uppercase ${adminTab === tab ? 'bg-purple-600 text-white' : 'bg-white/5 text-purple-300/60'}`}>
              {tab === 'users' ? 'المستخدمين' : tab === 'rooms' ? 'الغرف' : tab === 'news' ? 'الأخبار' : tab === 'banners' ? 'البنرات' : tab === 'bgs' ? 'الخلفيات' : 'التصميم'}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
        {adminTab === 'users' && (
          <div className="space-y-4">
            <div className="relative mb-4">
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-300/30 text-xs"><i className="fas fa-search"></i></span>
              <input type="text" value={searchId} onChange={(e) => setSearchId(e.target.value)} placeholder="بحث بواسطة الـ ID..." className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pr-10 pl-4 text-xs text-white outline-none focus:border-purple-500/40 shadow-inner" />
            </div>
            {filteredUsers.map(u => (
              <div key={u.id} className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3 animate-in fade-in duration-300">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <img src={u.photoURL} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                    <div><p className="text-xs font-black">{u.displayName}</p><p className={`text-[9px] ${u.banUntil ? 'text-red-500 font-black' : 'text-purple-400'}`}>ID: {u.customId}</p></div>
                  </div>
                  <div className="flex items-center gap-1"><i className="fas fa-coins text-yellow-500 text-[9px]"></i><span className="text-xs font-bold">{u.coins || 0}</span></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setShowChargePopup(u.id); setChargeAmount(''); }} className="bg-green-600/20 text-green-400 text-[10px] py-2 rounded-xl border border-green-600/30 font-black">شحن</button>
                  <button onClick={() => { setShowIdPopup(u.id); setNewCustomId(u.customId || ''); }} className="bg-blue-600/20 text-blue-400 text-[10px] py-2 rounded-xl border border-blue-600/30 font-black">تعديل ID</button>
                  <button onClick={() => setShowBanPopup(u.id)} className="bg-red-600/20 text-red-400 text-[10px] py-2 rounded-xl border border-red-600/30 font-black">حظر</button>
                  {u.banUntil && <button onClick={() => handleUserUpdate(u.id, { banUntil: deleteField() })} className="bg-purple-600/20 text-purple-400 text-[10px] py-2 rounded-xl border border-purple-600/30 font-black">فك الحظر</button>}
                </div>
              </div>
            ))}
          </div>
        )}

        {adminTab === 'rooms' && (
          <div className="space-y-4">
            <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest px-1">إدارة الغرف النشطة ({allRooms.length})</p>
            {allRooms.length === 0 ? (
              <div className="text-center py-20 opacity-20"><i className="fas fa-door-closed text-4xl mb-2"></i><p className="text-xs font-bold">لا توجد غرف نشطة</p></div>
            ) : allRooms.map(room => (
              <div key={room.id} className="bg-white/5 rounded-2xl border border-white/10 flex items-stretch gap-4 animate-in fade-in overflow-hidden h-24">
                <div className="w-24 h-full flex-shrink-0">
                  <img src={room.coverImage} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 py-3 flex flex-col justify-center min-w-0">
                  <p className="text-xs font-black text-white truncate">{room.title}</p>
                  <p className="text-[9px] text-purple-400 font-bold">ID: {room.roomIdDisplay || room.id.substring(0,8)}</p>
                  <p className="text-[8px] text-white/40 mt-1 truncate">بواسطة: {room.owner?.name}</p>
                </div>
                <div className="flex items-center gap-3 px-4">
                  <div className="bg-white/5 px-2 py-1 rounded-lg border border-white/5 flex items-center gap-1">
                    <i className="fas fa-users text-[8px] text-purple-400"></i>
                    <span className="text-[10px] font-black text-white">{room.participantsCount || 0}</span>
                  </div>
                  <button 
                    onClick={async () => {
                      if(confirm(`هل تريد حقاً حذف غرفة "${room.title}" نهائياً؟`)) {
                        await deleteDoc(doc(db, "rooms", room.id));
                        alert("تم حذف الغرفة");
                      }
                    }} 
                    className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 border border-red-600/30 flex items-center justify-center active:scale-90 transition-all"
                  >
                    <i className="fas fa-trash-alt text-sm"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {adminTab === 'news' && (
          <div className="space-y-4">
            <div className="bg-white/5 p-4 rounded-2xl space-y-3">
              <input value={newsTitle} onChange={e => setNewsTitle(e.target.value)} placeholder="العنوان" className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs text-white outline-none" />
              <textarea value={newsDesc} onChange={e => setNewsDesc(e.target.value)} placeholder="الوصف" className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs text-white outline-none h-20" />
              <button onClick={() => newsInputRef.current?.click()} className="w-full bg-white/10 py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 text-white">
                {newsImage ? <i className="fas fa-check text-green-500"></i> : <i className="fas fa-image"></i>} اختر صورة
              </button>
              <button onClick={async () => {
                if (!newsTitle || !newsImage) return alert("أكمل البيانات");
                await addDoc(collection(db, "news"), { title: newsTitle, desc: newsDesc, image: newsImage, createdAt: serverTimestamp() });
                setNewsTitle(''); setNewsDesc(''); setNewsImage(null); alert("تم الإضافة");
              }} className="w-full bg-purple-600 py-3 rounded-xl text-xs font-black shadow-lg text-white">إضافة الخبر</button>
            </div>
            {allNews.map(n => (
              <div key={n.id} className="bg-white/5 p-3 rounded-xl flex justify-between items-center border border-white/5">
                <div className="flex items-center gap-3"><img src={n.image} className="w-10 h-10 rounded-lg object-cover" /><span className="text-[10px] font-bold text-white truncate max-w-[150px]">{n.title}</span></div>
                <button onClick={async () => { if(confirm("حذف؟")) await deleteDoc(doc(db, "news", n.id)); }} className="text-red-500 p-2"><i className="fas fa-trash"></i></button>
              </div>
            ))}
          </div>
        )}

        {adminTab === 'banners' && (
          <div className="space-y-4">
             <div className="bg-white/5 p-4 rounded-2xl space-y-3">
                <input value={bannerTitle} onChange={e => setBannerTitle(e.target.value)} placeholder="عنوان البنر" className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs text-white outline-none" />
                <button onClick={() => bannerInputRef.current?.click()} className="w-full aspect-video bg-white/5 rounded-2xl flex items-center justify-center border-2 border-dashed border-white/10 overflow-hidden">
                  {bannerImage ? <img src={bannerImage} className="w-full h-full object-cover" /> : <i className="fas fa-plus text-2xl opacity-20 text-white"></i>}
                </button>
                <button onClick={async () => {
                  if (!bannerImage) return alert("اختر صورة");
                  await addDoc(collection(db, "banners"), { title: bannerTitle, imageUrl: bannerImage, createdAt: serverTimestamp() });
                  setBannerTitle(''); setBannerImage(null); alert("تم الإضافة");
                }} className="w-full bg-purple-600 py-3 rounded-xl text-xs font-black shadow-lg text-white">إضافة البنر</button>
             </div>
             <div className="grid grid-cols-2 gap-3">
                {allBanners.map(b => (
                  <div key={b.id} className="relative aspect-video rounded-xl overflow-hidden border border-white/10 group">
                    <img src={b.imageUrl} className="w-full h-full object-cover" />
                    <button onClick={async () => { if(confirm("حذف؟")) await deleteDoc(doc(db, "banners", b.id)); }} className="absolute top-1 right-1 w-6 h-6 bg-red-600 rounded-lg flex items-center justify-center text-white"><i className="fas fa-trash text-[10px]"></i></button>
                  </div>
                ))}
             </div>
          </div>
        )}

        {adminTab === 'bgs' && (
          <div className="space-y-8">
            <div className="bg-white/5 p-4 rounded-2xl space-y-3 border border-white/5">
              <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">إضافة خلفية غرفة جديدة</p>
              <button onClick={() => roomBgInputRef.current?.click()} className="w-full aspect-[9/16] bg-white/5 rounded-2xl flex items-center justify-center border-2 border-dashed border-white/10 overflow-hidden group">
                {roomBgImage ? <img src={roomBgImage} className="w-full h-full object-cover" /> : <i className="fas fa-plus text-2xl opacity-20 text-white group-hover:opacity-40 transition-opacity"></i>}
              </button>
              <button onClick={async () => {
                if (!roomBgImage) return alert("اختر صورة");
                await addDoc(collection(db, "roomBackgrounds"), { imageUrl: roomBgImage, createdAt: serverTimestamp() });
                setRoomBgImage(null); alert("تم الإضافة");
              }} className="w-full bg-purple-600 py-3 rounded-xl text-xs font-black text-white shadow-lg active:scale-95 transition-transform">إضافة الخلفية للمتجر</button>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest px-1">إدارة خلفيات الغرف الحالية ({allRoomBgs.length})</p>
              <div className="grid grid-cols-3 gap-3">
                {allRoomBgs.map((bg) => (
                  <div key={bg.id} className="relative aspect-[9/16] rounded-xl overflow-hidden border border-white/10 group shadow-lg">
                    <img src={bg.imageUrl} className="w-full h-full object-cover" />
                    <button 
                      onClick={async () => {
                        if(confirm("هل أنت متأكد من حذف هذه الخلفية نهائياً؟")) {
                          await deleteDoc(doc(db, "roomBackgrounds", bg.id));
                          alert("تم الحذف");
                        }
                      }} 
                      className="absolute inset-0 bg-red-600/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300"
                    >
                      <i className="fas fa-trash text-white text-lg"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white/5 p-4 rounded-2xl space-y-4 border border-white/10 shadow-inner">
               <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">مظهر صفحة تسجيل الدخول</p>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-[8px] text-white/40 text-center font-bold">خلفية الدخول</p>
                    <button onClick={() => loginBgInputRef.current?.click()} className="w-full aspect-[9/16] bg-black/40 rounded-xl overflow-hidden border border-white/10 active:scale-95 transition-transform">
                      {loginBgImage ? <img src={loginBgImage} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><i className="fas fa-image text-white/10"></i></div>}
                    </button>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[8px] text-white/40 text-center font-bold">أيقونة التطبيق</p>
                    <button onClick={() => loginLogoInputRef.current?.click()} className="w-full aspect-square bg-black/40 rounded-xl overflow-hidden border border-white/10 active:scale-95 transition-transform">
                      {loginLogoImage ? <img src={loginLogoImage} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><i className="fas fa-icons text-white/10"></i></div>}
                    </button>
                  </div>
               </div>
               <button onClick={async () => {
                  const data: any = {};
                  if (loginBgImage) data.loginBackground = loginBgImage;
                  if (loginLogoImage) data.loginLogo = loginLogoImage;
                  if (Object.keys(data).length === 0) return alert("لم يتم اختيار أي تغييرات");
                  await setDoc(doc(db, "settings", "appearance"), data, { merge: true });
                  alert("تم تحديث مظهر الدخول");
               }} className="w-full bg-blue-600 py-3 rounded-xl text-xs font-black text-white shadow-lg">حفظ مظهر الدخول</button>
            </div>
          </div>
        )}

        {adminTab === 'design' && (
          <div className="space-y-6">
            <div className="bg-white/5 p-5 rounded-[2rem] border border-white/10 space-y-6 shadow-2xl">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">تخصيص أيقونات الميكروفونات</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-white/40 mr-2 uppercase tracking-tighter">أيقونة المايك المفتوح</label>
                  <button onClick={() => micOpenInputRef.current?.click()} className="w-full h-16 bg-black/40 rounded-2xl border-2 border-dashed border-white/5 flex items-center justify-center overflow-hidden transition-all hover:bg-black/60">
                    {micOpenIcon ? <img src={micOpenIcon} className="h-10 w-10 object-contain" /> : <i className="fas fa-plus text-white/20"></i>}
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-white/40 mr-2 uppercase tracking-tighter">أيقونة المايك المغلق (Lock)</label>
                  <button onClick={() => micLockedInputRef.current?.click()} className="w-full h-16 bg-black/40 rounded-2xl border-2 border-dashed border-white/5 flex items-center justify-center overflow-hidden transition-all hover:bg-black/60">
                    {micLockedIcon ? <img src={micLockedIcon} className="h-10 w-10 object-contain" /> : <i className="fas fa-plus text-white/20"></i>}
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-white/40 mr-2 uppercase tracking-tighter">أيقونة خلفية المايك المشغول</label>
                  <button onClick={() => micOccupiedInputRef.current?.click()} className="w-full h-16 bg-black/40 rounded-2xl border-2 border-dashed border-white/5 flex items-center justify-center overflow-hidden transition-all hover:bg-black/60">
                    {micOccupiedBg ? <img src={micOccupiedBg} className="h-10 w-10 object-contain" /> : <i className="fas fa-plus text-white/20"></i>}
                  </button>
                </div>
              </div>

              <button onClick={saveDesignSettings} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-4 rounded-2xl font-black text-xs text-white shadow-xl active:scale-95 transition-transform border border-white/10">حفظ التغييرات</button>
            </div>
          </div>
        )}
      </div>

      {/* Popups (Charge, ID, Ban) */}
      {showChargePopup && (
        <div className="fixed inset-0 z-[700] bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[#1a0b2e] w-full max-w-[280px] rounded-[2rem] border border-white/10 p-6 shadow-2xl flex flex-col gap-4">
            <h4 className="text-sm font-black text-white text-center">شحن كوينز</h4>
            <input type="number" value={chargeAmount} onChange={e => setChargeAmount(e.target.value)} placeholder="الكمية..." className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white outline-none text-center" />
            <div className="flex gap-2">
              <button onClick={handleChargeSubmit} className="flex-1 bg-green-600 py-3 rounded-xl text-[10px] font-black text-white">تأكيد</button>
              <button onClick={() => setShowChargePopup(null)} className="flex-1 bg-white/5 py-3 rounded-xl text-[10px] font-black text-white border border-white/10">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {showBanPopup && (
        <div className="fixed inset-0 z-[700] bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[#1a0b2e] w-full max-w-[280px] rounded-[2rem] border border-white/10 p-6 shadow-2xl flex flex-col gap-3">
            <h4 className="text-sm font-black text-white text-center mb-2">حظر مستخدم</h4>
            {[1, 7, 30].map(d => (
              <button key={d} onClick={() => handleBanSubmit(d)} className="w-full bg-white/5 py-3 rounded-xl text-[10px] font-black text-white border border-white/5">حظر {d} يوم</button>
            ))}
            <button onClick={() => handleBanSubmit('permanent')} className="w-full bg-red-600/20 text-red-400 py-3 rounded-xl text-[10px] font-black border border-red-500/20">حظر دائم</button>
            <button onClick={() => setShowBanPopup(null)} className="w-full bg-white/10 py-3 rounded-xl text-[10px] font-black text-white mt-2">إلغاء</button>
          </div>
        </div>
      )}
      
      {showIdPopup && (
        <div className="fixed inset-0 z-[700] bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[#1a0b2e] w-full max-w-[280px] rounded-[2rem] border border-white/10 p-6 shadow-2xl flex flex-col gap-4">
            <h4 className="text-sm font-black text-white text-center">تعديل الـ ID</h4>
            <input type="text" value={newCustomId} onChange={e => setNewCustomId(e.target.value)} placeholder="ID جديد..." className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white outline-none text-center" />
            <div className="flex gap-2">
              <button onClick={handleIdUpdateSubmit} className="flex-1 bg-blue-600 py-3 rounded-xl text-[10px] font-black text-white">تحديث</button>
              <button onClick={() => setShowIdPopup(null)} className="flex-1 bg-white/5 py-3 rounded-xl text-[10px] font-black text-white border border-white/10">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
