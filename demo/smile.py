import csv
import itertools
import os
import subprocess

# Change these as per your needs
file_path = "smiles.txt"
row_start = 1
row_end = 143
column_index = 16

with open(file_path) as f:
    reader = csv.reader(f,delimiter='\t')
    column_head = itertools.islice(reader,0,1)
    directory = None
    for row in column_head:
        directory = row[column_index]
        if not os.path.exists(row[column_index]):
            os.makedirs(row[column_index])

    rows = itertools.islice(reader, row_start, row_end)
    i = row_start
    for row in rows:
        image_name = '{}/{}_{}.png'.format(directory,directory,i)
        row_col_name = "-:{}".format(row[column_index])
        cmd = ['obabel',row_col_name,'-O',image_name]
        print(cmd)
        try:
            subprocess.call(cmd)
            print("{} created row number: {} Column: {}".format(image_name,i, directory))
            print("-"*80)
        except:
            print("*"*80)
            print("{} failed  row number: {} Column: {}".format(image_name,i, directory))
            print("*"*80)

        i +=1