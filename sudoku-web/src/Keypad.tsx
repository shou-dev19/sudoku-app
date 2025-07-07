import React from 'react';

interface KeypadProps {
  onInput: (value: number | null) => void;
}

const Keypad: React.FC<KeypadProps> = ({ onInput }) => {
  return (
    <div className="sudoku-keypad">
      {[1,2,3,4,5,6,7,8,9].map(n => (
        <button key={n} onClick={() => onInput(n)}>{n}</button>
      ))}
      <button onClick={() => onInput(null)}>クリア</button>
    </div>
  );
};

export default Keypad; 