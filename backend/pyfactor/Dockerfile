FROM --platform=$BUILDPLATFORM python:3.11-slim

WORKDIR /app

COPY new_requirements.txt .
RUN pip install --no-cache-dir -r new_requirements.txt

COPY . .

CMD ["daphne", "pyfactor.asgi:application", "-b", "0.0.0.0", "-p", "8000"]