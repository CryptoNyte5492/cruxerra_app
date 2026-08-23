import { useEffect, useState } from "react";
import api from "../api";
import styles from "../components/Model.module.css";

export default function RaceModal({ race, file_id, athlete, onClose }) {

    const [data, setData] = useState(null);

    useEffect(() => {
        if (!race) return;

        const fetchPrediction = async () => {
            const token = localStorage.getItem("access_token");

            const pred = await api.get(
                `/api/runners/prediction/?file_id=${file_id}&athlete=${encodeURIComponent(athlete)}&race_id=${race.id}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
);
            setData(pred.data);
        };

        fetchPrediction();
    }, [race, file_id, athlete])

    if (!data) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <button type="button" onClick={onClose}>Close</button>

                <h1>Conditions</h1>
                <p>Temperature: {data.conditions.temp}°F</p>
                <p>Humidity: {data.conditions.humidity}%</p>
                <p>Surface: {data.conditions.surface}</p>
                <p>Elevation: {data.conditions.elevation} ft</p>

                <h1>Ideal Time</h1>
                <p>{data.ideal_time}</p>

                <h1>Standard Deviation</h1>
                <p>{data.std_dev ?? "--"}</p>
            </div>
        </div>
    );
}
