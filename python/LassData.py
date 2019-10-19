import requests
import json
import datetime
import math
import re
import sys
import traceback
from gzip import decompress

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
            unzip_data = decompress(r.content)
            data = json.loads(unzip_data)["feeds"]
            #compute grid data
            for d in data:
                #去除數值異常
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

                    #每十分鐘記一筆資料
                    try:
                        t = datetime.datetime.strptime(d["timestamp"], '%Y-%m-%dT%H:%M:%SZ')
                        t = t.replace(tzinfo=pytz.utc).astimezone(taiwan)
                        m = t.minute - t.minute%10
                        t = t.replace(minute=m,second=0)
                        gridData["time"] = t
                        #四捨五入到最近網格
                        gridData["gridX"] = math.floor(intX+0.5)
                        gridData["gridY"] = math.floor(intY+0.5)
                        #計算貢獻比例，越遠越小
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
            for level in range(0,self.levelNum):
                arr = gridArr[level]
                for key in arr:
                    d = arr[key]
                    day = str(d["time"].year)+"_"+str(d["time"].month)+"_"+str(d["time"].day)
                    dataKey = {"level": d["level"], "time": d["time"], "gridX":d["gridX"], "gridY": d["gridY"]}
                    
                    query = self.db["sensorgrid_"+day].find_one(dataKey)
                    if query is None:
                        self.db["sensorgrid_"+day].insert_one(d)
                    else:
                        d["pm25"] += query["pm25"]
                        d["t"] += query["t"]
                        d["h"] += query["h"]
                        d["weight"] += query["weight"]
                        self.db["sensorgrid_"+day].update(dataKey,d)

                    if level == 0:
                        self.UpdateCountrySummary(d)

    def UpdateCountrySummary(self, d):
        countryArr = ["Taiwan", "Korea"]
        for country in countryArr:
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
            self.db["sensordailysum"+countryCode].update({"_id":tday},{"$inc":inc},upsert=True)
            self.db["sensor10minsum"+countryCode].update({"_id":t10min},{"$inc":inc},upsert=True)

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
                return "centeral"
