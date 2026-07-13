import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import styles from "../components/Runner.module.css";

function formatTime(seconds) {
  if (seconds == null || Number.isNaN(seconds) || !Number.isFinite(seconds)) {
    return "--";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  const hundredths = Math.round((seconds % 1) * 100);

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
}

function parseRaceDate(value) {
  const [month, day, year] = String(value).split("/").map(Number);
  return new Date(year, month - 1, day);
}

export default function RunnerDetail() {
  const { athlete, file_id, race_id } = useParams();
  const navigate = useNavigate();
  const athleteName = decodeURIComponent(athlete);
  const [races, setRaces] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    const fetchData = async () => {
      try {
        const raceRes = await axios.get(
          `http://localhost:8000/api/runnersviews/?file_id=${file_id}&athlete=${encodeURIComponent(athleteName)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setRaces(
          [...raceRes.data].sort((a, b) => parseRaceDate(b.date) - parseRaceDate(a.date))
        );

        const predictionRes = await axios.get(
          `http://localhost:8000/api/runners/prediction/?file_id=${file_id}&athlete=${athlete}&race_id=${race_id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setPrediction(predictionRes.data);
      } catch (error) {
        console.log(error.response?.data || error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [athleteName, file_id]);
  
  const bestRace = useMemo(
    () => races.reduce((best, race) => (!best || race.time_sec < best.time_sec ? race : best), null),
    [races]
  );

  if (loading) return <p className={styles.loading}>Loading...</p>;

  return (
    <div className={styles["runner-page"]}>
      <aside className={styles.sidebar}>
        <button className={styles.backButton} type="button" onClick={() => navigate(`/runner/${file_id}`)}>
          Back
        </button>
        <h3>{athleteName}</h3>

        <div className={styles["stat-card"]}>
          <p>Total Races</p>
          <strong>{races.length}</strong>
        </div>

        <div className={styles["stat-card"]}>
          <p>Best Time</p>
          <strong>{bestRace ? formatTime(bestRace.time_sec) : "--"}</strong>
        </div>

        <div className={styles["stat-card"]}>
          <p>Prediction</p>
          <strong>{prediction ? formatTime(prediction) : "--"}</strong>
        </div>
      </aside>

      <main className={styles["main-content"]}>
        <div className={styles.header}>
          <h1>{athleteName}</h1>
          <p>Progress, race history, and next-race estimate</p>
        </div>

        <div className={styles.card}>
          <h2>Next Race Prediction</h2>
          {prediction}
        </div>

        <div className={styles.card}>
          <h2>Race History</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Event</th>
                <th>Date</th>
                <th>Distance</th>
                <th>Time</th>
                <th>Surface</th>
                <th>Weather</th>
              </tr>
            </thead>
            <tbody>
              {races.map((race) => (
                <tr key={race.id}>
                  <td>{race.event}</td>
                  <td>{race.date}</td>
                  <td>{race.distance}m</td>
                  <td>{formatTime(race.time_sec)}</td>
                  <td>{race.surface}</td>
                  <td>{race.temperature}F / {race.humidity}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
