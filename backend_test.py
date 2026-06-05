#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for CA Firm Register Software
Tests all CRUD operations and AI-powered endpoints
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from environment
BASE_URL = "https://ca-register-hub.preview.emergentagent.com/api"

# Test data storage
test_data = {
    "client_id": None,
    "document_ids": [],
    "task_ids": []
}

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_test(test_name):
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}Testing: {test_name}{RESET}")
    print(f"{BLUE}{'='*80}{RESET}")

def print_success(message):
    print(f"{GREEN}✓ {message}{RESET}")

def print_error(message):
    print(f"{RED}✗ {message}{RESET}")

def print_info(message):
    print(f"{YELLOW}ℹ {message}{RESET}")

# ==================== CLIENT TESTS ====================

def test_create_client():
    """Test POST /api/clients"""
    print_test("Create Client")
    
    payload = {
        "firm_name": "Test Firm Ltd",
        "owner_name": "John Doe",
        "mobile": "9876543210",
        "email": "test@firm.com",
        "address": "123 Test Street, Mumbai"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/clients", json=payload, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            test_data["client_id"] = data["id"]
            print_success(f"Client created successfully with ID: {data['id']}")
            print_info(f"Firm: {data['firm_name']}, Owner: {data['owner_name']}")
            return True
        else:
            print_error(f"Failed with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print_error(f"Exception: {str(e)}")
        return False

def test_get_all_clients():
    """Test GET /api/clients"""
    print_test("Get All Clients")
    
    try:
        response = requests.get(f"{BASE_URL}/clients", timeout=10)
        
        if response.status_code == 200:
            clients = response.json()
            print_success(f"Retrieved {len(clients)} clients")
            
            # Verify our test client exists
            test_client = next((c for c in clients if c["id"] == test_data["client_id"]), None)
            if test_client:
                print_success(f"Test client found: {test_client['firm_name']}")
                return True
            else:
                print_error("Test client not found in list")
                return False
        else:
            print_error(f"Failed with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print_error(f"Exception: {str(e)}")
        return False

def test_get_client_by_id():
    """Test GET /api/clients/{id}"""
    print_test("Get Client by ID")
    
    if not test_data["client_id"]:
        print_error("No client ID available")
        return False
    
    try:
        response = requests.get(f"{BASE_URL}/clients/{test_data['client_id']}", timeout=10)
        
        if response.status_code == 200:
            client = response.json()
            print_success(f"Retrieved client: {client['firm_name']}")
            print_info(f"Owner: {client['owner_name']}, Mobile: {client['mobile']}")
            return True
        else:
            print_error(f"Failed with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print_error(f"Exception: {str(e)}")
        return False

def test_update_client():
    """Test PUT /api/clients/{id}"""
    print_test("Update Client")
    
    if not test_data["client_id"]:
        print_error("No client ID available")
        return False
    
    payload = {
        "address": "456 Updated Street, Delhi",
        "email": "updated@firm.com"
    }
    
    try:
        response = requests.put(
            f"{BASE_URL}/clients/{test_data['client_id']}", 
            json=payload, 
            timeout=10
        )
        
        if response.status_code == 200:
            client = response.json()
            print_success(f"Client updated successfully")
            print_info(f"New address: {client['address']}")
            print_info(f"New email: {client['email']}")
            return True
        else:
            print_error(f"Failed with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print_error(f"Exception: {str(e)}")
        return False

# ==================== DOCUMENT TESTS ====================

def test_create_documents():
    """Test POST /api/documents"""
    print_test("Create Documents")
    
    if not test_data["client_id"]:
        print_error("No client ID available")
        return False
    
    documents = [
        {
            "client_id": test_data["client_id"],
            "doc_name": "GST Return - Q1",
            "status": "required",
            "storage_location": "Cabinet A",
            "softcopy_location": "D:/Clients/Test/",
            "return_status": False,
            "deadline_date": "2025-12-31"
        },
        {
            "client_id": test_data["client_id"],
            "doc_name": "Income Tax Return",
            "status": "pending",
            "storage_location": "Cabinet B",
            "softcopy_location": "D:/Clients/Test/",
            "return_status": False,
            "deadline_date": "2025-11-30"
        },
        {
            "client_id": test_data["client_id"],
            "doc_name": "Balance Sheet",
            "status": "submitted",
            "storage_location": "Cabinet A",
            "softcopy_location": "D:/Clients/Test/",
            "return_status": True,
            "deadline_date": "2025-10-31"
        }
    ]
    
    success_count = 0
    for doc in documents:
        try:
            response = requests.post(f"{BASE_URL}/documents", json=doc, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                test_data["document_ids"].append(data["id"])
                print_success(f"Created document: {doc['doc_name']} (Status: {doc['status']})")
                success_count += 1
            else:
                print_error(f"Failed to create {doc['doc_name']}: {response.text}")
        except Exception as e:
            print_error(f"Exception creating {doc['doc_name']}: {str(e)}")
    
    return success_count == len(documents)

def test_get_all_documents():
    """Test GET /api/documents"""
    print_test("Get All Documents")
    
    try:
        response = requests.get(f"{BASE_URL}/documents", timeout=10)
        
        if response.status_code == 200:
            documents = response.json()
            print_success(f"Retrieved {len(documents)} documents")
            return True
        else:
            print_error(f"Failed with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print_error(f"Exception: {str(e)}")
        return False

def test_get_client_documents():
    """Test GET /api/documents/client/{client_id}"""
    print_test("Get Client Documents")
    
    if not test_data["client_id"]:
        print_error("No client ID available")
        return False
    
    try:
        response = requests.get(
            f"{BASE_URL}/documents/client/{test_data['client_id']}", 
            timeout=10
        )
        
        if response.status_code == 200:
            documents = response.json()
            print_success(f"Retrieved {len(documents)} documents for client")
            for doc in documents:
                print_info(f"  - {doc['doc_name']} (Status: {doc['status']})")
            return True
        else:
            print_error(f"Failed with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print_error(f"Exception: {str(e)}")
        return False

def test_update_document():
    """Test PUT /api/documents/{id}"""
    print_test("Update Document")
    
    if not test_data["document_ids"]:
        print_error("No document IDs available")
        return False
    
    doc_id = test_data["document_ids"][0]
    payload = {
        "status": "submitted",
        "return_status": True
    }
    
    try:
        response = requests.put(
            f"{BASE_URL}/documents/{doc_id}", 
            json=payload, 
            timeout=10
        )
        
        if response.status_code == 200:
            doc = response.json()
            print_success(f"Document updated successfully")
            print_info(f"New status: {doc['status']}, Return status: {doc['return_status']}")
            return True
        else:
            print_error(f"Failed with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print_error(f"Exception: {str(e)}")
        return False

# ==================== TASK TESTS ====================

def test_create_tasks():
    """Test POST /api/tasks"""
    print_test("Create Tasks")
    
    tasks = [
        {
            "client_id": test_data["client_id"],
            "task_name": "Review GST Returns",
            "description": "Review and verify Q1 GST returns",
            "all_docs_submitted": False
        },
        {
            "client_id": test_data["client_id"],
            "task_name": "Prepare Income Tax Filing",
            "description": "Prepare and file income tax return",
            "all_docs_submitted": False
        },
        {
            "task_name": "General Office Task",
            "description": "Update client database",
            "all_docs_submitted": True
        }
    ]
    
    success_count = 0
    for task in tasks:
        try:
            response = requests.post(f"{BASE_URL}/tasks", json=task, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                test_data["task_ids"].append(data["id"])
                client_info = f" (Client-specific)" if task.get("client_id") else " (General)"
                print_success(f"Created task: {task['task_name']}{client_info}")
                success_count += 1
            else:
                print_error(f"Failed to create {task['task_name']}: {response.text}")
        except Exception as e:
            print_error(f"Exception creating {task['task_name']}: {str(e)}")
    
    return success_count == len(tasks)

def test_get_all_tasks():
    """Test GET /api/tasks"""
    print_test("Get All Tasks")
    
    try:
        response = requests.get(f"{BASE_URL}/tasks", timeout=10)
        
        if response.status_code == 200:
            tasks = response.json()
            print_success(f"Retrieved {len(tasks)} tasks")
            return True
        else:
            print_error(f"Failed with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print_error(f"Exception: {str(e)}")
        return False

def test_get_pending_tasks():
    """Test GET /api/tasks/pending"""
    print_test("Get Pending Tasks")
    
    try:
        response = requests.get(f"{BASE_URL}/tasks/pending", timeout=10)
        
        if response.status_code == 200:
            tasks = response.json()
            print_success(f"Retrieved {len(tasks)} pending tasks")
            for task in tasks:
                print_info(f"  - {task['task_name']} (Completed: {task['is_completed']})")
            return True
        else:
            print_error(f"Failed with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print_error(f"Exception: {str(e)}")
        return False

def test_update_task():
    """Test PUT /api/tasks/{id}"""
    print_test("Update Task (Toggle Completion)")
    
    if not test_data["task_ids"]:
        print_error("No task IDs available")
        return False
    
    task_id = test_data["task_ids"][0]
    payload = {
        "is_completed": True
    }
    
    try:
        response = requests.put(
            f"{BASE_URL}/tasks/{task_id}", 
            json=payload, 
            timeout=10
        )
        
        if response.status_code == 200:
            task = response.json()
            print_success(f"Task updated successfully")
            print_info(f"Task: {task['task_name']}, Completed: {task['is_completed']}")
            if task.get('completed_at'):
                print_info(f"Completed at: {task['completed_at']}")
            return True
        else:
            print_error(f"Failed with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print_error(f"Exception: {str(e)}")
        return False

# ==================== DASHBOARD TESTS ====================

def test_dashboard_stats():
    """Test GET /api/dashboard/stats"""
    print_test("Dashboard Statistics")
    
    try:
        response = requests.get(f"{BASE_URL}/dashboard/stats", timeout=10)
        
        if response.status_code == 200:
            stats = response.json()
            print_success("Dashboard stats retrieved successfully")
            print_info(f"Clients: {stats['clients']['total']}")
            print_info(f"Tasks - Total: {stats['tasks']['total']}, Pending: {stats['tasks']['pending']}, Completed: {stats['tasks']['completed']}")
            print_info(f"Documents - Total: {stats['documents']['total']}, Pending: {stats['documents']['pending']}, Submitted: {stats['documents']['submitted']}, Required: {stats['documents']['required']}")
            return True
        else:
            print_error(f"Failed with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print_error(f"Exception: {str(e)}")
        return False

# ==================== AI ENDPOINT TESTS ====================

def test_ai_generate_message():
    """Test POST /api/ai/generate-message"""
    print_test("AI Generate Client Message")
    
    if not test_data["client_id"]:
        print_error("No client ID available")
        return False
    
    payload = {
        "client_id": test_data["client_id"],
        "message_type": "pending_docs"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/ai/generate-message", 
            json=payload, 
            timeout=30,
            stream=True
        )
        
        if response.status_code == 200:
            print_success("AI message generation started (streaming)")
            
            # Collect streamed content
            full_message = ""
            for line in response.iter_lines():
                if line:
                    decoded_line = line.decode('utf-8')
                    if decoded_line.startswith('data: '):
                        content = decoded_line[6:]  # Remove 'data: ' prefix
                        if content == '[DONE]':
                            break
                        full_message += content
            
            if full_message:
                print_success("AI message generated successfully")
                print_info(f"Message preview: {full_message[:150]}...")
                return True
            else:
                print_error("No content received from AI")
                return False
        else:
            print_error(f"Failed with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print_error(f"Exception: {str(e)}")
        return False

def test_ai_generate_cheatsheet():
    """Test POST /api/ai/generate-cheatsheet"""
    print_test("AI Generate Document Cheatsheet")
    
    if not test_data["client_id"]:
        print_error("No client ID available")
        return False
    
    payload = {
        "client_id": test_data["client_id"]
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/ai/generate-cheatsheet", 
            json=payload, 
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            print_success("AI cheatsheet generated successfully")
            print_info(f"Client: {data['client']}")
            print_info(f"Content preview: {data['content'][:150]}...")
            return True
        else:
            print_error(f"Failed with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print_error(f"Exception: {str(e)}")
        return False

def test_ai_daily_summary():
    """Test POST /api/ai/daily-summary"""
    print_test("AI Generate Daily Summary")
    
    payload = {
        "date": datetime.now().strftime("%Y-%m-%d")
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/ai/daily-summary", 
            json=payload, 
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            print_success("AI daily summary generated successfully")
            print_info(f"Date: {data['date']}")
            print_info(f"Stats: {data['stats']}")
            print_info(f"Summary preview: {data['summary'][:150]}...")
            return True
        else:
            print_error(f"Failed with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print_error(f"Exception: {str(e)}")
        return False

# ==================== CLEANUP TESTS ====================

def test_delete_document():
    """Test DELETE /api/documents/{id}"""
    print_test("Delete Document")
    
    if len(test_data["document_ids"]) < 2:
        print_error("Not enough document IDs available")
        return False
    
    # Delete the second document (keep first for other tests)
    doc_id = test_data["document_ids"][1]
    
    try:
        response = requests.delete(f"{BASE_URL}/documents/{doc_id}", timeout=10)
        
        if response.status_code == 200:
            print_success(f"Document deleted successfully")
            return True
        else:
            print_error(f"Failed with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print_error(f"Exception: {str(e)}")
        return False

def test_delete_task():
    """Test DELETE /api/tasks/{id}"""
    print_test("Delete Task")
    
    if len(test_data["task_ids"]) < 2:
        print_error("Not enough task IDs available")
        return False
    
    # Delete the second task (keep first for other tests)
    task_id = test_data["task_ids"][1]
    
    try:
        response = requests.delete(f"{BASE_URL}/tasks/{task_id}", timeout=10)
        
        if response.status_code == 200:
            print_success(f"Task deleted successfully")
            return True
        else:
            print_error(f"Failed with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print_error(f"Exception: {str(e)}")
        return False

def test_delete_client():
    """Test DELETE /api/clients/{id}"""
    print_test("Delete Client (with cascade)")
    
    if not test_data["client_id"]:
        print_error("No client ID available")
        return False
    
    try:
        response = requests.delete(f"{BASE_URL}/clients/{test_data['client_id']}", timeout=10)
        
        if response.status_code == 200:
            print_success(f"Client deleted successfully (cascade delete of related docs/tasks)")
            return True
        else:
            print_error(f"Failed with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print_error(f"Exception: {str(e)}")
        return False

# ==================== MAIN TEST RUNNER ====================

def main():
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}CA FIRM REGISTER SOFTWARE - BACKEND API TESTING{RESET}")
    print(f"{BLUE}Backend URL: {BASE_URL}{RESET}")
    print(f"{BLUE}{'='*80}{RESET}\n")
    
    results = {}
    
    # Client Management Tests
    print(f"\n{YELLOW}{'='*80}{RESET}")
    print(f"{YELLOW}CLIENT MANAGEMENT TESTS{RESET}")
    print(f"{YELLOW}{'='*80}{RESET}")
    results["Create Client"] = test_create_client()
    results["Get All Clients"] = test_get_all_clients()
    results["Get Client by ID"] = test_get_client_by_id()
    results["Update Client"] = test_update_client()
    
    # Document Management Tests
    print(f"\n{YELLOW}{'='*80}{RESET}")
    print(f"{YELLOW}DOCUMENT MANAGEMENT TESTS{RESET}")
    print(f"{YELLOW}{'='*80}{RESET}")
    results["Create Documents"] = test_create_documents()
    results["Get All Documents"] = test_get_all_documents()
    results["Get Client Documents"] = test_get_client_documents()
    results["Update Document"] = test_update_document()
    
    # Task Management Tests
    print(f"\n{YELLOW}{'='*80}{RESET}")
    print(f"{YELLOW}TASK MANAGEMENT TESTS{RESET}")
    print(f"{YELLOW}{'='*80}{RESET}")
    results["Create Tasks"] = test_create_tasks()
    results["Get All Tasks"] = test_get_all_tasks()
    results["Get Pending Tasks"] = test_get_pending_tasks()
    results["Update Task"] = test_update_task()
    
    # Dashboard Tests
    print(f"\n{YELLOW}{'='*80}{RESET}")
    print(f"{YELLOW}DASHBOARD TESTS{RESET}")
    print(f"{YELLOW}{'='*80}{RESET}")
    results["Dashboard Stats"] = test_dashboard_stats()
    
    # AI-Powered Tests
    print(f"\n{YELLOW}{'='*80}{RESET}")
    print(f"{YELLOW}AI-POWERED ENDPOINT TESTS{RESET}")
    print(f"{YELLOW}{'='*80}{RESET}")
    results["AI Generate Message"] = test_ai_generate_message()
    results["AI Generate Cheatsheet"] = test_ai_generate_cheatsheet()
    results["AI Daily Summary"] = test_ai_daily_summary()
    
    # Cleanup Tests
    print(f"\n{YELLOW}{'='*80}{RESET}")
    print(f"{YELLOW}CLEANUP TESTS (DELETE OPERATIONS){RESET}")
    print(f"{YELLOW}{'='*80}{RESET}")
    results["Delete Document"] = test_delete_document()
    results["Delete Task"] = test_delete_task()
    results["Delete Client"] = test_delete_client()
    
    # Summary
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}TEST SUMMARY{RESET}")
    print(f"{BLUE}{'='*80}{RESET}\n")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = f"{GREEN}PASSED{RESET}" if result else f"{RED}FAILED{RESET}"
        print(f"{test_name}: {status}")
    
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}Total: {passed}/{total} tests passed{RESET}")
    print(f"{BLUE}{'='*80}{RESET}\n")
    
    # Exit with appropriate code
    sys.exit(0 if passed == total else 1)

if __name__ == "__main__":
    main()
