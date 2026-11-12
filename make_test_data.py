
import pandas as pd

# Load your original dataset
df = pd.read_csv("dataset/creditcard.csv")

# Select 20 transactions for testing
test_data = df.sample(n=20, random_state=42)

# Save the test data
test_data.to_csv("dataset/test_transactions.csv", index=False)

print("Test transaction data created successfully!")
print(test_data[["Time", "Amount", "Class"]])
