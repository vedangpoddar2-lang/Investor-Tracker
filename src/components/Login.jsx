import { useState } from 'react';
import { supabase } from '../lib/supabase';
import './Login.css';

export default function Login() {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);
        try {
            if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: window.location.origin
                    }
                });
                if (error) throw error;

                // If email confirmation is disabled, Supabase returns a session immediately
                if (!data.session) {
                    setMessage('Registration successful! Please sign in.');
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">
                        <span className="logo-text">APEX</span>
                    </div>
                    <h1 className="login-title">{isSignUp ? 'Create Account' : 'Sign In'}</h1>
                    <p className="login-subtitle">
                        {isSignUp ? 'Join the investor dashboard' : 'Sign in to manage your pipeline'}
                    </p>
                </div>

                <form className="login-form" onSubmit={handleAuth}>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            className="input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@company.com"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && <div className="login-error">{error}</div>}
                    {message && <div className="login-success">{message}</div>}

                    <button className="btn btn-primary btn-block" disabled={loading}>
                        {loading ? (isSignUp ? 'Registering...' : 'Signing in...') : (isSignUp ? 'Sign Up' : 'Sign In')}
                    </button>
                </form>

                <div className="login-footer">
                    <button
                        className="btn btn-ghost mode-toggle"
                        onClick={() => setIsSignUp(!isSignUp)}
                    >
                        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                    </button>
                    <p className="powered-by">Protected by Supabase Auth</p>
                </div>
            </div>
        </div>
    );
}
