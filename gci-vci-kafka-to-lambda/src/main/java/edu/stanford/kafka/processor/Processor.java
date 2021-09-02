package edu.stanford.kafka.processor;

import org.apache.kafka.clients.consumer.ConsumerRecords;

// This is an interface that can be used for all processors. Of course we
// only have one at this time, but another could be added and some configuration
// be built in to choose the approrpriate processor at runtime.
public interface Processor<K,V> {
  void process(ConsumerRecords<K,V> records);
}
