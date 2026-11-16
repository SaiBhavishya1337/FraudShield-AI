
import pandas as pd

transactions = pd.read_csv("dataset/train_transaction.csv")
identity = pd.read_csv("dataset/train_identity.csv")

data = transactions.merge(
    identity, on="TransactionID", how="left"
)

data.to_csv("dataset/merged_fraud_data.csv", index=False)

print("Merge completed!")
print("Dataset shape:", data.shape)
print(data.head())
