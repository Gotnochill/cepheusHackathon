import pandas as pd
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

CONNECTION_STRING = os.getenv('MONGODB_URI')

client = MongoClient(CONNECTION_STRING)

db = client['test']
collection = db['disasters']

data = pd.DataFrame(list(collection.find()))

print(data)
