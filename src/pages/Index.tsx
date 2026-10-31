import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Timer, Play, RotateCcw, Users, Trophy, Edit3, BookOpen } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { zambianCards } from "@/utils/cards";
import { ThemeToggle } from "@/components/ThemeToggle";
import beepSound from "@/beep-09.mp3";
import { getDeviceId } from "@/lib/device-id";

type GameState = 'cover' | 'menu' | 'teams' | 'setup' | 'playing' | 'results';

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
// Must match the limits in convex/teams.ts
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

const BG = "min-h-screen bg-gradient-to-br from-green-600 via-orange-500 to-red-600 dark:from-green-700 dark:via-orange-600 dark:to-red-700";

function fireConfetti() {
  const zambian = ['#198D19', '#FF8C00', '#DC2626', '#FCD34D', '#ffffff'];
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.55 }, colors: zambian });
  setTimeout(() => {
    confetti({ particleCount: 80, angle: 60,  spread: 55, origin: { x: 0 }, colors: zambian });
    confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1 }, colors: zambian });
  }, 320);
}

function GameCompleteEffect({ isGameComplete, onComplete }: { isGameComplete: boolean; onComplete: () => void }) {
  const hasRun = useRef(false);
  useEffect(() => {
    if (isGameComplete && !hasRun.current) {
      hasRun.current = true;
      onComplete();
      fireConfetti();
    }
  }, [isGameComplete, onComplete]);
  return null;
}

export default function Index() {
  const saveTeamMutation = useMutation(api.teams.saveTeam);
  const recordGameResultsMutation = useMutation(api.teams.recordGameResult);

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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadlineRef = useRef(0);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const beepRef = useRef<HTMLAudioElement | null>(null);
  // A ref (not state) so rapid taps never see a stale set and repeat a card
  const usedCardsRef = useRef<Set<string>>(new Set());

  const isLastTurn = currentRound >= totalRounds && currentTeamIndex === numberOfTeams - 1;
  const isGameComplete = gameState === 'results' && isLastTurn;

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

  const endTurn = useCallback(() => {
    stopTimer();
    transitionTo('results');
  }, [stopTimer, transitionTo]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    // Count down against a fixed deadline so a locked or backgrounded phone doesn't slow the clock
    deadlineRef.current = Date.now() + TURN_SECONDS * 1000;
    setTimeLeft(TURN_SECONDS);
    setIsTimerRunning(true);
    requestWakeLock();
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        beepRef.current?.play().catch(() => {});
        endTurn();
      }
    }, 250);
  }, [endTurn, requestWakeLock]);

  // Clean up timer and wake lock on unmount
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
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

  // Android back gesture: keep the player in the game instead of closing the app
  useEffect(() => {
    if (gameState !== 'teams' && !IN_GAME_STATES.includes(gameState)) return;
    if (!window.history.state?.zedRushGuard) {
      window.history.pushState({ ...window.history.state, zedRushGuard: true }, '');
    }
    const onPop = () => {
      window.history.pushState({ ...window.history.state, zedRushGuard: true }, '');
      if (gameState === 'playing') endTurn();
      else if (gameState === 'teams') transitionTo('menu');
      else toast("Game in progress. Tap New Game to quit.");
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [gameState, endTurn, transitionTo]);

  const chooseNumberOfTeams = (n: number) => {
    setNumberOfTeams(n);
    setTeams(prev => resizeTeams(prev, n));
  };

  const startGame = useCallback(() => {
    // Unlock audio during this tap so the time's-up beep can play later on mobile
    if (!beepRef.current) beepRef.current = new Audio(beepSound);
    const beep = beepRef.current;
    beep.muted = true;
    beep.play().then(() => {
      beep.pause();
      beep.currentTime = 0;
      beep.muted = false;
    }).catch(() => { beep.muted = false; });

    setCurrentCard(getNextCard());
    setTimeLeft(TURN_SECONDS);
    setVisible(false);
    setTimeout(() => {
      setGameState('playing');
      setVisible(true);
      startTimer();
    }, 180);
  }, [getNextCard, startTimer]);

  const correctGuess = useCallback(() => {
    setJustScored(true);
    setTimeout(() => setJustScored(false), 380);
    setTeams(prev => prev.map((t, i) =>
      i === currentTeamIndex ? { ...t, score: t.score + 1 } : t
    ));
    setCurrentCard(getNextCard(currentCard[0]));
  }, [currentTeamIndex, currentCard, getNextCard]);

  // Rules: passing on a card costs the team a point
  const skipCard = useCallback(() => {
    setTeams(prev => prev.map((t, i) =>
      i === currentTeamIndex ? { ...t, score: t.score - 1 } : t
    ));
    setCurrentCard(getNextCard(currentCard[0]));
  }, [currentTeamIndex, currentCard, getNextCard]);

  const nextTeam = useCallback(() => {
    const next = (currentTeamIndex + 1) % numberOfTeams;
    if (next === 0) {
      if (currentRound >= totalRounds) {
        transitionTo('results');
        return;
      }
    }
    // Changing team while the results screen is still fading out would make it
    // look like the final turn and record the game early
    transitionTo('setup', () => {
      if (next === 0) setCurrentRound(r => r + 1);
      setCurrentTeamIndex(next);
    });
  }, [currentTeamIndex, currentRound, numberOfTeams, totalRounds, transitionTo]);

  const resetGame = useCallback(() => {
    stopTimer();
    clearSavedGame();
    setSavedGame(null);
    // Reset with the screen change so the auto-save never stores the blank game
    transitionTo('menu', () => {
      setTeams(resizeTeams([], numberOfTeams));
      setCurrentTeamIndex(0);
      setCurrentRound(1);
      setTimeLeft(TURN_SECONDS);
      usedCardsRef.current = new Set();
    });
  }, [numberOfTeams, stopTimer, transitionTo]);

  const resumeGame = () => {
    if (!savedGame) return;
    setNumberOfTeams(savedGame.numberOfTeams);
    setTeams(savedGame.teams);
    setTeamInputs(savedGame.teamInputs ?? {});
    setTotalRounds(savedGame.totalRounds);
    setCurrentRound(savedGame.currentRound);
    setCurrentTeamIndex(savedGame.currentTeamIndex);
    usedCardsRef.current = new Set(savedGame.usedCards ?? []);
    // A turn interrupted mid-play counts as over
    transitionTo(savedGame.gameState === 'playing' ? 'results' : savedGame.gameState);
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
    // Don't wait on the backend: offline, Convex holds mutations until it reconnects
    const deviceId = getDeviceId();
    Promise.all(newTeams.map(team => saveTeamMutation({ deviceId, name: team.name, members: team.members })))
      .catch(() => toast.error("Couldn't save teams online. The game works offline."));
  };

  const topScore = Math.max(...teams.map(t => t.score));
  const winners = teams.filter(t => t.score === topScore);

  const recordGameResults = useCallback(async () => {
    try {
      await recordGameResultsMutation({
        deviceId: getDeviceId(),
        teamScores: teams.map(t => ({ teamName: t.name, teamMembers: t.members, score: t.score })),
        totalRounds,
        winningTeam: winners.map(t => t.name).join(' & '),
      });
    } catch {
      // Results not saved to cloud — game still completes normally
    }
  }, [teams, totalRounds, winners, recordGameResultsMutation]);

  const fadeClass = `screen-fade ${visible ? 'screen-fade-in' : 'screen-fade-out'}`;
  const isUrgent = timeLeft <= 10 && isTimerRunning;

  // ─── COVER ───────────────────────────────────────────────────────────────
  if (gameState === 'cover') {
    return (
      <div className={`flex flex-col items-center justify-center p-4 relative overflow-hidden ${fadeClass}`} style={{minHeight:'100vh', background:'linear-gradient(to bottom right, #1A5C1A, #d97706, #dc2626)'}}>
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-10  left-10  w-20 h-20 border-2 border-white rounded-full" />
          <div className="absolute top-32  right-20 w-16 h-16 border-2 border-white rotate-45" />
          <div className="absolute bottom-20 left-20  w-24 h-24 border-2 border-white rounded-full" />
          <div className="absolute bottom-32 right-10 w-12 h-12 border-2 border-white rotate-45" />
          <div className="absolute top-1/2 left-1/4 w-8  h-8  border-2 border-white rounded-full" />
          <div className="absolute top-1/3 right-1/3 w-6  h-6  border-2 border-white rotate-45" />
        </div>

        <div className="text-center space-y-12 max-w-lg mx-auto z-10">
          <div className="space-y-6">
            <div className="relative inline-block">
              <img src="/zed-rush-logo.png" alt="Zed Rush" className="w-72 mx-auto drop-shadow-2xl" />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full animate-pulse" />
            </div>

            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
              <p className="text-2xl text-white/95 font-semibold">The Ultimate Zambian</p>
              <p className="text-3xl text-white font-bold">Guessing Game</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex justify-center space-x-8">
              <div className="text-center">
                <Timer className="size-8 mx-auto text-yellow-400 mb-2" />
                <p className="text-white/90 text-sm font-semibold">30 Seconds</p>
              </div>
              <div className="text-center">
                <Users className="size-8 mx-auto text-yellow-400 mb-2" />
                <p className="text-white/90 text-sm font-semibold">Team Game</p>
              </div>
              <div className="text-center">
                <Trophy className="size-8 mx-auto text-yellow-400 mb-2" />
                <p className="text-white/90 text-sm font-semibold">Score Points</p>
              </div>
            </div>

            <Button
              onClick={() => transitionTo('menu')}
              size="lg"
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-2 border-white/40 font-bold text-xl py-6 px-12 rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl"
            >
              <Play className="mr-3 size-6" />
              Start Playing
            </Button>
            {savedGame && (
              <div>
                <Button
                  onClick={resumeGame}
                  size="lg"
                  className="bg-green-700/80 hover:bg-green-700 text-white border-2 border-white/40 font-bold text-lg py-5 px-10 rounded-2xl shadow-2xl"
                >
                  <RotateCcw className="mr-2 size-5" />
                  Resume Game
                </Button>
                <p className="text-white/70 text-xs mt-2">
                  Round {savedGame.currentRound} of {savedGame.totalRounds} · {savedGame.teams.map(t => t.name).join(' vs ')}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-6 text-center text-white/70 text-sm">
          <p>Celebrating Zambian Culture • Livingstone to Nakonde &amp; everywhere in-between</p>
        </div>
      </div>
    );
  }

  // ─── MENU ────────────────────────────────────────────────────────────────
  if (gameState === 'menu') {
    return (
      <div className={`${BG} flex flex-col items-center justify-center p-4 ${fadeClass}`}>
        <ThemeToggle />
        <div className="text-center space-y-6 max-w-md mx-auto w-full">
          <div className="space-y-3">
            <img src="/zed-rush-logo.png" alt="Zed Rush" className="w-48 mx-auto drop-shadow-2xl" />
            <p className="text-base text-white/90 font-medium">
              The guessing game that brings friends &amp; family together!
            </p>
          </div>

          <Card className="bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
            <CardHeader className="pb-2">
              <CardTitle className="text-center text-gray-800 dark:text-gray-100 text-base">How to Play</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-gray-700 dark:text-gray-200">• Teams take turns</p>
              <p className="text-gray-700 dark:text-gray-200">• Describe the main word without using the forbidden words</p>
              <p className="text-gray-700 dark:text-gray-200">• Get as many correct guesses as possible in 30 seconds</p>
              <p className="text-gray-700 dark:text-gray-200">• Featuring Zambia-relatable people, places, and culture!</p>
              <div className="pt-1">
                <Link
                  to="/rules"
                  className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400 font-semibold hover:underline"
                >
                  <BookOpen className="size-3" /> View full rules
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
            <CardHeader className="pb-2">
              <CardTitle className="text-center text-gray-800 dark:text-gray-100 text-base">Number of Teams</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center gap-2 mb-2">
                {[2, 3, 4, 5].map(n => (
                  <Button
                    key={n}
                    onClick={() => chooseNumberOfTeams(n)}
                    variant={numberOfTeams === n ? "default" : "outline"}
                    className="px-4 py-2 text-sm font-bold"
                  >
                    {n}
                  </Button>
                ))}
              </div>
              <p className="text-center text-xs text-muted-foreground">Selected: {numberOfTeams} teams</p>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
            <CardHeader className="pb-2">
              <CardTitle className="text-center text-gray-800 dark:text-gray-100 text-base">Number of Rounds</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {[1, 5, 10, 15, 20].map(r => (
                  <Button
                    key={r}
                    onClick={() => setTotalRounds(r)}
                    variant={totalRounds === r ? "default" : "outline"}
                    className="text-sm py-2 font-bold"
                  >
                    {r}
                  </Button>
                ))}
              </div>
              <p className="text-center text-xs text-muted-foreground mt-2">
                Selected: {totalRounds} round{totalRounds > 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button
              onClick={() => transitionTo('teams')}
              size="lg"
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 text-base"
            >
              <Edit3 className="mr-2 size-5" />
              Setup Teams
            </Button>
            <Button
              onClick={() => transitionTo('setup')}
              size="lg"
              variant="secondary"
              className="w-full font-semibold"
            >
              <Play className="mr-2 size-5" />
              Quick Start
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── TEAMS SETUP ─────────────────────────────────────────────────────────
  if (gameState === 'teams') {
    return (
      <div className={`${BG} flex flex-col items-center justify-center p-4 ${fadeClass}`}>
        <div className="max-w-md mx-auto space-y-6 w-full">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-1">Setup {numberOfTeams} Teams</h2>
            <p className="text-white/80 text-sm">Enter team names and player names</p>
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {Array.from({ length: numberOfTeams }, (_, i) => (
              <Card key={i} className="bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
                <CardHeader className="pb-2">
                  <CardTitle className="text-center text-gray-800 dark:text-gray-100 text-sm font-bold">
                    Team {i + 1}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label htmlFor={`t${i}n`} className="text-gray-700 dark:text-gray-200 text-xs font-semibold">Team Name</Label>
                    <Input
                      id={`t${i}n`}
                      placeholder="e.g., The Zambezi Warriors"
                      value={teamInputs[`team${i + 1}Name`] ?? ''}
                      maxLength={MAX_NAME_LENGTH - 4}
                      onChange={e => setTeamInputs(p => ({ ...p, [`team${i + 1}Name`]: e.target.value }))}
                      className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`t${i}m`} className="text-gray-700 dark:text-gray-200 text-xs font-semibold">
                      Player Names <span className="font-normal opacity-70">(comma separated)</span>
                    </Label>
                    <Input
                      id={`t${i}m`}
                      placeholder="e.g., Chanda, Mulenga, Temba"
                      value={teamInputs[`team${i + 1}Members`] ?? ''}
                      onChange={e => setTeamInputs(p => ({ ...p, [`team${i + 1}Members`]: e.target.value }))}
                      className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-3">
            <Button onClick={saveTeams} size="lg" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4">
              Save Teams &amp; Continue
            </Button>
            <Button onClick={() => transitionTo('menu')} variant="secondary" size="lg" className="w-full font-semibold">
              Back to Menu
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── SETUP (pre-turn) ────────────────────────────────────────────────────
  if (gameState === 'setup') {
    const currentTeam = teams[currentTeamIndex];
    return (
      <div className={`${BG} flex flex-col items-center justify-center p-4 ${fadeClass}`}>
        <div className="max-w-md mx-auto space-y-6 w-full">
          <div className="text-center">
            <Badge variant="secondary" className="mb-3 text-lg px-4 py-2 font-bold">
              {currentTeam.name}'s Turn
            </Badge>
            <div className="flex justify-center mb-2">
              <Badge variant="outline" className="text-sm bg-white/20 text-white border-white/30">
                Round {currentRound} of {totalRounds}
              </Badge>
            </div>
            {currentTeam.members.length > 0 && (
              <p className="text-white/80 text-sm">Players: {currentTeam.members.join(", ")}</p>
            )}
          </div>

          <Card className="bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
            <CardHeader className="pb-2">
              <CardTitle className="text-center flex items-center justify-center gap-2 text-gray-800 dark:text-gray-100">
                <Trophy className="size-5 text-yellow-500" />
                Scoreboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teams.map((team, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{team.name}</div>
                      {team.members.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {team.members.slice(0, 3).join(", ")}
                          {team.members.length > 3 && ` +${team.members.length - 3} more`}
                        </div>
                      )}
                    </div>
                    <div className="text-2xl font-black text-green-600">{team.score}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button onClick={startGame} size="lg" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-5 text-lg">
              <Timer className="mr-2 size-5" />
              Start Game
            </Button>
            <div className="flex gap-3">
              <Button onClick={() => transitionTo('teams')} variant="secondary" size="lg" className="flex-1 font-semibold">
                <Edit3 className="mr-2 size-4" /> Edit Teams
              </Button>
              <Button onClick={resetGame} variant="secondary" size="lg" className="flex-1 font-semibold">
                <RotateCcw className="mr-2 size-4" /> New Game
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── PLAYING ─────────────────────────────────────────────────────────────
  if (gameState === 'playing') {
    const currentTeam = teams[currentTeamIndex];
    return (
      <div className={`${BG} flex flex-col min-h-screen ${fadeClass}`}>
        {/* Header */}
        <div className="p-4 text-center bg-black/20 dark:bg-black/40">
          <div className="flex justify-between items-center mb-2">
            <Badge variant="secondary" className="font-bold">{currentTeam.name}</Badge>

            {/* Timer */}
            <div className={`px-5 py-2 rounded-xl font-black text-4xl transition-all duration-300 timer-normal
              ${isUrgent
                ? 'text-red-300 bg-red-900/50 ring-2 ring-red-400 timer-urgent'
                : 'text-white bg-black/30'
              }`}
            >
              {timeLeft}s
            </div>

            <Badge variant="outline" className="text-xs bg-white/20 text-white border-white/30">
              Round {currentRound}/{totalRounds}
            </Badge>
          </div>
          {currentTeam.members.length > 0 && (
            <p className="text-white/80 text-sm font-medium">{currentTeam.members.join(" • ")}</p>
          )}
        </div>

        {/* Game Card */}
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm bg-white dark:bg-gray-800 shadow-2xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-3xl font-black text-green-700 dark:text-green-400 mb-2 leading-tight">
                {currentCard[0]}
              </CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                Describe without using these words:
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {currentCard.slice(1).map((word, i) => (
                  <Badge key={i} variant="destructive" className="justify-center py-2 text-sm font-semibold h-auto text-center whitespace-normal break-words leading-tight">
                    {word}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Buttons */}
        <div className="p-4 space-y-3">
          <Button
            onClick={correctGuess}
            size="lg"
            className={`w-full bg-green-600 hover:bg-green-700 text-white font-black py-5 text-xl rounded-xl shadow-lg
              ${justScored ? 'btn-bounce' : ''}`}
          >
            ✓ Correct! Next Card
          </Button>
          <div className="flex gap-3">
            <Button
              onClick={skipCard}
              variant="secondary"
              size="lg"
              className="flex-1 font-semibold"
            >
              Skip Card (−1)
            </Button>
            <Button
              onClick={endTurn}
              variant="destructive"
              size="lg"
              className="flex-1 font-semibold"
            >
              End Turn
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── RESULTS ─────────────────────────────────────────────────────────────
  if (gameState === 'results') {
    const currentTeam = teams[currentTeamIndex];
    const sorted = [...teams].sort((a, b) => b.score - a.score);
    const isTie = winners.length > 1;

    return (
      <div className={`${BG} flex flex-col items-center justify-center p-4 ${fadeClass}`}>
        <GameCompleteEffect isGameComplete={isGameComplete} onComplete={recordGameResults} />
        <div className="max-w-md mx-auto space-y-6 w-full">

          <div className="text-center">
            {isGameComplete ? (
              <>
                <div className="text-6xl mb-2 animate-bounce">🏆</div>
                <h2 className="text-3xl font-black text-white mb-1">Game Complete!</h2>
                <p className="text-yellow-300 font-bold text-xl">
                  {isTie
                    ? `It's a tie! ${winners.map(t => t.name).join(' & ')}`
                    : `${winners[0].name} wins!`}
                </p>
              </>
            ) : (
              <>
                <Trophy className="size-14 mx-auto text-yellow-400 mb-2" />
                <h2 className="text-3xl font-black text-white mb-1">Time's Up!</h2>
              </>
            )}
            <div className="flex justify-center gap-2 mt-3">
              <Badge variant="secondary" className="text-base px-4 py-1 font-bold">
                {currentTeam.name}: {currentTeam.score} pts
              </Badge>
              <Badge variant="outline" className="text-sm bg-white/20 text-white border-white/30">
                Round {currentRound}/{totalRounds}
              </Badge>
            </div>
            {currentTeam.members.length > 0 && (
              <p className="text-white/80 text-sm mt-2">Great job: {currentTeam.members.join(", ")}!</p>
            )}
          </div>

          <Card className="bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
            <CardHeader className="pb-2">
              <CardTitle className="text-center flex items-center justify-center gap-2 text-gray-800 dark:text-gray-100">
                <Users className="size-5" />
                {isGameComplete ? 'Final Scoreboard' : 'Current Scores'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sorted.map((team, i) => {
                  // Medals go by score, so tied teams share the same place
                  const place = sorted.findIndex(t => t.score === team.score);
                  return (
                  <div key={i} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {isGameComplete && place === 0 && <Trophy className="size-4 text-yellow-500 shrink-0" />}
                      {isGameComplete && place === 1 && <span className="text-sm">🥈</span>}
                      {isGameComplete && place === 2 && <span className="text-sm">🥉</span>}
                      <div>
                        <div className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{team.name}</div>
                        {team.members.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {team.members.slice(0, 2).join(", ")}
                            {team.members.length > 2 && ` +${team.members.length - 2}`}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-2xl font-black text-green-600">{team.score}</div>
                  </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {!isGameComplete && (
              <Button
                onClick={nextTeam}
                size="lg"
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 text-base"
              >
                Next Team's Turn
              </Button>
            )}
            <Button onClick={resetGame} variant="secondary" size="lg" className="w-full font-semibold">
              <RotateCcw className="mr-2 size-5" />
              New Game
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
