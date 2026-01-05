// frontend/src/QueueScreen.jsx
function QueueScreen({ username, info }) {
  return (
    <div className="container">
      <h1>🎮 Searching for opponent...</h1>
      <div className="status waiting">
        Position: {info.position} | Time left: {info.timeLeft}s
      </div>
      <div className="queue-bar">
        <div 
          className="queue-progress" 
          style={{ width: `${(10 - info.timeLeft) * 10}%` }}
        />
      </div>
      <p>Playing as {username}</p>
    </div>
  );
}

export default QueueScreen;
