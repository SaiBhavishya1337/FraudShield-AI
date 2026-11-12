import os
import pandas as pd
import joblib
from flask import request, jsonify
from flask import Flask, request, jsonify
from flask_cors import CORS
from pathlib import Path
app = Flask(__name__)
# Load trained Random Forest model and Amount scaler
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MODEL_PATH = os.path.join(BASE_DIR, "models", "fraud_model.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "models", "scaler.pkl")

model = joblib.load(MODEL_PATH)
scaler = joblib.load(SCALER_PATH)

print("Random Forest model loaded successfully!")
print("Amount scaler loaded successfully!")
CORS(app)

# Load saved model and scaler
BASE_DIR = Path(__file__).resolve().parent.parent

model = joblib.load(BASE_DIR / "models" / "fraud_model.pkl")
scaler = joblib.load(BASE_DIR / "models" / "scaler.pkl")

FEATURES = list(model.feature_names_in_)

@app.route("/")
def home():
    return jsonify({
        "message": "FraudShield AI Backend is Running!",
        "status": "success"
    })

@app.route("/predict_csv", methods=["POST"])
def predict_csv():
    try:
        if "file" not in request.files:
            return jsonify({"error": "Please upload a CSV file"}), 400

        file = request.files["file"]

        if not file.filename.lower().endswith(".csv"):
            return jsonify({"error": "Only CSV files are allowed"}), 400

        df = pd.read_csv(file)

        if df.empty:
            return jsonify({"error": "CSV file is empty"}), 400

        feature_columns = (
            ["Time"] +
            [f"V{i}" for i in range(1, 29)] +
            ["Amount"]
        )

        missing = [
            col for col in feature_columns
            if col not in df.columns
        ]

        if missing:
            return jsonify({
                "error": "Missing required columns: " + ", ".join(missing)
            }), 400

        # Prepare model input in the correct feature order
        X = df[feature_columns].copy()

        if X.isnull().any().any():
            return jsonify({"error": "CSV contains missing values"}), 400

        # Scale Amount using the trained scaler
        X["Amount"] = scaler.transform(
            X[["Amount"]]
        ).ravel()

        # Random Forest predictions
        predictions = model.predict(X)

        if hasattr(model, "predict_proba"):
            probabilities = model.predict_proba(X)[:, 1]
        else:
            probabilities = predictions.astype(float)

        # Prepare results
        results = pd.DataFrame({
            "Transaction_ID": range(1, len(df) + 1),
            "Amount": df["Amount"].values,
            "Prediction": [
                "Fraud" if p == 1 else "Genuine"
                for p in predictions
            ],
            "Fraud_Risk_Score": (
                probabilities * 100
            ).round(2)
        })

        fraud_count = int((predictions == 1).sum())
        genuine_count = int((predictions == 0).sum())
        total = len(predictions)

        return jsonify({
            "total_transactions": total,
            "fraud_detected": fraud_count,
            "genuine_transactions": genuine_count,
            "fraud_percentage": round(
                fraud_count / total * 100, 3
            ),
            "preview": results.head(10).to_dict(
                orient="records"
            )
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
