# Name

## Description

## Env variables

| Variable | Description | Required |
|----------|-------------|----------|
| NAME     | DESCRIPTION | Yes      |

docker run --network host -v "./test:/input" -e "DB=postgres://postgres:mysecretpassword@localhost:5432/postgres" hudint/pg-executor
