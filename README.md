# 紫豹在哪裡
紫豹在哪裡是一個整合多種空汙相關資料，並以視覺化動態呈現的網站。
對於空汙問題，它可提供以下價值：
1. 整合長期空汙相關資料並視覺化呈現，所有人皆可依數據為基礎進行討論。
2. 協助鎖定台灣空汙來源的可能地點，讓防制資源可以集中投向重點區域。
3. 凡走過必留下痕跡，用資料透明度遏止可能的惡意排放。
4. 提供相關資料的API接口，所有人皆可延續發展相關專案。
5. 開源網站程式碼，想發展相關專案的人都可自行參考開發。

若有希望整合的其他空汙相關數據，請自行從github源始碼發展，或來信aga3134@gmail.com建議。

# 架站指南
1. 須先安裝: nginx，nodejs，mongodb，mysql

2. 設定nginx的config檔

範例:
  
    upstream nodejs{
      server localhost:8001;
    }

    server {
      listen 80 default_server;
      listen [::]:80 default_server;

      #改成你下載的專案路徑
      root /home/ubuntu/AirPollution;

      index index.html index.htm;
      server_name localhost;

      #/static, /data 資料夾的資料由nginx處理
        location ~* /(static|data) {
        try_files $uri $uri/ =404;
      }

      #其他的pass給nodejs處理
      location / {
        proxy_pass http://nodejs/;
      }
    }

3. 將config-template.js改名為config.js，並填入資料

    **googleAuth** 是使用google oauth登入需要的資料 (記得進google developer console -> api管理員 -> 憑證 -> 選擇憑證，設重新導向url)

    **mysqlAuth** 是登入server mysql資料庫需要的資料

    **sessionConfig** 是session加密用，依自己喜好設

    **dataSrcFolder** 是你下載的各種資料存放的位置

    **dataDoneFolder** 是處理完後的資料要移到哪裡

    **gridPerUnit** 是設定將每單位經緯度切成幾格pm2.5網格

    **levelNum** 是設定pm2.5網格在地圖上可zoom out的層數

    **serverPort** 是設定nodejs要在哪個port listen

4. 在專案資料夾下執行npm install，下載使用到的nodejs函式庫

5. 確認nginx、mysql、mongodb有啟動，在專案路徑下執行node server.js開啟網站

# 資料連接API

1. 取得pm2.5網格資料

  http://purbao.lass-net.org/sensorGrid?date=2017/5/28&hour=0&level=0&minLat=23&maxLat=23.5&minLng=120&maxLng=121

    date改成你想取得資料的日期(日期前面不要補0)

    hour改成你想取得該日第幾個小時的資料，值為0~23

    level改成你想取得的網格大小，值為0~5，0網格最小最密，5網格最大最疏
    
    minLat, maxLat改成你想取得網格的緯度範圍
    
    minLng, maxLng改成你想取得網格的經度範圍

    資料為json格式:

    level: 目前資料的網格大小

    gridX: 網格經度

    gridY: 網格緯度

    time: 網格資料的更新時間

    pm25: 網格內測站的平均pm2.5(單位: μg/m3)


2. 取得發電廠資料

  http://purbao.lass-net.org/powerStation

    資料為json格式:
    
    _id: 發電廠ID

    capacity: 電廠最大發電量(單位: MW)

    name: 電廠名稱

    type: 發電類型(nuclear核能, coal燃煤, co-gen汽電共生, ipp-coal民營-燃煤, lng燃氣, ipp-lng民營-燃氣, oil重油, diesel輕油, hydro水力, wind風力, solar太陽能, pumping-gen抽蓄發電, pumping-load抽蓄負載)


3. 取得電廠發電量

  http://purbao.lass-net.org/powerGen?date=2017/5/28

    date改成你想取得資料的日期(日期前面不要補0)

    資料為json格式:

    time: 發電時間

    remark: 資料備註

    powerGen: 電廠發電量(單位: MW)

    stationID: 發電廠ID


4. 取得北中南東部用電量

  http://purbao.lass-net.org/powerLoad?date=2017/5/28

    date改成你想取得資料的日期(日期前面不要補0)

    資料為json格式:

    _id: 用電時間

    north: 北部用電量(單位: 萬瓩)

    central: 中部用電量(單位: 萬瓩)

    south: 南部用電量(單位: 萬瓩)

    east: 東部用電量(單位: 萬瓩)


5. 取得各發電類型的發電量

  http://purbao.lass-net.org/powerRatio?date=2017/5/28

    date改成你想取得資料的日期(日期前面不要補0)

    資料為json格式:

    _id: 發電時間

    pumpGen: 抽蓄發電(單位: 萬瓩)

    solar: 太陽能(單位: 萬瓩)

    wind: 風力(單位: 萬瓩)

    hydro: 水力(單位: 萬瓩)

    diesel: 輕油(單位: 萬瓩)

    oil: 重油(單位: 萬瓩)

    ippLng: 民營-燃氣(單位: 萬瓩)

    lng: 燃氣(單位: 萬瓩)

    ippCoal: 民營-燃煤(單位: 萬瓩)

    coGen: 汽電共生(單位: 萬瓩)

    coal: 燃煤(單位: 萬瓩)

    nuclear: 核能(單位: 萬瓩)


6. 取得氣象測站資料

  http://purbao.lass-net.org/weatherStation

    資料為json格式:
    
    _id: 測站ID

    town: 測站所在鄉鎮

    city: 測站所在城市

    lng: 測站所在經度

    lat: 測站所在緯度

    name: 測站名稱


7. 取得氣象資料

  http://purbao.lass-net.org/weatherData?date=2017/5/28

    date改成你想取得資料的日期(日期前面不要補0)

    資料為json格式:

    p: 壓力(單位: 百帕)

    h: 溼度，(單位: 百分率)

    t: 溫度，(單位: 攝氏)

    wSpeed: 風速(單位: 公尺/秒)

    wDir: 風向(單位: 度，0度北風，45度東北風)

    height: 測站海拔高度(單位: 公尺)

    siteID: 測站ID

    time: 資料記錄時間


8. 取得路段資料

  http://purbao.lass-net.org/roadSegment

    資料為json格式:

    _id: 路段ID

    path: 路段經緯度座標 (每個點以空白隔開，點的經度緯度以逗號隔開)


9. 取得路段壅塞程度

  http://purbao.lass-net.org/roadData?date=2017/5/28

    date改成你想取得資料的日期(日期前面不要補0)

    資料為json格式:

    time: 資料記錄時間

    level: 1:順暢( >79km/h ) 2:車多( 59~79km/h ) 3:車多( 39~59km/h ) 4:壅塞( <39km/h )

    roadID: 路段ID
