package edu.stanford.kafka.consumer;

import java.util.Collections;
import java.util.Properties;

import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.serialization.LongDeserializer;
import org.apache.kafka.common.serialization.StringDeserializer;

import edu.stanford.kafka.configuration.Configuration;

public class ConsumerCreator {

  public static Consumer<String, String> createConsumer() {
    // Kafka properties are used to effect the operation of Kafka. See the
    // documentation for a full list. The ones handled directly here are the
    // most critical. All other ones can be set as well, however. See below for details
    final Properties props = new Properties();
    props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, Configuration.getBootstrapServers());
    props.put(ConsumerConfig.GROUP_ID_CONFIG, Configuration.getGroupId());
    props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
    props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
    props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, Configuration.getMaxPollRecords());
    props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false");
    props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, Configuration.getOffsetReset());

    // This is where are generic Kafka property support is provided. The Configure
    // function has additional details on this.
    System.getenv().forEach((k, v) -> Configure(k, v, props));

    final Consumer<String, String> consumer = new KafkaConsumer<>(props);

    // We need to position using a rebalance listener, which will get a
    // notification when a partition is assigned (manually or automatically)
    // to this consumer.
    int position=0;
    if (Configuration.getPosition().compareTo("start") == 0) position = -1;
    if (Configuration.getPosition().compareTo("end") == 0) position = 1;

    consumer.subscribe(Collections.singletonList(Configuration.getTopicName()), new RebalanceListener(consumer, position));
    return consumer;
  }

  private static void Configure(String key, String value, Properties props) {
    // We'll set as a kafka property any environment variable starting with
    // "KAFKA". A couple exclusions exist based on our specific config. These
    // are harmless to pass through, but do create warnings in Kafka.
    if (!key.startsWith("KAFKA_") ||
        key.compareTo("KAFKA_TOPIC_NAME") == 0 ||
        key.compareTo("KAFKA_POSITION") == 0
        )
      return;

    // Environment variables are UPPER_SNAKE_CASE. We need lower.case.with.periods
    String propKey = key.toLowerCase().substring(6).replace('_','.');
    props.put(propKey, value);
  }
}
