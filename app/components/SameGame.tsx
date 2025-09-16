'use client';

import React, { useState, useCallback } from 'react';

type Panel = number | null;
type GameBoard = Panel[][];

const BOARD_SIZE = 8;
const INITIAL_NUMBERS = [1, 2, 4];
const TARGET_NUMBER = 2147483648;

// Generate random initial board
const generateInitialBoard = (): GameBoard => {
  const board: GameBoard = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    board[row] = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
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
  const [board, setBoard] = useState<GameBoard>(generateInitialBoard);
  const [gameWon, setGameWon] = useState(false);

  // Find all connected panels of the same number
  const findConnectedPanels = useCallback((board: GameBoard, startRow: number, startCol: number): [number, number][] => {
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
            newRow < BOARD_SIZE &&
            newCol >= 0 &&
            newCol < BOARD_SIZE &&
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
  const applyGravity = useCallback((board: GameBoard): GameBoard => {
    const newBoard: GameBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));

    // For each column, collect non-null panels and place them at the bottom
    for (let col = 0; col < BOARD_SIZE; col++) {
      const columnPanels: number[] = [];
      for (let row = 0; row < BOARD_SIZE; row++) {
        if (board[row][col] !== null) {
          columnPanels.push(board[row][col] as number);
        }
      }

      // Place panels from bottom up
      for (let i = 0; i < columnPanels.length; i++) {
        newBoard[BOARD_SIZE - 1 - i][col] = columnPanels[columnPanels.length - 1 - i];
      }
    }

    // Move columns left to fill gaps
    const finalBoard: GameBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    let targetCol = 0;

    for (let col = 0; col < BOARD_SIZE; col++) {
      // Check if this column has any panels
      let hasPanel = false;
      for (let row = 0; row < BOARD_SIZE; row++) {
        if (newBoard[row][col] !== null) {
          hasPanel = true;
          break;
        }
      }

      if (hasPanel) {
        for (let row = 0; row < BOARD_SIZE; row++) {
          finalBoard[row][targetCol] = newBoard[row][col];
        }
        targetCol++;
      }
    }

    return finalBoard;
  }, []);

  // Refill empty spaces from top and right
  const refillBoard = useCallback((board: GameBoard): GameBoard => {
    const newBoard = board.map(row => [...row]);

    // Fill empty spaces
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (newBoard[row][col] === null) {
          newBoard[row][col] = getRandomNumber();
        }
      }
    }

    return newBoard;
  }, []);

  // Handle panel click
  const handlePanelClick = useCallback((row: number, col: number) => {
    if (gameWon || board[row][col] === null) return;

    const connectedPanels = findConnectedPanels(board, row, col);
    
    // Need at least 2 connected panels to make a move
    if (connectedPanels.length < 2) return;

    const newBoard = board.map(row => [...row]);
    const originalValue = board[row][col] as number;

    // Remove connected panels
    connectedPanels.forEach(([r, c]) => {
      newBoard[r][c] = null;
    });

    // Apply gravity
    const gravityBoard = applyGravity(newBoard);

    // Place doubled value at the bottom-leftmost position where panels were removed
    // Find the leftmost and bottommost position among removed panels
    const leftmostCol = Math.min(...connectedPanels.map(([, c]) => c));
    const bottommostRow = Math.max(...connectedPanels.map(([r]) => r));
    
    // Place the new panel at the bottom-left position after gravity
    // Find the bottom-most available position in the leftmost affected column
    let targetRow = BOARD_SIZE - 1;
    while (targetRow >= 0 && gravityBoard[targetRow][leftmostCol] !== null) {
      targetRow--;
    }
    
    if (targetRow >= 0) {
      const newValue = originalValue * 2;
      gravityBoard[targetRow][leftmostCol] = newValue;
      
      // Check for win condition
      if (newValue === TARGET_NUMBER) {
        setGameWon(true);
      }
    }

    // Refill the board
    const finalBoard = refillBoard(gravityBoard);

    setBoard(finalBoard);
  }, [board, gameWon, findConnectedPanels, applyGravity, refillBoard]);

  // Reset game
  const resetGame = useCallback(() => {
    setBoard(generateInitialBoard());
    setGameWon(false);
  }, []);

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
            <p className="text-gray-600 mb-2">
              同じ数字の隣接するパネルをクリックして消去し、2147483648を目指そう！
            </p>
            <button
              onClick={resetGame}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              新しいゲーム
            </button>
          </div>

          <div className="grid grid-cols-8 gap-1 max-w-md mx-auto bg-gray-300 p-2 rounded">
            {board.map((row, rowIndex) =>
              row.map((panel, colIndex) => (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => handlePanelClick(rowIndex, colIndex)}
                  className={`
                    w-12 h-12 text-sm font-bold rounded border border-gray-400
                    hover:border-gray-600 transition-colors
                    ${getPanelColor(panel)}
                    ${panel === null ? 'cursor-default' : 'cursor-pointer'}
                  `}
                  disabled={gameWon || panel === null}
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
      </div>
    </div>
  );
};

export default SameGame;