import React, { useState, useEffect, useCallback } from 'react';
import Board, { BoardState, CellValue } from './Board.tsx';
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

// --- ランダムな完成盤面を生成する関数 ---
function shuffle<T>(array: T[]): T[] {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isSafe(board: BoardState, row: number, col: number, num: number): boolean {
  for (let x = 0; x < 9; x++) {
    if (board[row][x] === num || board[x][col] === num) return false;
  }
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[startRow + i][startCol + j] === num) return false;
    }
  }
  return true;
}

function fillBoard(board: BoardState): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === null) {
        for (const num of shuffle([1,2,3,4,5,6,7,8,9])) {
          if (isSafe(board, row, col, num)) {
            board[row][col] = num;
            if (fillBoard(board)) return true;
            board[row][col] = null;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function generateSudokuPuzzle(emptyCells: number = 40): BoardState {
  // 完成盤面を作る
  const board: BoardState = emptyBoard();
  fillBoard(board);
  // 問題用に指定数だけランダムに空欄にする
  let count = 0;
  const cells = shuffle(Array.from({length: 81}, (_, i) => i));
  for (const idx of cells) {
    if (count >= emptyCells) break;
    const r = Math.floor(idx / 9);
    const c = idx % 9;
    if (board[r][c] !== null) {
      board[r][c] = null;
      count++;
    }
  }
  return cloneBoard(board);
}

const App: React.FC = () => {
  const [initial, setInitial] = useState<BoardState>(cloneBoard(samplePuzzle));
  const [current, setCurrent] = useState<BoardState>(cloneBoard(samplePuzzle));
  const [selected, setSelected] = useState<{row:number, col:number}|null>(null);
  const [errors, setErrors] = useState<boolean[][]>(checkErrors(current));
  const [cleared, setCleared] = useState(false);
  const [startTime, setStartTime] = useState<number|null>(null);
  const [elapsed, setElapsed] = useState<number>(0);
  const [paused, setPaused] = useState(false);
  const [resumeAvailable, setResumeAvailable] = useState(false);
  // 難易度: easy=30, normal=40, hard=50
  const [difficulty, setDifficulty] = useState<'easy'|'normal'|'hard'>('normal');

  // セーブ/ロード
  useEffect(() => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      setInitial(data.initial);
      setCurrent(data.current);
      setStartTime(data.startTime);
      setElapsed(data.elapsed || 0);
      setResumeAvailable(true);
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
    if (cleared || !startTime || paused) return;
    const timer = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);
    return () => clearInterval(timer);
  }, [cleared, startTime, paused]);

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
    let emptyCells = 40;
    if (difficulty === 'easy') emptyCells = 30;
    if (difficulty === 'normal') emptyCells = 40;
    if (difficulty === 'hard') emptyCells = 50;
    const puzzle = generateSudokuPuzzle(emptyCells);
    setInitial(cloneBoard(puzzle));
    setCurrent(cloneBoard(puzzle));
    setSelected(null);
    setCleared(false);
    setStartTime(Date.now());
    setElapsed(0);
    setPaused(false);
    setResumeAvailable(false);
    localStorage.removeItem(SAVE_KEY);
  };

  // 中断（保存）
  const handlePause = () => {
    setPaused(true);
    setResumeAvailable(true);
    localStorage.setItem(SAVE_KEY, JSON.stringify({initial, current, startTime, elapsed}));
  };

  // 再開
  const handleResume = () => {
    setPaused(false);
    setStartTime(Date.now() - elapsed);
  };

  return (
    <div className="App" style={{minHeight: '100vh', display: 'flex', flexDirection: 'column'}}>
      <header className="app-header-bar">
        <div className="header-left" style={{display:'flex',alignItems:'center',gap:12}}>
          <span className="time-info">経過時間: {Math.floor(elapsed/1000)}秒</span>
          {/* 難易度選択UI */}
          <div style={{marginLeft:8, display:'flex', gap:4}}>
            <button
              style={{
                padding: '2px 10px',
                borderRadius: 6,
                border: difficulty==='easy' ? '2px solid #facc15' : '1px solid #3a4252',
                background: difficulty==='easy' ? '#facc15' : '#232b3a',
                color: difficulty==='easy' ? '#181e2a' : '#e0e6f0',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '0.95em',
                transition: 'all 0.2s',
              }}
              onClick={()=>setDifficulty('easy')}
              disabled={paused}
            >やさしい</button>
            <button
              style={{
                padding: '2px 10px',
                borderRadius: 6,
                border: difficulty==='normal' ? '2px solid #3b82f6' : '1px solid #3a4252',
                background: difficulty==='normal' ? '#3b82f6' : '#232b3a',
                color: difficulty==='normal' ? '#fff' : '#e0e6f0',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '0.95em',
                transition: 'all 0.2s',
              }}
              onClick={()=>setDifficulty('normal')}
              disabled={paused}
            >ふつう</button>
            <button
              style={{
                padding: '2px 10px',
                borderRadius: 6,
                border: difficulty==='hard' ? '2px solid #ef4444' : '1px solid #3a4252',
                background: difficulty==='hard' ? '#ef4444' : '#232b3a',
                color: difficulty==='hard' ? '#fff' : '#e0e6f0',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '0.95em',
                transition: 'all 0.2s',
              }}
              onClick={()=>setDifficulty('hard')}
              disabled={paused}
            >むずかしい</button>
          </div>
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
      <main style={{flex: 1}}>
        <Board
          initial={initial}
          current={current}
          selected={selected}
          errors={errors}
          onCellSelect={handleCellSelect}
        />
        {cleared && (
          <div style={{marginTop:8, textAlign: 'center'}}>
            <span className="time-info">クリア！ 経過時間: {Math.floor(elapsed/1000)}秒</span>
          </div>
        )}
        {paused && (
          <div style={{marginTop: 16, textAlign: 'center', color: '#fff', fontWeight: 'bold'}}>
            <span>中断中です。「再開」ボタンで続きからプレイできます。</span>
          </div>
        )}
      </main>
      {/* フッター */}
      <footer style={{position: 'sticky', bottom: 0, background: '#181e2a', borderTop: '1px solid #3a4252', paddingBottom: 'env(safe-area-inset-bottom, 0)'}}>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 4, padding: 8, maxWidth: 400, margin: '0 auto'}}>
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button
              key={n}
              onClick={() => handleInput(n)}
              style={{
                aspectRatio: '1/1',
                borderRadius: 6,
                background: '#232b3a',
                color: '#e0e6f0',
                fontWeight: 'bold',
                fontSize: '1.3rem',
                border: '1px solid #3a4252',
                margin: 0,
                padding: 0,
                cursor: 'pointer',
                transition: 'background 0.2s, color 0.2s',
              }}
              disabled={paused}
            >{n}</button>
          ))}
        </div>
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '8px 16px'}}>
          <button
            onClick={() => handleInput(null)}
            style={{flex: 1, height: 48, borderRadius: 8, background: '#232b3a', color: '#e0e6f0', fontWeight: 'bold', fontSize: '1rem', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer'}}
            disabled={paused}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21H7Z"></path><path d="M22 21H7"></path><path d="m5 12 5 5"></path></svg>
            消去
          </button>
          <button
            onClick={handlePause}
            style={{flex: 1, height: 48, borderRadius: 8, background: '#facc15', color: '#181e2a', fontWeight: 'bold', fontSize: '1rem', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, cursor: 'pointer'}}
            disabled={paused}
          >
            <div style={{display: 'flex', alignItems: 'center', gap: 4}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
              <span>中断</span>
            </div>
            <span style={{fontSize: '0.8em', fontWeight: 'normal'}}>ゲームを保存</span>
          </button>
          <button
            onClick={handleResume}
            style={{flex: 1, height: 48, borderRadius: 8, background: '#3b82f6', color: '#fff', fontWeight: 'bold', fontSize: '1rem', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, cursor: 'pointer'}}
            disabled={!paused && !resumeAvailable}
          >
            <div style={{display: 'flex', alignItems: 'center', gap: 4}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
              <span>再開</span>
            </div>
            <span style={{fontSize: '0.8em', fontWeight: 'normal'}}>前回の続きから</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
