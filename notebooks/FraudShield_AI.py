import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
df = pd.read_csv("dataset/creditcard.csv")
print("FraudShield AI Dataset Loaded!")
print("Shape:", df.shape)
print(df.head())
