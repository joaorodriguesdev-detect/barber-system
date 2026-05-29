// frontend/src/components/LocationMap.tsx
'use client';
import { MapPin } from 'lucide-react';

export default function LocationMap() {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5 px-1 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
        <MapPin size={14} className="text-blue-500" />
        <span>Nossa Localização</span>
      </div>
            <div className="relative overflow-hidden w-full aspect-video bg-black rounded-2xl border border-white/[0.06] grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-500 hover:scale-[1.02] hover:border-white/[0.14] active:scale-[0.99]">
        <iframe 
          src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d14437.947230485642!2d-49.276855!3d-25.4284!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1spt-BR!2sbr!4v1700000000000!5m2!1spt-BR!2sbr" 
          className="w-full h-full border-none"
          allowFullScreen={false} 
          loading="lazy"
        />
      </div>
    </section>
  );
}