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
#with open('CA023679.json', 'r') as myfile:
with open('/Users/lmadhavr/Downloads/PAH.json', 'r') as myfile:
    data=json.loads(myfile.read())

# parse file
#data= json.loads(data)
count=0
for vpt in data:
    count= count + 1 
    if ('caid' in vpt):
        vpt['caId']=vpt['caid']
        del vpt['caid']
    else:
        print ('No caid in %s \n ' %vpt)
    p.produce('ldh-test', value=json.dumps(vpt), callback=acked)
    p.poll(0)
print ('Total number pushed = %s' %count )
# flush() is typically called when the producer is done sending messages to wait
# for outstanding messages to be transmitted to the broker and delivery report
# callbacks to get called. For continous producing you should call p.poll(0)
# after each produce() call to trigger delivery report callbacks.
p.flush()
