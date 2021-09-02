import uuid
import json 

from confluent_kafka import Producer, Consumer,TopicPartition
c = Consumer({
    'bootstrap.servers': 'XXXX',
    'sasl.mechanism': 'PLAIN',
    'security.protocol': 'SASL_SSL',
    'sasl.username': 'XXXX',
    'sasl.password': 'XXXX',
    'group.id': 'StanfordStaging-6',  # this will create a new consumer group on each invocation.
    'auto.offset.reset': 'earliest'
})

c.subscribe(['ldh-test'])
#c.seek(TopicPartition("ldh-test", 0, 0))

try:
    count = 0
    while True:
        msg = c.poll(2)  # Wait for message or event/error
        #c.seek(0)
        if msg is None:
            # No message available within timeout.
            # Initial message consumption may take up to `session.timeout.ms` for
            #   the group to rebalance and start consuming.
            print ('No message')
            continue
        if msg.error():
            # Errors are typically temporary, print error and continue.
            print("Consumer error: {}".format(msg.error()))
            continue
       # if ('offset' in msg):
       #     offset=msg['offset']
        data=json.loads(msg.value())
        count = count + 1
        if count % 20000 == 0:
            print('count offset: %s %s' %(count, msg.offset()))
        

except KeyboardInterrupt:
    pass

finally:
    # Leave group and commit final offsets
    c.close()
