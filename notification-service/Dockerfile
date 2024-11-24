FROM node:20
WORKDIR /usr/notification-service
COPY package*.json ./
RUN npm ci\
    && npm install typescript -g
COPY . .
RUN tsc src/index.ts --outDir dist
CMD ["node", "./dist/index.js"]