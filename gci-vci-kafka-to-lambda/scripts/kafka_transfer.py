import uuid
import json
import argparse
import sys
import os
import time
import getpass
from uuid import uuid4
from datetime import datetime, timedelta

from confluent_kafka import Producer, Consumer,TopicPartition

bootstrap = sys.argv[1]
original_topic = sys.argv[2]
new_topic = sys.argv[3]
group = sys.argv[4]
username = sys.argv[5]
max_messages = sys.argv[6]

def delivery_report(err, msg):
    if err is not None:
        print("Delivery failed for User record {}: {}".format(msg.key(), err))
        return
    #print('User record {} successfully produced to {} [{}] at offset {}'.format(
    #    msg.key(), msg.topic(), msg.partition(), msg.offset()))

def main():

    pw = getpass.getpass()

    p = Producer({
        'bootstrap.servers': bootstrap,
        'sasl.mechanism': 'PLAIN',
        'security.protocol': 'SASL_SSL',
        'sasl.username': username,
        'sasl.password': pw
        #'group.id': 'StanfordStaging' # this will create a new consumer group on each invocation.
    })

    p.flush()

    c = Consumer({
        'bootstrap.servers': bootstrap,
        'session.timeout.ms': 6000,
        'enable.auto.commit': 'false',
        'auto.offset.reset': 'earliest',
        'sasl.mechanism': 'PLAIN',
        'security.protocol': 'SASL_SSL',
        'sasl.username': username,
        'sasl.password': pw,
        'group.id': group
    })

    c.subscribe([original_topic])
    try:
        count = 0
        start = time.time()
        while True:
            msg = c.poll()
            if msg is None:
                print("No message")
                c.close()
                end = time.time()
                print("Events consumed: %i" % count)
                print("Time: %i" % (end - start))
                break
            if msg.error():
                raise Exception(msg.error())
            else:
                p.produce(topic=new_topic, value=msg.value(), on_delivery=delivery_report)
            if count % 20000 == 0 :
                now = datetime.now()
                now_str = now.strftime("%d/%m/%Y %H:%M:%S")
                data=json.loads(msg.value())
                car_id=data['caId']
                print('count, offset, car_id, date - num: %s %s %s %s' %(count, msg.offset(), car_id, now_str))
                if count > 0:
                    print("Flushing producer queue...")
                    p.flush()
            if count >= int(max_messages):
                c.close()
                print("Flushing producer queue...")
                p.flush()
                end = time.time()
                print("Events consumed: %i, Elapsed Time: %i" % (count, (end - start)))
                break
            count = count + 1
    except KeyboardInterrupt:
        end = time.time()
        elapsed_time = end - start
        converted_time = timedelta(seconds=elapsed_time)
        print("\nEvents consumed: %i" % count)
        print("Elapsed Time: %s" % str(converted_time))
        print('%% Aborted by user\n')
    finally:
        # Close down consumer to commit final offsets.
        p.flush()
        c.close()


if __name__ == '__main__':
    main()