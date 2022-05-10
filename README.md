# Telepítés

Az `npm i` parancs kiadása minden szükséges csomagot telepít az csomagkezelő segítségével.
Ehhez szükséges, hogy legyen telepített Node.JS és npm az eszközön.
A fejlesztés során a node 16.13.1-es, míg az npm 8.1.2-es verziója volt használva.

# Szükséges beállítások a futtatás előtt

Mivel a Socket.IO szerver megfelelő működéséhez szükséges egy Redis szerver is, ezért annak telepítése is szükséges.\
[Redis szerver telepítése](https://redis.io/docs/getting-started/installation/)

.env paramétereinek beállítása: \
PORT=ezen a porton fog futni a backend \
NODEMAILER_USER=e-mail fiók felhasználóneve \
NODEMAILER_PWD=e-mail fiók jelszava \
ACCESS_TOKEN_SECRET=tetszőleges legalább 1 hosszú karaktersorozat \
REFRESH_TOKEN_SECRET=tetszőleges legalább 1 hosszú karaktersorozat \
MONGODB_URI=mongodb kapcsolódási URL-je \
APPOINTMENT_PIN_LENGTH=időpontok PIN kódjának hossza (alapértelmezetten 6-ra van állítva a frontenden való ellenőrzése, így eltérés esetén ott is frissíteni kell) \
NODEMAILER_SENDER=e-mail küldőjének neve \
PRODUCTION=0 esetén garantáltan "123456" lesz minden étterem PIN kódja \
TESTING=1 esetén nem fogja előállítani a .pdf fileokat a számlák generálásánál \
REDIS_HOST=a cím, melyen fut a redis szerver \
REDIS_PORT=a port, melyen fut a redis szerver \
FRONTEND_URL=a frontend címe, melyen fut, ez kerül majd kiküldésre a felhasználóknak az e-mailekben az URL-ek prefixeként

# Futtatás

Az `npm run normal` parancs kiadás hatására elindul a backend a Redis szerver nélkül.
Az `npm start` parancs kiadás hatására elindul a backend a Redis szerverrel együtt.
Frontenddel való használat esetén ajánlott .env paraméter beállítások:
PRODUCTION=0 \
TESTING=0

# Tesztelés

Az `npm run test` parancs hatására lefutnak a tesztek, melyek előtte teljesen törlik a MongoDB adatbázis objektumait.
.env fájl megkötései a backenden a tesztek megfelelő futásához: \
- TESTING=1 \
- PRODUCTION=0 \

# Adatbázis feltöltése adatokkal

Az `npm run populate {COUNT}` parancs segítségével mintaadatokkal tölthető fel az adatbázis. A paraméter helyére tetszőleges egész szám kerülhet, annak üresen hagyása esetén egyetlen étterem regisztrálása szimulálódik. A felhasználói fiókok admin{x}@gmail.com alakú e-mail címmel és `123456` jelszóval jönnek létre.

# SSL kulcsok újragenerálása

Szükséges parancsok kiadása egymás után:
- openssl genrsa -out key.pem
- openssl req -new -key key.pem -out csr.pem
- openssl x509 -req -days 365 -in csr.pem -signkey key.pem -out cert.pem

A `server.js` állományban a `privateKey` változó így majd a `key.pem`-et fogja olvasni a megfelelő helyről, míg a `certificate` nevű változó a `cert.pem`-et fogja olvasni.