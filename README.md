# Payment gateway simulator - Ntay

A very simple payment gateway simulator for developers to simulate a payment gateway behaviour.

The main purpose of this gateway simulator project is to strip out a lot of unnecessary or extra 
configuration and to make integrating the gateway in a "not so serious" web project easier.

However, the irony is that this project isn't hosted anywhere, so developers still have to set up 
Docker and PostgreSQL manually. It doesn't actually strip away extra configuration yet.

> [!NOTE]
> Install Docker if you have not already.

## Running the project

```bash
# .NET backend + Frontend + PostgreSQL
docker compose --profile dotnet up

# FastAPI backend + Frontend + PostgreSQL
docker compose --profile fastapi up
```
> [!TIP]
> The .NET backend is recommended to run because it supports the Server-Sent Events (SSE) better than 
FastAPI (Python).

#### Service

- Frontend: http://localhost:4444
- Backend: http://localhost:8888 (only one backend should be ran at a time)

## Tests

Only a few major features and hooks have been tested in the frontend.
As for the backend, the .NET backend has one test at the moment. I will add more tests in the future for 
.NET backend though, but I will not be doing that for the FastAPI, at least not by myself.

```bash
# Run frontend tests
npm run test

# Run .NET backend tests
dotnet test

```
## Yapping

#### Frontend

I decided to use as less external libraries as I can so that the Frontend ends up with less build size.
However, that is not the main reason; I also wanted to do few things manually, like building a manual
cache storage. The data is stored in the cache after it is fetched, and is stored as a `Promise`.

Creating a manual cache system ended up being more complex than I imagined, so I decided to keep it very
minimal that should work most of the time, but obviously has some flaw. The reason I did not spend more time
in it is because the manual cache was starting to become a mini project within the payment gateway simulation
project, which is not the goal. This does not mean that the caching will not be improved though, which means
it will be another thing that I will come back to in the future.

#### Why two backends?

This project was created because I wanted to learn something new, and at that time, I decided to learn
FastAPI. I eventually realised that I do not really like Python, so I decided to do the bare minimum, and 
move to something else. I was planning on learning C#/.NET for a long time, so I decided to give it a try, 
and I liked it. I still ended up doing the bare minimum though, because I was getting tired of this project 
at this point, and wanted to move on.

So, the project is obviously not perfect, and has a lot of room to improve, which I may improve some day.
