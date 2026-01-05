const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] }
});

/* ---------------- CONSTANTS ---------------- */
const ROWS = 6;
const COLS = 7;
const CONNECT_N = 4;

/* ---------------- STORES ---------------- */
const activeGames = new Map();   // gameId -> Game
const waitingQueue = [];         // { username, socketId }
const sessions = new Map();      // username -> { socketId, gameId }
const leaderboard = new Map();   // username -> wins

/* ---------------- GAME CLASS ---------------- */
class Game {
  constructor(p1, p2 = null, isBotGame = false) {
    this.id = uuidv4();
    this.players = { p1, p2 };
    this.isBotGame = isBotGame;
    this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    this.currentTurn = 1;
    this.status = 'playing';
    this.winner = null;

    this.turnEndsAt = Date.now() + 20000;
    this.turnTimer = null;
  }

  dropDisc(col, player) {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.board[r][col] === 0) {
        this.board[r][col] = player;
        return r;
      }
    }
    return -1;
  }

  isBoardFull() {
    return this.board[0].every(c => c !== 0);
  }

  checkWin(player) {
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.board[r][c] !== player) continue;

        for (const [dr, dc] of dirs) {
          let count = 1;
          for (let i = 1; i < CONNECT_N; i++) {
            const nr = r + dr*i;
            const nc = c + dc*i;
            if (
              nr < 0 || nr >= ROWS ||
              nc < 0 || nc >= COLS ||
              this.board[nr][nc] !== player
            ) break;
            count++;
          }
          if (count >= CONNECT_N) return true;
        }
      }
    }
    return false;
  }

  viewFor(playerNum) {
    const isMyTurn = this.currentTurn === playerNum;

    return {
      gameId: this.id,
      board: this.board,
      currentTurn: this.currentTurn,
      status: this.status,
      opponentName: this.players[playerNum === 1 ? 'p2' : 'p1']?.username || 'Bot',
      isBotGame: this.isBotGame,

      timeLeft: isMyTurn ? Math.max(
        0,
        Math.ceil((this.turnEndsAt - Date.now()) / 1000)
      ) : null
    };
  }
}

/* ---------------- BOT AI (SIMPLE) ---------------- */
function botMove(game) {
  const valid = [];
  for (let c = 0; c < COLS; c++) {
    if (game.board[0][c] === 0) valid.push(c);
  }
  return valid[Math.floor(Math.random() * valid.length)];
}
/*----------------------TIMER------------------- */
function startTurnTimer(game) {
  clearTimeout(game.turnTimer);

  game.turnEndsAt = Date.now() + 20000;

  game.turnTimer = setTimeout(() => {
    if (game.status !== 'playing') return;

    // switch turn
    game.currentTurn = game.currentTurn === 1 ? 2 : 1;
    game.turnEndsAt = Date.now() + 20000;

    const p1Socket = sessions.get(game.players.p1.username)?.socketId;
    let p2Socket = null;
    if(!game.isBotGame && game.players.p2){
      p2Socket = sessions.get(game.players.p2.username)?.socketId;
    }

    if (p1Socket) io.to(p1Socket).emit('game_update', game.viewFor(1));
    if (p2Socket) io.to(p2Socket).emit('game_update', game.viewFor(2));

    
  }, 20000);
}


/* ---------------- SOCKET HANDLERS ---------------- */
io.on('connection', socket => {
  console.log('Connected:', socket.id);

  socket.on('authenticate', ({ username }) => {
    socket.data.username = username;
    sessions.set(username, { socketId: socket.id });
    socket.emit('authenticated');
  });

  /* ---------- PLAY BOT ---------- */
  socket.on('play_bot', () => {
    const username = socket.data.username;
    const game = new Game({ username }, null, true);
    activeGames.set(game.id, game);
    sessions.get(username).gameId = game.id;

    socket.emit('game_started', {
      ...game.viewFor(1),
      viewerPlayer: 1
    });
    startTurnTimer(game);
  });

  /* ---------- PLAY ONLINE ---------- */
  socket.on('play_online', () => {
    const username = socket.data.username;
    waitingQueue.push({ username, socketId: socket.id });
    socket.emit('queue_status', { position: waitingQueue.length });

    if (waitingQueue.length >= 2) {
      const p1 = waitingQueue.shift();
      const p2 = waitingQueue.shift();

      const game = new Game(
        { username: p1.username },
        { username: p2.username },
        false
      );

      activeGames.set(game.id, game);
      sessions.get(p1.username).gameId = game.id;
      
      sessions.get(p2.username).gameId = game.id;

      io.to(p1.socketId).emit('game_started', {
        ...game.viewFor(1),
        viewerPlayer: 1
      });

      io.to(p2.socketId).emit('game_started', {
        ...game.viewFor(2),
        viewerPlayer: 2
      });
      startTurnTimer(game);
    }
    
  });

  /* ---------- MAKE MOVE ---------- */
  socket.on('make_move', ({ gameId, column }) => {
    const username = socket.data.username;
    const session = sessions.get(username);
    if (!session || session.gameId !== gameId) return;

    const game = activeGames.get(gameId);
    if (!game || game.status !== 'playing') return;

    const playerNum =
      game.players.p1?.username === username ? 1 :
      game.players.p2?.username === username ? 2 : null;

      if (!playerNum || game.currentTurn !== playerNum) return;

      if (game.dropDisc(column, playerNum) === -1) return;

    /* ---- WIN CHECK ---- */
      if (game.checkWin(playerNum)) {
        game.status = 'finished';
        game.winner = playerNum;
      } else if (game.isBoardFull()) {
        game.status = 'finished';
        game.winner = 'draw';
      } else {
        game.currentTurn = playerNum === 1 ? 2 : 1;
        startTurnTimer(game);
      }

      const p1Socket = sessions.get(game.players.p1.username)?.socketId;

      let p2Socket = null;
      if(!game.isBotGame && game.players.p2){
        p2Socket = sessions.get(game.players.p2.username)?.socketId;
      }
      

      if (p1Socket) io.to(p1Socket).emit('game_update', game.viewFor(1));
      if (p2Socket) io.to(p2Socket).emit('game_update', game.viewFor(2));

      if (game.status === 'finished') {
        clearTimeout(game.turnTimer);
      // ✅ 1. Update leaderboard using USERNAME
        if (game.winner !== 'draw') {
          const winnerUsername = game.players[`p${game.winner}`].username;
          leaderboard.set(
          winnerUsername,
          (leaderboard.get(winnerUsername) || 0) + 1
        );
      }

    // ✅ 2. Send PLAYER NUMBER to clients
      const winnerPlayer = game.winner === 'draw' ? 0 : game.winner;

      if (p1Socket) io.to(p1Socket).emit('game_over', { winner: winnerPlayer });
      if (p2Socket) io.to(p2Socket).emit('game_over', { winner: winnerPlayer });

  // ✅ 3. CLEAR SESSION GAME (IMPORTANT FOR PLAY AGAIN)
      sessions.get(game.players.p1.username).gameId = null;
      if (!game.isBotGame && game.players.p2) {
        sessions.get(game.players.p2.username).gameId = null;
      }
      

  // (optional cleanup)
      activeGames.delete(game.id);
    }


    /* ---- BOT TURN ---- */
    if (game.isBotGame && game.status === 'playing') {
      setTimeout(() => {
        const col = botMove(game);
        game.dropDisc(col, 2);

        if (game.checkWin(2)) {
          game.status = 'finished';
          game.winner = 2;
        } else if (game.isBoardFull()) {
          game.status = 'finished';
          game.winner = 'draw';
        } else {
          game.currentTurn = 1;
        }

        socket.emit('game_update', game.viewFor(1));

        if (game.status === 'finished') {
          clearTimeout(game.turnTimer);
          if(game.winner === 1){
            leaderboard.set(
              socket.data.username,
              (leaderboard.get(socket.data.username) || 0) +1
            );
          }
          socket.emit('game_over', {
            winner: game.winner === 'draw' ? 0 : game.winner
          });

          sessions.get(socket.data.username).gameId = null;
          activeGames.delete(game.id);
        }
      }, 600);
    }
  });

  socket.on('disconnect', () => {
    const username = socket.data.username;
    const session = sessions.get(username);

    if(session?.gameId){
      const game = activeGames.get(session.gameId);
      if(game){
        clearTimeout(game.turnTimer);
        activeGames.delete(game.id);
      }
    }
    console.log('Disconnected:', socket.id);
  });
});

/* ---------------- LEADERBOARD API ---------------- */
app.get('/api/leaderboard', (req, res) => {
  const top = [...leaderboard.entries()]
    .map(([username, wins]) => ({ username, wins }))
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 10);

  res.json({ players: top });
});

/* ---------------- START SERVER ---------------- */
server.listen(3001, () => {
  console.log('🚀 Server running at http://localhost:3001');
});
