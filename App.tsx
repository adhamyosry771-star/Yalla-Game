
import React, { useState, useEffect, useRef } from 'react';
import { Room } from './types';
import { RoomCard } from './components/RoomCard';
import { VoiceRoom } from './components/VoiceRoom';
import { Login } from './components/Login';
import { SetupProfile } from './components/SetupProfile';
import { NewsPage } from './components/NewsPage';
import { MessagesPage } from './components/MessagesPage';
import { ProfilePage } from './components/ProfilePage';
import { CreateRoomModal } from './components/CreateRoomModal';
import { auth, db } from './firebase';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, onSnapshot, collection, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isProfileSetup, setIsProfileSetup] = useState(true);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'news' | 'messages' | 'me'>('home');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [shouldOpenWalletOnProfile, setShouldOpenWalletOnProfile] = useState(false);
  
  const [roomMicStates, setRoomMicStates] = useState<any[]>(Array(10).fill({ status: 'open', user: null }));
  const [isMicMuted, setIsMicMuted] = useState(true);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  // منطق الفقاعة المتحركة
  const [bubblePos, setBubblePos] = useState({ x: window.innerWidth - 85, y: window.innerHeight - 220 });
  const isDragging = useRef(false);
  const hasMoved = useRef(false); 
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let unsubscribeUserDoc: any;
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        unsubscribeUserDoc = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data());
            setIsProfileSetup(true);
          } else {
            setIsProfileSetup(false);
          }
          setLoading(false);
        });
      } else {
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });

    const bannersQuery = query(collection(db, "banners"), orderBy("createdAt", "desc"), limit(5));
    const unsubscribeBanners = onSnapshot(bannersQuery, (snapshot) => {
      setBanners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const roomsQuery = query(collection(db, "rooms"), orderBy("createdAt", "desc"), limit(20));
    const unsubscribeRooms = onSnapshot(roomsQuery, (snapshot) => {
      setRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
      unsubscribeBanners();
      unsubscribeRooms();
    };
  }, []);

  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentBannerIndex(prev => (prev + 1) % banners.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [banners]);

  const onMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    isDragging.current = true;
    hasMoved.current = false;
    const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    dragOffset.current = {
      x: clientX - bubblePos.x,
      y: clientY - bubblePos.y
    };
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return;
      hasMoved.current = true;
      const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
      
      const nextX = Math.min(Math.max(0, clientX - dragOffset.current.x), window.innerWidth - 64);
      const nextY = Math.min(Math.max(0, clientY - dragOffset.current.y), window.innerHeight - 64);
      
      setBubblePos({ x: nextX, y: nextY });
    };

    const onMouseUp = () => {
      isDragging.current = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onMouseMove);
    window.addEventListener('touchend', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onMouseMove);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, [bubblePos]);

  const handleRoomClick = (room: Room) => {
    if (activeRoom && activeRoom.id === room.id) {
      setIsMinimized(false);
    } else {
      setRoomMicStates(Array(10).fill({ status: 'open', user: null }));
      setIsMicMuted(true);
      setActiveRoom(room);
      setIsMinimized(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#1a0b2e] flex items-center justify-center"><div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!user) return <Login onLoginSuccess={() => {}} />;
  if (!isProfileSetup) return <SetupProfile onComplete={() => setIsProfileSetup(true)} />;

  const finalUserPhoto = userData?.photoURL || user?.photoURL || "https://picsum.photos/200";

  return (
    <div className="min-h-screen pb-16 max-w-md mx-auto bg-[#1a0b2e] shadow-2xl relative overflow-hidden flex flex-col border-x border-white/5" dir="rtl">
      {activeTab === 'home' && (
        <header className="px-5 py-3 flex justify-between items-center sticky top-0 z-10 bg-[#1a0b2e]/90 backdrop-blur-md">
          <h1 className="text-lg font-black tracking-tighter bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Yalla Games</h1>
          <div className="flex gap-2">
            <button className="w-8 h-8 relative bg-white/5 rounded-xl flex items-center justify-center border border-white/10 text-white active:scale-90 transition-all"><i className="fas fa-bell text-xs"></i></button>
            <div 
              className="w-8 h-8 rounded-full border border-purple-500/50 p-0.5 overflow-hidden cursor-pointer shadow-lg active:scale-90 transition-transform" 
              onClick={() => setActiveTab('me')}
            >
              <img 
                src={finalUserPhoto} 
                className="w-full h-full rounded-full object-cover" 
                alt="My Profile" 
                loading="eager"
              />
            </div>
          </div>
        </header>
      )}

      {activeTab === 'home' ? (
        <main className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
          <div className="w-full h-32 rounded-[2.5rem] overflow-hidden relative shadow-2xl border border-white/5 bg-white/5">
            {banners.length > 0 ? banners.map((banner, index) => (
              <div key={banner.id} className={`absolute inset-0 transition-opacity duration-1000 ${index === currentBannerIndex ? 'opacity-100' : 'opacity-0'}`}>
                <img src={banner.imageUrl} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a0b2e]/90 via-transparent to-transparent p-5 flex flex-col justify-end"><h4 className="font-black text-sm text-white">{banner.title}</h4></div>
              </div>
            )) : <div className="h-full flex items-center justify-center opacity-20"><i className="fas fa-images"></i></div>}
          </div>
          <section>
            <h2 className="text-base font-black text-white mb-3">غرف صوتية</h2>
            <div className="grid grid-cols-2 gap-3">
              {rooms.map(room => (
                <RoomCard key={room.id} room={room} onClick={handleRoomClick} />
              ))}
            </div>
          </section>
        </main>
      ) : activeTab === 'news' ? <NewsPage /> : activeTab === 'messages' ? <MessagesPage /> : <ProfilePage initialUserData={userData} forceOpenWallet={shouldOpenWalletOnProfile} onWalletOpened={() => setShouldOpenWalletOnProfile(false)} />}

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto h-16 bg-[#0d051a]/98 backdrop-blur-xl border-t border-white/5 flex justify-around items-center px-2 z-50 rounded-t-3xl">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'home' ? 'text-purple-400' : 'text-purple-300/30'}`}><i className="fas fa-home text-sm"></i><span className="text-[8px] font-black uppercase">الرئيسية</span></button>
        <button onClick={() => setActiveTab('news')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'news' ? 'text-purple-400' : 'text-purple-300/30'}`}><i className="fas fa-newspaper text-sm"></i><span className="text-[8px] font-black uppercase">أخبار</span></button>
        <div className="relative -top-3 flex flex-col items-center gap-1">
          <button onClick={() => setIsCreateModalOpen(true)} className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 shadow-lg flex items-center justify-center text-xl border-4 border-[#1a0b2e] active:scale-90 transition-transform text-white"><i className="fas fa-plus"></i></button>
          <span className="text-[8px] font-black uppercase text-purple-300/60">إنشاء</span>
        </div>
        <button onClick={() => setActiveTab('messages')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'messages' ? 'text-purple-400' : 'text-purple-300/30'}`}><i className="fas fa-comment-dots text-sm"></i><span className="text-[8px] font-black uppercase">رسائل</span></button>
        <button onClick={() => setActiveTab('me')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'me' ? 'text-purple-400' : 'text-purple-300/30'}`}><i className="fas fa-user text-sm"></i><span className="text-[8px] font-black uppercase">أنا</span></button>
      </nav>

      {/* الفقاعة العائمة المتحركة المحسنة */}
      {isMinimized && activeRoom && (
        <div 
          className="fixed z-[300] flex flex-col items-end gap-1 touch-none"
          style={{ left: bubblePos.x, top: bubblePos.y }}
        >
          {/* زر إغلاق (X) على جهة اليمين - شفاف وعصري */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setActiveRoom(null);
              setIsMinimized(false);
            }}
            className="w-6 h-6 bg-black/40 backdrop-blur-xl text-white/80 rounded-full flex items-center justify-center shadow-lg active:scale-75 transition-all z-[310] border border-white/20 hover:bg-red-500/40 mb-1"
          >
            <i className="fas fa-times text-[10px]"></i>
          </button>
          
          <div 
            onMouseDown={onMouseDown}
            onTouchStart={onMouseDown}
            onClick={() => {
              if (!hasMoved.current) setIsMinimized(false);
            }}
            className="w-16 h-16 rounded-full border-[3px] border-purple-500/80 shadow-[0_0_20px_rgba(168,85,247,0.4)] cursor-move overflow-hidden bg-[#1a0b2e] active:scale-95 transition-all animate-slow-rotate relative"
          >
            <img src={activeRoom.coverImage} className="w-full h-full object-cover pointer-events-none select-none" alt="minimized" />
            <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-transparent pointer-events-none"></div>
          </div>
        </div>
      )}

      <CreateRoomModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      {activeRoom && !isMinimized && (
        <VoiceRoom 
          room={activeRoom} 
          onLeave={() => { setActiveRoom(null); setIsMinimized(false); }} 
          onMinimize={() => setIsMinimized(true)}
          onOpenWallet={() => { setActiveTab('me'); setIsMinimized(false); setShouldOpenWalletOnProfile(true); setActiveRoom(null); }}
          micStates={roomMicStates}
          setMicStates={setRoomMicStates}
          isMicMuted={isMicMuted}
          setIsMicMuted={setIsMicMuted}
        />
      )}

      <style>{`
        @keyframes slowRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-slow-rotate {
          animation: slowRotate 8s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default App;
