// frontend/src/Leaderboard.jsx
function Leaderboard({ data }) {
  return (
    <div className="leaderboard">
      <h3>🏆 Leaderboard</h3>
      {data.slice(0, 10).map((player, i) => (
        <div key={player.username} className="lb-item">
          <span>#{i + 1} {player.username}</span>
          <span>{player.wins} wins</span>
        </div>
      ))}
      {data.length === 0 && <p>No games played yet</p>}
    </div>
  );
}

export default Leaderboard;
