# tutorial: https://nander.cc/using-selenium-within-a-docker-container

FROM python:3.8
ENV PYTHONUNBUFFERED=1


# install google chrome
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
RUN sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
RUN apt-get -y update
RUN apt-get install -y google-chrome-stable

# install chromedriver
RUN apt-get install -yqq unzip
RUN wget -O /tmp/chromedriver.zip http://chromedriver.storage.googleapis.com/`curl -sS chromedriver.storage.googleapis.com/LATEST_RELEASE`/chromedriver_linux64.zip
RUN unzip /tmp/chromedriver.zip chromedriver -d /usr/local/bin/


RUN apt-get install -y xvfb

# Set display port as an environment variable
ENV DISPLAY=:99

RUN pip install --upgrade pip

WORKDIR /hpg_base
COPY ./ /hpg_base/
RUN pip install -r requirements.txt


