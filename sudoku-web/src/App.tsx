import React, { useState, useEffect, useCallback } from 'react';
import Board, { BoardState, CellValue } from './Board.tsx';
import Keypad from './Keypad.tsx';
import './App.css';

// 9x9の空盤面生成
const emptyBoard = (): BoardState => Array(9).fill(null).map(() => Array(9).fill(null));

// 簡易な数独問題（固定）
const samplePuzzle: BoardState = [
  [5,3,null,null,7,null,null,null,null],
  [6,null,null,1,9,5,null,null,null],
  [null,9,8,null,null,null,null,6,null],
  [8,null,null,null,6,null,null,null,3],
  [4,null,null,8,null,3,null,null,1],
  [7,null,null,null,2,null,null,null,6],
  [null,6,null,null,null,null,2,8,null],
  [null,null,null,4,1,9,null,null,5],
  [null,null,null,null,8,null,null,7,9],
];

// 盤面のコピー
const cloneBoard = (b: BoardState): BoardState => b.map(row => [...row]);

// セーブ用キー
const SAVE_KEY = 'sudoku_save';

function checkErrors(board: BoardState): boolean[][] {
  // 各マスがルール違反かどうかの2次元配列を返す
  const errors = Array(9).fill(null).map(() => Array(9).fill(false));
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = board[r][c];
      if (!v) continue;
      // 行・列・ブロックで重複チェック
      for (let i = 0; i < 9; i++) {
        if (i !== c && board[r][i] === v) errors[r][c] = true;
        if (i !== r && board[i][c] === v) errors[r][c] = true;
      }
      const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
      for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) {
        const rr = br+dr, cc = bc+dc;
        if ((rr !== r || cc !== c) && board[rr][cc] === v) errors[r][c] = true;
      }
    }
  }
  return errors;
}

function isCleared(board: BoardState, errors: boolean[][]): boolean {
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    if (!board[r][c] || errors[r][c]) return false;
  }
  return true;
}

const App: React.FC = () => {
  const [initial, setInitial] = useState<BoardState>(cloneBoard(samplePuzzle));
  const [current, setCurrent] = useState<BoardState>(cloneBoard(samplePuzzle));
  const [selected, setSelected] = useState<{row:number, col:number}|null>(null);
  const [errors, setErrors] = useState<boolean[][]>(checkErrors(current));
  const [cleared, setCleared] = useState(false);
  const [startTime, setStartTime] = useState<number|null>(null);
  const [elapsed, setElapsed] = useState<number>(0);

  // セーブ/ロード
  useEffect(() => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      setInitial(data.initial);
      setCurrent(data.current);
      setStartTime(data.startTime);
      setElapsed(data.elapsed || 0);
    } else {
      setStartTime(Date.now());
    }
  }, []);
  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({initial, current, startTime, elapsed}));
  }, [initial, current, startTime, elapsed]);

  // エラー・クリア判定
  useEffect(() => {
    const errs = checkErrors(current);
    setErrors(errs);
    setCleared(isCleared(current, errs));
  }, [current]);

  // タイマー
  useEffect(() => {
    if (cleared || !startTime) return;
    const timer = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);
    return () => clearInterval(timer);
  }, [cleared, startTime]);

  // セル選択
  const handleCellSelect = (row: number, col: number) => {
    if (initial[row][col] !== null) return;
    setSelected({row, col});
  };

  // 入力
  const handleInput = (value: number | null) => {
    if (!selected) return;
    const {row, col} = selected;
    if (initial[row][col] !== null) return;
    setCurrent(prev => {
      const next = cloneBoard(prev);
      next[row][col] = value;
      return next;
    });
  };

  // 新しいゲーム
  const handleNewGame = () => {
    setInitial(cloneBoard(samplePuzzle)); // 本来はランダム生成
    setCurrent(cloneBoard(samplePuzzle));
    setSelected(null);
    setCleared(false);
    setStartTime(Date.now());
    setElapsed(0);
    localStorage.removeItem(SAVE_KEY);
  };

  return (
    <div className="App">
      <header className="app-header-bar">
        <div className="header-left">
          <span className="time-info">経過時間: {Math.floor(elapsed/1000)}秒</span>
        </div>
        <div className="header-center">
          <h1>数独</h1>
        </div>
        <div className="header-right">
          <button className="icon-btn" onClick={handleNewGame} title="新しいゲーム">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        </div>
      </header>
      <main>
        <Board
          initial={initial}
          current={current}
          selected={selected}
          errors={errors}
          onCellSelect={handleCellSelect}
        />
        <Keypad onInput={handleInput} />
        {cleared && (
          <div style={{marginTop:8, textAlign: 'center'}}>
            <span className="time-info">クリア！ 経過時間: {Math.floor(elapsed/1000)}秒</span>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
