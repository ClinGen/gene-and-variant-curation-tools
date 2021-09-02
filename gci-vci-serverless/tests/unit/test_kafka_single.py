import uuid
import json 

from confluent_kafka import Producer, Consumer


p = Producer({
    'bootstrap.servers': 'XXXX',
    'sasl.mechanism': 'PLAIN',
    'security.protocol': 'SASL_SSL',
    'sasl.username': 'XXXX',
    'sasl.password': 'XXXX'
})


def acked(err, msg):
    """Delivery report callback called (from flush()) on successful or failed delivery of the message."""
    if err is not None:
        print("failed to deliver message: {}".format(err.str()))
    else:
        print("produced to: {} [{}] @ {}".format(msg.topic(), msg.partition(), msg.offset()))


  
# Opening JSON file 
with open('CA023679.json', 'r') as myfile:
#with open('PAH.json', 'r') as myfile:
    data=json.loads(myfile.read())

# parse file
#data= json.loads(data)
#count=0
#for vpt in data:
#    count = count + 1
    #print (vpt['caid'])
p.produce('ldh-test', value=json.dumps(data), callback=acked)
p.poll(0)
#print ('Total number pushed = %s' %count )
# flush() is typically called when the producer is done sending messages to wait
# for outstanding messages to be transmitted to the broker and delivery report
# callbacks to get called. For continous producing you should call p.poll(0)
# after each produce() call to trigger delivery report callbacks.
p.flush(10)
'''
c = Consumer({
    'bootstrap.servers': '<ccloud bootstrap servers>',
    'sasl.mechanism': 'PLAIN',
    'security.protocol': 'SASL_SSL',
    'sasl.username': '<ccloud key>',
    'sasl.password': '<ccloud secret>',
    'group.id': str(uuid.uuid1()),  # this will create a new consumer group on each invocation.
    'auto.offset.reset': 'earliest'
})

c.subscribe(['python-test-topic'])

try:
    while True:
        msg = c.poll(0.1)  # Wait for message or event/error
        if msg is None:
            # No message available within timeout.
            # Initial message consumption may take up to `session.timeout.ms` for
            #   the group to rebalance and start consuming.
            continue
        if msg.error():
            # Errors are typically temporary, print error and continue.
            print("Consumer error: {}".format(msg.error()))
            continue

        print('consumed: {}'.format(msg.value()))

except KeyboardInterrupt:
    pass

finally:
    # Leave group and commit final offsets
    c.close()
'''