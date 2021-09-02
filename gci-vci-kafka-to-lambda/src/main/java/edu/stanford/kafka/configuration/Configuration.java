package edu.stanford.kafka.configuration;

// Provides an interface to the environment variables used and sets up
// defaults
public class Configuration {
  public static String getBootstrapServers() {
    String rc = System.getenv("KAFKA_BOOTSTRAP_SERVERS");
    return rc != null ? rc : "localhost:9092";
  }

  public static Integer getMessageCount() {
    return getIntegerEnv("KAFKA_MESSAGE_COUNT", 1000);
  }

  public static String getClientId() {
    String rc = System.getenv("KAFKA_CLIENT_ID");
    return rc != null ? rc : "client1";
  }

  public static String getTopicName() {
    String rc = System.getenv("KAFKA_TOPIC_NAME");
    return rc != null ? rc : "demo";
  }

  public static String getGroupId() {
    String rc = System.getenv("KAFKA_GROUP_ID");
    return rc != null ? rc : "consumerGroup10";
  }

  public static String getOffsetReset() {
    String rc = System.getenv("KAFKA_OFFSET_RESET");
    return rc != null ? rc : "earliest";
  }

  public static String getPosition() {
    String rc = System.getenv("KAFKA_POSITION");
    return rc != null ? rc : "";
  }

  public static Integer getMaxPollRecords() {
    return getIntegerEnv("KAFKA_MAX_POLL_RECORDS", 500); // matches Kafka consumer shell
  }

  private static Integer getIntegerEnv(String key, Integer defaultValue) {
    String rc = System.getenv(key);
    return rc != null ? Integer.parseInt(rc) : defaultValue;
  }
}
