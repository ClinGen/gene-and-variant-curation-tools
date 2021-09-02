package edu.stanford.kafka;

import java.time.Duration;
import java.util.concurrent.ExecutionException;
import java.util.ArrayList;

import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.producer.Producer;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.clients.producer.RecordMetadata;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import edu.stanford.kafka.configuration.Configuration;
import edu.stanford.kafka.consumer.ConsumerCreator;
import edu.stanford.kafka.processor.Processor;
import edu.stanford.kafka.processor.ProcessorCreator;

public class App {
  // This is the main entry point of the application. This method will
  // create all our dependencies, then run the consumer.
  public static void main(String[] args) {
    // Create all objects IoC style
    Logger logger = LoggerFactory.getLogger(App.class);
    Consumer<String, String> consumer = ConsumerCreator.createConsumer();
    Processor<String,String> processor = ProcessorCreator.<String,String>createProcessor();

    // Run our main thread
    runConsumer(logger, consumer, processor);
  }

  static <K,V> void runConsumer(Logger logger, Consumer<K,V> consumer, Processor<K,V> processor) {
    // Good docs here: https://kafka.apache.org/24/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html
    try {
      while (true) {
        // The poll function in Kafka consumer library is a long poll on the
        // topic. This line will block until there are records to process
        final ConsumerRecords<K, V> records = consumer.poll(Duration.ofMillis(Long.MAX_VALUE));

        // Delegate the actual processing to our processor (which has been setup elsewhere
        // as a LambdaProcessor)
        processor.process(records);

        // Commit asynchronously. Note that it's possible that the commit fails, but we
        // don't handle that here. We assume the target lambda function is setup
        // idempotently per best practices, so a duplicate message would not have
        // negative side effects
        consumer.commitAsync();
      }
    } finally {
      // We will hit this on a SIGTERM/SIGHUP or the like
      consumer.close();
    }
  }
}
