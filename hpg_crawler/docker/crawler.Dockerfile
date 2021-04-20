FROM python:3
ENV PYTHONUNBUFFERED=1
WORKDIR /hpg_base
COPY ./ /hpg_base/
RUN pip install -r requirements.txt
