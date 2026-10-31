import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Timer, Play, Users, Trophy, ArrowLeft, Bell, Check, X, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { zambianCards } from "@/utils/cards";
import { ThemeToggle } from "@/components/ThemeToggle";
import { isSoundOn, setSoundOn, sounds, unlockSound } from "@/lib/sounds";

type GameState = 'cover' | 'menu' | 'teams' | 'setup' | 'playing' | 'results';

// Inside a turn: 3-2-1 countdown, the 30 seconds of play, then the recap of every card
type TurnPhase = 'countdown' | 'play' | 'recap';
type TurnResult = 'got' | 'skip' | 'buzz';
type TurnEntry = { word: string; result: TurnResult };

type Team = {
  name: string;
  members: string[];
  score: number;
};

type TeamInputs = Record<string, string>;

type SavedGame = {
  gameState: GameState;
  numberOfTeams: number;
  teams: Team[];
  teamInputs: TeamInputs;
  totalRounds: number;
  currentRound: number;
  currentTeamIndex: number;
  usedCards: string[];
};

const TURN_SECONDS = 30;
const COUNTDOWN_STEP_MS = 800;
// Keep names short enough to fit on the scoreboard
const MAX_NAME_LENGTH = 40;
const MAX_MEMBERS = 20;
const SAVE_KEY = 'zed-rush-game';
// Screens where a game is in progress: saved locally and guarded against the back button
const IN_GAME_STATES: GameState[] = ['setup', 'playing', 'results'];

function defaultTeam(i: number): Team {
  return { name: `Team ${i + 1}`, members: [], score: 0 };
}

function resizeTeams(prev: Team[], n: number): Team[] {
  return Array.from({ length: n }, (_, i) => prev[i] ?? defaultTeam(i));
}

function loadSavedGame(): SavedGame | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedGame;
    if (!Array.isArray(saved.teams) || saved.teams.length !== saved.numberOfTeams) return null;
    return saved;
  } catch {
    return null;
  }
}

function clearSavedGame() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* storage unavailable */ }
}

// "Chanda", "Chanda and Temba", "Chanda, Mulenga and Temba"
function joinNames(names: string[]) {
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function turnPoints(log: TurnEntry[]) {
  return log.reduce((sum, e) => sum + (e.result === 'got' ? 1 : -1), 0);
}

const BG = "min-h-screen bg-gradient-to-br from-green-600 via-orange-500 to-red-600 dark:from-green-700 dark:via-orange-600 dark:to-red-700";
const PANEL = "bg-white/95 dark:bg-gray-800/95 text-gray-800 dark:text-gray-100 rounded-2xl shadow-lg";
const PILL = "bg-white/20 border border-white/30 rounded-full px-3 py-1 text-[13px] font-semibold text-white whitespace-nowrap";

function fireConfetti() {
  const zambian = ['#198D19', '#FF8C00', '#DC2626', '#FCD34D', '#ffffff'];
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.55 }, colors: zambian });
  setTimeout(() => {
    confetti({ particleCount: 80, angle: 60,  spread: 55, origin: { x: 0 }, colors: zambian });
    confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1 }, colors: zambian });
  }, 320);
}

function GameCompleteEffect({ isGameComplete }: { isGameComplete: boolean }) {
  const hasRun = useRef(false);
  useEffect(() => {
    if (isGameComplete && !hasRun.current) {
      hasRun.current = true;
      fireConfetti();
    }
  }, [isGameComplete]);
  return null;
}

export default function Index() {
  // The "Quick Game" app shortcut opens /?quick=true and goes straight to the first turn
  const [gameState, setGameState] = useState<GameState>(() =>
    new URLSearchParams(window.location.search).get('quick') === 'true' ? 'setup' : 'cover'
  );
  const [visible, setVisible] = useState(true);
  const [savedGame, setSavedGame] = useState<SavedGame | null>(loadSavedGame);
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TURN_SECONDS);
  const [numberOfTeams, setNumberOfTeams] = useState(2);
  const [teams, setTeams] = useState<Team[]>(() => resizeTeams([], 2));
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentCard, setCurrentCard] = useState<string[]>([]);
  const [teamInputs, setTeamInputs] = useState<TeamInputs>({});
  const [totalRounds, setTotalRounds] = useState(1);
  const [currentRound, setCurrentRound] = useState(1);
  const [justScored, setJustScored] = useState(false);
  const [turnPhase, setTurnPhase] = useState<TurnPhase>('countdown');
  const [countdownN, setCountdownN] = useState(3);
  const [turnLog, setTurnLog] = useState<TurnEntry[]>([]);
  const [popKey, setPopKey] = useState(0);
  const [flashBuzz, setFlashBuzz] = useState(false);
  const [soundOn, setSoundOnState] = useState(isSoundOn);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flashRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deadlineRef = useRef(0);
  const lastSecondRef = useRef(TURN_SECONDS);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  // A ref (not state) so rapid taps never see a stale set and repeat a card
  const usedCardsRef = useRef<Set<string>>(new Set());

  const isLastTurn = currentRound >= totalRounds && currentTeamIndex === numberOfTeams - 1;
  // The results screen is only shown once the last turn is confirmed
  const isGameComplete = gameState === 'results';
  const turnScore = turnPoints(turnLog);

  // Fade-transition helper. `apply` runs together with the screen change, so the
  // screen fading out never renders with the next screen's state.
  const transitionTo = useCallback((next: GameState, apply?: () => void) => {
    setVisible(false);
    setTimeout(() => {
      apply?.();
      setGameState(next);
      setVisible(true);
    }, 180);
  }, []);

  const getNextCard = useCallback((exclude?: string) => {
    let available = zambianCards.filter(c => !usedCardsRef.current.has(c[0]));
    if (available.length === 0) {
      // Whole deck used: reshuffle, but don't repeat the card on screen
      usedCardsRef.current = new Set();
      available = zambianCards.filter(c => c[0] !== exclude);
    }
    const card = available[Math.floor(Math.random() * available.length)];
    usedCardsRef.current.add(card[0]);
    return card;
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }, []);

  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch {
      // Not supported or denied — the game still works, the screen may just dim
    }
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setIsTimerRunning(false);
    releaseWakeLock();
  }, [releaseWakeLock]);

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = null;
  }, []);

  // Time's up or End Turn: show the recap so the team can check every card
  const finishTurn = useCallback(() => {
    stopTimer();
    sounds.timesUp();
    setTurnPhase('recap');
  }, [stopTimer]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    // Count down against a fixed deadline so a locked or backgrounded phone doesn't slow the clock
    deadlineRef.current = Date.now() + TURN_SECONDS * 1000;
    lastSecondRef.current = TURN_SECONDS;
    setTimeLeft(TURN_SECONDS);
    setIsTimerRunning(true);
    requestWakeLock();
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      if (remaining !== lastSecondRef.current) {
        lastSecondRef.current = remaining;
        if (remaining > 0 && remaining <= 5) sounds.tick();
      }
      setTimeLeft(remaining);
      if (remaining === 0) finishTurn();
    }, 250);
  }, [finishTurn, requestWakeLock]);

  // Clean up timers and wake lock on unmount
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (flashRef.current) clearTimeout(flashRef.current);
    wakeLockRef.current?.release().catch(() => {});
  }, []);

  // The browser drops the wake lock when the app is hidden; take it back on return
  useEffect(() => {
    if (!isTimerRunning) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [isTimerRunning, requestWakeLock]);

  // Save the game in progress so a refresh or closed app can be resumed
  useEffect(() => {
    if (!IN_GAME_STATES.includes(gameState)) return;
    if (isGameComplete) {
      clearSavedGame();
      setSavedGame(null);
      return;
    }
    try {
      const save: SavedGame = {
        gameState, numberOfTeams, teams, teamInputs, totalRounds, currentRound, currentTeamIndex,
        usedCards: [...usedCardsRef.current],
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch {
      // Storage full or unavailable — game continues without resume support
    }
  }, [gameState, isGameComplete, numberOfTeams, teams, teamInputs, totalRounds, currentRound, currentTeamIndex]);

  const cancelCountdown = useCallback(() => {
    stopCountdown();
    transitionTo('setup');
  }, [stopCountdown, transitionTo]);

  // Android back gesture: keep the player in the game instead of closing the app
  useEffect(() => {
    if (gameState !== 'teams' && !IN_GAME_STATES.includes(gameState)) return;
    if (!window.history.state?.zedRushGuard) {
      window.history.pushState({ ...window.history.state, zedRushGuard: true }, '');
    }
    const onPop = () => {
      window.history.pushState({ ...window.history.state, zedRushGuard: true }, '');
      if (gameState === 'playing' && turnPhase === 'play') finishTurn();
      else if (gameState === 'playing' && turnPhase === 'countdown') cancelCountdown();
      else if (gameState === 'teams') transitionTo('menu');
      else toast("Game in progress. Tap New Game to quit.");
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [gameState, turnPhase, finishTurn, cancelCountdown, transitionTo]);

  const chooseNumberOfTeams = (n: number) => {
    setNumberOfTeams(n);
    setTeams(prev => resizeTeams(prev, n));
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundOnState(next);
    if (next) {
      unlockSound();
      sounds.correct();
    }
  };

  // Start Turn: 3, 2, 1, Go! Then the first card and the 30-second clock
  const startTurn = useCallback(() => {
    // Unlock audio during this tap so the game's sounds can play on mobile
    unlockSound();
    stopCountdown();
    transitionTo('playing', () => {
      setTurnLog([]);
      setCurrentCard([]);
      setTurnPhase('countdown');
      setCountdownN(3);
      setTimeLeft(TURN_SECONDS);
    });
    setTimeout(() => {
      sounds.countdown();
      let n = 3;
      countdownRef.current = setInterval(() => {
        n -= 1;
        if (n > 0) {
          setCountdownN(n);
          sounds.countdown();
        } else if (n === 0) {
          setCountdownN(0);
          sounds.go();
        } else {
          stopCountdown();
          setCurrentCard(getNextCard());
          setTurnPhase('play');
          startTimer();
        }
      }, COUNTDOWN_STEP_MS);
    }, 180);
  }, [getNextCard, startTimer, stopCountdown, transitionTo]);

  const record = useCallback((result: TurnResult) => {
    const word = currentCard[0];
    setTurnLog(log => [...log, { word, result }]);
    setCurrentCard(getNextCard(word));
  }, [currentCard, getNextCard]);

  const correctGuess = useCallback(() => {
    if (turnPhase !== 'play') return;
    record('got');
    sounds.correct();
    setJustScored(true);
    setTimeout(() => setJustScored(false), 380);
    setPopKey(k => k + 1);
  }, [turnPhase, record]);

  // Rules: passing on a card costs the team a point
  const skipCard = useCallback(() => {
    if (turnPhase !== 'play') return;
    record('skip');
    sounds.skip();
  }, [turnPhase, record]);

  // Taboo rule: another team buzzes when the describer says a forbidden word
  const buzz = useCallback(() => {
    if (turnPhase !== 'play') return;
    record('buzz');
    sounds.buzz();
    setFlashBuzz(true);
    if (flashRef.current) clearTimeout(flashRef.current);
    flashRef.current = setTimeout(() => setFlashBuzz(false), 700);
  }, [turnPhase, record]);

  const endTurnEarly = useCallback(() => {
    if (turnPhase === 'play') finishTurn();
  }, [turnPhase, finishTurn]);

  // In the recap, tapping a card flips it between guessed and missed
  const toggleEntry = (index: number) => {
    setTurnLog(log => log.map((e, i) => i === index ? { ...e, result: e.result === 'got' ? 'skip' : 'got' } : e));
  };

  // Leaving the recap adds the turn's points, then moves to the next team or the final results
  const confirmTurn = useCallback(() => {
    const points = turnPoints(turnLog);
    const addPoints = () => setTeams(prev => prev.map((t, i) =>
      i === currentTeamIndex ? { ...t, score: t.score + points } : t
    ));
    if (isLastTurn) {
      transitionTo('results', addPoints);
      return;
    }
    const next = (currentTeamIndex + 1) % numberOfTeams;
    transitionTo('setup', () => {
      addPoints();
      if (next === 0) setCurrentRound(r => r + 1);
      setCurrentTeamIndex(next);
    });
  }, [turnLog, currentTeamIndex, isLastTurn, numberOfTeams, transitionTo]);

  const resetGame = useCallback(() => {
    stopTimer();
    stopCountdown();
    clearSavedGame();
    setSavedGame(null);
    // Reset with the screen change so the auto-save never stores the blank game
    transitionTo('menu', () => {
      setTeams(resizeTeams([], numberOfTeams));
      setCurrentTeamIndex(0);
      setCurrentRound(1);
      setTimeLeft(TURN_SECONDS);
      setTurnLog([]);
      usedCardsRef.current = new Set();
    });
  }, [numberOfTeams, stopTimer, stopCountdown, transitionTo]);

  // Same teams, scores back to zero; used cards are kept so the rematch gets fresh words
  const playAgain = () => {
    transitionTo('setup', () => {
      setTeams(prev => prev.map(t => ({ ...t, score: 0 })));
      setCurrentTeamIndex(0);
      setCurrentRound(1);
      setTurnLog([]);
    });
  };

  const resumeGame = () => {
    if (!savedGame) return;
    setNumberOfTeams(savedGame.numberOfTeams);
    setTeams(savedGame.teams);
    setTeamInputs(savedGame.teamInputs ?? {});
    setTotalRounds(savedGame.totalRounds);
    setCurrentRound(savedGame.currentRound);
    setCurrentTeamIndex(savedGame.currentTeamIndex);
    usedCardsRef.current = new Set(savedGame.usedCards ?? []);
    // A turn's points only count once its recap is confirmed, so an interrupted turn is replayed
    transitionTo(savedGame.gameState === 'playing' ? 'setup' : savedGame.gameState);
  };

  const saveTeams = () => {
    const nameCounts = new Map<string, number>();
    const newTeams: Team[] = Array.from({ length: numberOfTeams }, (_, i) => {
      let name = (teamInputs[`team${i + 1}Name`] ?? '').trim().slice(0, MAX_NAME_LENGTH - 4) || `Team ${i + 1}`;
      // Keep names unique so scores and the scoreboard can't mix teams up
      const key = name.toLowerCase();
      const count = (nameCounts.get(key) ?? 0) + 1;
      nameCounts.set(key, count);
      if (count > 1) name = `${name} (${count})`;
      return {
        name,
        members: (teamInputs[`team${i + 1}Members`] ?? '')
          .split(',').map(m => m.trim().slice(0, MAX_NAME_LENGTH)).filter(m => m.length > 0)
          .slice(0, MAX_MEMBERS),
        score: teams[i]?.score || 0,
      };
    });
    setTeams(newTeams);
    transitionTo('setup');
  };

  const topScore = Math.max(...teams.map(t => t.score));
  const winners = teams.filter(t => t.score === topScore);

  // Players take turns describing, one per round
  const describerOf = (team: Team) =>
    team.members.length > 0 ? team.members[(currentRound - 1) % team.members.length] : null;

  const fadeClass = `screen-fade ${visible ? 'screen-fade-in' : 'screen-fade-out'}`;
  const isUrgent = timeLeft <= 10 && isTimerRunning;

  // ─── COVER ───────────────────────────────────────────────────────────────
  if (gameState === 'cover') {
    return (
      <div className={`relative flex flex-col items-center px-6 pt-14 pb-6 overflow-hidden ${fadeClass}`} style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #1A5C1A, #d97706, #dc2626)' }}>
        <div aria-hidden="true" className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-10 left-7 w-20 h-20 border-2 border-white rounded-full" />
          <div className="absolute top-36 right-9 w-14 h-14 border-2 border-white rotate-45" />
          <div className="absolute bottom-28 left-10 w-24 h-24 border-2 border-white rounded-full" />
        </div>

        <div className="relative z-10 w-full max-w-md flex flex-col items-center flex-1">
          <img src="/zed-rush-logo.png" alt="Zed Rush" className="w-64 drop-shadow-2xl" />

          <div className="mt-5 w-full bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30 px-4 py-4 text-center">
            <p className="text-lg text-white/95 font-semibold">The Ultimate Zambian</p>
            <p className="font-display text-3xl text-white uppercase leading-tight">Guessing Game</p>
          </div>

          <div className="mt-6 grid grid-cols-3 w-full text-center">
            <div className="flex flex-col items-center gap-1.5">
              <Timer className="size-7 text-yellow-300" />
              <span className="text-white text-sm font-semibold">30 Seconds</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Users className="size-7 text-yellow-300" />
              <span className="text-white text-sm font-semibold">Team Game</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Trophy className="size-7 text-yellow-300" />
              <span className="text-white text-sm font-semibold">Score Points</span>
            </div>
          </div>

          <div className="flex-1 min-h-8" />

          <div className="w-full space-y-3">
            <button
              onClick={() => transitionTo('menu')}
              className="w-full min-h-16 bg-white text-green-700 rounded-2xl shadow-xl font-bold text-lg flex items-center justify-center gap-2"
            >
              <Play className="size-5 fill-current" />
              Start Playing
            </button>
            {savedGame && (
              <button
                onClick={resumeGame}
                className="w-full min-h-13 bg-white/20 border border-white/40 text-white rounded-2xl font-semibold"
              >
                Resume game (Round {savedGame.currentRound} of {savedGame.totalRounds})
              </button>
            )}
          </div>

          <p className="mt-5 text-xs text-white/85 text-center">
            Celebrating Zambian Culture · Livingstone to Nakonde &amp; everywhere in-between
          </p>
        </div>
      </div>
    );
  }

  // ─── MENU ────────────────────────────────────────────────────────────────
  if (gameState === 'menu') {
    const option = (selected: boolean) =>
      `min-h-12 rounded-xl border text-base font-bold ${selected
        ? 'bg-green-700 border-green-700 text-white'
        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100'}`;
    return (
      <div className={`${BG} ${fadeClass}`}>
        <button
          onClick={toggleSound}
          aria-label={soundOn ? 'Sound on. Tap to mute' : 'Sound off. Tap to turn on'}
          className="fixed top-3 left-3 z-50 flex items-center gap-1.5 bg-white text-gray-800 border border-gray-200 shadow-md dark:bg-gray-800 dark:text-white dark:border-gray-600 rounded-full px-3 py-1.5 text-xs font-semibold"
        >
          {soundOn ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
          <span>Sound {soundOn ? 'on' : 'off'}</span>
        </button>
        <ThemeToggle />

        <div className="max-w-md mx-auto min-h-screen flex flex-col p-4 pt-12">
          <div className="flex flex-col items-center gap-1.5 text-center">
            <img src="/zed-rush-logo.png" alt="Zed Rush" className="w-36 drop-shadow-xl" />
            <p className="text-[15px] text-white font-medium">The guessing game that brings friends &amp; family together</p>
          </div>

          <div className="flex flex-col gap-3.5 pt-5">
            <div className={`${PANEL} px-5 py-4 space-y-2`}>
              <h2 className="font-display text-lg uppercase">How to play</h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                Teams take turns. Describe the main word without saying the forbidden words, and get as many right as you can in 30 seconds.
              </p>
              <Link to="/rules" className="inline-flex min-h-8 items-center text-[13px] font-semibold text-green-700 dark:text-green-400 hover:underline">
                View full rules
              </Link>
            </div>

            <div className={`${PANEL} px-5 py-4 space-y-2.5`}>
              <h2 className="text-[15px] font-semibold">Number of teams</h2>
              <div role="radiogroup" aria-label="Number of teams" className="grid grid-cols-4 gap-2">
                {[2, 3, 4, 5].map(n => (
                  <button key={n} role="radio" aria-checked={numberOfTeams === n} onClick={() => chooseNumberOfTeams(n)} className={option(numberOfTeams === n)}>
                    {n}
                  </button>
                ))}
              </div>
              <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
              <h2 className="text-[15px] font-semibold">Number of rounds</h2>
              <div role="radiogroup" aria-label="Number of rounds" className="grid grid-cols-5 gap-2">
                {[1, 5, 10, 15, 20].map(r => (
                  <button key={r} role="radio" aria-checked={totalRounds === r} onClick={() => setTotalRounds(r)} className={option(totalRounds === r)}>
                    {r}
                  </button>
                ))}
              </div>
              <p className="text-[13px] text-gray-600 dark:text-gray-400">
                {numberOfTeams} teams, {totalRounds} round{totalRounds > 1 ? 's' : ''}: {numberOfTeams * totalRounds} turns in total
              </p>
            </div>
          </div>

          <div className="flex-1 min-h-6" />

          <div className="space-y-2.5">
            <button
              onClick={() => transitionTo('teams')}
              className="w-full min-h-15 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl shadow-lg font-bold text-[17px]"
            >
              Set Up Teams
            </button>
            <button
              onClick={() => transitionTo('setup')}
              className="w-full min-h-13 bg-gray-100 text-gray-900 rounded-xl font-semibold text-[15px]"
            >
              Quick Start with Team {Array.from({ length: numberOfTeams - 1 }, (_, i) => i + 1).join(', ')} and {numberOfTeams}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── TEAMS SETUP ─────────────────────────────────────────────────────────
  if (gameState === 'teams') {
    const field = "w-full min-h-11 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 text-[15px] text-gray-900 dark:text-gray-100";
    return (
      <div className={`${BG} ${fadeClass}`}>
        <div className="max-w-md mx-auto min-h-screen flex flex-col px-4 pt-3 pb-5">
          <div className="flex items-center gap-1.5">
            <button onClick={() => transitionTo('menu')} aria-label="Back to menu" className="size-11 -ml-1.5 flex items-center justify-center text-white">
              <ArrowLeft className="size-6" />
            </button>
            <div>
              <h1 className="font-display text-2xl leading-tight uppercase text-white">Set up {numberOfTeams} teams</h1>
              <p className="text-[13px] text-white/90">Names are optional; blanks become Team 1, 2, 3</p>
            </div>
          </div>

          <div className="flex-1 space-y-3 pt-4">
            {Array.from({ length: numberOfTeams }, (_, i) => (
              <div key={i} className={`${PANEL} px-4 py-3.5 space-y-2.5`}>
                <h2 className="text-sm font-bold text-green-700 dark:text-green-400">Team {i + 1}</h2>
                <div className="space-y-1">
                  <label htmlFor={`t${i}n`} className="text-xs font-semibold text-gray-600 dark:text-gray-300">Team name</label>
                  <input
                    id={`t${i}n`}
                    className={field}
                    placeholder="e.g., The Zambezi Warriors"
                    value={teamInputs[`team${i + 1}Name`] ?? ''}
                    maxLength={MAX_NAME_LENGTH - 4}
                    onChange={e => setTeamInputs(p => ({ ...p, [`team${i + 1}Name`]: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor={`t${i}m`} className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                    Players <span className="font-normal">(separate with commas)</span>
                  </label>
                  <input
                    id={`t${i}m`}
                    className={field}
                    placeholder="e.g., Chanda, Mulenga, Temba"
                    value={teamInputs[`team${i + 1}Members`] ?? ''}
                    onChange={e => setTeamInputs(p => ({ ...p, [`team${i + 1}Members`]: e.target.value }))}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={saveTeams}
            className="mt-4 w-full min-h-15 bg-green-600 hover:bg-green-700 text-white rounded-2xl shadow-lg font-bold text-[17px]"
          >
            Save Teams &amp; Continue
          </button>
        </div>
      </div>
    );
  }

  // ─── TEAM'S TURN (get ready) ─────────────────────────────────────────────
  if (gameState === 'setup') {
    const currentTeam = teams[currentTeamIndex];
    const describer = describerOf(currentTeam);
    const guessers = currentTeam.members.filter(m => m !== describer);
    return (
      <div className={`${BG} ${fadeClass}`}>
        <div className="max-w-md mx-auto min-h-screen flex flex-col px-4 py-5 text-white">
          <div className="flex flex-col items-center gap-2.5 text-center pt-8">
            <span className={PILL}>Round {currentRound} of {totalRounds}</span>
            <h1 className="font-display text-4xl leading-none uppercase drop-shadow">{currentTeam.name}</h1>
            <p className="text-lg font-semibold">It's your turn</p>
            {describer ? (
              <p className="text-sm text-white/90">
                <span className="font-bold">{describer}</span> describes
                {guessers.length > 0 && <>; {joinNames(guessers)} guess{guessers.length === 1 ? 'es' : ''}</>}
              </p>
            ) : (
              <p className="text-sm text-white/90">Pick one player to describe; the rest of the team guesses</p>
            )}
            <p className="text-[13px] text-white/85 max-w-xs">Hold the phone so only the describer can see it. Other teams: watch for forbidden words and hit Buzz.</p>
          </div>

          <div className={`${PANEL} mt-6 px-4 py-3.5`}>
            <div className="flex items-center gap-2 pb-1.5">
              <Trophy className="size-4.5 text-yellow-500" />
              <h2 className="text-[15px] font-semibold">Scoreboard</h2>
            </div>
            {teams.map((team, i) => (
              <div key={i} className={`flex items-center justify-between min-h-12 px-2.5 rounded-xl ${i === currentTeamIndex ? 'bg-green-50 dark:bg-green-900/30' : ''}`}>
                <div className="flex flex-col">
                  <span className={`text-[15px] ${i === currentTeamIndex ? 'font-bold' : 'font-semibold'}`}>{team.name}</span>
                  {i === currentTeamIndex && <span className="text-xs font-semibold text-green-700 dark:text-green-400">Up now</span>}
                </div>
                <span className="text-2xl font-black text-green-700 dark:text-green-400">{team.score}</span>
              </div>
            ))}
          </div>

          <div className="flex-1 min-h-6" />

          <button
            onClick={startTurn}
            className="w-full min-h-16 bg-green-600 hover:bg-green-700 text-white rounded-2xl shadow-lg font-bold text-lg flex items-center justify-center gap-2.5"
          >
            <Timer className="size-5" />
            Start 30 Seconds
          </button>
          <div className="flex justify-center gap-7 pt-2.5">
            <button onClick={() => transitionTo('teams')} className="min-h-11 text-sm font-semibold text-white hover:underline">Edit Teams</button>
            <button onClick={resetGame} className="min-h-11 text-sm font-semibold text-white hover:underline">New Game</button>
          </div>
        </div>
      </div>
    );
  }

  // ─── PLAYING ─────────────────────────────────────────────────────────────
  if (gameState === 'playing') {
    const currentTeam = teams[currentTeamIndex];
    const describer = describerOf(currentTeam);
    const longWord = (currentCard[0] ?? '').length > 13;
    return (
      <div className={`${BG} flex flex-col text-white ${fadeClass}`}>
        <div className="px-4 pt-4 pb-3.5 bg-black/20 dark:bg-black/40 space-y-2.5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2.5">
            <span className={`${PILL} justify-self-start max-w-full overflow-hidden text-ellipsis`}>{currentTeam.name}</span>
            <span
              role="timer"
              aria-label={`${timeLeft} seconds left`}
              className={`min-w-27 text-center px-4 py-1.5 rounded-2xl font-black text-4xl leading-tight tabular-nums timer-normal transition-colors ${isUrgent
                ? 'bg-red-900/60 ring-2 ring-red-400 text-red-100 timer-urgent'
                : 'bg-black/30'}`}
            >
              {timeLeft}s
            </span>
            <span className={`${PILL} justify-self-end`}>Round {currentRound}/{totalRounds}</span>
          </div>
          <div className="flex justify-between items-center text-[13px] font-medium text-white/90">
            <span>{describer ? <><span className="font-bold">{describer}</span> is describing</> : currentTeam.members.join(' • ')}</span>
            <span className="relative font-bold">
              {turnScore} pts this turn
              {popKey > 0 && <span key={popKey} className="zr-pop absolute right-0 -top-5 font-black text-lg text-yellow-300">+1</span>}
            </span>
          </div>
        </div>

        <div className="flex justify-end px-4 pt-3">
          <button
            onClick={buzz}
            aria-label="Buzz: the describer said a forbidden word"
            className="min-h-11 flex items-center gap-2 bg-red-800 hover:bg-red-900 text-white border-2 border-white/70 rounded-full px-4 text-sm font-bold"
          >
            <Bell className="size-4" />
            Buzz! Forbidden word
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-2.5">
          {currentCard.length > 0 && (
            <div key={currentCard[0]} className="zr-card w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl px-5 pt-7 pb-5 space-y-4">
              <div className="flex flex-col items-center gap-2.5 text-center">
                <h1 className={`font-display uppercase leading-none text-green-700 dark:text-green-400 ${longWord ? 'text-3xl' : 'text-4xl'}`}>
                  {currentCard[0]}
                </h1>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Describe without using these words:</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {currentCard.slice(1).map((word, i) => (
                  <span key={i} className="bg-red-600 text-white rounded-lg px-2 py-2.5 text-[15px] font-semibold text-center leading-tight break-words">
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 pt-3 pb-5 space-y-3 max-w-md w-full mx-auto">
          <button
            onClick={correctGuess}
            className={`w-full min-h-17 bg-green-600 hover:bg-green-700 text-white rounded-2xl shadow-lg font-black text-xl ${justScored ? 'btn-bounce' : ''}`}
          >
            Correct! Next Card
          </button>
          <div className="flex gap-3">
            <button onClick={skipCard} className="flex-1 min-h-13 bg-gray-100 text-gray-900 rounded-xl font-semibold text-[15px]">
              Skip Card <span className="text-red-700">(−1)</span>
            </button>
            <button onClick={endTurnEarly} className="flex-1 min-h-13 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-[15px]">
              End Turn
            </button>
          </div>
        </div>

        {flashBuzz && (
          <div className="zr-flash fixed inset-0 z-40 pointer-events-none bg-red-800/70 flex items-center justify-center">
            <span className="font-display text-7xl uppercase">Buzz!</span>
          </div>
        )}

        {turnPhase === 'countdown' && (
          <div className={`${BG} fixed inset-0 z-50 flex flex-col items-center justify-center gap-2`}>
            <span key={countdownN} className="zr-count font-display text-[180px] leading-none drop-shadow-xl">
              {countdownN > 0 ? countdownN : 'Go!'}
            </span>
            <span className="text-base font-semibold text-white/90">Get ready{describer ? `, ${describer}` : ''}</span>
          </div>
        )}

        {turnPhase === 'recap' && (
          <div className="fixed inset-0 z-50 bg-black/50 flex flex-col justify-end">
            <div className="zr-sheet w-full max-w-md mx-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-t-3xl px-5 pt-5 pb-6 flex flex-col gap-3 max-h-[92vh]">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-3xl leading-none uppercase text-red-600">{timeLeft === 0 ? "Time's up!" : 'Turn over'}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{currentTeam.name} scored</p>
                </div>
                <span className="font-black text-5xl leading-none text-green-700 dark:text-green-400 tabular-nums">{turnScore}</span>
              </div>
              <p className="text-[13px] text-gray-600 dark:text-gray-300">Tap a word to fix a mistake.</p>
              <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5">
                {turnLog.length === 0 && <p className="text-sm text-gray-500 py-3">No cards played this turn.</p>}
                {turnLog.map((entry, i) => {
                  const ok = entry.result === 'got';
                  return (
                    <button
                      key={i}
                      onClick={() => toggleEntry(i)}
                      aria-label={`${entry.word}: ${ok ? 'guessed' : 'missed'}. Tap to change`}
                      className={`w-full min-h-12 flex items-center gap-3 px-3 rounded-xl border text-left ${ok
                        ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800'
                        : 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800'}`}
                    >
                      {ok ? <Check className="size-5 shrink-0 text-green-700" /> : <X className="size-5 shrink-0 text-red-700" />}
                      <span className="flex-1 font-semibold text-[15px]">{entry.word}</span>
                      <span className={`text-[13px] font-semibold ${ok ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                        {ok ? 'Got it' : entry.result === 'buzz' ? 'Buzzed (−1)' : 'Skipped (−1)'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={confirmTurn}
                className="w-full min-h-14 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold text-[17px]"
              >
                {isLastTurn ? 'See Final Results' : "Next Team's Turn"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── GAME COMPLETE ───────────────────────────────────────────────────────
  if (gameState === 'results') {
    const sorted = [...teams].sort((a, b) => b.score - a.score);
    const isTie = winners.length > 1;
    const winnerPlayers = !isTie ? winners[0].members : [];
    return (
      <div className={`${BG} ${fadeClass}`}>
        <GameCompleteEffect isGameComplete={isGameComplete} />
        <div className="max-w-md mx-auto min-h-screen flex flex-col px-4 py-5 text-white">
          <div className="flex flex-col items-center gap-2.5 text-center pt-10">
            <div className="size-19 rounded-full bg-white/20 border border-white/35 flex items-center justify-center">
              <Trophy className="size-10 text-yellow-300" />
            </div>
            <h1 className="font-display text-4xl leading-none uppercase drop-shadow">Game Complete!</h1>
            <p className="text-xl font-bold text-yellow-300">
              {isTie ? `It's a tie! ${winners.map(t => t.name).join(' & ')}` : `${winners[0].name} win!`}
            </p>
            {winnerPlayers.length > 0 && (
              <p className="text-sm text-white/90">Great job, {winnerPlayers.join(', ')}</p>
            )}
          </div>

          <div className={`${PANEL} mt-7 px-4 py-3.5`}>
            <h2 className="text-[15px] font-semibold pb-1.5">Final Scoreboard</h2>
            {sorted.map((team, i) => {
              // Tied teams share the same place
              const place = sorted.findIndex(t => t.score === team.score) + 1;
              const first = place === 1;
              return (
                <div key={i} className={`flex items-center gap-3 min-h-12 px-2.5 rounded-xl ${first ? 'bg-yellow-100 dark:bg-yellow-900/30' : ''}`}>
                  <span className={`w-5 text-center font-bold ${first ? 'text-yellow-700 dark:text-yellow-400' : 'text-gray-500'}`}>{place}</span>
                  <span className={`flex-1 text-[15px] ${first ? 'font-bold' : 'font-semibold'}`}>{team.name}</span>
                  <span className="text-2xl font-black text-green-700 dark:text-green-400">{team.score}</span>
                </div>
              );
            })}
          </div>

          <div className="flex-1 min-h-6" />

          <button
            onClick={playAgain}
            className="w-full min-h-15 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl shadow-lg font-bold text-[17px]"
          >
            Play Again, Same Teams
          </button>
          <button
            onClick={resetGame}
            className="mt-2.5 w-full min-h-13 bg-gray-100 text-gray-900 rounded-xl font-semibold text-[15px]"
          >
            New Game
          </button>
        </div>
      </div>
    );
  }

  return null;
}
