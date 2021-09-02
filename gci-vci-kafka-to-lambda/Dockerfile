# This is what's called a "multi-stage build". The first FROM is a container
# used to build the jar from source. The second container image will copy
# the jar into it for execution. This keeps the build self-contained (no
# need to install Java on developer's machines), and keeps the final image
# small as you don't need compilers, etc.

# The specific image we'll use in both cases is Amazon Corretto, which
# is a Docker image that uses Amazon Linux 2 as the base and Amazon Corretto
# pre-installed. Amazon Corretto is a version of OpenJDK (one of two popular
# JDKs in use), but with some changes to optimize for the AWS environment.
# Most importantly, Corretto has a longer support cycle than the underlying
# OpenJDK. We'll choose Amazon Corretto 11, which corresponds to Java 11 or
FROM amazoncorretto:11 as build

RUN yum install -y maven

WORKDIR /build

COPY pom.xml /build/

# dependency:resolve doesn't seem to pull everything. Let's just build
# and force maven to grab everything
RUN mvn package

COPY src/ /build/src/

RUN mvn package

# This is the beginning of our runtime container. Note we copy the jar file
# built above into this container to run.
FROM amazoncorretto:11

WORKDIR /kafka
COPY --from=build /build/target/consumer-1.0.0-SNAPSHOT.jar /kafka/
ENTRYPOINT ["java", "-jar", "/kafka/consumer-1.0.0-SNAPSHOT.jar"]
