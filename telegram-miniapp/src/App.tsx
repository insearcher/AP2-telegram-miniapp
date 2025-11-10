import { useEffect, useState } from 'react';

function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Basic initialization
    setReady(true);
  }, []);

  if (!ready) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h1>AP2 Shopping Assistant</h1>
      <p>Telegram Mini App with Crypto Payments</p>
      <p>✅ Iteration 0: Infrastructure Setup Complete</p>
    </div>
  );
}

export default App;
