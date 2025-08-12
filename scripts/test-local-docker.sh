#!/bin/bash

echo "🐳 LOCAL DOCKER TESTING ENVIRONMENT"
echo "=================================="
echo ""

# Function to check if docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker Desktop."
        exit 1
    fi
    echo "✅ Docker is running"
}

# Function to clean up existing containers
cleanup() {
    echo "🧹 Cleaning up existing test containers..."
    docker-compose -f docker-compose.test.yml down -v
    docker network rm dott-test-network 2>/dev/null || true
}

# Function to start test environment
start_test_env() {
    echo "🚀 Starting test environment..."
    docker-compose -f docker-compose.test.yml up -d
    
    echo "⏳ Waiting for services to be ready..."
    sleep 10
    
    # Check service health
    echo ""
    echo "🏥 Service Health Check:"
    
    # Database
    if docker exec dott-test-db pg_isready -U postgres > /dev/null 2>&1; then
        echo "✅ PostgreSQL: Ready"
    else
        echo "❌ PostgreSQL: Not ready"
    fi
    
    # Redis
    if docker exec dott-test-redis redis-cli ping > /dev/null 2>&1; then
        echo "✅ Redis: Ready"
    else
        echo "❌ Redis: Not ready"
    fi
    
    # Backend
    if curl -s http://localhost:8001/health/ > /dev/null 2>&1; then
        echo "✅ Backend: Ready"
    else
        echo "❌ Backend: Not ready"
    fi
    
    # Frontend
    if curl -s http://localhost:3001 > /dev/null 2>&1; then
        echo "✅ Frontend: Ready"
    else
        echo "❌ Frontend: Not ready"
    fi
    
    echo ""
    echo "📍 Access Points:"
    echo "- Frontend: http://localhost:3001"
    echo "- Backend API: http://localhost:8001"
    echo "- Nginx Proxy: http://localhost:8080"
    echo "- PostgreSQL: localhost:5433"
    echo "- Redis: localhost:6380"
}

# Function to run tests
run_tests() {
    echo ""
    echo "🧪 Running Tests..."
    
    # Frontend tests
    echo "Testing frontend health..."
    curl -s http://localhost:3001/api/health | jq '.' || echo "Frontend health check failed"
    
    # Backend tests
    echo "Testing backend health..."
    curl -s http://localhost:8001/health/ | jq '.' || echo "Backend health check failed"
    
    # Test through nginx (simulates Cloudflare)
    echo "Testing through proxy..."
    curl -s -H "CF-Ray: test-123" http://localhost:8080/health || echo "Proxy health check failed"
}

# Function to view logs
view_logs() {
    echo ""
    echo "📋 Container Logs (Ctrl+C to exit):"
    docker-compose -f docker-compose.test.yml logs -f
}

# Main menu
case "${1:-help}" in
    start)
        check_docker
        cleanup
        start_test_env
        ;;
    stop)
        cleanup
        echo "✅ Test environment stopped"
        ;;
    test)
        run_tests
        ;;
    logs)
        view_logs
        ;;
    restart)
        check_docker
        cleanup
        start_test_env
        ;;
    *)
        echo "Usage: $0 {start|stop|test|logs|restart}"
        echo ""
        echo "Commands:"
        echo "  start    - Start the test environment"
        echo "  stop     - Stop and clean up"
        echo "  test     - Run basic tests"
        echo "  logs     - View container logs"
        echo "  restart  - Restart everything"
        ;;
esac
