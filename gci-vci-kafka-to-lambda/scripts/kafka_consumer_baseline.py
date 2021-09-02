import uuid
import json
import argparse
import sys
import os
import time
import getpass
import signal
from uuid import uuid4
from datetime import datetime, timedelta

from confluent_kafka import Producer, Consumer,TopicPartition

bootstrap = sys.argv[1]
topic = sys.argv[2]
group = sys.argv[3]
username = sys.argv[4]
max_messages = sys.argv[5]


def main():

    if len(sys.argv) < 6:
        print("Not enough arguments")
        exit

    count = 0

    pw = getpass.getpass()

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

    c.subscribe([topic])
    try:
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
            if count % 20000 == 0 :
                now = datetime.now()
                now_str = now.strftime("%d/%m/%Y %H:%M:%S")
                data=json.loads(msg.value())
                car_id=data['caId']
                print('count, offset, car_id, date - num: %s %s %s %s' %(count, msg.offset(), car_id, now_str))
            if count >= int(max_messages):
                now = datetime.now()
                now_str = now.strftime("%d/%m/%Y %H:%M:%S")
                data=json.loads(msg.value())
                car_id=data['caId']
                print('count, offset, car_id, date - num: %s %s %s %s' %(count, msg.offset(), car_id, now_str))
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
        c.close()

if __name__ == '__main__':
    main()