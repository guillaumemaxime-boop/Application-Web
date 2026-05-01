# --- Build stage : Node 20 + Angular CLI ---
FROM node:20-alpine AS build
WORKDIR /workspace

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npx ng build --configuration production

# --- Runtime stage : Nginx ---
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/dist/portfolio-frontend/browser /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=20s --timeout=3s --retries=3 \
  CMD wget -q -O- http://localhost/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
