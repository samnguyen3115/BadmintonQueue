import React, { useState, useEffect } from "react";
import "./styles.css";

const LoginPage: React.FC = () => {
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [loginEmail, setLoginEmail] = useState("");
    const [registerName, setRegisterName] = useState("");
    const [registerEmail, setRegisterEmail] = useState("");
    const [registerQualification, setRegisterQualification] = useState("intermediate");

    // Redirect if already logged in
    useEffect(() => {
        const currentPlayer = localStorage.getItem("currentPlayer");
        if (currentPlayer) {
            window.location.href = "/";
        }
    }, []);

    const toggleFormMode = () => {
        setIsLoginMode(!isLoginMode);
        setErrorMessage("");
        setSuccessMessage("");
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: loginEmail }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccessMessage("Login successful! Redirecting...");
                localStorage.setItem("currentPlayer", JSON.stringify(data.player));
                setTimeout(() => (window.location.href = "/"), 1500);
            } else {
                setErrorMessage(data.detail || "Login failed");
            }
        } catch {
            setErrorMessage("Network error. Please try again.");
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: registerName,
                    email: registerEmail,
                    qualification: registerQualification,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccessMessage("Registration successful! You can now sign in.");
                setTimeout(() => {
                    setIsLoginMode(true);
                    setLoginEmail(registerEmail);
                }, 1500);
            } else {
                setErrorMessage(data.detail || "Registration failed");
            }
        } catch {
            setErrorMessage("Network error. Please try again.");
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <h1>Welcome</h1>
                    <p>{isLoginMode ? "Sign in to access the queue system" : "Create your account to join the queue"}</p>
                </div>

                {errorMessage && <div className="error-message">{errorMessage}</div>}
                {successMessage && <div className="success-message">{successMessage}</div>}

                {isLoginMode ? (
                    <form onSubmit={handleLogin}>
                        <div className="form-group">
                            <label htmlFor="login-email">Email Address</label>
                            <input
                                type="email"
                                id="login-email"
                                value={loginEmail}
                                onChange={(e) => setLoginEmail(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="btn-primary">
                            Sign In
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleRegister}>
                        <div className="form-group">
                            <label htmlFor="register-name">Full Name</label>
                            <input
                                type="text"
                                id="register-name"
                                value={registerName}
                                onChange={(e) => setRegisterName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="register-email">Email Address</label>
                            <input
                                type="email"
                                id="register-email"
                                value={registerEmail}
                                onChange={(e) => setRegisterEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="register-qualification">Skill Level</label>
                            <select
                                id="register-qualification"
                                value={registerQualification}
                                onChange={(e) => setRegisterQualification(e.target.value)}
                                required
                            >
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </select>
                        </div>

                        <button type="submit" className="btn-primary">
                            Register
                        </button>
                    </form>
                )}

                <div className="form-toggle">
                    <p>
                        {isLoginMode ? "Don't have an account?" : "Already have an account?"}{" "}
                        <button type="button" onClick={toggleFormMode}>
                            {isLoginMode ? "Sign up" : "Sign in"}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
