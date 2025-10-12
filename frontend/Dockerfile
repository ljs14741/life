FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NEXT_PUBLIC_API_BASE=""
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev
EXPOSE 3000
CMD ["npm","start"]
