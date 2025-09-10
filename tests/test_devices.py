from datetime import UTC, datetime, timedelta
import os
import sys
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

# Set test database
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

# Add src path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src")))

# Import app and DB setup
from database.database import get_db, get_engine
from badminton_queue import app
from database.models import Base, Devices

# Setup engine and session
engine = get_engine()
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Dependency override
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

# Reset the DB before all tests
def setup_module(module):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

# --------------------- FIXTURES ---------------------

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def register_device(client):
    client.post("/devices/register_device", json={
        "id": "test_device",
        "location": "Lab Room 1"
    })

# --------------------- TESTS ---------------------

def test_register_device(client):
    response = client.post("/devices/register_device", json={
        "id": "test_device",
        "location": "Lab Room 1"
    })
    assert response.status_code == 200
    assert "Device with id: 'test_device'" in response.json()["message"]

def test_register_duplicate_device(client):
    client.post("/devices/register_device", json={
        "id": "test_device",
        "location": "Lab Room 1"
    })
    response = client.post("/devices/register_device", json={
        "id": "test_device",
        "location": "Lab Room 1"
    })
    assert response.status_code == 400
    assert response.json()["detail"] == "Device ID already registered"

def test_register_data_valid(client, register_device):
    response = client.post("/devices/test_device/register_data", json={
        "temperature": 22.5,
        "humidity": 50.2,
        "CO2": 400,
        "occupancy": True
    })
    assert response.status_code == 200
    assert response.json()["message"] == "Data registered successfully."

def test_register_data_invalid_device(client):
    response = client.post("/devices/invalid_device/register_data", json={
        "temperature": 22.5,
        "humidity": 50.2,
        "CO2": 400,
        "occupancy": True
    })
    assert response.status_code == 400
    assert response.json()["detail"] == "Cannot find devices match with input ID"

def test_get_device_details(client, register_device):
    response = client.get("/device/test_device")
    assert response.status_code == 200
    assert response.json()["id"] == "test_device"

def test_get_device_data(client, register_device):
    client.post("/devices/test_device/register_data", json={
        "temperature": 22.5,
        "humidity": 50.2,
        "CO2": 400,
        "occupancy": True
    })
    response = client.get("/device/test_device/data?limit=1")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1

def test_get_device_data_invalid_limit(client):
    response = client.get("/device/test_device/data?limit=-1")
    assert response.status_code == 422

def test_filter_listing_by_location(client, register_device):
    response = client.get("/device/all_device", params={"location": "Lab Room 1"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == "test_device"

def test_filter_listing_by_time(client, register_device):
    time_param = (datetime.now(UTC) - timedelta(hours=1)).isoformat()
    response = client.get("/device/all_device", params={"startTime": time_param})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == "test_device"

def test_filter_listing_wrong_location(client):
    response = client.get("/device/all_device", params={"location": "Unknown Room"})
    assert response.status_code == 200
    assert response.json() == []

def test_set_config(client, register_device):
    form_data = {
        "interval_report": 300,
        "CO2_threshold": 800.0
    }
    response = client.post("/device/test_device/set_config", data=form_data)
    assert response.status_code == 200
    assert response.json() == {"message": "Configuration saved successfully."}

def test_get_config(client):
    response = client.get("/device/test_device/get_config")
    assert response.status_code == 200
    assert response.json() == {
        "id": 1,
        "reporting_interval": 300,
        "CO2_alert_threshold": 800
    }

def test_set_config_invalid_device(client):
    form_data = {
        "interval_report": 300,
        "CO2_threshold": 800.0
    }
    response = client.post("/device/invalid_device/set_config", data=form_data)
    assert response.status_code == 400
    assert response.json()["detail"] == "Device not found"

def test_update_config(client):
    form_data = {
        "interval_report": 600,
        "CO2_threshold": 900.0
    }
    response = client.post("/device/test_device/set_config", data=form_data)
    assert response.status_code == 200

    # Confirm update
    response = client.get("/device/test_device/get_config")
    data = response.json()
    assert data["reporting_interval"] == 600
    assert data["CO2_alert_threshold"] == 900
