import math

import numpy as np
import pandas as pd
from scipy.stats import power
from sklearn.linear_model import LinearRegression
import datetime
from sklearn.linear_model import Ridge
from dataclasses import dataclass

def safe_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default
    
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
 ------ Builds a data model that calculates and holds the coefficients for the athlete ------
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

@dataclass
class AthleteModel:
    coefs: np.ndarray
    features: list

    @property
    def coef_dict(self):
        return dict(zip(self.features, self.features))

def design_matrix(distance_list, temp_list, hum_list, elev_list, surface_list=None):
    ## Turn list values into np arrays
    dist = np.asarray(distance_list, dtype=float)
    logd = np.log(dist)
    heat_above60 = np.maximum(0.0, np.asarray(temp_list, dtype=float) - 60.0)
    hum_above60 = np.maximum(0.0, np.asarray(hum_list, dtype=float) - 60.0)
    elev_gain = np.maximum(0.0, np.asarray(elev_list, dtype=float))

    ## Surface encoding: track=0, grass=1, trail=2
    grass_flag = []
    trail_flag = []
    if surface_list is not None:
        for s in surface_list:
            s = (s or "").strip().lower()
            grass_flag.append(1.0 if s == "grass" else 0.0)
            trail_flag.append(1.0 if s == "trail" else 0.0)
    else:
        grass_flag = [0.0] * len(dist)
        trail_flag = [0.0] * len(dist)

    ## Create matrix of coefficients for each feature => coeficient vector
    X = np.column_stack({
        np.ones_like(logd),  # 1           
        logd,                # ln(d)
        logd**2,             # ln(d)^2
        heat_above60,        # H
        hum_above60,         # U
        elev_gain,
        grass_flag,          # G
        trail_flag           # T
        })
    feature_names = ["intercept", "logd", "logd2", "heat_above60", "hum_above60", "elev_gain", "grass", "trail"]
    return X, feature_names
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
 ------ Utility functions for data parsing & conversion   -------
 - parse_time_to_seconds: convert a "M:SS" or "M:SS.ss" string into total seconds (float)
 - seconds_to_time: format a float number of seconds back into "M:SS.ss" string
 - to_int_safe: safely convert a value to int (returns default if it fails)
 - to_float_safe: safely convert a value to float (returns default if it fails)
 - to_date_safe: parse a date string ("M/D/YYYY") into a datetime.date object

 These functions keep input handling robust by catching bad/missing values,
 ensuring the rest of the modeling code always works with clean, numeric data.
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

def parse_time_to_seconds(time_str):
    """
    Accepts formats like '12:34.56' or '12:34' and returns total seconds as float.
    """
    if not time_str or ":" not in time_str:
        raise ValueError(f"Invalid time string: {time_str}")
    m_str, s_str = time_str.strip().split(":")
    return int(m_str) * 60 + float(s_str)

def seconds_to_time(seconds):
    """
    Converts seconds (float) to 'M:SS.ss' format.
    """
    if seconds is None:
        return None
    seconds = float(seconds)
    minutes = int(seconds // 60)
    remaining_seconds = seconds - minutes * 60
    return f"{minutes}:{remaining_seconds:05.2f}"  # zero-pad seconds to at least 2 digits

def to_int_safe(v, default=None):
    try:
        return int(str(v).strip())
    except Exception:
        return default

def to_float_safe(v, default=None):
    try:
        return float(str(v).strip())
    except Exception:
        return default

def to_date_safe(date_str, default=None):
    """
    Expects M/D/YYYY or MM/DD/YYYY
    """
    try:
        month, day, year = map(int, date_str.strip().split("/"))
        return datetime.date(year, month, day)
    except Exception:
        return default


"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  ------ Time predicting functions -------
  - The data model of the athlete created are used to predict the time of the runner in ideal, perfect conditions
  - The Gascon Model is a model for predicting race times across different distances
  - A heuristic approach is taken if their is an insufficient amount of data to use the default model
 """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""


def fit_athlete_performance_model(runners, athlete, min_samples=4, alpha=1.0):
    dist, temp, hum, elev, times = [], [], [], [], []

    for r in runners:
        if r.get("Athlete").strip() != athlete.strip():
            continue
        d = to_float_safe(r.get("Distance (m)"))
        t = to_float_safe(r.get("Temperature (F)"))
        h = to_float_safe(r.get("Humidity (%)"))
        e = to_float_safe(r.get("Elevation Gain"))
        time_sec = None
        try:
            time_sec = parse_time_to_seconds(r.get("Time", ""))
        except Exception:
            pass
        if d and d > 0 and t is not None and h is not None and e is not None and time_sec is not None:
            dist.append(d); temp.append(t); hum.append(h); elev.append(e); times.append(time_sec)
    if len(times) < min_samples:
        return None
        
    X, feature_names = design_matrix(dist, temp, hum, elev)
    y = np.asarray(times, dtype=float)

    ## Ridge Regression model ( OLS that deals with large coefficients)
    model = Ridge(alpha=alpha, fit_intercept=False).fit(X,y)
    coef = model.coef_.copy() ## Create a new copy of the model's array so that he original model coeffiecients aren't modified
    heat_idx = feature_names.index("heat_above60")
    hum_idx = feature_names.index("hum_above60")
    elev_idx = feature_names.index("elev_gain")
    ## Eliminates all the negative values for each coefficient and turns the values 0 if so
    coef[heat_idx] = max(coef[heat_idx], 0.0)
    coef[hum_idx] = max(coef[hum_idx], 0.0)
    coef[elev_idx] = max(coef[elev_idx], 0.0)

    return AthleteModel(coefs=coef, features=feature_names)

def predict_time(model, distance, temp, humidity, elev, surface):
    """
    Predict the athlete's race time under the given conditions.

    Uses the learned linear model:
        y = Xβ
    where:
        X = feature vector for this race
        β = learned regression coefficients
    """
    # Build a single feature vector (design matrix with one row)
    X = design_matrix(
        [distance],
        [temp],
        [humidity],
        [elev],
        surface_list=[surface]
    )[0]

    # Compute the predicted time using matrix multiplication:
    # prediction = Xβ
    return float(X[0] @ model.coefs)

def calculate_vdot(distance: float, time: float):
    """
    Calculate Daniels & Gilbert VO₂ and VDOT.

    Returns:
        (vo2_est, percent_vo2max, vdot)
    """
    if distance <= 0 or time <= 0:
        raise ValueError("Distance and time must be positive.")
    # Average running speed (m/min)
    speed = distance / time * 60
    # Estimated oxygen cost of running at this speed
    vo2_est = (
        0.182258 * speed
        + 0.000104 * speed**2
        + 3.5
    )
    # Sustainable fraction of VO₂max for the race duration
    minutes = time / 60
    percent = (
        0.8
        + 0.1894393 * math.exp(-0.012778 * minutes)
        + 0.2989558 * math.exp(-0.1932605 * minutes)
    )
    # Daniels VDOT estimate
    vdot = vo2_est / percent

    return round(vo2_est, 2), round(percent, 4), round(vdot, 2)

def normalize_time(model, actual_time, temp, humidity, elev, surface):
    """
    Convert an actual race time to its equivalent under ideal conditions.
    """
    coef = model.coef_dict

    penalty = (
        coef["heat_above60"] * max(0, temp - 60) +
        coef["hum_above60"] * max(0, humidity - 60) + 
        coef["elev_gain"] * elev
    )

    if surface == "Grass":
        penalty += coef["grass_flag"]
    elif surface == "Trail":
        penalty += coef["trail_flag"]

    return actual_time - penalty

def predict_time(model, distance_m):
    pass

def heuristic(time_sec, distance_m, temp_f, humidity, elevation_gain_m, athlete=None, runners=None):

    pass


"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  ------ Averaging functions -------
  - These functions calculate different averages according to the race times
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

def average_ideal_for_distance(runners, athlete, distance):
    distance = to_int_safe(distance, None)
    if distance is None:
        return None
    times = []
    for r in runners:
        try:
            if r.get("Athlete", "").strip() == athlete.strip() and to_int_safe(r.get("Distance (m)")) == distance:
                total_sec = parse_time_to_seconds(r.get("Time", ""))
                temp = to_float_safe(r.get("Temperature (F)"), 60)
                hum = to_float_safe(r.get("Humidity (%)"), 60)
                elev = to_float_safe(r.get("Elevation Gain"), 0)
                normal = normalize_time(total_sec, distance, temp, hum, elev, athlete=athlete, runners=runners)
                if normal is not None:
                    times.append(normal)
        except Exception:
            continue
    if not times:
        return None
    return float(np.mean(times))

def average_time_for_distance(runners, athlete, distance):
    distance = to_int_safe(distance, None)
    if distance is None:
        return None

    times = []
    for r in runners:
        if r.get("Athlete", "").strip() == athlete.strip() and to_int_safe(r.get("Distance (m)")) == distance:
            try:
                total_sec = parse_time_to_seconds(r.get("Time", ""))
                times.append(total_sec)
            except Exception:
                continue
    if not times:
        return None
    return float(np.mean(times))

def cumulative_averages(runners, athlete, distance):
    distance = to_int_safe(distance, None)
    if distance is None:
        return [], [], []

    raw_times = []
    ideal_times = []
    raw_averages = []
    ideal_averages = []
    events = []

    # Sort by date to make cumulative meaningful
    rows = [
        (to_date_safe(r.get("Date", "")),r) for r in runners if r.get("Athlete", "").strip() == athlete.strip()
        and to_int_safe(r.get("Distance (m)")) == distance
    ]
    rows.sort(key=lambda x: (x[0] is None, x[0]))  # None dates last, but included

    for _, r in rows:
        try:
            total_sec = parse_time_to_seconds(r.get("Time", ""))
            temp = to_float_safe(r.get("Temperature (F)"), 60)
            hum = to_float_safe(r.get("Humidity (%)"), 60)
            elev = to_float_safe(r.get("Elevation Gain"), 0)
            normal = normalize_time(total_sec, distance, temp, hum, elev, athlete=athlete, runners=runners)

            if total_sec is None or normal is None:
                continue

            raw_times.append(total_sec)
            ideal_times.append(normal)
            raw_averages.append(float(np.mean(raw_times)))
            ideal_averages.append(float(np.mean(ideal_times)))
            events.append(r.get("Event", "").strip())
        except Exception:
            continue

    return raw_averages, ideal_averages, events

def gascon_model(distances, times, race_days_ago):
    """
    T(d) = a + b * ln(d) + c * ln(d)^2  ==>>  a,b,c: learned model coefficeints
    """
    ## Turn lists into np arrays
    distances = np.asarray(distances, dtype=float)
    times = np.asarray(times, dtype=float)
    decay_lambda = 0.0026

    decay_weights = np.exp(-decay_lambda * np.array(race_days_ago))
    W = np.diag(decay_weights)
    ## Create a model matrix representing 'a', 'b', and 'c' constants in equation
    X = np.column_stack([ 
            np.ones(len(distances)), ## Represents a'
            np.log(distances), ## Represents 'b' 
            np.log(distances)**2 ## Represents 'c'
            ])
    
    beta = np.linalg.solve(
    X.T @ W @ X,
    X.T @ W @ times
)
    a, b, c = beta
    x = np.log(distances)

    return a + b*x + c*x*x

def weighted(runners, athlete, distance):
    distance = to_int_safe(distance, None)
    if distance is None:
        return []

    events, times, dates = [], [], []
    for r in runners:
        try:
            if r.get("Athlete", "").strip() == athlete.strip() and to_int_safe(r.get("Distance (m)")) == distance:
                total_sec = parse_time_to_seconds(r.get("Time", ""))
                date = to_date_safe(r.get("Date", ""))
                # Skip rows without valid date or time
                if date is None or total_sec is None:
                    continue
                times.append(total_sec)
                dates.append(date)
                events.append(r.get("Event", "").strip())
        except Exception:
            continue

    if not times:
        return []

    df = pd.DataFrame({"Race": events, "Time (s)": times, "Date": dates})
    df = df.sort_values("Date")
    today = df["Date"].max()
    df["WeeksAgo"] = df["Date"].apply(lambda d: (today - d).days / 7.0)
    lambda_val = 0.05  # decay rate per week
    df["Weight"] = np.exp(-lambda_val * df["WeeksAgo"])

    weighted_series = []
    for i in range(1, len(df) + 1):
        weighted_avg = np.average(df["Time (s)"].iloc[:i], weights=df["Weight"].iloc[:i])
        weighted_series.append(float(weighted_avg))

    return weighted_series