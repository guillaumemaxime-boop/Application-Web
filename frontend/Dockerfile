# --- Build stage : Node 20 + Angular CLI ---
FROM node:20-alpine AS build
WORKDIR /workspace

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npx ng build --configuration production

# --- Runtime stage : Nginx ---
FROM nginx:1.27-alpine

# Templated config: nginx's docker-entrypoint runs envsubst on /etc/nginx/templates/*.template
# at startup. Defaults match docker-compose; Railway overrides via service env vars.
ENV PORT=80 \
    BACKEND_HOST=overflowing-stillness.railway.internal \
    BACKEND_PORT=8080 \
    UMAMI_WEBSITE_ID='' \
    UMAMI_SHARE_TOKEN='' \
    NGINX_ENVSUBST_FILTER='^(PORT|BACKEND_HOST|BACKEND_PORT|UMAMI_WEBSITE_ID|UMAMI_SHARE_TOKEN)$'

COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /workspace/dist/portfolio-frontend/browser /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=20s --timeout=3s --retries=3 \
  CMD wget -q -O- "http://127.0.0.1:${PORT}/" >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
