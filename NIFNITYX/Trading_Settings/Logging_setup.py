#!/usr/bin/env python3
import asyncio
import configparser
import csv
import functools
import logging
import os
import sys
import pytz
import time
from datetime import datetime, time as dtime, timedelta
import urllib.parse
import pandas as pd
import requests
import numpy as np
from stocktrends import indicators
from collections import deque

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("upstox_renko_4_10_vrunali.log", encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger()