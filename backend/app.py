
import os
import logging
from pathlib import Path

import joblib
import pandas as pd

from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.exceptions import RequestEntityTooLarge


# --------------------------------------------------
# 1. APPLICATION CONFIGURATION
# --------------------------------------------------

app = Flask(__name__)

app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024

MAX_CSV_ROWS = 5000
MAX_TRANSACTION_AMOUNT = 10_000_000

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fraudshield")

# Add additional frontend origins through Render environment variables.
default_origins = [
    "https://fraud-shield-4c1rkwm49-bhavi14.vercel.app",
    "http://localhost:5173"
]

extra_origins = os.environ.get("FRONTEND_ORIGINS", "")

FRONTEND_ORIGINS = default_origins + [
    origin.strip()
    for origin in extra_origins.split(",")
    if origin.strip()
]

CORS(
    app,
    resources={
        r"/*": {
            "origins": FRONTEND_ORIGINS,
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    }
)


# --------------------------------------------------
# 2. LOAD MODEL AND PREPROCESSOR
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "models"

MODEL_PATH = MODEL_DIR / "fraud_model_new.pkl"
PREPROCESSOR_PATH = MODEL_DIR / "preprocessor.pkl"

if not MODEL_PATH.exists():
    raise FileNotFoundError(f"Model not found: {MODEL_PATH}")

if not PREPROCESSOR_PATH.exists():
    raise FileNotFoundError(
        f"Preprocessor not found: {PREPROCESSOR_PATH}"
    )

model = joblib.load(MODEL_PATH)
preprocessor = joblib.load(PREPROCESSOR_PATH)

if not hasattr(model, "predict_proba"):
    raise RuntimeError("Model must support predict_proba")

if not hasattr(model, "classes_") or 1 not in model.classes_:
    raise RuntimeError("Model must be trained with fraud class 1")

logger.info("FraudShield AI model loaded successfully")
logger.info("FraudShield AI preprocessor loaded successfully")


# --------------------------------------------------
# 3. MODEL FEATURES
# Keep the same names and order used during training.
# --------------------------------------------------

FEATURES = [
    "TransactionAmt",
    "ProductCD",
    "card1",
    "card2",
    "card3",
    "card4",
    "card5",
    "card6",
    "addr1",
    "addr2",
    "dist1",
    "dist2",
    "P_emaildomain",
    "R_emaildomain",
    "DeviceType",
    "DeviceInfo",
    "id_30",
    "id_31"
]

NUMERIC_FEATURES = [
    "TransactionAmt",
    "card1",
    "card2",
    "card3",
    "card5",
    "addr1",
    "addr2",
    "dist1",
    "dist2"
]


# --------------------------------------------------
# 4. INPUT VALIDATION
# --------------------------------------------------

def validate_dataframe(dataframe):

    if dataframe.empty:
        return "No transaction records provided"

    if len(dataframe) > MAX_CSV_ROWS:
        return f"Maximum {MAX_CSV_ROWS} transactions allowed"

    missing = [
        feature for feature in FEATURES
        if feature not in dataframe.columns
    ]

    if missing:
        return "Missing features: " + ", ".join(missing)

    dataframe = dataframe[FEATURES].copy()

    for column in dataframe.columns:

        invalid_types = dataframe[column].map(
            lambda value: isinstance(value, (list, dict, tuple))
        )

        if invalid_types.any():
            return f"Invalid data type in {column}"

    for column in NUMERIC_FEATURES:

        original = dataframe[column].replace(
            r"^\s*$", pd.NA, regex=True
        )

        converted = pd.to_numeric(
            original, errors="coerce"
        )

        invalid = original.notna() & converted.isna()

        if invalid.any():
            return f"Invalid numeric values in {column}"

        if not converted.dropna().map(
            lambda value: pd.notna(value) and abs(value) != float("inf")
        ).all():
            return f"Non-finite numeric values in {column}"

        dataframe[column] = converted

    amounts = dataframe["TransactionAmt"]

    if amounts.isna().any():
        return "TransactionAmt is required"

    if (
        (amounts < 0).any()
        or (amounts > MAX_TRANSACTION_AMOUNT).any()
    ):
        return "TransactionAmt is outside the permitted range"

    return dataframe


# --------------------------------------------------
# 5. PREDICTION HELPERS
# --------------------------------------------------

def run_predictions(dataframe):

    processed = preprocessor.transform(dataframe[FEATURES])

    predictions = model.predict(processed)

    fraud_index = list(model.classes_).index(1)

    probabilities = model.predict_proba(processed)[:, fraud_index]

    return predictions, probabilities


def clean_records(records):

    cleaned = []

    for record in records:

        item = {}

        for key, value in record.items():

            if pd.isna(value):
                item[key] = None

            elif hasattr(value, "item"):
                item[key] = value.item()

            else:
                item[key] = value

        cleaned.append(item)

    return cleaned


# --------------------------------------------------
# 6. HOME AND HEALTH ENDPOINTS
# --------------------------------------------------

@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "message": "FraudShield AI Backend is Running!",
        "model": "IEEE-CIS Random Forest",
        "status": "success",
        "feature_count": len(FEATURES)
    }), 200


@app.route("/health", methods=["GET"])
def health():

    return jsonify({
        "status": "healthy",
        "model_loaded": model is not None,
        "preprocessor_loaded": preprocessor is not None
    }), 200


# --------------------------------------------------
# 7. SINGLE TRANSACTION PREDICTION
# --------------------------------------------------

@app.route("/predict", methods=["POST"])
def predict():

    try:

        if not request.is_json:
            return jsonify({
                "error": "Content-Type must be application/json"
            }), 415

        transaction = request.get_json(silent=True)

        if not isinstance(transaction, dict):
            return jsonify({
                "error": "Invalid transaction JSON"
            }), 400

        dataframe = pd.DataFrame([transaction])

        validated = validate_dataframe(dataframe)

        if isinstance(validated, str):
            return jsonify({"error": validated}), 400

        predictions, probabilities = run_predictions(validated)

        prediction = int(predictions[0])
        probability = float(probabilities[0])

        return jsonify({
            "prediction": "Fraud" if prediction == 1 else "Genuine",
            "fraud_risk_score": round(probability * 100, 2),
            "amount": float(validated.iloc[0]["TransactionAmt"])
        }), 200

    except Exception:

        logger.exception("Single transaction prediction failed")

        return jsonify({
            "error": "Internal server error. Please try again."
        }), 500


# --------------------------------------------------
# 8. CSV TRANSACTION PREDICTION
# --------------------------------------------------

@app.route("/predict_csv", methods=["POST"])
def predict_csv():

    try:

        if "file" not in request.files:
            return jsonify({
                "error": "Please upload a CSV file"
            }), 400

        uploaded_file = request.files["file"]

        if not uploaded_file.filename:
            return jsonify({
                "error": "No file selected"
            }), 400

        if not uploaded_file.filename.lower().endswith(".csv"):
            return jsonify({
                "error": "Only CSV files are accepted"
            }), 400

        dataframe = pd.read_csv(
            uploaded_file,
            nrows=MAX_CSV_ROWS + 1
        )

        validated = validate_dataframe(dataframe)

        if isinstance(validated, str):
            return jsonify({"error": validated}), 400

        predictions, probabilities = run_predictions(validated)

        transaction_ids = (
            dataframe["TransactionID"].tolist()
            if "TransactionID" in dataframe.columns
            else list(range(1, len(dataframe) + 1))
        )

        results = pd.DataFrame({
            "Transaction_ID": transaction_ids,
            "Amount": validated["TransactionAmt"].tolist(),
            "Prediction": [
                "Fraud" if prediction == 1 else "Genuine"
                for prediction in predictions
            ],
            "Fraud_Risk_Score": (
                probabilities * 100
            ).round(2)
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
            "preview": clean_records(
                results.head(10).to_dict(orient="records")
            )
        }), 200

    except pd.errors.EmptyDataError:

        return jsonify({
            "error": "The uploaded CSV is empty"
        }), 400

    except pd.errors.ParserError:

        return jsonify({
            "error": "Invalid CSV format"
        }), 400

    except UnicodeDecodeError:

        return jsonify({
            "error": "CSV encoding is not supported"
        }), 400

    except Exception:

        logger.exception("CSV prediction failed")

        return jsonify({
            "error": "Internal server error. Please try again."
        }), 500


# --------------------------------------------------
# 9. ERROR HANDLERS
# --------------------------------------------------

@app.errorhandler(RequestEntityTooLarge)
def handle_large_file(error):

    return jsonify({
        "error": "Request too large. Maximum upload size is 10 MB."
    }), 413


@app.errorhandler(404)
def handle_not_found(error):

    return jsonify({
        "error": "API endpoint not found"
    }), 404


@app.errorhandler(405)
def handle_method_not_allowed(error):

    return jsonify({
        "error": "HTTP method not allowed"
    }), 405


@app.errorhandler(500)
def handle_internal_error(error):

    logger.error("Unhandled server error")

    return jsonify({
        "error": "Internal server error"
    }), 500


# --------------------------------------------------
# 10. APPLICATION ENTRY POINT
# --------------------------------------------------

if __name__ == "__main__":

    port = int(os.environ.get("PORT", 5000))

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )
