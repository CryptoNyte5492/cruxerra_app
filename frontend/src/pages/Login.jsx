import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from "../components/Home.module.css";
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const loginUser = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await axios.post(
                "http://localhost:8000/api/auth/token/",
                {
                    username,
                    password
                }
            )

            localStorage.setItem(
            "access_token",
            res.data.access
            );

            localStorage.setItem(
                "refresh_token",
                res.data.refresh
            );

            navigate("/dashboard");

        }

        catch (error) {
            setError("Username or password is incorrect.");
            console.log(error.response?.data || error);
        }
        finally {
            setLoading(false);
        }
        
    }

    return (
        <div className={styles.mainLayout}>
            <div className={styles.sidebar}>
                <div>
                    <h1 className={styles["viga-regular"]}>CRUXERRA</h1>
                    <p>Easily upload your csv file and calculate your race times.</p>
                </div>
            </div>
            <div className={styles.main}>
                <div className={styles["upload-card"]}>
                    <div className={styles.cardText}>
                        <h3>Log in</h3>
                    </div>
                    <form onSubmit={loginUser}>
                        <div className="mb-3">
                            <label htmlFor="username" className="form-label">Username</label>
                            <input
                                id="username"
                                className="form-control"
                                type="text"
                                placeholder="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>

                        <div className="mb-3">
                            <label htmlFor="loginPassword" className="form-label">Password</label>
                            <input
                                id="loginPassword"
                                className="form-control"
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {error && <p className={styles.errorText}>{error}</p>}

                        <button className={`btn ${styles["btn-gradient"]}`} type="submit" disabled={loading}>
                            {loading ? "Logging in..." : "Login"}
                        </button>
                    </form>
                    <button className={styles.linkButton} type="button" onClick={() => navigate("/register")}>
                        Need an account? Sign up
                    </button>
                </div>
            </div>
        </div>
    )
}
