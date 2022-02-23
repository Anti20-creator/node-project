from multiprocessing.pool import ThreadPool
import requests
import datetime
import warnings
import time

warnings.filterwarnings("ignore")
now = datetime.datetime.now()
url = 'https://192.168.31.161:4000/api/appointments/book'
def data(d):
    return {
        'restaurantId': '620f9a5886305c45045c7966',
        'tableId': '620f9a5986305c45045c7968',
        'date': str(now + datetime.timedelta(days = d)),
        'email': 'specialguest@gmail.com',
        'peopleCount': 1
    }

d=3
def get_url(i):
  return requests.post(url, json=data(d), verify=False)

with ThreadPool(10) as pool: #ten requests to run in paralel
  output_list = list(pool.map(get_url, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]))
  
print(output_list)
