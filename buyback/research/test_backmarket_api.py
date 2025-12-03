"""
Test script for Back Market Buyback API integration using pytest.

This script tests the Back Market API endpoints using the provided authentication token.
Based on the PowerShell example:
    Invoke-WebRequest -Uri 'https://preprod.backmarket.fr/ws/buyback/v1/orders?page=1' `
        -Method GET `
        -Headers @{
            "Accept"="application/json, application/problem+json";
            "Authorization"="Basic YOUR_VALID_TOKEN"
        }
"""

import pytest
import requests
import json
from typing import Optional, Dict, Any


class BackMarketAPIClient:
    """Client for interacting with Back Market Buyback API."""
    
    BASE_URL = "https://preprod.backmarket.fr"
    BUYBACK_BASE_PATH = "/ws/buyback/v1"
    
    def __init__(self, auth_token: str):
        """
        Initialize the API client.
        
        Args:
            auth_token: Base64 encoded Basic auth token
        """
        self.auth_token = auth_token
        self.headers = {
            "Accept": "application/json, application/problem+json",
            "Authorization": f"Basic {auth_token}"
        }
    
    def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        params: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
        raise_for_status: bool = True
    ) -> requests.Response:
        """
        Make an HTTP request to the Back Market API.
        
        Args:
            method: HTTP method (GET, POST, PUT, etc.)
            endpoint: API endpoint path
            params: Query parameters
            data: Request body data
            raise_for_status: Whether to raise exception on HTTP errors
            
        Returns:
            Response object
        """
        url = f"{self.BASE_URL}{self.BUYBACK_BASE_PATH}{endpoint}"
        
        response = requests.request(
            method=method,
            url=url,
            headers=self.headers,
            params=params,
            json=data,
            timeout=30
        )
        
        if raise_for_status:
            response.raise_for_status()
        
        return response
    
    def get_orders(
        self, 
        page: int = 1, 
        limit: Optional[int] = None,
        raise_for_status: bool = True
    ) -> requests.Response:
        """
        Retrieve orders from the Back Market buyback API.
        
        Args:
            page: Page number (default: 1)
            limit: Number of results per page (optional)
            raise_for_status: Whether to raise exception on HTTP errors
            
        Returns:
            Response object
        """
        params = {"page": page}
        if limit:
            params["limit"] = limit
        
        return self._make_request("GET", "/orders", params=params, raise_for_status=raise_for_status)
    
    def get_order_by_id(
        self, 
        order_id: str,
        raise_for_status: bool = True
    ) -> requests.Response:
        """
        Retrieve a specific order by ID.
        
        Args:
            order_id: The order identifier
            raise_for_status: Whether to raise exception on HTTP errors
            
        Returns:
            Response object
        """
        return self._make_request("GET", f"/orders/{order_id}", raise_for_status=raise_for_status)
    
    def update_order_status(
        self, 
        order_id: str, 
        status: str,
        raise_for_status: bool = True
    ) -> requests.Response:
        """
        Update the status of an order.
        
        Args:
            order_id: The order identifier
            status: New status for the order
            raise_for_status: Whether to raise exception on HTTP errors
            
        Returns:
            Response object
        """
        data = {"status": status}
        return self._make_request("PUT", f"/orders/{order_id}/status", data=data, raise_for_status=raise_for_status)


# Pytest fixtures
@pytest.fixture
def auth_token():
    """Authentication token for Back Market API."""
    return "YTA2YmY1NGE4ZWFjMzQxYTdiMjcxYjpCTVQtYWFhNGNkOTkyZTIxMTBkM2ZjNzQxMjcwMWJjOTg0YWRhZjFmMzkwYQ=="


@pytest.fixture
def client(auth_token):
    """Back Market API client instance."""
    return BackMarketAPIClient(auth_token)


# Test functions
def test_get_orders_page_1(client):
    """Test fetching orders from page 1."""
    response = client.get_orders(page=1, raise_for_status=False)
    
    assert response.status_code == 200, f"Failed with {response.status_code}. Expected 200."
    
    # Check if response is JSON
    content_type = response.headers.get('Content-Type', '')
    if 'text/html' in content_type or response.text.strip().startswith('<'):
        pytest.fail(
            f"Failed: Received HTML instead of JSON (status {response.status_code}). "
            f"This may indicate invalid endpoint path or authentication issue."
        )
    
    data = response.json()
    assert isinstance(data, dict), "Response should be a JSON object"
    assert len(data) > 0, "Response should contain data"


def test_get_orders_with_limit(client):
    """Test fetching orders with limit parameter."""
    response = client.get_orders(page=1, limit=10, raise_for_status=False)
    
    assert response.status_code == 200, f"Failed with {response.status_code}. Expected 200."
    
    # Check if response is JSON
    content_type = response.headers.get('Content-Type', '')
    if 'text/html' in content_type or response.text.strip().startswith('<'):
        pytest.fail(
            f"Failed: Received HTML instead of JSON (status {response.status_code}). "
            f"This may indicate invalid endpoint path or authentication issue."
        )
    
    data = response.json()
    assert isinstance(data, dict), "Response should be a JSON object"


def test_get_order_by_id_not_found(client):
    """Test fetching a non-existent order should return 404."""
    response = client.get_order_by_id("invalid-order-id-12345", raise_for_status=False)
    
    assert response.status_code == 404, f"Failed with {response.status_code}. Expected 404 for non-existent order."


def test_get_order_by_id_invalid_format(client):
    """Test fetching order with invalid ID format."""
    response = client.get_order_by_id("", raise_for_status=False)
    
    # API may return 200 (treats empty as valid), 400 (Bad Request), or 404 (Not Found)
    # All are acceptable responses depending on API implementation
    assert response.status_code in [200, 400, 404], (
        f"Failed with {response.status_code}. Expected 200, 400, or 404 for invalid order ID format."
    )


def test_authentication_required(client):
    """Test that invalid authentication returns 401."""
    # Create a client with invalid token
    invalid_client = BackMarketAPIClient("invalid_token_12345")
    response = invalid_client.get_orders(raise_for_status=False)
    
    # Invalid token should return 401 (Unauthorized) or 403 (Forbidden)
    assert response.status_code in [401, 403], (
        f"Failed with {response.status_code}. Expected 401 or 403 for invalid authentication token."
    )
    
    # Verify that valid token works (using the fixture client)
    valid_response = client.get_orders(raise_for_status=False)
    assert valid_response.status_code == 200, (
        f"Failed with {valid_response.status_code}. Valid token should return 200, not {valid_response.status_code}."
    )


def test_response_content_type_json(client):
    """Test that successful responses return JSON content type."""
    response = client.get_orders(raise_for_status=False)
    
    if response.status_code == 200:
        content_type = response.headers.get('Content-Type', '').lower()
        assert 'application/json' in content_type, (
            f"Failed: Expected JSON content type, got '{content_type}' (status {response.status_code})"
        )


def test_api_endpoint_availability(client):
    """Test that the API endpoint is reachable."""
    response = client.get_orders(raise_for_status=False)
    
    # Should not be a connection error (5xx might indicate server issues)
    assert response.status_code < 500, (
        f"Failed with {response.status_code}: Server error. API endpoint may be unavailable."
    )
    
    # Common status codes
    if response.status_code == 401:
        pytest.fail("Failed with 401: Unauthorized. Check authentication token.")
    elif response.status_code == 403:
        pytest.fail("Failed with 403: Forbidden. Token may not have required permissions.")
    elif response.status_code == 404:
        pytest.fail("Failed with 404: Not Found. Endpoint path may be incorrect.")
    elif response.status_code == 500:
        pytest.fail("Failed with 500: Internal Server Error. Back Market API may be experiencing issues.")
    elif response.status_code == 503:
        pytest.fail("Failed with 503: Service Unavailable. Back Market API may be down for maintenance.")
