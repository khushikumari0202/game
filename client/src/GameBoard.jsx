function GameBoard({ board, onColumnClick, currentTurn }) {
  console.log('GameBoard render:', { board: board?.length, turn: currentTurn }); // Debug

  if (!board || !Array.isArray(board) || board.length !== 6) {
    return <div className="status waiting">Board loading...</div>;
  }

  const getCellClass = (value) => {
    if (value === 0) return '';
    return value === 1 ? 'player1' : 'player2 bot';
  };

  const isValidColumn = (col) => board[0][col] === 0;

  return (
    <div className="game-board">
      {Array.from({ length: 7 }, (_, col) => (
        <div
          key={col}
          className={`column-container ${isValidColumn(col) ? 'valid-move' : ''}`}
          onClick={() => {
            if (isValidColumn(col)) {
              console.log('Column clicked:', col);
              onColumnClick(col);
            }
          }}
          style={{ cursor: isValidColumn(col) ? 'pointer' : 'not-allowed' }}
        >
          {board.map((row, rowIdx) => (
            <div
              key={`${rowIdx}-${col}`}
              className={`cell ${getCellClass(row[col])}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default GameBoard;
