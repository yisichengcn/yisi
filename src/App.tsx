/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Trophy, 
  Shield, 
  Zap, 
  Heart, 
  Keyboard, 
  MousePointer2,
  ChevronRight,
  X
} from 'lucide-react';
import { GameState, EnemyType, PowerUpType, ElementType, ACHIEVEMENTS, Achievement, GAME_CONSTANTS } from './types.ts';

// --- Game Engine Classes ---

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1.0;
    this.color = color;
    this.size = Math.random() * 3 + 1;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= 0.02;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
}

class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number = 5; // 1/10 of player size (50)
  color: string;
  element: ElementType;

  constructor(x: number, y: number, vx: number, vy: number, element: ElementType = ElementType.WATER) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.element = element;
    this.color = element === ElementType.WATER ? '#60a5fa' : '#ef4444';
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    const time = Date.now() / 100;

    if (this.element === ElementType.WATER) {
      // Water Ball Glow
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.color;
      
      // Main Water Body
      ctx.fillStyle = 'rgba(96, 165, 250, 0.7)';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();

      // Highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(-this.radius * 0.3, -this.radius * 0.3, this.radius * 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Fire Ball
      const flicker = Math.sin(time * 2) * 1;
      ctx.shadowBlur = 10 + flicker;
      ctx.shadowColor = '#ef4444';
      
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + flicker, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.arc(0, 0, (this.radius + flicker) * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

class Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  hp: number;
  type: EnemyType;
  color: string;
  element: ElementType;

  constructor(canvasWidth: number, type: EnemyType, level: number, element: ElementType = ElementType.FIRE) {
    this.type = type;
    this.element = element;
    switch (type) {
      case EnemyType.FAST:
        this.width = 30;
        this.height = 30;
        this.speed = 4 + level * 0.5;
        this.hp = 1;
        this.color = element === ElementType.FIRE ? '#facc15' : '#60a5fa';
        break;
      case EnemyType.HEAVY:
        this.width = 60;
        this.height = 50;
        this.speed = 1.5 + level * 0.2;
        this.hp = 5 + Math.floor(level / 2);
        this.color = element === ElementType.FIRE ? '#ef4444' : '#1e3a8a';
        break;
      default:
        this.width = 40;
        this.height = 40;
        this.speed = 2.5 + level * 0.3;
        this.hp = 2;
        this.color = element === ElementType.FIRE ? '#f97316' : '#3b82f6';
    }
    this.x = Math.random() * (canvasWidth - this.width);
    this.y = -this.height;
  }

  update() {
    this.y += this.speed;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

    const time = Date.now() / 100;

    if (this.element === ElementType.FIRE) {
      const flicker = Math.sin(time * 2) * 3;
      const radius = (this.width / 2) + flicker;

      // Fire Glow
      ctx.shadowBlur = 25 + flicker;
      ctx.shadowColor = this.color;

      // 1. Outer Layer (Main Color)
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();

      // 2. Middle Layer (Orange/Hot)
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
      ctx.fill();

      // 3. Inner Core (Yellow/White Hot)
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Flame Spikes
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + (time * 0.5);
        const spikeLen = radius * (1.2 + Math.sin(time + i) * 0.3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * spikeLen, Math.sin(angle) * spikeLen);
        ctx.stroke();
      }
    } else {
      // Water Blob Enemy
      const waterTime = time / 2;
      ctx.shadowBlur = 20;
      ctx.shadowColor = this.color;
      
      ctx.fillStyle = this.color;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const wobble = Math.sin(waterTime + i) * 3;
        const r = (this.width / 2) + wobble;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(-5, -5, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

class PowerUp {
  x: number;
  y: number;
  size: number = 30;
  type: PowerUpType;
  speed: number = 2;

  constructor(canvasWidth: number) {
    const rand = Math.random();
    if (rand > 0.7) this.type = PowerUpType.HEAL;
    else if (rand > 0.35) this.type = PowerUpType.SHIELD;
    else this.type = PowerUpType.TRIPLE_SHOT;
    this.x = Math.random() * (canvasWidth - this.size);
    this.y = -this.size;
  }

  update() {
    this.y += this.speed;
  }

  draw(ctx: CanvasRenderingContext2D) {
    let color = '#fb923c'; // Default Triple Shot
    let label = 'T';
    
    if (this.type === PowerUpType.SHIELD) {
      color = '#34d399';
      label = 'S';
    } else if (this.type === PowerUpType.HEAL) {
      color = '#ef4444';
      label = 'H';
    }

    ctx.save();
    ctx.translate(this.x + this.size / 2, this.y + this.size / 2);
    
    // Pulse effect
    const scale = 1 + Math.sin(Date.now() / 200) * 0.1;
    ctx.scale(scale, scale);

    ctx.shadowBlur = 20;
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(-this.size / 2, -this.size / 2, this.size, this.size);
    
    ctx.fillStyle = color;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 0);

    ctx.restore();
  }
}

// --- Main Component ---

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Game State
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [health, setHealth] = useState(3);
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS);
  const [activeAchievement, setActiveAchievement] = useState<Achievement | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);

  // Refs for game loop (to avoid closure issues)
  const stateRef = useRef({
    player: { x: 0, y: 0, width: 50, height: 50, invincibility: 0, shield: false, tripleShot: 0 },
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    particles: [] as Particle[],
    powerups: [] as PowerUp[],
    keys: {} as Record<string, boolean>,
    lastEnemySpawn: 0,
    lastPowerupSpawn: 0,
    lastShot: 0,
    totalKills: 0,
    noDamageLevel: true,
    powerupsCollected: 0,
    canvasSize: { width: 0, height: 0 },
    isPointerDown: false,
    playerElement: ElementType.WATER
  });

  const unlockAchievement = useCallback((id: string) => {
    setAchievements(prev => {
      const index = prev.findIndex(a => a.id === id);
      if (index !== -1 && !prev[index].unlocked) {
        const updated = [...prev];
        updated[index] = { ...updated[index], unlocked: true };
        setActiveAchievement(updated[index]);
        setTimeout(() => setActiveAchievement(null), 3000);
        return updated;
      }
      return prev;
    });
  }, []);

  const resetGame = (element: ElementType = ElementType.WATER) => {
    setScore(0);
    setLevel(1);
    setHealth(3);
    stateRef.current.playerElement = element;
    stateRef.current.bullets = [];
    stateRef.current.enemies = [];
    stateRef.current.particles = [];
    stateRef.current.powerups = [];
    stateRef.current.totalKills = 0;
    stateRef.current.noDamageLevel = true;
    stateRef.current.powerupsCollected = 0;
    stateRef.current.player.invincibility = 0;
    stateRef.current.player.shield = false;
    stateRef.current.player.tripleShot = 0;
    stateRef.current.player.x = stateRef.current.canvasSize.width / 2 - 25;
    stateRef.current.player.y = stateRef.current.canvasSize.height - 100;
    setGameState(GameState.PLAYING);
  };

  // Handle Resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current && canvasRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        stateRef.current.canvasSize = { width, height };
        
        // Initial player position
        if (stateRef.current.player.x === 0) {
          stateRef.current.player.x = width / 2 - 25;
          stateRef.current.player.y = height - 100;
        }
      }
    };

    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      stateRef.current.keys[e.code] = true;
      if (e.code === 'KeyP' && (gameState === GameState.PLAYING || gameState === GameState.PAUSED)) {
        setGameState(prev => prev === GameState.PLAYING ? GameState.PAUSED : GameState.PLAYING);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      stateRef.current.keys[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // Touch/Mouse Handling
  const handlePointerDown = (e: React.PointerEvent) => {
    if (gameState !== GameState.PLAYING) return;
    stateRef.current.isPointerDown = true;
    handlePointerMove(e);
  };

  const handlePointerUp = () => {
    stateRef.current.isPointerDown = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (gameState !== GameState.PLAYING) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      stateRef.current.player.x = e.clientX - rect.left - stateRef.current.player.width / 2;
      stateRef.current.player.y = e.clientY - rect.top - stateRef.current.player.height / 2;
    }
  };

  // Game Loop
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;

    let animationId: number;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const loop = (time: number) => {
      const { player, bullets, enemies, particles, powerups, keys, canvasSize } = stateRef.current;

      // 1. Update Player
      if (keys['ArrowLeft'] || keys['KeyA']) player.x -= GAME_CONSTANTS.PLAYER_SPEED;
      if (keys['ArrowRight'] || keys['KeyD']) player.x += GAME_CONSTANTS.PLAYER_SPEED;
      if (keys['ArrowUp'] || keys['KeyW']) player.y -= GAME_CONSTANTS.PLAYER_SPEED;
      if (keys['ArrowDown'] || keys['KeyS']) player.y += GAME_CONSTANTS.PLAYER_SPEED;

      // Boundaries
      player.x = Math.max(0, Math.min(canvasSize.width - player.width, player.x));
      player.y = Math.max(0, Math.min(canvasSize.height - player.height, player.y));

      if (player.invincibility > 0) player.invincibility -= 16;
      if (player.tripleShot > 0) player.tripleShot -= 16;

      // Shooting
      if ((keys['Space'] || stateRef.current.isPointerDown) && time - stateRef.current.lastShot > 200) {
        const centerX = player.x + player.width / 2;
        const centerY = player.y;
        
        if (player.tripleShot > 0) {
          bullets.push(new Bullet(centerX, centerY, 0, -GAME_CONSTANTS.BULLET_SPEED, stateRef.current.playerElement));
          bullets.push(new Bullet(centerX, centerY, -2, -GAME_CONSTANTS.BULLET_SPEED, stateRef.current.playerElement));
          bullets.push(new Bullet(centerX, centerY, 2, -GAME_CONSTANTS.BULLET_SPEED, stateRef.current.playerElement));
        } else {
          bullets.push(new Bullet(centerX, centerY, 0, -GAME_CONSTANTS.BULLET_SPEED, stateRef.current.playerElement));
        }
        stateRef.current.lastShot = time;
      }

      // 2. Spawn Entities
      if (time - stateRef.current.lastEnemySpawn > GAME_CONSTANTS.ENEMY_SPAWN_RATE / (1 + level * 0.2)) {
        const rand = Math.random();
        let type = EnemyType.BASIC;
        if (rand > 0.8) type = EnemyType.HEAVY;
        else if (rand > 0.6) type = EnemyType.FAST;
        
        const enemyElement = stateRef.current.playerElement === ElementType.WATER ? ElementType.FIRE : ElementType.WATER;
        enemies.push(new Enemy(canvasSize.width, type, level, enemyElement));
        stateRef.current.lastEnemySpawn = time;
      }

      if (time - stateRef.current.lastPowerupSpawn > GAME_CONSTANTS.POWERUP_SPAWN_RATE) {
        powerups.push(new PowerUp(canvasSize.width));
        stateRef.current.lastPowerupSpawn = time;
      }

      // 3. Update Entities
      bullets.forEach((b, i) => {
        b.update();
        if (b.y < -10) bullets.splice(i, 1);
      });

      enemies.forEach((e, i) => {
        e.update();
        if (e.y > canvasSize.height) {
          enemies.splice(i, 1);
          setScore(s => Math.max(0, s - 50)); // Penalty for escape
        }
      });

      powerups.forEach((p, i) => {
        p.update();
        if (p.y > canvasSize.height) powerups.splice(i, 1);
      });

      particles.forEach((p, i) => {
        p.update();
        if (p.life <= 0) particles.splice(i, 1);
      });

      // 4. Collision Detection
      // Bullets vs Enemies
      bullets.forEach((b, bi) => {
        enemies.forEach((e, ei) => {
          if (
            b.x > e.x && b.x < e.x + e.width &&
            b.y > e.y && b.y < e.y + e.height
          ) {
            bullets.splice(bi, 1);
            e.hp -= 1;
            if (e.hp <= 0) {
              enemies.splice(ei, 1);
              stateRef.current.totalKills++;
              setScore(s => {
                const newScore = s + (e.type === EnemyType.HEAVY ? 300 : e.type === EnemyType.FAST ? 200 : 100);
                if (newScore >= level * GAME_CONSTANTS.LEVEL_UP_SCORE) {
                  setLevel(l => l + 1);
                  setShowLevelUp(true);
                  setTimeout(() => setShowLevelUp(false), 2000);
                  stateRef.current.enemies = []; // Clear screen on level up
                }
                return newScore;
              });

              // Particles
              for (let k = 0; k < 10; k++) {
                particles.push(new Particle(e.x + e.width / 2, e.y + e.height / 2, e.color));
              }

              // Achievements
              if (stateRef.current.totalKills === 1) unlockAchievement('first_blood');
              if (stateRef.current.totalKills === 50) unlockAchievement('ace');
            }
          }
        });
      });

      // Player vs Enemies
      if (player.invincibility <= 0) {
        enemies.forEach((e, ei) => {
          if (
            player.x < e.x + e.width &&
            player.x + player.width > e.x &&
            player.y < e.y + e.height &&
            player.y + player.height > e.y
          ) {
            if (player.shield) {
              player.shield = false;
              enemies.splice(ei, 1);
              for (let k = 0; k < 15; k++) particles.push(new Particle(e.x + e.width / 2, e.y + e.height / 2, '#34d399'));
            } else {
              setHealth(h => {
                const next = h - 1;
                if (next <= 0) setGameState(GameState.GAMEOVER);
                return next;
              });
              player.invincibility = GAME_CONSTANTS.INVINCIBILITY_DURATION;
              stateRef.current.noDamageLevel = false;
              enemies.splice(ei, 1);
              for (let k = 0; k < 20; k++) particles.push(new Particle(player.x + player.width / 2, player.y + player.height / 2, '#ef4444'));
            }
          }
        });
      }

      // Player vs PowerUps
      powerups.forEach((p, i) => {
        if (
          player.x < p.x + p.size &&
          player.x + player.width > p.x &&
          player.y < p.y + p.size &&
          player.y + player.height > p.y
        ) {
          powerups.splice(i, 1);
          stateRef.current.powerupsCollected++;
          if (p.type === PowerUpType.SHIELD) {
            player.shield = true;
          } else if (p.type === PowerUpType.HEAL) {
            setHealth(h => Math.min(5, h + 1)); // Max 5 health
            for (let k = 0; k < 10; k++) {
              particles.push(new Particle(player.x + player.width / 2, player.y + player.height / 2, '#ef4444'));
            }
          } else {
            player.tripleShot = 10000; // 10 seconds
          }

          if (stateRef.current.powerupsCollected === 5) unlockAchievement('power_hungry');
        }
      });

      // Level based achievements
      if (level === 2 && stateRef.current.noDamageLevel) unlockAchievement('untouchable');
      if (level === 3) unlockAchievement('survivor');

      // 5. Draw
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

      // Background Stars (Simple)
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 50; i++) {
        const x = (Math.sin(i * 1234.5) * 0.5 + 0.5) * canvasSize.width;
        const y = ((time * (0.05 + (i % 5) * 0.02) + i * 100) % canvasSize.height);
        ctx.globalAlpha = 0.3 + (i % 3) * 0.2;
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.globalAlpha = 1.0;

      // Draw Entities
      bullets.forEach(b => b.draw(ctx));
      enemies.forEach(e => e.draw(ctx));
      powerups.forEach(p => p.draw(ctx));
      particles.forEach(p => p.draw(ctx));

        // Draw Player
        if (player.invincibility <= 0 || Math.floor(time / 100) % 2 === 0) {
          ctx.save();
          ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
          
          // Shield Glow
          if (player.shield) {
            ctx.beginPath();
            ctx.arc(0, 0, player.width * 0.8, 0, Math.PI * 2);
            ctx.strokeStyle = '#34d399';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#34d399';
            ctx.stroke();
          }

          if (stateRef.current.playerElement === ElementType.WATER) {
            // Water Body (Blobby effect)
            const waterTime = time / 200;
            ctx.shadowBlur = 25;
            ctx.shadowColor = '#60a5fa';
            
            // Outer Water
            ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
            ctx.beginPath();
            for (let i = 0; i < 12; i++) {
              const angle = (i / 12) * Math.PI * 2;
              const wobble = Math.sin(waterTime * 10 + i) * 4;
              const r = (player.width / 2) + wobble;
              const px = Math.cos(angle) * r;
              const py = Math.sin(angle) * r;
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();

            // Inner Water (Highlights/Reflections)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.beginPath();
            ctx.ellipse(-8, -8, 6, 10, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();

            // Bubbles inside
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            for (let i = 0; i < 3; i++) {
              const bx = Math.sin(waterTime * 3 + i) * 10;
              const by = Math.cos(waterTime * 2 + i) * 10;
              ctx.beginPath();
              ctx.arc(bx, by, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          } else {
            // Fire Body
            const flicker = Math.sin(time / 50) * 4;
            const radius = (player.width / 2) + flicker;
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#ef4444';

            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        }

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [gameState, level, unlockAchievement]);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-screen bg-slate-950 font-sans overflow-hidden scanline"
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Canvas Layer */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />

      {/* HUD Layer */}
      {gameState !== GameState.START && (
        <div className="absolute top-0 left-0 w-full p-4 md:p-8 z-10 flex justify-between items-start pointer-events-none">
          <div className="flex flex-col gap-2">
            <div className="glass px-4 py-2 rounded-xl flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <span className="font-display font-bold text-xl tracking-wider">{score.toLocaleString()}</span>
              </div>
              <div className="w-px h-4 bg-white/20" />
              <div className="flex items-center gap-2">
                <span className="text-blue-400 text-sm font-bold uppercase tracking-widest">Level</span>
                <span className="font-display font-bold text-xl">{level}</span>
              </div>
            </div>
            
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Heart 
                  key={i} 
                  className={`w-6 h-6 transition-all duration-300 ${i < health ? 'text-red-500 fill-red-500' : 'text-white/10'}`} 
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <button 
              onClick={() => setGameState(prev => prev === GameState.PLAYING ? GameState.PAUSED : GameState.PLAYING)}
              className="glass p-3 rounded-xl pointer-events-auto hover:bg-white/10 transition-colors"
            >
              {gameState === GameState.PAUSED ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
            </button>
            
            {/* Active Buffs */}
            <div className="flex flex-col gap-2">
              <AnimatePresence>
                {stateRef.current.player.shield && (
                  <motion.div 
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 20, opacity: 0 }}
                    className="glass px-3 py-1 rounded-lg flex items-center gap-2 border-emerald-500/30"
                  >
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400 uppercase">Shield Active</span>
                  </motion.div>
                )}
                {stateRef.current.player.tripleShot > 0 && (
                  <motion.div 
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 20, opacity: 0 }}
                    className="glass px-3 py-1 rounded-lg flex items-center gap-2 border-orange-500/30"
                  >
                    <Zap className="w-4 h-4 text-orange-400" />
                    <span className="text-xs font-bold text-orange-400 uppercase">Triple Shot</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* Overlays */}
      <AnimatePresence>
        {gameState === GameState.START && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
          >
            <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 flex flex-col justify-center items-center lg:items-start text-center lg:text-left">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <h1 className="text-6xl md:text-8xl font-display font-bold tracking-tighter mb-2 bg-gradient-to-b from-white to-blue-400 bg-clip-text text-transparent">
                    水火大战
                  </h1>
                  <p className="text-blue-300/60 font-mono tracking-widest uppercase mb-8">Interstellar Vanguard v1.0</p>
                </motion.div>

                <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => resetGame(ElementType.WATER)}
                    className="group relative px-12 py-4 bg-blue-600 rounded-2xl font-bold text-xl overflow-hidden transition-all hover:bg-blue-500 hover:shadow-[0_0_40px_rgba(59,130,246,0.5)]"
                  >
                    <div className="relative z-10 flex items-center gap-3">
                      <Play className="w-6 h-6 fill-current" />
                      水
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => resetGame(ElementType.FIRE)}
                    className="group relative px-12 py-4 bg-red-600 rounded-2xl font-bold text-xl overflow-hidden transition-all hover:bg-red-500 hover:shadow-[0_0_40px_rgba(239,68,68,0.5)]"
                  >
                    <div className="relative z-10 flex items-center gap-3">
                      <Play className="w-6 h-6 fill-current" />
                      火
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.button>
                </div>
              </div>

              <div className="lg:col-span-5 flex flex-col gap-4">
                <div className="glass p-6 rounded-3xl">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-blue-400 mb-4 flex items-center gap-2">
                    <Keyboard className="w-4 h-4" /> 操作指南
                  </h3>
                  <div className="space-y-3 text-sm text-slate-300">
                    <div className="flex justify-between items-center">
                      <span>移动战机</span>
                      <span className="px-2 py-1 bg-white/10 rounded font-mono text-xs">WASD / 方向键</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>发射子弹</span>
                      <span className="px-2 py-1 bg-white/10 rounded font-mono text-xs">空格键 / 长按屏幕</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>暂停游戏</span>
                      <span className="px-2 py-1 bg-white/10 rounded font-mono text-xs">P 键</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>触摸控制</span>
                      <span className="px-2 py-1 bg-white/10 rounded font-mono text-xs">滑动屏幕</span>
                    </div>
                  </div>
                </div>

                <div className="glass p-6 rounded-3xl">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-orange-400 mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> 强化道具
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className="w-10 h-10 rounded-lg border border-orange-500/50 flex items-center justify-center text-orange-400 font-bold">T</div>
                      <span className="text-xs font-medium">三向子弹</span>
                    </div>
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className="w-10 h-10 rounded-lg border border-emerald-500/50 flex items-center justify-center text-emerald-400 font-bold">S</div>
                      <span className="text-xs font-medium">能量护盾</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {gameState === GameState.PAUSED && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md"
          >
            <div className="glass-dark p-12 rounded-[40px] text-center max-w-sm w-full border-white/10">
              <h2 className="text-4xl font-display font-bold mb-8 tracking-tight">游戏暂停</h2>
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => setGameState(GameState.PLAYING)}
                  className="w-full py-4 bg-blue-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-500 transition-colors"
                >
                  <Play className="w-5 h-5 fill-current" /> 继续游戏
                </button>
                <button 
                  onClick={() => setGameState(GameState.START)}
                  className="w-full py-4 bg-white/5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" /> 退出任务
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {gameState === GameState.GAMEOVER && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-red-950/40 backdrop-blur-xl p-4"
          >
            <div className="glass-dark p-8 md:p-12 rounded-[48px] max-w-2xl w-full border-red-500/20 shadow-[0_0_100px_rgba(239,68,68,0.2)]">
              <div className="text-center mb-10">
                <h2 className="text-5xl md:text-7xl font-display font-bold mb-2 text-red-500 tracking-tighter">任务失败</h2>
                <p className="text-slate-400 font-mono uppercase tracking-widest text-sm">Mission Terminated</p>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-10">
                <div className="glass p-6 rounded-3xl text-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">最终得分</span>
                  <span className="text-4xl font-display font-bold text-white">{score.toLocaleString()}</span>
                </div>
                <div className="glass p-6 rounded-3xl text-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">到达关卡</span>
                  <span className="text-4xl font-display font-bold text-blue-400">{level}</span>
                </div>
              </div>

              <div className="mb-10">
                <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Trophy className="w-4 h-4" /> 获得成就
                </h3>
                <div className="flex flex-wrap gap-2">
                  {achievements.filter(a => a.unlocked).length > 0 ? (
                    achievements.filter(a => a.unlocked).map(a => (
                      <div key={a.id} className="glass px-4 py-2 rounded-full text-sm font-medium border-yellow-500/30 text-yellow-200">
                        {a.title}
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-500 italic text-sm">本次任务未解锁成就</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <button 
                  onClick={resetGame}
                  className="flex-1 py-5 bg-white text-slate-950 rounded-3xl font-bold flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors"
                >
                  <RotateCcw className="w-5 h-5" /> 重新开始
                </button>
                <button 
                  onClick={() => setGameState(GameState.START)}
                  className="flex-1 py-5 bg-white/5 rounded-3xl font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
                >
                  主菜单
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level Up Notification */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
          >
            <div className="text-center">
              <h2 className="text-8xl font-display font-bold italic text-blue-400 tracking-tighter drop-shadow-[0_0_30px_rgba(96,165,250,0.8)]">
                LEVEL UP
              </h2>
              <p className="text-2xl font-display font-bold text-white uppercase tracking-[0.5em]">关卡 {level}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Achievement Popup */}
      <AnimatePresence>
        {activeAchievement && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[60] glass-dark px-6 py-4 rounded-2xl border-yellow-500/50 flex items-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          >
            <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.4)]">
              <Trophy className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h4 className="text-yellow-400 font-bold text-sm uppercase tracking-widest">成就解锁！</h4>
              <p className="text-white font-bold">{activeAchievement.title}</p>
              <p className="text-slate-400 text-xs">{activeAchievement.description}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
