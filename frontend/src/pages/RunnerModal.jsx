import { use, useEffect } from "react";
import api from "../api";
import styles from "../components/Model.module.css";

export default function RaceModal({ race, file_id, athlete, onClose }) {

    const [data, setData] = useState(null);
    const [prediction, setPrediction] = useState(null);

    useEffect(() => {
        if (!race) return;

        const fetch = async () => {
            const token = localStorage.getItem("access_token");

            const res = api.get(
                `/api/runners/race-analysis/?file_id=${fileId}&athlete=${encodeURIComponent(athlete)}&race_id=${race.id}`,
                {
                    headers: {
                            Authorization: `Bearer ${token}`,
                    }
                }
            )
            const pred = await api.get(
                `/api/runners/prediction/?file_id=${fileId}&athlete=${encodeURIComponent(athlete)}&race_id=${race.id}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
);
            setData(fetch.data);
            setPrediction(pred.data);
        };

        fetch();
    }, [race])


    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>

                <h1>Conditions</h1>
                <p>Temperature: {data.conditions.temp}°F</p>
                <p>Humidity: {data.conditions.humidity}%</p>
                <p>Surface: {data.conditions.surface}</p>
                <p>Elevation: {data.conditions.elevation} ft</p>

                <h1>Ideal Time</h1>
                <p>{data.ideal_time}</p>

                <h1>Standard Deviation</h1>
                <p>{data.std_}</p>
            </div>
        </div>
    );
}