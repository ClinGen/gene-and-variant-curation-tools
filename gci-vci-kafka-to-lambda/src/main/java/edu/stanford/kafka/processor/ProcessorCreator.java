package edu.stanford.kafka.processor;

public class ProcessorCreator {

  public static Processor<String,String> createProcessor() {
    // We only have one processor type at the moment, so this is easy. ;-)
    return new LambdaProcessor();
  }
}
