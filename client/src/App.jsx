import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import GameBoard from './GameBoard.jsx';
import QueueScreen from './QueueScreen.jsx';
import Leaderboard from './Leaderboard.jsx';

const SOCKET_SERVER = 'http://localhost:3001';

function App() {
  const [screen, setScreen] = useState('username');
  const [username, setUsername] = useState('');
  const [gameState, setGameState] = useState(null);
  const [status, setStatus] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [queueInfo, setQueueInfo] = useState({ position: 0, timeLeft: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [myPlayer, setMyPlayer] = useState(null); // 1 or 2
  const [opponentName, setOpponentName] = useState('');
  const myPlayerRef = useRef(null);
  const [gameMode, setGameMode] = useState(null); // 'bot' | 'online'
  const socketRef = useRef(null);
  const [displayTime, setDisplayTime] = useState(30);

  useEffect(() => {
    if (!gameState) return;

    if (gameState.timeLeft === null) {
      setDisplayTime(null);
      return;
    }

    setDisplayTime(gameState.timeLeft);

    const interval = setInterval(() => {
      setDisplayTime(t => {
        if(t === null) return null;
        return Math.max(0, t - 1)});
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState?.gameId, gameState?.currentTurn, gameState?.timeLeft]);


  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3001/api/leaderboard');
      const data = await res.json();
      setLeaderboard(data.players || []);
    } catch (e) {
      console.error('Leaderboard fetch failed', e);
    }
  }, []);

  useEffect(() => {
  fetchLeaderboard();
}, [fetchLeaderboard]);


  useEffect(() => {
    const socket = io(SOCKET_SERVER);
    socketRef.current = socket;

    socket.on('authenticated', () => setScreen('menu'));

    socket.on('game_started', (data) => {
      setGameState(data);
      setMyPlayer(data.viewerPlayer); // 1 or 2
      myPlayerRef.current = data.viewerPlayer;

      if(data.players){
        const myIndex = data.viewerPlayer === 1 ? 0 : 1;
        const oppIndex = myIndex === 0 ? 1 : 0;

        setOpponentName(data.players[oppIndex]?.username || 'Bot');
      }
      setStatus('');
      setGameOver(false);
      setScreen('game');
    });

    socket.on('game_update', (data) => {
      // 🔒 Ignore updates after game over
      setGameState(data);
    });

    socket.on('game_over', (data) => {
      setGameOver(true);
      if (data.winner === myPlayerRef.current) {
        setStatus('🎉 You Win!');
      } else if (data.winner === 0) {
        setStatus('🤝 Draw');
      } else {
        setStatus('❌ You Lost');
      }
      fetchLeaderboard();
    });

    socket.on('queue_status', (data) => {
      setQueueInfo(data);
      setScreen('queue');
    });

    socket.on('leaderboard_update', (data) => {
      setLeaderboard(data.players || []);
    });

    return () => socket.disconnect();
  }, [fetchLeaderboard]);

  const handleUsernameSubmit = () => {
    if (!username.trim()) return;
    socketRef.current.emit('authenticate', { username: username.trim() });
  };

  const handlePlayBot = () => {
    setGameMode('bot');
    setGameOver(false);
    setStatus('');
    socketRef.current.emit('play_bot');
  };
  const handlePlayOnline = () => {
    setGameMode('online');
    setGameOver(false);
    setStatus('');
    socketRef.current.emit('play_online');
  };  

  const handleColumnClick = (column) => {
    if (!gameState || gameOver || gameState.currentTurn !== myPlayer) return;
    socketRef.current.emit('make_move', {
      gameId: gameState.gameId,
      column
    });
  };

  const handlePlayAgain = () => {
    setGameState(null);
    setStatus('');
    setGameOver(false);
    setOpponentName('');

    if (gameMode === 'bot') {
      socketRef.current.emit('play_bot');
    } else {
      socketRef.current.emit('play_online');
      setScreen('queue'); // online users go back to queue
    }
  };


  /* ---------- UI ---------- */

  if (screen === 'username') {
    return (
      <div className="container">
        <h1>🎮 4 in a Row</h1>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username"
        />
        <button onClick={handleUsernameSubmit}>Play</button>
        <Leaderboard data={leaderboard} />
      </div>
    );
  }

  if (screen === 'menu') {
    return (
      <div className="container">
        <h1>Welcome, {username}</h1>
        <button onClick={handlePlayBot}>🤖 Play Bot</button>
        <button onClick={handlePlayOnline}>🌐 Play Online</button>
        <Leaderboard data={leaderboard} />
      </div>
    );
  }

  if (screen === 'queue') {
    return <QueueScreen username={username} info={queueInfo} />;
  }

  return (
    <div className="container">
      <h1>🎮 4 in a Row</h1>
      <div className="game-header">
        <div className="player you">
          <p>You</p>
          <h2>{username}</h2>
        </div>

        <div className="vs">VS</div>

        <div className="player opponent">
          <p>Opponent</p>
          <h2>{opponentName}</h2>
        </div>
      </div>

      <div className="status">{status}</div>

      {gameOver && (
        <button className='play-again-btn' onClick={handlePlayAgain}>🔁 Play Again</button>
      )}

      <div className="turn-timer">{displayTime !== null ? (
        <>⏱ Time left: {displayTime}s</>
      ) : (
        <>⏳ Waiting for opponent...</>
      )}</div>

      {gameState && (
        <GameBoard
          board={gameState.board}
          onColumnClick={handleColumnClick}
          currentTurn={gameState.currentTurn}
        />
      )}

      <Leaderboard data={leaderboard} />
    </div>
  );
}

export default App;
