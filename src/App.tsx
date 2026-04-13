import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Play, RotateCcw, Trophy, Sparkles, Rocket, Plane, Bird, Sun } from 'lucide-react';

// --- Types ---
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

interface ArrowItem {
  id: string;
  x: number;
  y: number;
  length: number;
  direction: Direction;
  isRemoved: boolean;
  isBouncing: boolean;
}

type GameState = 'START' | 'PLAYING' | 'FINISHED';

// --- Constants ---
const EMOJIS = ['💪', '🔥', '🚀', '😎', '🌟', '✨', '🎯', '⚡️'];

const DIFFICULTY_CONFIG = {
  EASY: { width: 8, height: 12, count: 25, maxLength: 2 },
  MEDIUM: { width: 10, height: 15, count: 45, maxLength: 3 },
  HARD: { width: 14, height: 20, count: 85, maxLength: 4 },
};

// --- Components ---

const EasyBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 bg-gradient-to-b from-sky-400 to-sky-200 overflow-hidden pointer-events-none">
      <div className="absolute top-10 left-10 w-20 h-20 bg-white/40 blur-2xl rounded-full" />
      <motion.div
        className="absolute top-[20%] left-[-10%]"
        animate={{ x: ['0vw', '110vw'] }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      >
        <Plane className="w-12 h-12 text-white/60 rotate-90" />
      </motion.div>
      {/* Sparse stars */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div 
          key={i} 
          className="absolute bg-white/40 rounded-full" 
          style={{ 
            width: '2px', height: '2px', 
            left: `${Math.random() * 100}%`, 
            top: `${Math.random() * 100}%` 
          }} 
        />
      ))}
    </div>
  );
};

const MediumBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 bg-gradient-to-b from-emerald-400 to-emerald-100 overflow-hidden pointer-events-none">
      {/* Mountains */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 flex items-end">
        <div className="w-full h-full bg-emerald-800/20 clip-path-mountain" style={{ clipPath: 'polygon(0% 100%, 20% 40%, 40% 80%, 60% 30%, 80% 70%, 100% 100%)' }} />
      </div>
      {/* Birds */}
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ top: `${20 + i * 10}%`, left: '-5%' }}
          animate={{ x: ['0vw', '110vw'], y: [0, -20, 0] }}
          transition={{ duration: 10 + i * 2, repeat: Infinity, ease: "easeInOut", delay: i * 1.5 }}
        >
          <Bird className="w-6 h-6 text-emerald-900/40" />
        </motion.div>
      ))}
    </div>
  );
};

const HardBackground = () => {
  const stars = useMemo(() => Array.from({ length: 200 }).map((_, i) => ({
    id: i,
    size: Math.random() * 2 + 1,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 15 + 5,
  })), []);

  return (
    <div className="fixed inset-0 -z-10 bg-[#020617] overflow-hidden pointer-events-none">
      {/* Sun */}
      <motion.div
        className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-orange-500/20 blur-[100px] rounded-full"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 5, repeat: Infinity }}
      />
      <motion.div
        className="absolute top-20 right-20"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      >
        <Sun className="w-24 h-24 text-orange-400/30 blur-sm" />
      </motion.div>

      {/* Dense Stars */}
      {stars.map(star => (
        <motion.div
          key={star.id}
          className="absolute bg-white rounded-full"
          style={{
            width: star.size,
            height: star.size,
            left: `${star.x}%`,
            top: `${star.y}%`,
          }}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: star.duration, repeat: Infinity }}
        />
      ))}
      
      {/* Galaxies */}
      <motion.div
        className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full"
        animate={{ x: [0, 100, 0], y: [0, 50, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>('START');
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [arrows, setArrows] = useState<ArrowItem[]>([]);
  const [activeEmoji, setActiveEmoji] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isShaking, setIsShaking] = useState(false);

  const config = DIFFICULTY_CONFIG[difficulty];

  // --- Game Logic ---

  const generateLevel = useCallback(() => {
    const newArrows: ArrowItem[] = [];
    const directions: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
    const occupied = new Set<string>();

    const isCellOccupied = (x: number, y: number) => occupied.has(`${x},${y}`);

    const wouldFace = (newArrow: Partial<ArrowItem>, existing: ArrowItem[]) => {
      return existing.some(other => {
        if (newArrow.y === other.y) {
          if (newArrow.x! < other.x && newArrow.direction === 'RIGHT' && other.direction === 'LEFT') return true;
          if (newArrow.x! > other.x && newArrow.direction === 'LEFT' && other.direction === 'RIGHT') return true;
        }
        if (newArrow.x === other.x) {
          if (newArrow.y! < other.y && newArrow.direction === 'DOWN' && other.direction === 'UP') return true;
          if (newArrow.y! > other.y && newArrow.direction === 'UP' && other.direction === 'DOWN') return true;
        }
        return false;
      });
    };

    for (let i = 0; i < config.count; i++) {
      const x = Math.floor(Math.random() * config.width);
      const y = Math.floor(Math.random() * config.height);
      const direction = directions[Math.floor(Math.random() * directions.length)];
      const length = Math.floor(Math.random() * config.maxLength) + 1;

      let canPlace = true;
      if (wouldFace({ x, y, direction }, newArrows)) {
        canPlace = false;
      } else {
        for (let l = 0; l < length; l++) {
          let cx = x, cy = y;
          if (direction === 'UP') cy += l;
          if (direction === 'DOWN') cy -= l;
          if (direction === 'LEFT') cx += l;
          if (direction === 'RIGHT') cx -= l;

          if (cx < 0 || cx >= config.width || cy < 0 || cy >= config.height || isCellOccupied(cx, cy)) {
            canPlace = false;
            break;
          }
        }
      }

      if (canPlace) {
        newArrows.push({
          id: `arrow-${i}`,
          x,
          y,
          length,
          direction,
          isRemoved: false,
          isBouncing: false,
        });
        for (let l = 0; l < length; l++) {
          let cx = x, cy = y;
          if (direction === 'UP') cy += l;
          if (direction === 'DOWN') cy -= l;
          if (direction === 'LEFT') cx += l;
          if (direction === 'RIGHT') cx -= l;
          occupied.add(`${cx},${cy}`);
        }
      }
    }

    // Ensure the game can be completed by removing 2 random arrows to create openings
    if (newArrows.length > 2) {
      for (let k = 0; k < 2; k++) {
        const randomIndex = Math.floor(Math.random() * newArrows.length);
        newArrows.splice(randomIndex, 1);
      }
    }

    setArrows(newArrows);
    setScore(0);
  }, [config]);

  const startGame = (diff: Difficulty) => {
    setDifficulty(diff);
    // Level generation will be triggered by useEffect when difficulty changes or manually
  };

  useEffect(() => {
    if (gameState === 'PLAYING') {
      generateLevel();
    }
  }, [difficulty, gameState, generateLevel]);

  const restartGame = () => {
    setGameState('START');
  };

  const isBlocked = (arrow: ArrowItem, currentArrows: ArrowItem[]) => {
    const { x, y, direction } = arrow;
    
    return currentArrows.some(other => {
      if (other.isRemoved || other.id === arrow.id) return false;

      // Check all cells of the 'other' arrow
      for (let l = 0; l < other.length; l++) {
        let ox = other.x, oy = other.y;
        if (other.direction === 'UP') oy += l;
        if (other.direction === 'DOWN') oy -= l;
        if (other.direction === 'LEFT') ox += l;
        if (other.direction === 'RIGHT') ox -= l;

        // Check if this cell (ox, oy) is in the path of the current arrow
        if (direction === 'UP' && ox === x && oy < y) return true;
        if (direction === 'DOWN' && ox === x && oy > y) return true;
        if (direction === 'LEFT' && oy === y && ox < x) return true;
        if (direction === 'RIGHT' && oy === y && ox > x) return true;
      }
      return false;
    });
  };

  // --- Sound Effects ---
  const playSound = (type: 'success' | 'fail') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else {
        osc.type = 'square';
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch (e) {
      console.warn('Audio not supported', e);
    }
  };

  const handleArrowTap = (id: string) => {
    const arrow = arrows.find(a => a.id === id);
    if (!arrow || arrow.isRemoved) return;

    if (isBlocked(arrow, arrows)) {
      playSound('fail');
      setArrows(prev => prev.map(a => a.id === id ? { ...a, isBouncing: true } : a));
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 300);
      setTimeout(() => setArrows(prev => prev.map(a => a.id === id ? { ...a, isBouncing: false } : a)), 300);
    } else {
      playSound('success');
      setArrows(prev => prev.map(a => a.id === id ? { ...a, isRemoved: true } : a));
      
      const newScore = score + 1;
      setScore(newScore);

      // Show motivational icon every 2 or 3 items
      if (newScore % 2 === 0 || newScore % 3 === 0) {
        const randomEmoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
        setActiveEmoji(randomEmoji);
        setTimeout(() => setActiveEmoji(null), 800);
      }
    }
  };

  useEffect(() => {
    if (gameState === 'PLAYING' && arrows.length > 0 && arrows.every(a => a.isRemoved)) {
      setTimeout(() => setGameState('FINISHED'), 1000);
    }
  }, [arrows, gameState]);

  // --- Components ---

  const ArrowLine = ({ arrow }: { arrow: ArrowItem }) => {
    const { direction, length } = arrow;
    const isVertical = direction === 'UP' || direction === 'DOWN';
    
    return (
      <div className={`relative flex items-center justify-center ${isVertical ? 'flex-col' : 'flex-row'}`}>
        <div 
          className={`bg-white/40 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(255,255,255,0.3)] ${isVertical ? 'w-1.5' : 'h-1.5'}`}
          style={{ 
            width: isVertical ? '6px' : `${length * 100}%`,
            height: isVertical ? `${length * 100}%` : '6px',
            transform: direction === 'UP' ? 'translateY(50%)' : direction === 'DOWN' ? 'translateY(-50%)' : direction === 'LEFT' ? 'translateX(50%)' : 'translateX(-50%)'
          }}
        />
        <div className="absolute z-10 text-white drop-shadow-lg">
          {direction === 'UP' && <ArrowUp className="w-5 h-5" />}
          {direction === 'DOWN' && <ArrowDown className="w-5 h-5" />}
          {direction === 'LEFT' && <ArrowLeft className="w-5 h-5" />}
          {direction === 'RIGHT' && <ArrowRight className="w-5 h-5" />}
        </div>
      </div>
    );
  };

  const renderBackground = () => {
    switch (difficulty) {
      case 'EASY': return <EasyBackground />;
      case 'MEDIUM': return <MediumBackground />;
      case 'HARD': return <HardBackground />;
    }
  };

  return (
    <div className="min-h-screen text-white font-sans overflow-hidden flex flex-col items-center justify-center p-4 relative">
      {renderBackground()}
      
      {/* Start Screen */}
      <AnimatePresence mode="wait">
        {gameState === 'START' && (
          <motion.div
            key="start"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center space-y-8 flex flex-col items-center"
          >
            <div className="space-y-4">
              <motion.div 
                className="flex items-center justify-center gap-4"
                animate={{ x: [-5, 5, -5] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              >
                <ArrowRight className="text-yellow-400 w-12 h-12 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]" />
                <h2 className="text-3xl md:text-4xl font-light tracking-widest uppercase text-white/90">
                  Welcome to
                </h2>
              </motion.div>
              
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                Arrow Game
              </h1>
              
              <p className="text-white/40 font-mono text-sm tracking-[0.3em] uppercase">
                developer <span className="text-white/80 font-bold">mradil.pk</span>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
              {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map((diff) => (
                <motion.button
                  key={diff}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setDifficulty(diff);
                    setGameState('PLAYING');
                  }}
                  className={`relative px-8 py-6 rounded-2xl font-black text-xl tracking-widest border-t border-white/30 overflow-hidden transition-all shadow-xl ${
                    diff === 'EASY' ? 'bg-sky-500/80 hover:bg-sky-400' :
                    diff === 'MEDIUM' ? 'bg-emerald-600/80 hover:bg-emerald-500' :
                    'bg-red-700/80 hover:bg-red-600'
                  }`}
                >
                  <span className="relative z-10">{diff}</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
                </motion.button>
              ))}
            </div>

            <p className="text-white/60 text-lg font-medium flex items-center gap-2">
              Select a difficulty to begin your journey <Rocket className="w-5 h-5 text-yellow-400" />
            </p>
          </motion.div>
        )}

        {/* Game Screen */}
        {gameState === 'PLAYING' && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: 1,
              x: isShaking ? [0, -5, 5, -5, 5, 0] : 0 
            }}
            exit={{ opacity: 0 }}
            className="relative w-full max-w-md aspect-[2/3] bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/10 p-2 shadow-2xl overflow-hidden"
          >
            {/* Grid Container */}
            <div 
              className="grid gap-0 h-full w-full"
              style={{ 
                gridTemplateColumns: `repeat(${config.width}, 1fr)`,
                gridTemplateRows: `repeat(${config.height}, 1fr)`
              }}
            >
              {arrows.map((arrow) => (
                <div 
                  key={arrow.id}
                  style={{ 
                    gridColumn: arrow.x + 1,
                    gridRow: arrow.y + 1
                  }}
                  className="relative flex items-center justify-center"
                >
                  <AnimatePresence>
                    {!arrow.isRemoved && (
                      <motion.button
                        layoutId={arrow.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ 
                          scale: 1,
                          opacity: 1,
                          x: arrow.isBouncing ? (arrow.direction === 'LEFT' ? -15 : arrow.direction === 'RIGHT' ? 15 : 0) : 0,
                          y: arrow.isBouncing ? (arrow.direction === 'UP' ? -15 : arrow.direction === 'DOWN' ? 15 : 0) : 0,
                        }}
                        exit={{ 
                          x: arrow.direction === 'LEFT' ? -800 : arrow.direction === 'RIGHT' ? 800 : 0,
                          y: arrow.direction === 'UP' ? -800 : arrow.direction === 'DOWN' ? 800 : 0,
                          opacity: 0,
                          scale: 0.8,
                          transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] }
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 20
                        }}
                        onClick={() => handleArrowTap(arrow.id)}
                        className="w-full h-full"
                      >
                        <ArrowLine arrow={arrow} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Motivational Emoji Overlay */}
            <AnimatePresence>
              {activeEmoji && (
                <motion.div
                  initial={{ scale: 0, opacity: 0, y: 20 }}
                  animate={{ scale: 1.5, opacity: 1, y: 0 }}
                  exit={{ scale: 2, opacity: 0, y: -20 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
                >
                  <span className="text-7xl drop-shadow-[0_0_30px_rgba(255,255,255,0.6)]">
                    {activeEmoji}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* HUD */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none">
              <div className="bg-white/10 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/20 text-sm font-bold text-white pointer-events-auto shadow-lg">
                {difficulty}
              </div>
              <button 
                onClick={generateLevel}
                className="bg-white/10 backdrop-blur-xl p-3 rounded-2xl border border-white/20 text-white/80 hover:text-white hover:bg-white/20 transition-all pointer-events-auto shadow-lg"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            {/* Centered Percentage Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-white/10 text-[12rem] font-black select-none">
                {Math.round((score / (arrows.length || 1)) * 100)}%
              </div>
            </div>

            {/* Bottom Home Navigation */}
            <div className="absolute bottom-6 left-0 right-0 flex justify-center">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setGameState('START')}
                className="bg-white/10 backdrop-blur-xl px-6 py-3 rounded-full border border-white/20 text-white/80 hover:text-white hover:bg-white/20 transition-all shadow-lg flex items-center gap-2 font-bold text-sm"
              >
                <Play className="w-4 h-4 rotate-180" /> HOME
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Finished Screen */}
        {gameState === 'FINISHED' && (
          <motion.div
            key="finished"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-8 max-w-sm bg-white/10 backdrop-blur-2xl p-12 rounded-[3rem] border border-white/10 shadow-2xl"
          >
            <motion.div
              animate={{ 
                rotate: [0, -10, 10, -10, 10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="inline-block"
            >
              <Trophy className="w-32 h-32 text-yellow-400 drop-shadow-[0_0_40px_rgba(250,204,21,0.6)]" />
            </motion.div>
            
            <div className="space-y-4">
              <h2 className="text-4xl font-black leading-tight">
                🎉 Congratulations!<br />
                <span className="text-yellow-400">{difficulty} MODE CLEAR!</span>
              </h2>
              <p className="text-white/60 text-lg">
                You mastered the {difficulty.toLowerCase()} level and cleared all {arrows.length} paths!
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={restartGame}
              className="flex items-center gap-3 mx-auto px-10 py-5 bg-white text-black rounded-full font-black text-xl shadow-[0_10px_30px_rgba(255,255,255,0.2)] hover:bg-slate-100 transition-colors uppercase tracking-widest"
            >
              <RotateCcw className="w-6 h-6" /> MAIN MENU
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
