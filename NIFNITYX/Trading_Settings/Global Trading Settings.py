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

TRADE_FUNDS_PERCENT = 0.90
MAX_TRADES = 1000
LOT_SIZE = 75
LOSS_LIMIT = -8.0
PROFIT_LIMIT = 25.0
DUMMY_CAPITAL = 100000.0
ADX_THRESHOLD = 28
DI_DIFF_THRESHOLD = 5
COOLING_PERIOD_SECONDS = 60
COOLING_PERIOD_SECONDS_LOSS = 120
SLOPE_THRESHOLD = 0.15
BRICK_SIZE = 4.00
EXIT_PRICE_THRESHOLD = 10.00
ADX_EXIT_THRESHOLD = 28
MIN_CANDLE_COUNT = 50  # Minimum candles required for reliable EMA50

# Trailing Stop Settings
TRAILING_ACTIVATE_THRESHOLD_1 = 5.0
TRAILING_BUFFER_1 = 2.00 / 100
TRAILING_ACTIVATE_THRESHOLD_2 = 8.0
TRAILING_BUFFER_2 = 2.50 / 100
TRAILING_ACTIVATE_THRESHOLD_3 = 12.0
TRAILING_BUFFER_3 = 3.00 / 100

# Sideways Market Filter Settings
ADX_SIDEWAYS_THRESHOLD = 25
DI_DIFF_THRESHOLD = 5

# Global variables
cumulative_pct = 0.0
cumulative_pnl = 0.0
initial_capital = None
last_trend = None
simulated_capital = DUMMY_CAPITAL
last_trade_exit_time = None
last_loss_time = None
