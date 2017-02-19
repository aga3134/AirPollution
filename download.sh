#!/usr/bin/env bash

now=$(date +"%Y-%m-%d_%H-%M")
cd ~/web/AirPollution/

#echo "1234" >> test.log
echo $now >> time.txt

mkdir -p data/loadareas
mkdir -p data/loadfueltype
mkdir -p data/genary
mkdir -p data/airdata
mkdir -p data/weather
mkdir -p data/traffic

#download power data from taipower
curl -o data/loadareas/loadareas_$now.csv http://www.taipower.com.tw/loadGraph/loadGraph/data/loadareas.csv

curl -o data/loadfueltype/loadfueltype_$now.csv http://stpc00601.taipower.com.tw/loadGraph/loadGraph/data/loadfueltype.csv

curl -o data/genary/genary_$now.txt http://www.taipower.com.tw/loadGraph/loadGraph/data/genary.txt

#download air data from airbox
curl -o data/airdata/airdata_$now.json http://airbox.edimaxcloud.com/devices?token=EA81A1FA-8EDB-4CA0-B07B-A881C74B0401

#download weather data from cwb
curl -o data/weather/weather_$now.xml "http://opendata.cwb.gov.tw/opendataapi?dataid=O-A0001-001&authorizationkey=CWB-3935AD4A-910C-477C-9390-7245E2DAC103"

#download traffic  data from tisvcloud
curl -o data/traffic/traffic.gz "http://tisvcloud.freeway.gov.tw/roadlevel_value5.xml.gz"
gunzip data/traffic/traffic.gz
mv data/traffic/traffic data/traffic/traffic_$now.xml
