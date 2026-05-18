import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
} from 'react';

const initialState = {
  players: [],
  boardTiles: [],
  gridRows: 0,
  gridCols: 0,
  gamePhase: 'setup',
  currentAttacker: null,
  currentDefender: null,
  duelState: null,
  duelResult: null,        // { winnerId, loserId } — set after a duel ends
  categorySources: {},     // { [categoryName]: 'api' | 'local' }
};

const PLAYER_COLORS = [
  '#e94560', '#3a86ff', '#06d6a0', '#ffbe0b',
  '#fb5607', '#8338ec', '#ff006e', '#3d405b',
  '#2ec4b6', '#cbf3f0',
];

// Fisher-Yates shuffle (pure — returns a new array)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Derive grid dimensions for N players.
// Uses the smallest rectangle with ≥2 rows and ≥2 cols that fits all players.
// Every cell in such a rectangle has at least 2 neighbors.
function getGridDimensions(n) {
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  return { rows, cols };
}

// Build tile array: N player tiles + filler neutral tiles
function buildBoardTiles(players) {
  const { rows, cols } = getGridDimensions(players.length);

  // All positions in the grid
  const positions = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      positions.push({ row: r, col: c });
    }
  }

  // Shuffle positions then assign players to the first N slots
  const shuffled = shuffle(positions);
  const shuffledPlayers = shuffle(players); // also randomise player order

  return shuffled.map((pos, i) => {
    const player = shuffledPlayers[i] ?? null;
    return {
      id: `tile-${pos.row}-${pos.col}`,
      playerId: player ? player.id : null,
      currentCategory: player ? player.category : null,
      isEliminated: false,
      position: pos,
    };
  });
}

function gameReducer(state, action) {
  switch (action.type) {

    case 'HYDRATE':
      return { ...initialState, ...action.payload };

    case 'ADD_PLAYER': {
      if (state.players.length >= 10) return state;
      const newPlayer = {
        id: crypto.randomUUID(),
        name: action.payload.name.trim(),
        category: action.payload.category.trim(),
        color: PLAYER_COLORS[state.players.length % PLAYER_COLORS.length],
      };
      return { ...state, players: [...state.players, newPlayer] };
    }

    case 'REMOVE_PLAYER': {
      const filtered = state.players.filter(p => p.id !== action.payload.id);
      return { ...state, players: filtered };
    }

    case 'GENERATE_BOARD': {
      if (state.players.length < 4) return state;

      const tiles = buildBoardTiles(state.players);
      const { rows, cols } = getGridDimensions(state.players.length);

      // Pick a random player as the first attacker
      const randomPlayer = state.players[Math.floor(Math.random() * state.players.length)];

      return {
        ...state,
        boardTiles: tiles,
        gridRows: rows,
        gridCols: cols,
        currentAttacker: randomPlayer.id,
        gamePhase: 'board',
      };
    }

    case 'SELECT_DEFENDER': {
      // Find the defender's tile to get their current category (the duel topic)
      const defenderTile = state.boardTiles.find(
        t => t.playerId === action.payload.defenderId
      );
      if (!defenderTile) return state;

      return {
        ...state,
        currentDefender: action.payload.defenderId,
        duelState: {
          topic: defenderTile.currentCategory,
          attackerSkipUsed: false,
          defenderSkipUsed: false,
        },
      };
    }

    case 'CANCEL_DEFENDER':
      return { ...state, currentDefender: null, duelState: null };

    case 'CANCEL_DUEL':
      // Abort the duel in progress — return to the board exactly as it was
      return { ...state, gamePhase: 'board', currentDefender: null, duelState: null };

    case 'SET_CATEGORY_SOURCE':
      return {
        ...state,
        categorySources: {
          ...state.categorySources,
          [action.payload.name]: action.payload.sourceType,
        },
      };

    case 'START_DUEL': {
      if (!state.currentDefender) return state;
      return { ...state, gamePhase: 'duel' };
    }

    case 'DUEL_END': {
      const { winnerId, loserId } = action.payload;

      // The "NOT played" category is always the ATTACKER's category.
      // (The duel topic was the Defender's category, so the attacker's is the one not used.)
      const attackerTile = state.boardTiles.find(t => t.playerId === state.currentAttacker);
      const notPlayedCategory = attackerTile?.currentCategory ?? null;

      // Transfer all loser tiles to winner; update all winner tiles to the NOT-played category
      const updatedTiles = state.boardTiles.map(tile => {
        if (tile.playerId === loserId) {
          return { ...tile, playerId: winnerId, currentCategory: notPlayedCategory };
        }
        if (tile.playerId === winnerId) {
          return { ...tile, currentCategory: notPlayedCategory };
        }
        return tile;
      });

      // Win condition: only one player still has tiles
      const remainingPlayerIds = [
        ...new Set(updatedTiles.filter(t => t.playerId !== null).map(t => t.playerId))
      ];

      const duelResult = { winnerId, loserId, newCategory: notPlayedCategory };

      if (remainingPlayerIds.length === 1) {
        return {
          ...state,
          boardTiles: updatedTiles,
          gamePhase: 'winner',
          currentAttacker: winnerId,
          currentDefender: null,
          duelState: null,
          duelResult,
        };
      }

      return {
        ...state,
        boardTiles: updatedTiles,
        gamePhase: 'post-duel',
        currentAttacker: winnerId,  // winner is ready to continue or pass
        currentDefender: null,
        duelState: null,
        duelResult,
      };
    }

    case 'CONTINUE_ATTACKING': {
      // Winner stays as attacker, return to board for another selection
      return {
        ...state,
        gamePhase: 'board',
        duelResult: null,
      };
    }

    case 'PASS_TURN': {
      // Randomly select a remaining active player as the new attacker, excluding the duel winner
      const activePlayers = [
        ...new Set(state.boardTiles.filter(t => t.playerId !== null).map(t => t.playerId))
      ].filter(id => id !== state.duelResult?.winnerId);
      const pool = activePlayers.length > 0 ? activePlayers : [state.currentAttacker];
      const newAttackerId = pool[Math.floor(Math.random() * pool.length)];

      return {
        ...state,
        gamePhase: 'board',
        currentAttacker: newAttackerId,
        duelResult: null,
      };
    }

    case 'RESET_GAME':
      return { ...initialState, players: state.players, categorySources: state.categorySources };

    default:
      return state;
  }
}

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const addPlayer = useCallback((name, category) => {
    dispatch({ type: 'ADD_PLAYER', payload: { name, category } });
  }, []);

  const removePlayer = useCallback((id) => {
    dispatch({ type: 'REMOVE_PLAYER', payload: { id } });
  }, []);

  const generateBoard = useCallback(() => {
    dispatch({ type: 'GENERATE_BOARD' });
  }, []);

  const selectDefender = useCallback((defenderId) => {
    dispatch({ type: 'SELECT_DEFENDER', payload: { defenderId } });
  }, []);

  const cancelDefender = useCallback(() => {
    dispatch({ type: 'CANCEL_DEFENDER' });
  }, []);

  const cancelDuel = useCallback(() => {
    dispatch({ type: 'CANCEL_DUEL' });
  }, []);

  const startDuel = useCallback(() => {
    dispatch({ type: 'START_DUEL' });
  }, []);

  const continueAttacking = useCallback(() => {
    dispatch({ type: 'CONTINUE_ATTACKING' });
  }, []);

  const passTurn = useCallback(() => {
    dispatch({ type: 'PASS_TURN' });
  }, []);

  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET_GAME' });
  }, []);

  const setCategorySource = useCallback((name, sourceType) => {
    dispatch({ type: 'SET_CATEGORY_SOURCE', payload: { name, sourceType } });
  }, []);

  const value = {
    state,
    dispatch,
    addPlayer,
    removePlayer,
    generateBoard,
    selectDefender,
    cancelDefender,
    startDuel,
    cancelDuel,
    continueAttacking,
    passTurn,
    resetGame,
    setCategorySource,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === null) {
    throw new Error('useGame must be used within a <GameProvider>.');
  }
  return context;
}
