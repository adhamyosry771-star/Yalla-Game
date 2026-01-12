
import React from 'react';
import { Room } from '../types';

interface RoomCardProps {
  room: Room;
  onClick: (room: Room) => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({ room, onClick }) => {
  return (
    <div 
      onClick={() => onClick(room)}
      className="relative rounded-[2rem] overflow-hidden cursor-pointer transform transition-all active:scale-95 border border-white/5 group shadow-2xl bg-[#0d051a] aspect-[1/1.1]"
    >
      {/* صورة الروم تملأ المربع بالكامل */}
      <img src={room.coverImage} alt={room.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
      
      {/* تدرج لوني لجعل النصوص واضحة */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30"></div>
      
      {/* عداد المتصلين في الأعلى */}
      <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-xl text-[9px] flex items-center gap-1.5 border border-white/10 z-10 shadow-lg">
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
        <span className="font-black text-white">{room.participantsCount}</span>
      </div>

      {/* بيانات الغرفة في الأسفل */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col gap-1 z-10">
        <h3 className="font-black text-[12px] text-white leading-tight truncate drop-shadow-lg">
          {room.title}
        </h3>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-full border border-white/20 overflow-hidden shadow-lg">
              <img src={room.owner.avatar} className="w-full h-full object-cover" />
            </div>
            <span className="text-[9px] text-white/80 font-bold truncate opacity-90">
              {room.owner.name}
            </span>
          </div>
          <div className="bg-white/10 backdrop-blur-md w-5 h-5 rounded-lg flex items-center justify-center border border-white/5">
            <i className="fas fa-volume-up text-[8px] text-purple-300"></i>
          </div>
        </div>
      </div>
    </div>
  );
};
