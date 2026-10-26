FROM node:22-trixie-slim AS build

# The Git hooks have no use inside the image.
ENV HUSKY=0

WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
    npm ci

COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src

# Empty in local builds, so only the image published by the pipeline sends analytics.
ARG VITE_APPINSIGHTS_CONNECTION_STRING=""
RUN npm run build

FROM nginx:1.30.4-alpine-slim AS runtime

RUN rm -rf /usr/share/nginx/html/*

COPY --chmod=0644 nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/

USER nginx

EXPOSE 8080

ENTRYPOINT ["nginx", "-g", "daemon off;"]
