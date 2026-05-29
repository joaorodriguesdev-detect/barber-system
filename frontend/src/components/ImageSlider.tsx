'use client';
import { useState, useEffect } from 'react';

const IMAGES = [
  '/modalimagens/md1.avif',
  '/modalimagens/md2.avif',
  '/modalimagens/md3.avif',
  '/modalimagens/md4.avif',
  '/modalimagens/md5.avif',
  '/modalimagens/md6.avif',
  '/modalimagens/md7.avif',
  '/modalimagens/md8.avif',
];

export default function ImageSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % IMAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative overflow-hidden rounded-[28px] h-52 flex items-center justify-center border border-white/[0.08] bg-black">
      {IMAGES.map((src, index) => (
        <img
          key={src}
          src={src}
          alt={`Slide ${index + 1}`}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out"
          style={{ opacity: index === current ? 1 : 0, zIndex: index === current ? 10 : 0 }}
        />
      ))}

      {/* Indicadores inferiores */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {IMAGES.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
              index === current
                ? 'bg-white w-4'
                : 'bg-white/40 hover:bg-white/60'
            }`}
            aria-label={`Ir para slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
