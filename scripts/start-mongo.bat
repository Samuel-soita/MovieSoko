@echo off
echo Starting MongoDB for Cine254...
docker start cine254-mongo 2>nul || docker run -d --name cine254-mongo -p 27017:27017 -e MONGO_INITDB_DATABASE=cine254 mongo:7
echo MongoDB running on mongodb://127.0.0.1:27017/cine254
echo Restart Cine254 with: npm start
