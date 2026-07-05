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

function predictNextRace(races) {
  if (races.length === 0) return null;

  const distanceCounts = races.reduce((counts, race) => {
    counts[race.distance] = (counts[race.distance] || 0) + 1;
    return counts;
  }, {});

  const targetDistance = Number(
    Object.entries(distanceCounts).sort((a, b) => b[1] - a[1])[0][0]
  );

  const sameDistance = races
    .filter((race) => race.distance === targetDistance)
    .sort((a, b) => parseRaceDate(a.date) - parseRaceDate(b.date));

  if (sameDistance.length === 1) {
    return {
      distance: targetDistance,
      seconds: sameDistance[0].time_sec,
      note: "Based on the only race at this distance so far.",
    };
  }

  const n = sameDistance.length;
  const xMean = (n - 1) / 2;
  const yMean = sameDistance.reduce((sum, race) => sum + race.time_sec, 0) / n;
  const denominator = sameDistance.reduce((sum, _race, index) => sum + (index - xMean) ** 2, 0);
  const slope = denominator === 0
    ? 0
    : sameDistance.reduce((sum, race, index) => sum + (index - xMean) * (race.time_sec - yMean), 0) / denominator;
  const predicted = yMean + slope * (n - xMean);

  return {
    distance: targetDistance,
    seconds: Math.max(predicted, 1),
    note: `Based on ${n} races at ${targetDistance}m.`,
  };
}

export default function RunnerDetail() {
  const { athlete, file_id } = useParams();
  const navigate = useNavigate();
  const athleteName = decodeURIComponent(athlete);
  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    const fetchData = async () => {
      try {
        const res = await axios.get(
          `http://localhost:8000/api/runnersviews/?file_id=${file_id}&athlete=${encodeURIComponent(athleteName)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setRaces(
          [...res.data].sort((a, b) => parseRaceDate(b.date) - parseRaceDate(a.date))
        );
      } catch (error) {
        console.log(error.response?.data || error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [athleteName, file_id]);

  const prediction = useMemo(() => predictNextRace(races), [races]);
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
          <strong>{prediction ? formatTime(prediction.seconds) : "--"}</strong>
          {prediction && <span>{prediction.distance}m</span>}
        </div>
      </aside>

      <main className={styles["main-content"]}>
        <div className={styles.header}>
          <h1>{athleteName}</h1>
          <p>Progress, race history, and next-race estimate</p>
        </div>

        <div className={styles.card}>
          <h2>Next Race Prediction</h2>
          {prediction ? (
            <div className={styles.predictionGrid}>
              <div>
                <p>Predicted Time</p>
                <strong>{formatTime(prediction.seconds)}</strong>
              </div>
              <div>
                <p>Distance</p>
                <strong>{prediction.distance}m</strong>
              </div>
              <div>
                <p>Model</p>
                <strong>Trend</strong>
              </div>
              <p>{prediction.note}</p>
            </div>
          ) : (
            <p>No races found for this athlete yet.</p>
          )}
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
