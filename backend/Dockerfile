FROM eclipse-temurin:17-jre-bullseye
WORKDIR /app

COPY build/libs/backend-0.0.1-SNAPSHOT.war /app/app.war

ENV TZ=Asia/Seoul
CMD ["java","-jar","-Duser.timezone=Asia/Seoul","/app/app.war"]