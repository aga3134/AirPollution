#!/usr/bin/env bash

now=$(date +"%Y-%m-%d")
cd ~/AirPollution/

mkdir -p data/graph/$now

for ((i=1; i<=16; i=i+1))
do
    index=$( printf '%02d' $i );
    filename="pm25_asia_$index.png"
    curl -o data/graph/$now/$filename http://sprintars.riam.kyushu-u.ac.jp/images/$filename
done
