import uuid
import simplejson as json
import glob
import traceback
import requests
from requests_aws4auth import AWS4Auth
from decimal import Decimal
from confluent_kafka import Producer, Consumer

#auth=AWS4Auth(os.getenv('AWS_ACCESS_KEY_ID'), \
#    os.getenv('AWS_SECRET_ACCESS_KEY'),'us-west-2', \
#       'execute-api')

p = Producer({
    'bootstrap.servers': 'XXXX',
    'sasl.mechanism': 'PLAIN',
    'security.protocol': 'SASL_SSL',
    'sasl.username': 'XXXX',
    'sasl.password': 'XXXX',
    'message.timeout.ms': 300000,
    'socket.timeout.ms': 300000,
    'queue.buffering.max.ms':5000
})

def acked(err, msg):
    """Delivery report callback called (from flush()) on successful or failed delivery of the message."""
    if err is not None:
        print("failed to deliver message: {}".format(err.str()))
    else:
        print("produced to: {} [{}] @ {}".format(msg.topic(), msg.partition(), msg.offset()))

def execute_stream(vpt):
    p.produce('ldh-test', value=json.dumps(vpt), callback=acked)
    p.poll(0)

def execute_post(vpt):
    post_data['body']=vpt
    post_data = json.dumps(post_data)
    #print ('Post data %s' %post_data)
    url = 'http://0.0.0.0:3000/vpt/'
    x = requests.post(url, data = post_data)

def execute_stream():
    vpt_samples = glob.glob('../data/vpt/*', recursive=True)
    count = 0
    full_data=[]
    stream_data=[]
    for sample in vpt_samples:
        count=count+1
        post_data={}
        with open(sample, 'r') as vptFile:
            data=json.loads(vptFile.read(),parse_float=Decimal )
        full_data.append(data)
    for i in range (1000):
        for vpt in full_data:
            stream_data.append(vpt)
    count=0
    for vpt in stream_data:
        p.produce('ldh-test', value=json.dumps(vpt), callback=acked)
        p.poll(0)
        count= count + 1
    print ('Total number pushed = %s' %count )
    p.flush()
def main():
  execute_stream()
if __name__=='__main__':
    main()
    
 