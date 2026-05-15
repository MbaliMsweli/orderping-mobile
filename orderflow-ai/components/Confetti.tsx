'use client';

import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
  round: boolean;
}

const COLORS = ['#FF6B4A', '#FFD700', '#00C9A7', '#A78BFA', '#F472B6', '#60A5FA', '#34D399'];

interface ConfettiProps {
  visible: boolean;
  onDone: () => void;
}

export default function Confetti({ visible, onDone }: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!visible) return;
    const ps: Particle[] = Array.from({ length: 32 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: COLORS[i % COLORS.length],
      delay: Math.random() * 0.6,
      duration: 1.2 + Math.random() * 1,
      size: 6 + Math.random() * 6,
      round: i % 3 === 0,
    }));
    setParticles(ps);
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [visible, onDone]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, pointerEvents: 'none',
      zIndex: 9999, overflow: 'hidden',
    }}>
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-20px) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            top: 0,
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            borderRadius: p.round ? '50%' : 2,
            background: p.color,
            animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}
    </div>
  );
}
