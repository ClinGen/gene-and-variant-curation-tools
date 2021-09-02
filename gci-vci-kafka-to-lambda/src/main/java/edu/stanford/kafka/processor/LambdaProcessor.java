package edu.stanford.kafka.processor;

import java.util.ArrayList;
import java.util.List;
import java.util.AbstractMap;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;

import org.apache.kafka.clients.consumer.ConsumerRecords;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.services.lambda.LambdaAsyncClient;
import software.amazon.awssdk.services.lambda.model.InvokeRequest;
import software.amazon.awssdk.services.lambda.model.ServiceException;

public class LambdaProcessor implements Processor<String,String> {
  Logger logger;

  // Constructor
  public LambdaProcessor() {
    logger = LoggerFactory.getLogger(LambdaProcessor.class);
  }

  // Primary method. This is called when records are available on the topic
  public void process(ConsumerRecords<String,String> records){
    List<Payload> payloadRecords = new ArrayList<Payload>(records.count());

    // We will convert raw kafka records to a payload we define (in an
    // anonymous class), then pass it on to jackson for serialization
    // Note that the Payload can have multiple events and has Kafka metadata
    records.forEach(r -> payloadRecords.add(new Payload(){
      public List<AbstractMap.SimpleEntry<String, byte[]>> getHeaders() {
        ArrayList<AbstractMap.SimpleEntry<String, byte[]>> headers =
          new ArrayList<AbstractMap.SimpleEntry<String, byte[]>>();

        r.headers().forEach(h -> headers.add(new AbstractMap.SimpleEntry<String, byte[]>(
                h.key(), h.value())));
        return headers;
      }
      public String getkey() { return r.key(); }
      public long getOffset() { return r.offset(); }
      public int getPartition() { return r.partition(); }
      public long getTimestamp() { return r.timestamp(); }
      public String timestampType() { return r.timestampType().toString(); }
      public String getTopic() { return r.topic(); }
      public String getValue() { return r.value(); }
    }));
    sendToLambda(payloadRecords);
  }

  // We'll send the payload over to the lambda function here. We send asynchronously
  // and log errors but otherwise rely on the built-in facilities for retry, etc.
  private void sendToLambda(List<Payload> records) {
    ObjectMapper mapper = new ObjectMapper();
    String jsonPayload = null;
    String functionName = System.getenv("LAMBDA_FUNCTION_NAME");
    try {
      jsonPayload = mapper.writeValueAsString(records);
      logger.info(jsonPayload);
      logger.info("got " + records.size() + " record(s) from consumer. Sending to " + functionName);
    } catch(JsonProcessingException e) {
      logger.error("Caught json processing exception", e);
      return;
    }

    try {
      LambdaAsyncClient awsLambda = LambdaAsyncClient.builder().build();

      //Need a SdkBytes instance for the payload
      SdkBytes payload = SdkBytes.fromUtf8String(jsonPayload);

      //Setup an InvokeRequest
      InvokeRequest request = InvokeRequest.builder()
              .functionName(functionName)
              .payload(payload)
              .build();

      //Invoke the Lambda function
      awsLambda.invoke(request).whenComplete((res, ex) -> {
        if (ex != null)
          logger.error("Exception running Lambda", ex);
        else
          logger.info("Lambda complete: " + res.payload().asUtf8String());
      });

      //Get the response
      // String value = res.payload().asUtf8String() ;

    } catch(ServiceException e) {
        e.getStackTrace();
    }
  }

  // This interface was designed to match the data available in the ConsumerRecord
  // class of the Kafka consumer library
  // https://kafka.apache.org/24/javadoc/org/apache/kafka/clients/consumer/ConsumerRecord.html
  private interface Payload {
    List<AbstractMap.SimpleEntry<String, byte[]>> getHeaders();
    String getkey();
    long getOffset();
    int getPartition();
    long getTimestamp();
    String timestampType();
    String getTopic();
    String getValue();
  }
}
