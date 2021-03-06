#/bin/bash -e

rm -rf build

cd api
yarn install
yarn build
cd ..

cd compiler
yarn install
yarn build
cd ..

cd client
yarn install
yarn build
cd ..

cd server
yarn install
yarn build
cd ..

mkdir build build/server
cp -r client/build build/server/public

mkdir build/api
cp -r api/dist build/api/dist
cp api/package.json build/api/package.json

mkdir build/compiler
cp -r compiler/dist build/compiler/dist
cp compiler/package.json build/compiler/package.json

cp -r server/prisma build/server
cp server/package.json build/server
cp -r server/dist build/server/src
