
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, serverTimestamp, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose }) => {
  const [title, setTitle] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [selectedBg, setSelectedBg] = useState<string | null>(null);
  const [availableBgs, setAvailableBgs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserData, setCurrentUserData] = useState<any>(null);

  useEffect(() => {
    let unsubscribeUser: any;
    
    if (isOpen) {
      const fetchBgs = async () => {
        const querySnapshot = await getDocs(collection(db, "roomBackgrounds"));
        setAvailableBgs(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      };
      fetchBgs();

      const user = auth.currentUser;
      if (user) {
        unsubscribeUser = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) {
            setCurrentUserData(docSnap.data());
          }
        });
      }
    }

    return () => {
      if (unsubscribeUser) unsubscribeUser();
    };
  }, [isOpen]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'cover') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCoverImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = async () => {
    if (!title || !coverImage || !selectedBg) return alert("يرجى إكمال جميع البيانات واختيار خلفية");
    setIsLoading(true);
    try {
      const user = auth.currentUser;
      const customId = currentUserData?.customId || user?.uid.substring(0, 8);
      
      await addDoc(collection(db, "rooms"), {
        title,
        coverImage,
        roomBackground: selectedBg,
        roomIdDisplay: customId, // تخزين الـ ID لعرضه في الغرفة
        owner: {
          uid: user?.uid,
          name: currentUserData?.displayName || user?.displayName || 'مستخدم جديد',
          avatar: currentUserData?.photoURL || user?.photoURL || '',
          customId: customId
        },
        participantsCount: 1,
        createdAt: serverTimestamp()
      });
      onClose();
      setTitle('');
      setCoverImage(null);
      setSelectedBg(null);
      alert("تم إنشاء الغرفة بنجاح!");
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[600] bg-[#1a0b2e] animate-in slide-in-from-bottom duration-300 flex flex-col" dir="rtl">
      <header className="p-4 flex items-center justify-between border-b border-white/5 bg-[#0d051a]/50 backdrop-blur-md">
        <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white">
          <i className="fas fa-times"></i>
        </button>
        <h2 className="text-lg font-black text-white">إنشاء غرفة صوتية</h2>
        <div className="w-10"></div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <div className="flex flex-col items-center gap-4">
          <label className="relative cursor-pointer group">
            <div className="w-32 h-32 rounded-[2.5rem] bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden transition-all group-hover:bg-white/10">
              {coverImage ? (
                <img src={coverImage} className="w-full h-full object-cover" alt="Cover" />
              ) : (
                <div className="flex flex-col items-center text-purple-300/40">
                  <i className="fas fa-camera text-2xl mb-2"></i>
                  <span className="text-[10px] font-black uppercase">صورة الغرفة</span>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'cover')} />
          </label>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest mr-2">اسم الغرفة</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:border-purple-500 transition-all shadow-inner"
              placeholder="مثلاً: سهرة الوناسة..."
            />
          </div>

          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-10 h-10 rounded-full border-2 border-purple-500/30 overflow-hidden bg-purple-900 shadow-lg">
              <img 
                src={currentUserData?.photoURL || auth.currentUser?.photoURL || "https://picsum.photos/200"} 
                className="w-full h-full object-cover" 
                alt="Owner" 
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-white">{currentUserData?.displayName || auth.currentUser?.displayName || 'المستخدم'}</span>
              <span className="text-[9px] text-purple-400 font-bold uppercase tracking-wider">المنشئ (ID: {currentUserData?.customId})</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest mr-2">اختر خلفية الغرفة (داخل الروم)</label>
          <div className="grid grid-cols-3 gap-3">
            {availableBgs.map((bg) => (
              <div 
                key={bg.id}
                onClick={() => setSelectedBg(bg.imageUrl)}
                className={`relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer border-2 transition-all ${selectedBg === bg.imageUrl ? 'border-purple-500 scale-95' : 'border-transparent opacity-60'}`}
              >
                <img src={bg.imageUrl} className="w-full h-full object-cover" alt="Background" />
                {selectedBg === bg.imageUrl && (
                  <div className="absolute inset-0 bg-purple-600/20 flex items-center justify-center">
                    <i className="fas fa-check-circle text-white text-xl"></i>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 bg-[#0d051a]/50 backdrop-blur-md border-t border-white/5">
        <button 
          onClick={handleCreate}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-4 rounded-2xl font-black text-white shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          {isLoading ? <i className="fas fa-spinner animate-spin"></i> : (
            <>
              <i className="fas fa-magic"></i>
              <span>إطلاق الغرفة الآن</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
