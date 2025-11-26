FROM openjdk:17-jdk-slim-bullseye
WORKDIR /app

COPY build/libs/backend-0.0.1-SNAPSHOT.war /app/app.war

ENV TZ=Asia/Seoul
CMD ["java","-jar","-Duser.timezone=Asia/Seoul","/app/app.war"]