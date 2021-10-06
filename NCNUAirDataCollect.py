# -*- coding: utf-8 -*-
"""
Created on Fri Oct  6 10:17:26 2017

@author: aga
"""

import websocket
import thread as thread
import time
import requests
import json
import re
import datetime
import pytz


def on_message(ws, message):
    global g_MsgCount
    global g_StationData
    g_MsgCount+=1
    #print(message)
    #parse data
    allMatch = re.findall('{(.+?)}', message)
    
    global g_TimeZone
    localTime = g_TimeZone.localize(datetime.datetime.now())
    timeStr = localTime.strftime("%Y-%m-%d %H:%M:%S")
    sensorData = {'time': timeStr}
    for match in allMatch:
        comma = match.find(",")
        key = match[:comma]
        value = match[comma+1:]
        if key == "Sender":
            sensorData["id"] = value
        if key == "Data":
            allData = re.findall('\[(.+?)\]',value)
            for d in allData:
                item = d.split(",")
                sensorData[item[0]] = item[1]
                
    if sensorData["id"] in g_StationData:
        g_StationData[sensorData["id"]]["data"] = sensorData

def on_error(ws, error):
    print(error)

def on_close(ws):
    print("### closed ###")

def GenJSONData():
    global g_StationData
    jsonData = {}
    jsonData["status"] = "ok"
    jsonData["devices"] = []
    dataCount = 0
    for key,station in g_StationData.items():
        if "data" in station:
            dataCount+=1
            device = {}
            device["id"] = key
            device["name"] = station["name"]
            device["lat"] = float(station["lat"])
            device["lon"] = float(station["lng"])
            device["pm25"] = float(station["data"]["PM2.5"])
            device["co2"] = 0
            device["hcho"] = 0
            device["tvoc"] = 0
            device["t"] = float(station["data"]["Temperature"])
            device["h"] = float(station["data"]["Humidity"])
            device["time"] = station["data"]["time"]
            device["org"] = ""
            device["area"] = ""
            device["type"] = "NCNU_airq"
            #print(device)
            jsonData["devices"].append(device)
            
    if dataCount == 0:
        jsonData["status"] = "fail"
    #print(jsonData)
            
    global g_TimeZone
    localTime = g_TimeZone.localize(datetime.datetime.now())
    timeStr = localTime.strftime("%Y-%m-%d_%H-%M")
    chArr = list(timeStr)
    chArr[len(chArr)-1] = "0"
    timeStr = "".join(chArr)
    
    dirPath = "/data/AirPollution/data/NCNU_airq/"
    with open(dirPath+'airq_'+timeStr+'.json', 'wb') as outfile:
        dumpStr = json.dumps(jsonData, ensure_ascii=False)
        #print(dumpStr)
        outfile.write(dumpStr.encode("utf-8"))
    
    print("stationNum: "+str(len(g_StationData.keys())))
    print("recieve data: "+str(dataCount))
    

def on_open(ws):
    def run(*args):
        time.sleep(60)  #collect data for 1 min
        ws.close()
        GenJSONData()
        print("thread terminating...")
    thread.start_new_thread(run, ())


if __name__ == "__main__":
    global g_Stations
    global g_MsgCount
    global g_StationData
    global g_TimeZone
    g_TimeZone = pytz.timezone('Asia/Taipei')
    g_MsgCount = 0
    g_Stations = None
    g_StationData = {}
    
    r = requests.post("http://www.airq.org.tw/Home/GetAllStation", data={'token': 1})
    g_Stations = json.loads(r.text);
    for station in g_Stations:
        id = station["id"]
        data = {}
        data["lat"] = station["lat"]
        data["lng"] = station["lng"]
        data["name"] = station["name"]
        g_StationData[id] = data

    #websocket.enableTrace(True)
    ws = websocket.WebSocketApp("ws://www.airq.org.tw/WSHandler.ashx",
                              on_message = on_message,
                              on_error = on_error,
                              on_close = on_close)
    ws.on_open = on_open
    ws.run_forever()
