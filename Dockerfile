FROM node
COPY . /app
WORKDIR /app
RUN apt update && apt install -y vim
RUN npm install
ENTRYPOINT ["node", "index.js"]