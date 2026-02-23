/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Target, Rocket as RocketIcon, Trophy, AlertTriangle, Languages } from 'lucide-react';
import { GameStatus, GameState, Rocket, Missile, Explosion, City, Battery, Point } from './types';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  ROCKET_SPEED_BASE, 
  MISSILE_SPEED, 
  EXPLOSION_MAX_RADIUS, 
  EXPLOSION_SPEED, 
  WIN_SCORE, 
  INITIAL_MISSILES,
  TRANSLATIONS 
} from './constants';

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    status: GameStatus.START,
    score: 0,
    level: 1,
    rockets: [],
    missiles: [],
    explosions: [],
    cities: [
      { id: 'c1', pos: { x: 150, y: 560 }, active: true },
      { id: 'c2', pos: { x: 250, y: 560 }, active: true },
      { id: 'c3', pos: { x: 350, y: 560 }, active: true },
      { id: 'c4', pos: { x: 450, y: 560 }, active: true },
      { id: 'c5', pos: { x: 550, y: 560 }, active: true },
      { id: 'c6', pos: { x: 650, y: 560 }, active: true },
    ],
    batteries: [
      { id: 'b1', pos: { x: 50, y: 560 }, active: true, missiles: INITIAL_MISSILES },
      { id: 'b2', pos: { x: 400, y: 560 }, active: true, missiles: INITIAL_MISSILES },
      { id: 'b3', pos: { x: 750, y: 560 }, active: true, missiles: INITIAL_MISSILES },
    ],
    language: 'zh',
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);
  const lastTimeRef = useRef<number>(0);
  const t = TRANSLATIONS[gameState.language];

  const initGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      status: GameStatus.PLAYING,
      score: 0,
      level: 1,
      rockets: [],
      missiles: [],
      explosions: [],
      cities: prev.cities.map(c => ({ ...c, active: true, destroyedAt: undefined })),
      batteries: prev.batteries.map(b => ({ ...b, active: true, missiles: INITIAL_MISSILES, destroyedAt: undefined })),
    }));
  }, []);

  const toggleLanguage = () => {
    setGameState(prev => ({ ...prev, language: prev.language === 'zh' ? 'en' : 'zh' }));
  };

  const handleCanvasClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState.status !== GameStatus.PLAYING) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const targetX = (clientX - rect.left) * scaleX;
    const targetY = (clientY - rect.top) * scaleY;

    // Find nearest active battery with missiles
    let bestBatteryIndex = -1;
    let minDist = Infinity;

    gameState.batteries.forEach((b, idx) => {
      if (b.active && b.missiles > 0) {
        const dist = Math.abs(b.pos.x - targetX);
        if (dist < minDist) {
          minDist = dist;
          bestBatteryIndex = idx;
        }
      }
    });

    if (bestBatteryIndex !== -1) {
      const battery = gameState.batteries[bestBatteryIndex];
      const newMissile: Missile = {
        id: Math.random().toString(36).substr(2, 9),
        start: { ...battery.pos },
        target: { x: targetX, y: targetY },
        pos: { ...battery.pos },
        speed: MISSILE_SPEED,
        progress: 0,
      };

      setGameState(prev => {
        const newBatteries = [...prev.batteries];
        newBatteries[bestBatteryIndex] = {
          ...newBatteries[bestBatteryIndex],
          missiles: newBatteries[bestBatteryIndex].missiles - 1,
        };
        return {
          ...prev,
          missiles: [...prev.missiles, newMissile],
          batteries: newBatteries,
        };
      });
    }
  };

  const update = useCallback((time: number) => {
    if (gameState.status !== GameStatus.PLAYING) return;

    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    setGameState(prev => {
      // 1. Spawn Rockets
      let newRockets = [...prev.rockets];
      if (Math.random() < 0.02 + (prev.score / 5000)) {
        const targetOptions = [
          ...prev.cities.filter(c => c.active).map(c => c.pos),
          ...prev.batteries.filter(b => b.active).map(b => b.pos)
        ];
        if (targetOptions.length > 0) {
          const target = targetOptions[Math.floor(Math.random() * targetOptions.length)];
          newRockets.push({
            id: Math.random().toString(36).substr(2, 9),
            start: { x: Math.random() * CANVAS_WIDTH, y: 0 },
            target: { ...target },
            pos: { x: 0, y: 0 },
            speed: ROCKET_SPEED_BASE + (Math.random() * 0.001),
            progress: 0,
          });
        }
      }

      // 2. Update Rockets
      let scoreGain = 0;
      let newExplosions = [...prev.explosions];
      let newCities = [...prev.cities];
      let newBatteries = [...prev.batteries];
      const now = Date.now();

      // Auto-repair logic
      newCities = newCities.map(c => {
        if (!c.active && c.destroyedAt && now - c.destroyedAt > 5000) {
          return { ...c, active: true, destroyedAt: undefined };
        }
        return c;
      });
      newBatteries = newBatteries.map(b => {
        if (!b.active && b.destroyedAt && now - b.destroyedAt > 2500) {
          return { ...b, active: true, destroyedAt: undefined, missiles: INITIAL_MISSILES };
        }
        return b;
      });

      newRockets = newRockets.map(rocket => {
        const progress = rocket.progress + rocket.speed;
        const x = rocket.start.x + (rocket.target.x - rocket.start.x) * progress;
        const y = rocket.start.y + (rocket.target.y - rocket.start.y) * progress;
        return { ...rocket, progress, pos: { x, y } };
      });

      newRockets = newRockets.filter(rocket => {
        // Check collision with explosions
        const hitByExplosion = newExplosions.some(exp => {
          const dist = Math.sqrt(Math.pow(rocket.pos.x - exp.pos.x, 2) + Math.pow(rocket.pos.y - exp.pos.y, 2));
          return dist < exp.radius;
        });

        if (hitByExplosion) {
          scoreGain += 20;
          return false;
        }

        // Check arrival at target
        if (rocket.progress >= 1) {
          // Impact!
          newExplosions.push({
            id: 'impact-' + Math.random(),
            pos: { ...rocket.target },
            radius: 0,
            maxRadius: EXPLOSION_MAX_RADIUS * 1.5,
            expanding: true,
            life: 1,
          });

          // Damage city or battery
          newCities = newCities.map(c => {
            if (c.pos.x === rocket.target.x && c.pos.y === rocket.target.y && c.active) {
              return { ...c, active: false, destroyedAt: now };
            }
            return c;
          });
          newBatteries = newBatteries.map(b => {
            if (b.pos.x === rocket.target.x && b.pos.y === rocket.target.y && b.active) {
              return { ...b, active: false, destroyedAt: now };
            }
            return b;
          });

          return false;
        }
        return true;
      });

      // 3. Update Missiles
      let newMissiles = prev.missiles.map(missile => {
        const progress = missile.progress + missile.speed;
        const x = missile.start.x + (missile.target.x - missile.start.x) * progress;
        const y = missile.start.y + (missile.target.y - missile.start.y) * progress;
        return { ...missile, progress, pos: { x, y } };
      });

      newMissiles = newMissiles.filter(missile => {
        if (missile.progress >= 1) {
          newExplosions.push({
            id: 'exp-' + Math.random(),
            pos: { ...missile.target },
            radius: 0,
            maxRadius: EXPLOSION_MAX_RADIUS,
            expanding: true,
            life: 1,
          });
          return false;
        }
        return true;
      });

      // 4. Update Explosions
      newExplosions = newExplosions.map(exp => {
        let radius = exp.radius;
        let expanding = exp.expanding;
        if (expanding) {
          radius += EXPLOSION_SPEED * 40;
          if (radius >= exp.maxRadius) expanding = false;
        } else {
          radius -= EXPLOSION_SPEED * 20;
        }
        return { ...exp, radius, expanding };
      });
      newExplosions = newExplosions.filter(exp => exp.radius > 0);

      // 5. Check Win/Loss
      const totalScore = prev.score + scoreGain;
      let newStatus = prev.status;
      if (totalScore >= WIN_SCORE) newStatus = GameStatus.WON;
      if (newBatteries.every(b => !b.active)) newStatus = GameStatus.LOST;

      return {
        ...prev,
        score: totalScore,
        status: newStatus,
        rockets: newRockets,
        missiles: newMissiles,
        explosions: newExplosions,
        cities: newCities,
        batteries: newBatteries,
      };
    });

    requestRef.current = requestAnimationFrame(update);
  }, [gameState.status]);

  useEffect(() => {
    if (gameState.status === GameStatus.PLAYING) {
      requestRef.current = requestAnimationFrame(update);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState.status, update]);

  // Canvas Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Ground
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 550, CANVAS_WIDTH, 50);

    // Draw Cities
    gameState.cities.forEach(city => {
      if (city.active) {
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(city.pos.x - 15, city.pos.y - 20, 30, 20);
        ctx.fillStyle = '#1d4ed8';
        ctx.fillRect(city.pos.x - 10, city.pos.y - 25, 10, 5);
        ctx.fillRect(city.pos.x + 2, city.pos.y - 28, 8, 8);
      } else {
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.arc(city.pos.x, city.pos.y - 5, 15, 0, Math.PI, true);
        ctx.fill();
      }
    });

    // Draw Batteries
    gameState.batteries.forEach(battery => {
      if (battery.active) {
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.moveTo(battery.pos.x - 20, battery.pos.y);
        ctx.lineTo(battery.pos.x, battery.pos.y - 30);
        ctx.lineTo(battery.pos.x + 20, battery.pos.y);
        ctx.fill();
        
        // Ammo indicator
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(battery.missiles.toString(), battery.pos.x, battery.pos.y + 15);
      } else {
        ctx.fillStyle = '#451a03';
        ctx.fillRect(battery.pos.x - 15, battery.pos.y - 10, 30, 10);
      }
    });

    // Draw Rockets (Flying Pigs)
    gameState.rockets.forEach(rocket => {
      ctx.save();
      ctx.translate(rocket.pos.x, rocket.pos.y);
      
      // Rotate pig to face direction of travel
      const angle = Math.atan2(rocket.target.y - rocket.start.y, rocket.target.x - rocket.start.x);
      ctx.rotate(angle + Math.PI / 2);

      // Pig Body
      ctx.fillStyle = '#ffafcc';
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pig Ears
      ctx.fillStyle = '#ff8fab';
      ctx.beginPath();
      ctx.moveTo(-8, -8);
      ctx.lineTo(-12, -15);
      ctx.lineTo(-4, -10);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(8, -8);
      ctx.lineTo(12, -15);
      ctx.lineTo(4, -10);
      ctx.fill();

      // Pig Snout
      ctx.fillStyle = '#ff8fab';
      ctx.beginPath();
      ctx.ellipse(0, 5, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(-3, -2, 1.5, 0, Math.PI * 2);
      ctx.arc(3, -2, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Wings
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      const wingWobble = Math.sin(Date.now() / 50) * 5;
      const wingRadius = Math.max(0.1, 4 + wingWobble);
      ctx.beginPath();
      ctx.ellipse(-12, 0, 8, wingRadius, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(12, 0, 8, wingRadius, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Trail
      ctx.strokeStyle = 'rgba(255, 175, 204, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(rocket.start.x, rocket.start.y);
      ctx.lineTo(rocket.pos.x, rocket.pos.y);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Draw Missiles
    gameState.missiles.forEach(missile => {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(missile.start.x, missile.start.y);
      ctx.lineTo(missile.pos.x, missile.pos.y);
      ctx.stroke();

      // Target X
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(missile.target.x - 5, missile.target.y - 5);
      ctx.lineTo(missile.target.x + 5, missile.target.y + 5);
      ctx.moveTo(missile.target.x + 5, missile.target.y - 5);
      ctx.lineTo(missile.target.x - 5, missile.target.y + 5);
      ctx.stroke();
    });

    // Draw Explosions
    gameState.explosions.forEach(exp => {
      const gradient = ctx.createRadialGradient(exp.pos.x, exp.pos.y, 0, exp.pos.x, exp.pos.y, exp.radius);
      gradient.addColorStop(0, '#fff');
      gradient.addColorStop(0.3, '#fbbf24');
      gradient.addColorStop(0.7, '#ef4444');
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(exp.pos.x, exp.pos.y, exp.radius, 0, Math.PI * 2);
      ctx.fill();
    });

  }, [gameState]);

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Header / HUD */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-4 px-4">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-widest text-neutral-500 font-mono">{t.score}</span>
            <span className="text-2xl font-bold text-emerald-400 tabular-nums">{gameState.score}</span>
          </div>
          <div className="h-8 w-px bg-neutral-800" />
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-widest text-neutral-500 font-mono">{t.target}</span>
            <span className="text-2xl font-bold text-blue-400 tabular-nums">{WIN_SCORE}</span>
          </div>
        </div>

        <h1 className="hidden md:block text-xl font-light tracking-tighter italic text-neutral-300">
          {t.title}
        </h1>

        <button 
          onClick={toggleLanguage}
          className="p-2 rounded-full hover:bg-neutral-800 transition-colors border border-neutral-800"
        >
          <Languages size={20} />
        </button>
      </div>

      {/* Game Area */}
      <div className="relative w-full max-w-4xl aspect-[4/3] bg-black rounded-2xl overflow-hidden shadow-2xl border border-neutral-800">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={handleCanvasClick}
          onTouchStart={handleCanvasClick}
          className="w-full h-full cursor-crosshair touch-none"
        />

        {/* Overlay Screens */}
        <AnimatePresence>
          {gameState.status === GameStatus.START && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
            >
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Shield className="w-16 h-16 text-blue-500 mb-6 mx-auto" />
                <h2 className="text-4xl font-bold mb-4 tracking-tight">{t.title}</h2>
                <p className="text-neutral-400 max-w-md mb-8 leading-relaxed">
                  {t.howToPlay}
                </p>
                <button
                  onClick={initGame}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-900/20"
                >
                  {t.start}
                </button>
              </motion.div>
            </motion.div>
          )}

          {gameState.status === GameStatus.WON && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-emerald-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
            >
              <Trophy className="w-20 h-20 text-yellow-400 mb-6" />
              <h2 className="text-4xl font-bold mb-4">{t.win}</h2>
              <div className="text-6xl font-black mb-8 text-emerald-400">{gameState.score}</div>
              <button
                onClick={initGame}
                className="px-8 py-3 bg-white text-emerald-950 rounded-full font-bold hover:bg-neutral-200 transition-all"
              >
                {t.restart}
              </button>
            </motion.div>
          )}

          {gameState.status === GameStatus.LOST && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-red-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
            >
              <AlertTriangle className="w-20 h-20 text-red-500 mb-6" />
              <h2 className="text-4xl font-bold mb-4">{t.loss}</h2>
              <div className="text-2xl text-neutral-300 mb-8">{t.score}: {gameState.score}</div>
              <button
                onClick={initGame}
                className="px-8 py-3 bg-red-600 text-white rounded-full font-bold hover:bg-red-500 transition-all"
              >
                {t.restart}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="mt-6 flex gap-8 text-neutral-500 text-sm font-mono uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-blue-500" />
          <span>Intercept</span>
        </div>
        <div className="flex items-center gap-2">
          <RocketIcon size={14} className="text-red-500" />
          <span>Threat</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-emerald-500" />
          <span>Defend</span>
        </div>
      </div>
    </div>
  );
}
