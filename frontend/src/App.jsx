import { useState, useRef, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import './styles.css';

function App() {
  const [game, setGame] = useState(new Chess());
  const [aiThinking, setAiThinking] = useState(false);
  const [difficulty, setDifficulty] = useState(10);
  const [history, setHistory] = useState([]);
  const [arrows, setArrows] = useState([]);
  const [evalScore, setEvalScore] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [boardTheme, setBoardTheme] = useState('default');
  const chatEndRef = useRef(null);

  // ... (Menu component and helper functions from previous answer)...

  const makeAIMove = async () => {
    if (!game.isGameOver()) {
      setAiThinking(true);
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fen: game.fen(), difficulty })
        });
        
        const { bestMove, evaluation, suggestedArrows } = await response.json();
        const newGame = new Chess(game.fen());
        newGame.move(bestMove);
        
        setGame(newGame);
        setHistory(prev => [...prev, bestMove]);
        setArrows(suggestedArrows);
        setEvalScore(evaluation);
        explainMove(bestMove, evaluation);
      } catch (error) {
        addChatMessage('AI service unavailable', true);
      }
      setAiThinking(false);
    }
  };

  return (
    <div className={`app ${boardTheme}`}>
      <Menu />
      
      <button className="menu-button" onClick={() => setShowMenu(true)}>
        ☰ Menu
      </button>

      <div className="game-container">
        <div className="chess-board">
          <Chessboard
            position={game.fen()}
            onDrop={(source, target) => {
              try {
                const move = game.move({ from: source, to: target });
                if (move) {
                  setHistory(prev => [...prev, `${source}${target}`]);
                  setTimeout(makeAIMove, 500);
                  return true;
                }
              } catch {
                addChatMessage('Invalid move!');
                return false;
              }
            }}
            customArrows={arrows}
            boardWidth={600}
          />
          <div className="eval-score">{evalScore}</div>
        </div>

        <div className="panel">
          <div className="history">
            <h3>Move History</h3>
            {history.map((move, i) => (
              <div key={i}>{i+1}. {move}</div>
            ))}
          </div>
          
          <div className="chat">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`message ${msg.isAI ? 'ai' : 'user'}`}>
                {msg.text}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;