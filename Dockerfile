# Use an official Python runtime as a parent image
FROM python:3.9-slim-buster

# Set the working directory in the container
WORKDIR /app

# Install any needed packages specified in requirements.txt
# Assuming requirements.txt is in the root of your project
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the current directory contents into the container at /app
COPY . .

# Use shell form to allow environment variable expansion for PORT
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}