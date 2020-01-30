import requests
import json
import datetime
import math
import re
import sys
import traceback
from gzip import decompress
import pymongo

import pytz
taiwan = pytz.timezone('Asia/Taipei')

class LassData:
    def __init__(self, db):
        self.db = db
        self.gridPerUnit = 100
        self.levelNum = 6
        
    def Init(self):
        pass
    
    def CollectData10min(self):
        try:
            self.CollectLassAirbox()
        except:
            print(sys.exc_info()[0])
            traceback.print_exc()
    
    def CollectLassAirbox(self):
        print("Collect Lass airbox")
        
        gridArr = []
        for i in range(0,self.levelNum):
            gridArr.append({})

        r = requests.get("https://pm25.lass-net.org/data/last-all-airbox.json.gz")
        r.encoding = "utf-8"
        if r.status_code == requests.codes.all_okay:
            unzip_data = decompress(r.content).decode('utf-8')
            data = json.loads(unzip_data)["feeds"]
            #compute grid data
            for d in data:
                #drop abnormal value
                if(d["s_d0"] <= 0) or (d["s_d0"] >= 3000):
                    continue;
                for level in range(0,self.levelNum):
                    scale = self.gridPerUnit/math.pow(2,level)
                    gridX = d["gps_lon"]*scale
                    gridY = d["gps_lat"]*scale
                    intX = math.floor(gridX)
                    intY = math.floor(gridY)
                    gridData = {}
                    gridData["level"] = level

                    try:
                        t = datetime.datetime.strptime(d["timestamp"], '%Y-%m-%dT%H:%M:%SZ')
                        t = t.replace(tzinfo=pytz.utc).astimezone(taiwan)
                        m = t.minute - t.minute%10
                        t = t.replace(minute=m,second=0)
                        gridData["time"] = t
                        gridData["gridX"] = math.floor(intX+0.5)
                        gridData["gridY"] = math.floor(intY+0.5)
                        wX = 1-abs(gridX-gridData["gridX"])
                        wY = 1-abs(gridY-gridData["gridY"])
                        weight = wX*wY
                        gridData["pm25"] = d["s_d0"]*weight
                        gridData["t"] = d["s_t0"]*weight
                        gridData["h"] = d["s_h0"]*weight
                        gridData["weight"] = weight

                        key = gridData["time"].isoformat()+str(gridData["gridX"])+str(gridData["gridY"])
                        arr = gridArr[level]
                        if key in arr:
                           arr[key]["pm25"] += gridData["pm25"]
                           arr[key]["t"] += gridData["t"]
                           arr[key]["h"] += gridData["h"]
                           arr[key]["weight"] += gridData["weight"]
                        else:
                            arr[key] = gridData
                    except ValueError:
                        continue
            #save to db
            opData = {}
            countryData = {}
            for level in range(0,self.levelNum):
                arr = gridArr[level]
                for key in arr:
                    d = arr[key]
                    day = str(d["time"].year)+"_"+str(d["time"].month)+"_"+str(d["time"].day)
                    table = "sensorgrid_"+day
                    if table not in opData:
                        opData[table] = []

                    dataKey = {"level": d["level"], "time": d["time"], "gridX":d["gridX"], "gridY": d["gridY"]}
                    inc = {"weight":d["weight"],"t":d["t"],"h":d["h"],"pm25":d["pm25"]}
                    opData[table].append(pymongo.UpdateOne(dataKey, {"$inc": inc}, upsert=True))

                    if level == 0:
                        countryData = self.UpdateCountrySummary(countryData,d)

            for table in opData:
                self.db[table].create_index([("level",1),("time",1),("gridX",1),("gridY",1)])
                if len(opData[table]) > 0:
                    self.db[table].bulk_write(opData[table],ordered=False)
            
            for table in countryData:
                if len(countryData[table]) > 0:
                    self.db[table].bulk_write(countryData[table],ordered=False)



    def UpdateCountrySummary(self,countryData,d):
        countryArr = ["Taiwan", "Korea"]
        for country in countryArr:
            if not self.CheckCountryBound(country,d):
                continue
            countryCode = ""
            if country == "Taiwan":
                countryCode = "s"
            elif country == "Korea":
                countryCode = "_krs"

            inc = {}
            area = self.LatToArea(country, d["gridY"]/self.gridPerUnit);
            inc[area+"Sum"] = d["pm25"]
            inc[area+"Num"] = d["weight"]
            tday = d["time"].replace(hour=0,minute=0,second=0)
            t10min = d["time"].replace(minute=(d["time"].minute-d["time"].minute%10),second=0)
            
            tableDaily = "sensordailysum"+countryCode
            if tableDaily not in countryData:
                countryData[tableDaily] = []
            countryData[tableDaily].append(pymongo.UpdateOne({"_id":tday}, {"$inc": inc}, upsert=True))
            
            table10min = "sensor10minsum"+countryCode
            if table10min not in countryData:
                countryData[table10min] = []
            countryData[table10min].append(pymongo.UpdateOne({"_id":t10min}, {"$inc": inc}, upsert=True))
        return countryData

    def CheckCountryBound(self,country,d):
        lat = d["gridY"]/self.gridPerUnit
        lng = d["gridX"]/self.gridPerUnit
        if country == "Taiwan":
            return lat >= 21 and lat <= 26 and lng >= 118 and lng <= 123
        elif country == "Korea":
            return lat >= 33 and lat <= 39 and lng >= 124 and lng <= 131
    

    def LatToArea(self, country, lat):
        if country == "Taiwan":
            if lat < 23.5:
                return "south"
            elif lat > 24.5:
                return "north"
            else:
                return "central"
        elif country == "Korea":
            if lat < 35.5:
                return "south"
            elif lat > 37:
                return "north"
            else:
                return "central"
