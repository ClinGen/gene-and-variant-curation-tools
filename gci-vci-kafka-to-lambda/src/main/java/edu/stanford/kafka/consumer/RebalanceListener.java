package edu.stanford.kafka.consumer;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.clients.consumer.ConsumerRebalanceListener;
import org.apache.kafka.common.TopicPartition;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class RebalanceListener implements ConsumerRebalanceListener {
  private Consumer<?,?> consumer;
  private Set<Integer> seenSets;
  private int seekPos = -1;
  private Logger logger;

  // This whole class exists simply to provide seeking support.
  // onPartitionsAssigned will be called when partitions are assigned to this
  // consumer. We'll make sure this is the first time we've seen this partition,
  // and if so, seek as desired.
  public RebalanceListener(Consumer<?,?> cons, int seekPosition) {
    if (cons == null) throw new IllegalArgumentException();
    consumer = cons;
    // seekPosition = -1 is beginning
    // seekPosition = 0 default
    // seekPosition = 1 end
    if (seekPosition != 0) seenSets = new HashSet<Integer>();
    seekPos = seekPosition;
    if (seekPos < -1 && seekPos > 1)
      throw new IllegalArgumentException();
    logger = LoggerFactory.getLogger(RebalanceListener.class);
    logger.info("Rebalance listener created. Position: " + seekPosition);
  }

  public void onPartitionsAssigned(Collection<TopicPartition> partitions) {
    if (seekPos == 0) return;
    partitions.forEach(p -> {
      Integer partid = p.partition();
      if (seenSets.contains(partid)) return;
      seenSets.add(partid);
      ArrayList<TopicPartition> parts = new ArrayList<TopicPartition>();
      parts.add(p);
      if (seekPos < 0){
        logger.info("New partition assigned: seeking to beginning");
        consumer.seekToBeginning(parts);
      }else{
        logger.info("New partition assigned: seeking to end");
        consumer.seekToEnd(parts);
      }
    });
  }

  public void onPartitionsLost(Collection<TopicPartition> partitions) {
  }

  public void onPartitionsRevoked(Collection<TopicPartition> partitions) {
  }
}
