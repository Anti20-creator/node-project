from concurrent.futures import ThreadPoolExecutor
from random import randint
import requests
import time
import datetime
from time import sleep, perf_counter
from threading import Thread
import warnings


warnings.filterwarnings("ignore")

url = 'https://192.168.31.161:4000/api/appointments/book'
myobj = {'somekey': 'somevalue'}
def data(d):
    return {
        'restaurantId': '620f9a5886305c45045c7966',
        'tableId': '620f9a5986305c45045c7968',
        'date': str(datetime.datetime.now() + datetime.timedelta(days = d)),
        'email': 'specialguest@gmail.com',
        'peopleCount': 1
    }

def task(d):
    print('started', datetime.datetime.now())
    result = requests.post(url, json=data(d), verify=False)
    print(result)

for d in range(1, 60):
    start_time = perf_counter()

    threads = [None]*5
    for i in range(1, 5):
        Thread(target=task(d)).start()

    end_time = perf_counter()
    print(f'It took {end_time- start_time: 0.2f} second(s) to complete.')
    print()
    time.sleep(2)



