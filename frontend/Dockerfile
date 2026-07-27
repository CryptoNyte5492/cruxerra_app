FROM node:20

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend /app

EXPOSE 5173

# Vite dev server listen on 0.0.0.0 so host can reach it
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]