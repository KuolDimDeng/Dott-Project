#!/bin/bash

# Get the absolute path to the project root directory
PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
ROOT_VENV="$PROJECT_ROOT/.venv"

# Function to create the root virtual environment if it doesn't exist
create_venv() {
    if [ ! -d "$ROOT_VENV" ]; then
        echo "Creating virtual environment at $ROOT_VENV"
        python3 -m venv "$ROOT_VENV"
    else
        echo "Virtual environment already exists at $ROOT_VENV"
    fi
}

# Function to check for and clean nested .venvs
check_venvs() {
    python3 "$PROJECT_ROOT/scripts/venv_checker.py" "$@"
}

# Function to activate the root virtual environment
activate_venv() {
    echo "Activating virtual environment at $ROOT_VENV"
    echo "Run this command in your shell:"
    echo "source \"$ROOT_VENV/bin/activate\""
}

# Function to install requirements
install_requirements() {
    if [ -f "$PROJECT_ROOT/requirements.txt" ]; then
        echo "Installing requirements from $PROJECT_ROOT/requirements.txt"
        "$ROOT_VENV/bin/pip" install -r "$PROJECT_ROOT/requirements.txt"
    else
        echo "No requirements.txt found in project root"
    fi
    
    # Check for backend requirements
    if [ -f "$PROJECT_ROOT/backend/pyfactor/requirements.txt" ]; then
        echo "Installing backend requirements from $PROJECT_ROOT/backend/pyfactor/requirements.txt"
        "$ROOT_VENV/bin/pip" install -r "$PROJECT_ROOT/backend/pyfactor/requirements.txt"
    fi
}

# Display usage information
usage() {
    echo "Usage: $0 [command]"
    echo "Commands:"
    echo "  create    - Create the root virtual environment if it doesn't exist"
    echo "  check     - Check for nested virtual environments"
    echo "  clean     - Remove nested virtual environments (with confirmation)"
    echo "  activate  - Show command to activate the root virtual environment"
    echo "  setup     - Create, activate, and install requirements"
    echo "  install   - Install requirements from requirements.txt files"
    echo "  help      - Show this help message"
}

# Main script
case "$1" in
    create)
        create_venv
        ;;
    check)
        check_venvs
        ;;
    clean)
        check_venvs --clean
        ;;
    activate)
        activate_venv
        ;;
    setup)
        create_venv
        activate_venv
        install_requirements
        ;;
    install)
        install_requirements
        ;;
    *)
        usage
        ;;
esac 