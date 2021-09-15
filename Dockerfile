FROM node:14-alpine

ENV NODE_ENV=development

WORKDIR /app
COPY client ./client
COPY server ./server
COPY compiler ./compiler
COPY api ./api
COPY build.sh ./build.sh
RUN chmod +x build.sh
RUN ./build.sh

ENV NODE_ENV=production

WORKDIR /app/build/shared
RUN yarn install --frozen-lockfile
WORKDIR /app/build/server
RUN yarn install --frozen-lockfile

CMD ["node", "src/index.js"] 