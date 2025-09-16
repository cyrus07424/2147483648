'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';

type Panel = number | null;
type GameBoard = Panel[][];

const BOARD_SIZES = [8, 16, 32, 64, 128] as const;
type BoardSize = typeof BOARD_SIZES[number];

const INITIAL_NUMBERS = [1, 2, 4];
const TARGET_NUMBER = 2147483648;

// Generate random initial board
const generateInitialBoard = (boardSize: BoardSize): GameBoard => {
  const board: GameBoard = [];
  for (let row = 0; row < boardSize; row++) {
    board[row] = [];
    for (let col = 0; col < boardSize; col++) {
      const randomIndex = Math.floor(Math.random() * INITIAL_NUMBERS.length);
      board[row][col] = INITIAL_NUMBERS[randomIndex];
    }
  }
  return board;
};

// Get random number from initial set
const getRandomNumber = (): number => {
  const randomIndex = Math.floor(Math.random() * INITIAL_NUMBERS.length);
  return INITIAL_NUMBERS[randomIndex];
};

const SameGame: React.FC = () => {
  const [boardSize, setBoardSize] = useState<BoardSize>(8);
  const [board, setBoard] = useState<GameBoard>(() => generateInitialBoard(8));
  const [gameWon, setGameWon] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [waitTime, setWaitTime] = useState(1000); // milliseconds
  const autoModeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Find all connected panels of the same number
  const findConnectedPanels = useCallback((board: GameBoard, startRow: number, startCol: number, boardSize: BoardSize): [number, number][] => {
    const targetNumber = board[startRow][startCol];
    if (targetNumber === null) return [];

    const visited = new Set<string>();
    const connected: [number, number][] = [];
    const queue: [number, number][] = [[startRow, startCol]];

    while (queue.length > 0) {
      const [row, col] = queue.shift()!;
      const key = `${row},${col}`;

      if (visited.has(key)) continue;
      visited.add(key);

      if (board[row][col] === targetNumber) {
        connected.push([row, col]);

        // Check adjacent cells (up, down, left, right)
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of directions) {
          const newRow = row + dr;
          const newCol = col + dc;
          if (
            newRow >= 0 &&
            newRow < boardSize &&
            newCol >= 0 &&
            newCol < boardSize &&
            !visited.has(`${newRow},${newCol}`)
          ) {
            queue.push([newRow, newCol]);
          }
        }
      }
    }

    return connected;
  }, []);

  // Apply gravity to make panels fall down and move left
  const applyGravity = useCallback((board: GameBoard, boardSize: BoardSize): GameBoard => {
    const newBoard: GameBoard = Array(boardSize).fill(null).map(() => Array(boardSize).fill(null));

    // For each column, collect non-null panels and place them at the bottom
    for (let col = 0; col < boardSize; col++) {
      const columnPanels: number[] = [];
      for (let row = 0; row < boardSize; row++) {
        if (board[row][col] !== null) {
          columnPanels.push(board[row][col] as number);
        }
      }

      // Place panels from bottom up
      for (let i = 0; i < columnPanels.length; i++) {
        newBoard[boardSize - 1 - i][col] = columnPanels[columnPanels.length - 1 - i];
      }
    }

    // Move columns left to fill gaps
    const finalBoard: GameBoard = Array(boardSize).fill(null).map(() => Array(boardSize).fill(null));
    let targetCol = 0;

    for (let col = 0; col < boardSize; col++) {
      // Check if this column has any panels
      let hasPanel = false;
      for (let row = 0; row < boardSize; row++) {
        if (newBoard[row][col] !== null) {
          hasPanel = true;
          break;
        }
      }

      if (hasPanel) {
        for (let row = 0; row < boardSize; row++) {
          finalBoard[row][targetCol] = newBoard[row][col];
        }
        targetCol++;
      }
    }

    return finalBoard;
  }, []);

  // Refill empty spaces from top and right
  const refillBoard = useCallback((board: GameBoard, boardSize: BoardSize): GameBoard => {
    const newBoard = board.map(row => [...row]);

    // Fill empty spaces
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        if (newBoard[row][col] === null) {
          newBoard[row][col] = getRandomNumber();
        }
      }
    }

    return newBoard;
  }, []);

  // Find the first clickable panel, scanning from bottom-left
  const findClickablePanel = useCallback((): [number, number] | null => {
    // Scan from bottom-left to top-right
    for (let row = boardSize - 1; row >= 0; row--) {
      for (let col = 0; col < boardSize; col++) {
        if (board[row][col] !== null) {
          const connectedPanels = findConnectedPanels(board, row, col, boardSize);
          if (connectedPanels.length >= 2) {
            return [row, col];
          }
        }
      }
    }
    return null;
  }, [board, boardSize, findConnectedPanels]);

  // Handle panel click
  const handlePanelClick = useCallback((row: number, col: number) => {
    if (gameWon || board[row][col] === null) return;

    const connectedPanels = findConnectedPanels(board, row, col, boardSize);
    
    // Need at least 2 connected panels to make a move
    if (connectedPanels.length < 2) return;

    const newBoard = board.map(row => [...row]);
    const originalValue = board[row][col] as number;

    // Find the bottom row among connected panels
    const maxRow = Math.max(...connectedPanels.map(([r]) => r));
    
    // Find the leftmost column in that bottom row among connected panels
    const bottomRowPanels = connectedPanels.filter(([r]) => r === maxRow);
    const leftmostCol = Math.min(...bottomRowPanels.map(([, c]) => c));
    
    // Remove connected panels
    connectedPanels.forEach(([r, c]) => {
      newBoard[r][c] = null;
    });

    // Place the converted panel at the bottom-left position among connected panels
    const newValue = originalValue * 2;
    newBoard[maxRow][leftmostCol] = newValue;

    // Apply gravity to move remaining panels down
    const gravityBoard = applyGravity(newBoard, boardSize);
    
    // Check for win condition
    if (newValue === TARGET_NUMBER) {
      setGameWon(true);
    }

    // Refill the board
    const finalBoard = refillBoard(gravityBoard, boardSize);

    setBoard(finalBoard);
  }, [board, gameWon, boardSize, findConnectedPanels, applyGravity, refillBoard]);

  // Reset game
  const resetGame = useCallback(() => {
    setBoard(generateInitialBoard(boardSize));
    setGameWon(false);
    setIsAutoMode(false); // Stop auto mode when resetting
  }, [boardSize]);

  // Handle board size change
  const handleBoardSizeChange = useCallback((newSize: BoardSize) => {
    setBoardSize(newSize);
    setBoard(generateInitialBoard(newSize));
    setGameWon(false);
    setIsAutoMode(false); // Stop auto mode when changing board size
  }, []);

  // Execute automatic mode
  const executeAutoMode = useCallback(() => {
    if (!isAutoMode || gameWon) return;

    const clickablePanel = findClickablePanel();
    if (clickablePanel) {
      const [row, col] = clickablePanel;
      handlePanelClick(row, col);
      
      // Schedule next execution
      autoModeTimeoutRef.current = setTimeout(executeAutoMode, waitTime);
    } else {
      // No clickable panels found, stop auto mode
      setIsAutoMode(false);
    }
  }, [isAutoMode, gameWon, findClickablePanel, handlePanelClick, waitTime]);

  // Handle auto mode toggle
  const toggleAutoMode = useCallback(() => {
    setIsAutoMode(prev => !prev);
  }, []);

  // Effect to manage auto mode execution
  useEffect(() => {
    if (isAutoMode && !gameWon) {
      autoModeTimeoutRef.current = setTimeout(executeAutoMode, waitTime);
    } else {
      if (autoModeTimeoutRef.current) {
        clearTimeout(autoModeTimeoutRef.current);
        autoModeTimeoutRef.current = null;
      }
    }

    return () => {
      if (autoModeTimeoutRef.current) {
        clearTimeout(autoModeTimeoutRef.current);
        autoModeTimeoutRef.current = null;
      }
    };
  }, [isAutoMode, gameWon, executeAutoMode, waitTime]);

  // Get panel color based on value
  const getPanelColor = (value: number | null): string => {
    if (value === null) return 'bg-gray-200';
    
    const colors: { [key: number]: string } = {
      1: 'bg-blue-200',
      2: 'bg-green-200',
      4: 'bg-yellow-200',
      8: 'bg-orange-200',
      16: 'bg-red-200',
      32: 'bg-purple-200',
      64: 'bg-pink-200',
      128: 'bg-indigo-200',
      256: 'bg-blue-300',
      512: 'bg-green-300',
      1024: 'bg-yellow-300',
      2048: 'bg-orange-300',
      4096: 'bg-red-300',
      8192: 'bg-purple-300',
      16384: 'bg-pink-300',
      32768: 'bg-indigo-300',
      65536: 'bg-blue-400',
      131072: 'bg-green-400',
      262144: 'bg-yellow-400',
      524288: 'bg-orange-400',
      1048576: 'bg-red-400',
      2097152: 'bg-purple-400',
      4194304: 'bg-pink-400',
      8388608: 'bg-indigo-400',
      16777216: 'bg-blue-500',
      33554432: 'bg-green-500',
      67108864: 'bg-yellow-500',
      134217728: 'bg-orange-500',
      268435456: 'bg-red-500',
      536870912: 'bg-purple-500',
      1073741824: 'bg-pink-500',
      2147483648: 'bg-gold-500 animate-pulse'
    };
    
    return colors[value] || 'bg-gray-300';
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-4">
            Same Game - 2147483648
          </h1>
          
          {gameWon && (
            <div className="text-center mb-4">
              <div className="text-2xl font-bold text-green-600 mb-2">
                🎉 おめでとうございます！ 🎉
              </div>
              <div className="text-lg text-gray-700">
                2147483648に到達しました！
              </div>
            </div>
          )}

          <div className="mb-6 text-center">
            <p className="text-gray-600 mb-4">
              同じ数字の隣接するパネルをクリックして消去し、2147483648を目指そう！
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                フィールドサイズ:
              </label>
              <div className="flex justify-center gap-2 flex-wrap">
                {BOARD_SIZES.map((size) => (
                  <button
                    key={size}
                    onClick={() => handleBoardSizeChange(size)}
                    className={`
                      px-3 py-1 rounded text-sm font-medium transition-colors
                      ${boardSize === size 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }
                    `}
                  >
                    {size}×{size}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">自動モード</h3>
              
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">
                    自動モード:
                  </label>
                  <button
                    onClick={toggleAutoMode}
                    disabled={gameWon}
                    className={`
                      px-4 py-2 rounded font-medium transition-colors
                      ${isAutoMode 
                        ? 'bg-red-500 hover:bg-red-600 text-white' 
                        : 'bg-green-500 hover:bg-green-600 text-white'
                      }
                      ${gameWon ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {isAutoMode ? 'OFF' : 'ON'}
                  </button>
                </div>
                
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">
                    ウエイト時間: {waitTime}ms
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="3000"
                    step="100"
                    value={waitTime}
                    onChange={(e) => setWaitTime(Number(e.target.value))}
                    className="w-32"
                    disabled={gameWon}
                  />
                </div>
              </div>
              
              <p className="text-xs text-gray-500 mt-2 text-center">
                自動モードON時、左下から順番にクリック可能なパネルを自動でクリックします
              </p>
            </div>
            
            <button
              onClick={resetGame}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              新しいゲーム
            </button>
          </div>

          <div 
            className={`
              grid gap-1 max-w-4xl mx-auto bg-gray-300 p-2 rounded overflow-auto
            `}
            style={{
              gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
              aspectRatio: '1',
              maxHeight: '80vh'
            }}
          >
            {board.map((row, rowIndex) =>
              row.map((panel, colIndex) => (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => !isAutoMode && handlePanelClick(rowIndex, colIndex)}
                  className={`
                    aspect-square text-xs font-bold rounded border border-gray-400
                    hover:border-gray-600 transition-colors flex items-center justify-center
                    ${getPanelColor(panel)}
                    ${panel === null || isAutoMode ? 'cursor-default' : 'cursor-pointer'}
                    ${isAutoMode ? 'opacity-75' : ''}
                  `}
                  style={{
                    fontSize: boardSize > 32 ? '0.6rem' : boardSize > 16 ? '0.7rem' : '0.8rem',
                    minWidth: boardSize > 64 ? '16px' : boardSize > 32 ? '20px' : boardSize > 16 ? '24px' : '48px',
                    minHeight: boardSize > 64 ? '16px' : boardSize > 32 ? '20px' : boardSize > 16 ? '24px' : '48px'
                  }}
                  disabled={gameWon || panel === null || isAutoMode}
                >
                  {panel}
                </button>
              ))
            )}
          </div>

          <div className="mt-4 text-center text-sm text-gray-500">
            <p>ルール: 同じ数字の隣接するパネルをクリックすると、つながっている全てのパネルが消え、</p>
            <p>元の値の2倍のパネルが一番下の一番左に現れます。</p>
          </div>
        </div>
        <footer className="text-center text-gray-400 mt-8">
          &copy; 2025 <a href="https://github.com/cyrus07424" target="_blank">cyrus</a>
        </footer>
      </div>
    </div>
  );
};

export default SameGame;
