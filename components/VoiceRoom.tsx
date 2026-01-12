
import React, { useState, useEffect, useRef } from 'react';
import { Room, Gift, ChatMessage } from '../types';
import { GIFTS } from '../constants';
import { auth, db } from '../firebase';
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

interface VoiceRoomProps {
  room: Room & { roomBackground?: string; roomIdDisplay?: string };
  onLeave: () => void;
  onMinimize: () => void;
  onOpenWallet?: () => void;
  micStates: any[];
  setMicStates: React.Dispatch<React.SetStateAction<any[]>>;
  isMicMuted: boolean;
  setIsMicMuted: React.Dispatch<React.SetStateAction<boolean>>;
}

type GiftTab = 'normal' | 'cp' | 'famous' | 'country' | 'vip' | 'birthday';
type SelectionMode = 'manual' | 'all-room' | 'all-mic';

export const VoiceRoom: React.FC<VoiceRoomProps> = ({ 
  room, onLeave, onMinimize, onOpenWallet, 
  micStates, setMicStates, isMicMuted, setIsMicMuted 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [showGifts, setShowGifts] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  
  const [selectedMicIndex, setSelectedMicIndex] = useState<number | null>(null);
  const [showMicActions, setShowMicActions] = useState(false);
  
  const [giftTab, setGiftTab] = useState<GiftTab>('normal');
  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null); 
  const [ownerData, setOwnerData] = useState<any>(null);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [selectionMode, setSelectionMode] = useState<SelectionMode>('manual');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [showSelectionMenu, setShowSelectionMenu] = useState(false);

  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const [showQuantityMenu, setShowQuantityMenu] = useState(false);
  const quantities = [1, 7, 38, 66, 188, 520, 1314];

  const user = auth.currentUser;
  const isRoomOwner = user?.uid === room.owner?.uid;

  // قائمة جميع المتواجدين
  const allPresentUsers = [];
  if (currentUserData || user) {
    allPresentUsers.push(currentUserData || { uid: user?.uid, displayName: user?.displayName, photoURL: user?.photoURL, customId: user?.uid.substring(0,8) });
  }
  micStates.forEach(mic => {
    if (mic.user && !allPresentUsers.find(p => p.uid === mic.user.uid)) {
      allPresentUsers.push(mic.user);
    }
  });

  const usersOnMics = micStates
    .map(mic => mic.user)
    .filter((u): u is any => u !== null && u !== undefined);

  useEffect(() => {
    if (room.owner?.uid) {
      const unsub = onSnapshot(doc(db, "users", room.owner.uid), (docSnap) => {
        if (docSnap.exists()) setOwnerData(docSnap.data());
      });
      return unsub;
    }
  }, [room.owner?.uid]);

  useEffect(() => {
    if (user) {
      const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
        if (docSnap.exists()) setCurrentUserData(docSnap.data());
      });
      return unsub;
    }
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), userId: 'me', userName: 'أنت', text: inputText, type: 'text' }]);
    setInputText('');
  };

  const toggleUserSelection = (uid: string) => {
    if (selectionMode !== 'manual') return; 
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(uid)) {
      newSelected.delete(uid);
    } else {
      newSelected.add(uid);
    }
    setSelectedUserIds(newSelected);
  };

  const handleSelectionMode = (mode: SelectionMode) => {
    setSelectionMode(mode);
    setShowSelectionMenu(false);
    if (mode === 'all-room') {
      const allIds = allPresentUsers.map(u => u.uid).filter(Boolean);
      setSelectedUserIds(new Set(allIds));
    } else if (mode === 'all-mic') {
      const micIds = usersOnMics.map(u => u.uid).filter(Boolean);
      setSelectedUserIds(new Set(micIds));
    } else {
      setSelectedUserIds(new Set()); 
    }
  };

  const handleMicClick = (index: number) => {
    if (!isRoomOwner && micStates[index].user?.uid !== user?.uid) {
      if (micStates[index].status === 'open' && !micStates[index].user) {
        takeMic(index);
      }
      return;
    }
    setSelectedMicIndex(index);
    setShowMicActions(true);
  };

  const takeMic = (index: number) => {
    const newMicStates = [...micStates];
    newMicStates.forEach(m => { if (m.user?.uid === user?.uid) m.user = null; });
    newMicStates[index] = { 
      ...newMicStates[index], 
      user: currentUserData || { uid: user?.uid, photoURL: user?.photoURL, displayName: user?.displayName, customId: currentUserData?.customId || user?.uid.substring(0,8) }, 
      status: 'occupied' 
    };
    setMicStates(newMicStates);
    setIsMicMuted(false); 
    setShowMicActions(false);
  };

  const toggleLockMic = (index: number) => {
    const newMicStates = [...micStates];
    const currentStatus = newMicStates[index].status;
    newMicStates[index] = { ...newMicStates[index], status: currentStatus === 'locked' ? 'open' : 'locked', user: null };
    setMicStates(newMicStates);
    setShowMicActions(false);
  };

  const leaveMic = (index: number) => {
    const newMicStates = [...micStates];
    newMicStates[index] = { ...newMicStates[index], user: null, status: 'open' };
    setMicStates(newMicStates);
    setIsMicMuted(true);
    setShowMicActions(false);
  };

  const displayId = ownerData?.customId || room.roomIdDisplay || room.owner?.customId || room.id.substring(0,6);
  const userIsOnMic = micStates.some(m => m.user?.uid === user?.uid);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col overflow-hidden w-full h-full animate-in fade-in duration-300" dir="rtl">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img src={room.roomBackground || room.coverImage} className="w-full h-full object-cover opacity-80" alt="" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90"></div>
      </div>

      <div className="relative z-10 flex flex-col h-full w-full max-w-md mx-auto font-['Cairo']">
        <div className="p-4 flex items-center justify-between overflow-visible">
          <div className="flex items-center">
            <div className="flex items-center gap-2.5 bg-black/40 backdrop-blur-2xl border-y border-l border-white/10 rounded-l-full rounded-r-none pr-5 pl-5 py-1.5 shadow-2xl relative -mr-4">
              <div className="w-9 h-9 rounded-full overflow-hidden border border-white/20 shadow-lg flex-shrink-0">
                <img src={room.coverImage} className="w-full h-full object-cover" alt="Room" />
              </div>
              <div className="flex flex-col">
                <h2 className="font-black text-[12px] text-white leading-tight truncate max-w-[110px]">{room.title}</h2>
                <span className={`text-[8px] font-black tracking-tighter ${displayId === 'OFFICIAL' ? 'text-blue-400' : 'text-white/40'}`}>
                  ID: {displayId}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowParticipants(true)} className="h-8 px-3 rounded-full bg-black/20 backdrop-blur-md border border-white/10 flex items-center gap-1.5 active:scale-95 transition-all">
              <i className="fas fa-users text-white text-[10px]"></i>
              <span className="text-[10px] font-black text-white">{room.participantsCount}</span>
            </button>
            <button onClick={() => setShowExitDialog(true)} className="w-8 h-8 rounded-full bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white active:scale-95"><i className="fas fa-ellipsis-h text-xs"></i></button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-y-6 gap-x-1 px-2 py-6">
          {micStates.map((mic, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <button 
                onClick={() => handleMicClick(i)}
                className={`w-[52px] h-[52px] sm:w-[58px] sm:h-[58px] rounded-full border flex items-center justify-center relative transition-all duration-300 backdrop-blur-md active:scale-90 ${
                mic.user ? 'border-purple-400/50 bg-white/5 shadow-lg' : 
                mic.status === 'locked' ? 'border-white/10 bg-white/5 shadow-inner' : 'border-white/15 bg-white/5'
              }`}>
                {mic.user ? (
                  <div className="w-full h-full p-1 relative">
                    <img src={mic.user.photoURL || "https://picsum.photos/100"} className="w-full h-full rounded-full object-cover" />
                    {mic.user.uid === user?.uid && !isMicMuted && (
                      <div className="absolute -bottom-0.5 -left-0.5 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center border border-black/30 shadow-xl z-20">
                        <i className="fas fa-microphone text-[8px] text-white"></i>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-white/20">
                    {mic.status === 'locked' ? <i className="fas fa-lock text-xs opacity-40"></i> : <i className="fas fa-microphone text-base"></i>}
                  </div>
                )}
              </button>
              <div className={`px-2.5 py-0.5 rounded-full backdrop-blur-sm border shadow-sm min-w-[30px] flex justify-center items-center ${mic.user ? 'bg-black/40 border-white/10' : 'bg-black/20 border-white/5'}`}>
                <span className="text-[10px] font-black text-white/90 truncate max-w-[45px]">
                  {mic.user ? mic.user.displayName : i + 1}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-hide">
          {messages.map(msg => (
            <div key={msg.id} className="flex items-start gap-2 animate-in slide-in-from-right duration-300">
              <div className="bg-black/20 backdrop-blur-sm border border-white/5 px-3 py-1.5 rounded-2xl max-w-[85%] shadow-sm">
                <span className="font-bold text-[10px] text-purple-300 block mb-0.5">{msg.userName}</span>
                <span className="text-[12px] text-white/95 leading-tight">{msg.text}</span>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="px-3 pb-6 flex items-center gap-2 mt-auto">
          {userIsOnMic ? (
            <button 
              onClick={() => setIsMicMuted(!isMicMuted)} 
              className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 transition-all bg-white/10 text-white/70 shadow-lg active:scale-90 animate-in zoom-in duration-200"
            >
              <i className={`fas ${!isMicMuted ? 'fa-microphone' : 'fa-microphone-slash'} text-sm`}></i>
            </button>
          ) : (
            <div className="w-0 overflow-hidden transition-all duration-200"></div>
          )}
          
          <div className="flex-1 h-10">
            <form onSubmit={handleSendMessage} className="h-full">
              <input value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="تفاعل مع الجميع..." className="w-full h-full bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-5 text-[11px] text-white outline-none placeholder:text-white/30" />
            </form>
          </div>
          <button onClick={() => setShowGifts(true)} className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center shadow-xl active:scale-90 transition-transform"><i className="fas fa-gift text-white text-sm"></i></button>
        </div>
      </div>

      {showParticipants && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-6 animate-in fade-in" onClick={() => setShowParticipants(false)}>
          <div className="w-full max-w-[300px] bg-[#1a0b2e]/85 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h3 className="text-white font-black text-sm">المتواجدون في الغرفة ({allPresentUsers.length})</h3>
              <button onClick={() => setShowParticipants(false)} className="text-white/40 hover:text-white transition-colors"><i className="fas fa-times text-xs"></i></button>
            </div>
            <div className="max-h-[380px] overflow-y-auto p-3 space-y-2 scrollbar-hide">
              {allPresentUsers.length > 0 ? allPresentUsers.map((u, idx) => (
                <div key={u.uid || idx} className="flex items-center gap-3 p-2 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                  <div className="w-11 h-11 rounded-full overflow-hidden border border-white/10 shadow-inner">
                    <img src={u.photoURL || "https://picsum.photos/100"} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <span className="text-white font-bold text-[11px] truncate">{u.displayName}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                       <span className="text-purple-400 text-[8px] font-black uppercase tracking-tighter bg-purple-500/10 px-1.5 rounded-md">ID: {u.customId || u.uid?.substring(0,8)}</span>
                       {micStates.some(m => m.user?.uid === u.uid) && (
                         <span className="text-green-400 text-[7px] font-bold bg-green-500/10 px-1.5 rounded-md">على المايك</span>
                       )}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="py-10 text-center space-y-3 opacity-30">
                  <i className="fas fa-user-friends text-2xl text-white"></i>
                  <p className="text-[10px] text-white font-bold">الغرفة فارغة</p>
                </div>
              )}
              <div className="p-4 text-center">
                <p className="text-white/10 text-[8px] font-black uppercase tracking-[0.2em]">End of List</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMicActions && selectedMicIndex !== null && (
        <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/60 backdrop-blur-[2px] animate-in fade-in" onClick={() => setShowMicActions(false)}>
          <div className="w-full max-w-md bg-[#1a0b2e]/60 backdrop-blur-2xl rounded-t-[2.5rem] p-6 pb-10 space-y-4 animate-slide-up border-t border-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center mb-4">
              <div className="w-12 h-1.5 bg-white/20 rounded-full mb-6"></div>
              <h3 className="text-white font-black text-lg">تحكم المايك رقم {selectedMicIndex + 1}</h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {micStates[selectedMicIndex].user?.uid === user?.uid ? (
                <button onClick={() => leaveMic(selectedMicIndex)} className="w-full py-4 bg-red-500/20 text-red-400 rounded-2xl font-black flex items-center justify-center gap-3 border border-red-500/20 active:scale-95 transition-all">
                  <i className="fas fa-sign-out-alt"></i> مغادرة المايك
                </button>
              ) : (
                <button onClick={() => takeMic(selectedMicIndex)} className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all">
                  <i className="fas fa-hand-pointer"></i> أخذ المايك
                </button>
              )}
              
              {isRoomOwner && micStates[selectedMicIndex].user?.uid !== user?.uid && (
                <button onClick={() => toggleLockMic(selectedMicIndex)} className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-3 border transition-all active:scale-95 ${
                  micStates[selectedMicIndex].status === 'locked' 
                  ? 'bg-white/10 text-white border-white/20' 
                  : 'bg-white/5 text-white/80 border-white/10'
                }`}>
                  <i className={`fas ${micStates[selectedMicIndex].status === 'locked' ? 'fa-lock-open' : 'fa-lock'}`}></i>
                  {micStates[selectedMicIndex].status === 'locked' ? 'فتح المايك' : 'قفل المايك'}
                </button>
              )}
              
              <button onClick={() => setShowMicActions(false)} className="w-full py-4 bg-white/5 text-white/40 rounded-2xl font-black active:scale-95 transition-all">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {showGifts && (
        <>
          <div className="fixed inset-0 z-[105] bg-black/10 animate-in fade-in" onClick={() => setShowGifts(false)}></div>
          <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-[110] bg-black/60 backdrop-blur-2px border-t border-white/10 animate-slide-up h-[366px] flex flex-col overflow-hidden rounded-t-[2.5rem] shadow-2xl">
            
            <div className="px-5 pt-4 flex items-center justify-between relative">
              <div className="flex items-center -space-x-2 overflow-visible">
                {usersOnMics.length > 0 ? (
                  usersOnMics.slice(0, 5).map((u, i) => (
                    <button 
                      key={u.uid || i} 
                      onClick={() => toggleUserSelection(u.uid)}
                      className="w-9 h-9 rounded-full relative flex items-center justify-center bg-purple-900 shadow-md transition-all active:scale-90"
                    >
                      {selectedUserIds.has(u.uid) && (
                        <div className="absolute inset-[-2px] rounded-full border-[3px] border-[#1a0b2e]/60 pointer-events-none z-0"></div>
                      )}
                      <img 
                        src={u.photoURL || "https://picsum.photos/50"} 
                        className="w-full h-full rounded-full object-cover z-10" 
                      />
                    </button>
                  ))
                ) : (
                  <div className="text-[10px] text-white/40 font-black pr-2">لا يوجد أحد على المايك</div>
                )}
                {usersOnMics.length > 5 && (
                  <div className="w-9 h-9 rounded-full border-2 border-slate-900 bg-black/40 flex items-center justify-center text-[10px] text-white font-bold backdrop-blur-sm z-10">
                    +{usersOnMics.length - 5}
                  </div>
                )}
              </div>

              <div className="relative">
                <button 
                  onClick={() => setShowSelectionMenu(!showSelectionMenu)}
                  className="w-9 h-9 rounded-full bg-[#1a0b2e]/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95"
                >
                  <i className={`fas fa-chevron-down text-[12px] transition-transform ${showSelectionMenu ? 'rotate-180' : ''}`}></i>
                </button>

                {showSelectionMenu && (
                  <div className="absolute top-full left-0 mt-2 w-32 bg-[#0d051a]/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 animate-in zoom-in duration-200">
                    <button 
                      onClick={() => handleSelectionMode('manual')}
                      className="w-full py-3 px-4 text-right text-[10px] font-black text-white hover:bg-white/10 transition-colors border-b border-white/5 flex items-center justify-between"
                    >
                      <span>تحديد</span>
                      {selectionMode === 'manual' && <i className="fas fa-check text-purple-400 text-[8px]"></i>}
                    </button>
                    <button 
                      onClick={() => handleSelectionMode('all-room')}
                      className="w-full py-3 px-4 text-right text-[10px] font-black text-white hover:bg-white/10 transition-colors border-b border-white/5 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <i className="fas fa-home text-[10px] opacity-60"></i>
                        <span>كل الغرفة</span>
                      </div>
                      {selectionMode === 'all-room' && <i className="fas fa-check text-purple-400 text-[8px]"></i>}
                    </button>
                    <button 
                      onClick={() => handleSelectionMode('all-mic')}
                      className="w-full py-3 px-4 text-right text-[10px] font-black text-white hover:bg-white/10 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <i className="fas fa-microphone text-[10px] opacity-60"></i>
                        <span>كل المايك</span>
                      </div>
                      {selectionMode === 'all-mic' && <i className="fas fa-check text-purple-400 text-[8px]"></i>}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 mt-3 pb-2">
              <div className="flex items-center justify-between w-full px-1 border-b border-white/10">
                {['normal', 'cp', 'famous', 'country', 'vip', 'birthday'].map((tab) => (
                   <button key={tab} onClick={() => setGiftTab(tab as GiftTab)} className={`relative flex-1 flex flex-col items-center text-[10px] font-black transition-all pb-1.5 ${giftTab === tab ? 'text-purple-400' : 'text-white/40'}`}>
                    {tab === 'normal' ? 'عادية' : tab === 'cp' ? 'CP' : tab === 'famous' ? 'مشاهير' : tab === 'country' ? 'دولة' : tab === 'vip' ? 'VIP' : 'ميلاد'}
                    {giftTab === tab && <div className="absolute bottom-0 w-6 h-0.5 bg-purple-400 rounded-full"></div>}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pt-1 scrollbar-hide">
              <div className="grid grid-cols-4 gap-2">
                {GIFTS.map(gift => (
                  <button key={gift.id} onClick={() => setSelectedGiftId(gift.id)} className={`flex flex-col items-center justify-center p-1 py-3 rounded-2xl transition-all h-[92px] ${selectedGiftId === gift.id ? 'bg-[#1a0b2e]/30' : 'bg-white/5'}`}>
                    <div className={`text-2xl mb-2 ${selectedGiftId === gift.id ? 'animate-gift-push' : ''}`}>{gift.icon}</div>
                    <span className="text-[10px] text-white font-bold mb-0.5">{gift.name}</span>
                    <div className="flex items-center gap-1"><span className="text-[10px] text-yellow-500 font-black">{gift.price}</span><i className="fas fa-coins text-yellow-500 text-[8px]"></i></div>
                  </button>
                ))}
              </div>
            </div>

            <div className="px-6 h-20 bg-black/40 border-t border-white/10 flex items-center justify-between py-2.5 overflow-visible">
              <button onClick={() => { setShowGifts(false); if(onOpenWallet) onOpenWallet(); }} className="flex items-center gap-2 bg-white/10 rounded-full h-9 px-4 border border-white/10">
                <div className="flex flex-row-reverse items-center gap-2">
                  <span className="text-[13px] text-white font-black">{(currentUserData?.coins || 0).toLocaleString('ar-EG')}</span>
                  <i className="fas fa-coins text-yellow-500 text-[10px]"></i>
                </div>
              </button>
              
              <div className="flex items-center h-9 w-[131px] relative overflow-visible">
                 <div className="flex items-center h-full w-full rounded-full border border-[#2d1252]/60 overflow-hidden shadow-lg">
                    <div className="basis-1/2 h-full relative overflow-visible bg-[#2d1252]/30">
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           setShowQuantityMenu(!showQuantityMenu);
                         }}
                         className="w-full h-full flex items-center justify-center gap-1 transition-all active:scale-95 z-20"
                       >
                         <i className={`fas fa-chevron-up text-[7px] text-white/60 transition-transform ${showQuantityMenu ? 'rotate-180' : ''}`}></i>
                         <span className="text-[9.5px] font-black text-white/90">x{selectedQuantity}</span>
                       </button>

                       {showQuantityMenu && (
                         <div className="absolute bottom-[calc(100%+12px)] left-0 w-[131px] bg-[#1a0b2e]/60 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-[150] animate-in zoom-in duration-200 origin-bottom">
                           <div className="flex flex-col max-h-48 overflow-y-auto scrollbar-hide">
                            {quantities.map((q) => (
                              <button 
                                key={q}
                                onClick={(e) => { 
                                  e.stopPropagation();
                                  setSelectedQuantity(q); 
                                  setShowQuantityMenu(false); 
                                }}
                                className={`w-full py-3 px-4 text-center text-[10px] font-black transition-colors border-b border-white/5 last:border-0 ${selectedQuantity === q ? 'bg-purple-600/30 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                              >
                                x{q}
                              </button>
                            ))}
                           </div>
                         </div>
                       )}
                    </div>

                    <button className="basis-1/2 h-full bg-[#2d1252]/85 text-white text-[9.5px] font-black active:bg-[#3d1a6e] transition-all border-r border-[#2d1252]/60">
                      إرسال
                    </button>
                 </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showExitDialog && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/80 animate-in fade-in backdrop-blur-sm" onClick={() => setShowExitDialog(false)}>
          <div className="flex flex-row items-center gap-10">
            <div className="flex flex-col items-center gap-3">
              <button onClick={() => { setShowExitDialog(false); onMinimize(); }} className="w-20 h-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white active:scale-90"><i className="fas fa-compress-alt text-3xl"></i></button>
              <span className="text-white font-black text-[12px]">احتفاظ</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <button onClick={onLeave} className="w-20 h-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-red-500 active:scale-90"><i className="fas fa-sign-out-alt text-3xl"></i></button>
              <span className="text-white font-black text-[12px]">خروج</span>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); } 
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } } 
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        @keyframes giftPush {
          0% { transform: scale(1); }
          50% { transform: scale(0.8); opacity: 0.7; }
          100% { transform: scale(1.1); opacity: 1; }
        }
        .animate-gift-push {
          animation: giftPush 0.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite alternate;
        }
      `}</style>
    </div>
  );
};
