import React from 'react';

export type CellValue = number | null;
export type BoardState = CellValue[][];

interface BoardProps {
  initial: BoardState;
  current: BoardState;
  selected: { row: number; col: number } | null;
  errors: boolean[][];
  onCellSelect: (row: number, col: number) => void;
}

const Board: React.FC<BoardProps> = ({ initial, current, selected, errors, onCellSelect }) => {
  return (
    <div className="sudoku-board">
      {current.map((row, rIdx) => (
        <div className="sudoku-row" key={rIdx}>
          {row.map((cell, cIdx) => {
            const isInitial = initial[rIdx][cIdx] !== null;
            const isSelected = selected && selected.row === rIdx && selected.col === cIdx;
            const isError = errors[rIdx][cIdx];
            return (
              <div
                key={cIdx}
                className={`sudoku-cell${isInitial ? ' initial' : ''}${isSelected ? ' selected' : ''}${isError ? ' error' : ''}`}
                onClick={() => onCellSelect(rIdx, cIdx)}
              >
                {cell !== null ? cell : ''}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default Board; 