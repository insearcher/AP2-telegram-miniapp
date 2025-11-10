import { useTelegram } from './hooks/useTelegram';
import './App.css';

function App() {
  const { user, isReady, error, isTelegramEnv } = useTelegram();

  if (!isReady) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        <h2>Initialization Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="app" data-testid="app-ready">
      <header className="app-header">
        <h1>🛍️ Shopping Assistant</h1>
        {!isTelegramEnv && (
          <div className="dev-badge">Browser Mode</div>
        )}
      </header>

      {user && (
        <div className="user-info">
          <div className="user-greeting">
            Welcome, <strong>{user.firstName}</strong>! 👋
          </div>
          {user.username && (
            <div className="user-username">@{user.username}</div>
          )}
        </div>
      )}

      <main className="app-main">
        <div className="placeholder-card" data-testid="chat-placeholder">
          <div className="placeholder-icon">💬</div>
          <h2>Chat Coming Soon</h2>
          <p>
            {isTelegramEnv
              ? "This is your Telegram Mini App shell. Chat functionality will be added in Iteration 2."
              : "Running in browser mode. Open in Telegram to see full functionality."}
          </p>
        </div>

        <div className="status-info">
          <div className="status-item">
            <span className="status-label">Status:</span>
            <span className="status-value">✅ Iteration 1 Complete</span>
          </div>
          <div className="status-item">
            <span className="status-label">Environment:</span>
            <span className="status-value">
              {isTelegramEnv ? '📱 Telegram' : '🌐 Browser'}
            </span>
          </div>
        </div>
      </main>

      <nav className="app-nav">
        <button className="nav-button active">
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Home</span>
        </button>
        <button className="nav-button">
          <span className="nav-icon">💬</span>
          <span className="nav-label">Chat</span>
        </button>
        <button className="nav-button">
          <span className="nav-icon">🛒</span>
          <span className="nav-label">Cart</span>
        </button>
        <button className="nav-button">
          <span className="nav-icon">👤</span>
          <span className="nav-label">Profile</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
