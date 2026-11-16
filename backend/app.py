
import os
import joblib
import pandas as pd

from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "models"

# Load new IEEE-CIS model and preprocessor
model = joblib.load(MODEL_DIR / "fraud_model_new.pkl")
preprocessor = joblib.load(MODEL_DIR / "preprocessor.pkl")

FEATURES = [
    "TransactionAmt",
    "ProductCD",
    "card1", "card2", "card3",
    "card4", "card5", "card6",
    "addr1", "addr2",
    "dist1", "dist2",
    "P_emaildomain",
    "R_emaildomain",
    "DeviceType",
    "DeviceInfo",
    "id_30",
    "id_31"
]

print("New FraudShield AI model loaded!")
print("Preprocessor loaded successfully!")

@app.route("/")
def home():
    return jsonify({
        "message": "FraudShield AI Backend is Running!",
        "model": "IEEE-CIS Random Forest",
        "status": "success"
    })


@app.route("/predict_csv", methods=["POST"])
def predict_csv():
    try:
        if "file" not in request.files:
            return jsonify({"error": "Upload a CSV file"}), 400

        df = pd.read_csv(request.files["file"])

        if df.empty:
            return jsonify({"error": "CSV is empty"}), 400

        missing = [col for col in FEATURES if col not in df.columns]

        if missing:
            return jsonify({
                "error": "Missing columns: " + ", ".join(missing)
            }), 400

        X = df[FEATURES].copy()

        processed = preprocessor.transform(X)
        predictions = model.predict(processed)

        probabilities = model.predict_proba(processed)[:, 1]

        results = pd.DataFrame({
            "Transaction_ID": (
                df["TransactionID"]
                if "TransactionID" in df.columns
                else range(1, len(df) + 1)
            ),
            "Amount": df["TransactionAmt"],
            "Prediction": [
                "Fraud" if p == 1 else "Genuine"
                for p in predictions
            ],
            "Fraud_Risk_Score": (probabilities * 100).round(2)
        })

        fraud_count = int((predictions == 1).sum())
        total = len(predictions)

        return jsonify({
            "total_transactions": total,
            "fraud_detected": fraud_count,
            "genuine_transactions": total - fraud_count,
            "fraud_percentage": round(
                fraud_count / total * 100, 3
            ),
            "preview": results.head(10).to_dict(orient="records")
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/predict", methods=["POST"])
def predict():
    try:
        transaction = request.get_json()

        if not transaction:
            return jsonify({"error": "No transaction data provided"}), 400

        missing = [col for col in FEATURES if col not in transaction]

        if missing:
            return jsonify({
                "error": "Missing features: " + ", ".join(missing)
            }), 400

        X = pd.DataFrame(
            [[transaction[col] for col in FEATURES]],
            columns=FEATURES
        )

        processed = preprocessor.transform(X)
        prediction = int(model.predict(processed)[0])
        probability = float(model.predict_proba(processed)[0][1])

        return jsonify({
            "prediction": "Fraud" if prediction == 1 else "Genuine",
            "fraud_risk_score": round(probability * 100, 2),
            "amount": transaction["TransactionAmt"]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
