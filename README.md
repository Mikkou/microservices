- to start project:

docker compose up -d
- to get logs from user and notification services

docker logs -f user-service

docker logs -f notification-service

- to rebuild all containers

docker compose up -d --no-deps --build

- quick start to check communication between microservices using rabbit

1. docker compose up -d
2. open logs of user and notification services
3. make request on POST and DELETE api


API:

1. create user, POST http://localhost:3000/users

```
{
    "name": "apple223",
    "email": "ssss@gmail.com"
}
```

2. get users, GET http://localhost:3000/users?limit=2&offset=0
3. update user, PUT http://localhost:3000/users

```
{
    "id": "6740d9ee7a7bb4bf3232027b", // this userId you can take from mongo service
    "name": "art",
    "email": "apple@gmail.com"
}
```

4. delete user, DELETE http://localhost:3000/users?id=6740d9ee7a7bb4bf3232027b


