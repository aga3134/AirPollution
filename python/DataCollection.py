import sys
from LassData import LassData
from pymongo import MongoClient
import json
import requests

if __name__ == "__main__":
    conn = MongoClient()
    db = conn["AirPollution"]
    lass = LassData(db)
    
    args = sys.argv
    if "init" in args:
        lass.Init()
        
    if "collect10min" in args:
        lass.CollectData10min()
    
    if "history" in args:
        lass.CollectDataHistory()
