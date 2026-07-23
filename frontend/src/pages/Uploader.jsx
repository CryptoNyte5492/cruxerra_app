import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "../components/Uploader.module.css";

export default function Uploader () {
    const [user, setUser] = useState(null);
    const [files, setFiles] = useState([]);
    const navigate = useNavigate();

    // Run when the first component loads
    useEffect(() => {
        // Obtain user's access JWT token to access user's data
        const token = localStorage.getItem("access_token");
        // Send GET request with user token to Django's view and serializer to authorize and get back user's data
        axios.get("http://localhost:8000/api/dashboard/", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        // The data returned is the user's data in a readale format for the frontend
        }).then(res => {setUser(res.data)}).catch(err => {console.log(err);});
    }, [] ) //<- This '[]' tells React to only run this once

    const handleFile = async (e) => {
        e.preventDefault();

        const token = localStorage.getItem("access_token");
        const formData = new FormData();

        for (let i = 0; i < files.length; i++) 
        {
            formData.append("file", files[i])
        }

        try
        {
            // Submit file to django' 
            const res = await axios.post("http://localhost:8000/api/dashboard/fileUpload/", formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            
            navigate(`/runner/${res.data.file_id[0]}`);
        }
        catch (error) {
    console.log("Status:", error.response?.status);
    console.log("Data:", error.response?.data);
}
    }

    return (
    <div className={styles.mainLayout}>
      {user ? (
        <>
      <div className={styles.sidebar}>
        <div>
        </div>

        <div>
          <h2>Files Uploaded:</h2>
        </div>

        <div>
          <h1 className={styles["viga-regular"]}>CRUXERRA</h1>
          <p>Easily upload your csv file and calculate your race times.</p>
        </div>
      </div>

      <div className={styles.main}>
        <div className={styles["upload-card"]}>
          <h4>Welcome,</h4>
          <h2>{user.username}</h2>

          <hr />

          <h5>Upload Race CSV files</h5>

          <form onSubmit={handleFile}>
            <div className={styles.fileRow}>
              <label className={styles.uploadButton}>
                Choose CSV Files
                <input
                  name="file"
                  type="file"
                  multiple
                  accept=".csv"
                  onChange={(e) => setFiles(Array.from(e.target.files))} // Create array of files
                  className={styles.fileInput}
                />
              </label>
              <p>
                {files.length > 0
                  ? `${files.length} file(s) selected`
                  : "No files selected"}
              </p>
            </div>

            <button className={`btn ${styles["btn-gradient"]}`} type="submit">
              Submit CSV File(s)
            </button>
          </form>
        </div>
      </div>
    </>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
