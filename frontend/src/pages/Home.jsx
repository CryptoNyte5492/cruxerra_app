import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from "../components/Home.module.css";
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

export default function Home() {
    const [fname, setFName] = useState("");
    const [lname, setLName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate(); // Navigate different routes and paths

    const registerForm = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {

            // Sends a POST (create) request to Django
            const res = await axios.post("http://localhost:8000/api/auth/register/", {
                first_name: fname,
                last_name: lname,
                email,
                password,
            });

            // Save the user's token data
            localStorage.setItem("access_token", res.data.access);
            localStorage.setItem("refresh_token", res.data.refresh);

            setFName("");
            setLName(""); 
            setEmail("");
            setPassword("");

            navigate("/dashboard");

        }

        catch (error) {
            setError("Could not create your account. Check the form and try again.");
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
            <h3>Create an account</h3>
        </div>
        <form onSubmit={registerForm}>
          <div className="mb-3">
               <label htmlFor="firstName" className="form-label">First Name</label>
               <input type="text" className="form-control" id="firstName" name="firstName" placeholder="First Name" value={fname} onChange={(e) => setFName(e.target.value)} required/>
          </div>
          <div className="mb-3">
               <label htmlFor="lastName" className="form-label">Last Name</label>
               <input type="text" className="form-control" id="lastName" name="lastName" placeholder="Last Name" value={lname} onChange={(e) => setLName(e.target.value)} required/>
          </div>
          <div className="mb-3">
               <label htmlFor="email" className="form-label">Email</label>
               <input type="email" className="form-control" id="email" name="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required/>
          </div>
          <div className="mb-3">
               <label htmlFor="password" className="form-label">Password</label>
               <input type="password" className="form-control" id="password" name="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required/>
          </div>
          {error && <p className={styles.errorText}>{error}</p>}
          <button className={`btn ${styles["btn-gradient"]}`} type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Submit"}
          </button>
        </form>
        <button className={styles.linkButton} type="button" onClick={() => navigate("/login")}>
          Already have an account? Log in
        </button>
    </div>

  </div>

  
    </div>
    )
}
