FROM node:22-slim AS base
WORKDIR /app
COPY package*.json ./
COPY .npmrc ./
RUN npm install --legacy-peer-deps

FROM base AS dev
COPY . /app/
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]

FROM base AS production
ARG VITE_API_BASE_URL="https://api.rabapay.xyz/api"
ARG VITE_FRONTEND_URL="https://rabapay.xyz"
ARG VITE_VPS_IP=""

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_FRONTEND_URL=$VITE_FRONTEND_URL
ENV VITE_VPS_IP=$VITE_VPS_IP

COPY . /app/
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3000"]
