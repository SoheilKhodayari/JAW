# Running the Crawler

## Without Docker

If you want to crawl a particular site:
```bash
$ python3 hpg_crawler/driver.py <site-id>
```

If you want to crawl a range of websites:
```bash
$ python3 hpg_crawler/driver.py <from-site-id> <to-site-id>
```

## With Docker

Specify which website you want to crawl in `docker-compose.yml` under the `command` field:
```bash
version: "3.3"
   
services:
  crawler:
    tty: true
    restart: always
    container_name: hpg_crawler
    build: 
      context: ./../ 
      dockerfile: ./hpg_crawler/crawling.Dockerfile
    command: python hpg_crawler/driver.py 1
    volumes:
      - ./../:/hpg_base

```

Then, you can spawn an instance of the crawler by:
```bash
$ ./run.docker.sh
```

