import uuid
import json

#from requests.models import cookiejar_from_dict 
#import car_client as ca

from confluent_kafka import Producer, Consumer,TopicPartition
def execute():
    cspec_file=File = open("cspec.json", "w")
    c = Consumer({
        'bootstrap.servers': 'XXX',
        'sasl.mechanism': 'PLAIN',
        'security.protocol': 'SASL_SSL',
        'sasl.username': 'XXX',
        'sasl.password': 'XXX',
        'group.id': '',  # this will create a new consumer group on each invocation.
        'auto.offset.reset': 'earliest'
    })
    #'group.id': '',  # this will create a new consumer group on each invocation.

    #c.subscribe([''])
    #c.subscribe([''])
    c.subscribe([''])
    #c.subscribe([''])
    #c.subscribe([''])
    #c.subscribe([']'])
    #c.seek(TopicPartition("", 0, 0))

    try:
        count = 0
        all_cspecs=[]
        cspecs={}
        while True:
            msg = c.poll(0)  # Wait for message or event/error
            #c.seek(0)
            if msg is None:
                # No message available within timeout.
                # Initial message consumption may take up to `session.timeout.ms` for
                #   the group to rebalance and start consuming.
                #print ('No message')
                continue
            if msg.error():
                # Errors are typically temporary, print error and continue.
                #print("Consumer error: {}".format(msg.error()))
                continue
        # if ('offset' in msg):
        #     offset=msg['offset']
            #msgkey=str(msg.key(),'utf-8')
            #print("msg key: {}".format(msg.key()))
            if count % 1 == 0:
            #if msgkey.startswith("variation_archive") or msgkey.startswith("clinical_assertion"):
                data=json.loads(msg.value())
                #group_id=data['hgnc'][0] + '_' + str(msg.partition()) + '_' + str(count % 4)
                #data=json.loads(msg.value())
                #car_id=data['caId']
                all_cspecs.append(data)
                print('\n count offset: %s  %s \n %s \n' %(count, msg.offset(), json.dumps(data)))
                #print('count offset: %s %s %s ' %(count, msg.offset(), car_id))
                #res=ca.find(car_id)
                #print (res)
            count = count + 1
    except KeyboardInterrupt:
        cspecs["cspecs"]=all_cspecs
        cspec_file.write(json.dumps(cspecs))
        pass
    finally:
        # Leave group and commit final offsets
        cspec_file.close()
        c.close()
def main(): 
    execute()
if __name__=='__main__':
    main()
