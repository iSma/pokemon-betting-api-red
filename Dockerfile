FROM node

WORKDIR /app

RUN npm install

EXPOSE 3000

CMD npm install && npm start
