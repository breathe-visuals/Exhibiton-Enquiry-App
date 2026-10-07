import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, errorInfo: null });
    window.location.hash = ''; // Reset route to Dashboard
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <AlertTriangle size={64} color="var(--danger-color)" style={{ marginBottom: '20px' }} />
          <h2 style={styles.title}>Something went wrong</h2>
          <p style={styles.subtitle}>An unexpected error occurred while loading this view.</p>
          <button style={styles.btn} onClick={this.handleReset}>
            <RefreshCw size={18} />
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    padding: '20px',
    textAlign: 'center',
    backgroundColor: '#fff',
  },
  title: {
    margin: '0 0 10px 0',
    color: 'var(--text-color)',
    fontSize: '1.5rem',
  },
  subtitle: {
    color: 'var(--text-muted)',
    marginBottom: '30px',
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: 'var(--primary-color)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  }
};

export default ErrorBoundary;
