from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

# Client Models
class Client(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    firm_name: str
    owner_name: str
    mobile: str
    email: Optional[str] = None
    address: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ClientCreate(BaseModel):
    firm_name: str
    owner_name: str
    mobile: str
    email: Optional[str] = None
    address: Optional[str] = None

class ClientUpdate(BaseModel):
    firm_name: Optional[str] = None
    owner_name: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

# Document Models
class Document(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    doc_name: str
    status: str  # required, submitted, pending
    storage_location: Optional[str] = None  # Physical location
    softcopy_location: Optional[str] = None  # Where softcopy is stored (e.g., "D:/Clients/ABC Ltd/")
    return_status: bool = False  # False=pending(red), True=returned(green)
    deadline_date: Optional[str] = None  # Last date for accounting software entry
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DocumentCreate(BaseModel):
    client_id: str
    doc_name: str
    status: str
    storage_location: Optional[str] = None
    softcopy_location: Optional[str] = None
    return_status: bool = False
    deadline_date: Optional[str] = None

class DocumentUpdate(BaseModel):
    doc_name: Optional[str] = None
    status: Optional[str] = None
    storage_location: Optional[str] = None
    softcopy_location: Optional[str] = None
    return_status: Optional[bool] = None
    deadline_date: Optional[str] = None

# Task Models
class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: Optional[str] = None
    task_name: str
    description: Optional[str] = None
    is_completed: bool = False
    all_docs_submitted: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

class TaskCreate(BaseModel):
    client_id: Optional[str] = None
    task_name: str
    description: Optional[str] = None
    all_docs_submitted: bool = False

class TaskUpdate(BaseModel):
    task_name: Optional[str] = None
    description: Optional[str] = None
    is_completed: Optional[bool] = None
    all_docs_submitted: Optional[bool] = None

# AI Request Models
class MessageGenerationRequest(BaseModel):
    client_id: str
    message_type: str  # "pending_docs" or "pending_tasks"

class CheatsheetRequest(BaseModel):
    client_id: str

class DailySummaryRequest(BaseModel):
    date: Optional[str] = None  # Format: YYYY-MM-DD

# ==================== CLIENT ENDPOINTS ====================

@api_router.post("/clients", response_model=Client)
async def create_client(client: ClientCreate):
    """Create a new client"""
    client_dict = client.dict()
    client_obj = Client(**client_dict)
    await db.clients.insert_one(client_obj.dict())
    return client_obj

@api_router.get("/clients", response_model=List[Client])
async def get_clients():
    """Get all clients"""
    clients = await db.clients.find().to_list(1000)
    return [Client(**client) for client in clients]

@api_router.get("/clients/{client_id}", response_model=Client)
async def get_client(client_id: str):
    """Get a specific client"""
    client = await db.clients.find_one({"id": client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return Client(**client)

@api_router.put("/clients/{client_id}", response_model=Client)
async def update_client(client_id: str, client_update: ClientUpdate):
    """Update a client"""
    update_data = {k: v for k, v in client_update.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.clients.update_one(
        {"id": client_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    
    updated_client = await db.clients.find_one({"id": client_id})
    return Client(**updated_client)

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str):
    """Delete a client"""
    result = await db.clients.delete_one({"id": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Also delete related documents and tasks
    await db.documents.delete_many({"client_id": client_id})
    await db.tasks.delete_many({"client_id": client_id})
    
    return {"message": "Client deleted successfully"}

# ==================== DOCUMENT ENDPOINTS ====================

@api_router.post("/documents", response_model=Document)
async def create_document(doc: DocumentCreate):
    """Create a new document"""
    doc_dict = doc.dict()
    doc_obj = Document(**doc_dict)
    await db.documents.insert_one(doc_obj.dict())
    return doc_obj

@api_router.get("/documents", response_model=List[Document])
async def get_all_documents():
    """Get all documents"""
    documents = await db.documents.find().to_list(1000)
    return [Document(**doc) for doc in documents]

@api_router.get("/documents/client/{client_id}", response_model=List[Document])
async def get_client_documents(client_id: str):
    """Get all documents for a specific client"""
    documents = await db.documents.find({"client_id": client_id}).to_list(1000)
    return [Document(**doc) for doc in documents]

@api_router.get("/documents/{doc_id}", response_model=Document)
async def get_document(doc_id: str):
    """Get a specific document"""
    doc = await db.documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return Document(**doc)

@api_router.put("/documents/{doc_id}", response_model=Document)
async def update_document(doc_id: str, doc_update: DocumentUpdate):
    """Update a document"""
    update_data = {k: v for k, v in doc_update.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.documents.update_one(
        {"id": doc_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    updated_doc = await db.documents.find_one({"id": doc_id})
    return Document(**updated_doc)

@api_router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document"""
    result = await db.documents.delete_one({"id": doc_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted successfully"}

# ==================== TASK ENDPOINTS ====================

@api_router.post("/tasks", response_model=Task)
async def create_task(task: TaskCreate):
    """Create a new task"""
    task_dict = task.dict()
    task_obj = Task(**task_dict)
    await db.tasks.insert_one(task_obj.dict())
    return task_obj

@api_router.get("/tasks", response_model=List[Task])
async def get_tasks():
    """Get all tasks"""
    tasks = await db.tasks.find().sort("created_at", -1).to_list(1000)
    return [Task(**task) for task in tasks]

@api_router.get("/tasks/pending")
async def get_pending_tasks():
    """Get all pending tasks"""
    tasks = await db.tasks.find({"is_completed": False}).sort("created_at", -1).to_list(1000)
    return [Task(**task) for task in tasks]

@api_router.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str):
    """Get a specific task"""
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return Task(**task)

@api_router.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, task_update: TaskUpdate):
    """Update a task"""
    update_data = {k: v for k, v in task_update.dict().items() if v is not None}
    
    # If marking as completed, add completion timestamp
    if update_data.get("is_completed") == True:
        update_data["completed_at"] = datetime.utcnow()
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.tasks.update_one(
        {"id": task_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    updated_task = await db.tasks.find_one({"id": task_id})
    return Task(**updated_task)

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    """Delete a task"""
    result = await db.tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted successfully"}

# ==================== AI-POWERED ENDPOINTS ====================

@api_router.post("/ai/generate-message")
async def generate_client_message(request: MessageGenerationRequest):
    """Generate personalized message for clients using AI"""
    try:
        # Get client details
        client = await db.clients.find_one({"id": request.client_id})
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        # Get pending documents
        pending_docs = await db.documents.find({
            "client_id": request.client_id,
            "status": "pending"
        }).to_list(100)
        
        # Get pending tasks
        pending_tasks = await db.tasks.find({
            "client_id": request.client_id,
            "is_completed": False
        }).to_list(100)
        
        # Prepare context for AI
        context = f"""
Client: {client['firm_name']}
Owner: {client['owner_name']}

Pending Documents ({len(pending_docs)}):
{chr(10).join([f"- {doc['doc_name']}" for doc in pending_docs]) if pending_docs else "None"}

Pending Tasks ({len(pending_tasks)}):
{chr(10).join([f"- {task['task_name']}" for task in pending_tasks]) if pending_tasks else "None"}
"""
        
        # Initialize LLM
        llm = LlmChat(
            api_key=os.environ['EMERGENT_LLM_KEY'],
            session_id=f"message-{request.client_id}",
            system_message="You are a professional CA firm assistant. Generate polite, professional messages to clients regarding their pending documents and tasks. Keep messages concise and actionable."
        ).with_model("openai", "gpt-4o")
        
        prompt = f"""Generate a professional, friendly WhatsApp message for the following client:

{context}

The message should:
1. Be polite and professional
2. Mention pending documents/tasks specifically
3. Request prompt submission
4. Be suitable for WhatsApp (concise, under 200 words)
5. End with firm name: SHREE RAJ & CO

Generate ONLY the message text, no additional formatting or quotes."""
        
        user_message = UserMessage(text=prompt)
        
        # Stream response
        async def generate_stream():
            full_message = ""
            async for event in llm.stream_message(user_message):
                if isinstance(event, TextDelta):
                    full_message += event.content
                    yield f"data: {event.content}\n\n"
                elif isinstance(event, StreamDone):
                    yield f"data: [DONE]\n\n"
                    break
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no"
            }
        )
        
    except Exception as e:
        logger.error(f"Error generating message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ai/generate-cheatsheet")
async def generate_cheatsheet(request: CheatsheetRequest):
    """Generate cheatsheet content for required documents"""
    try:
        # Get client details
        client = await db.clients.find_one({"id": request.client_id})
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        # Get all documents
        documents = await db.documents.find({"client_id": request.client_id}).to_list(1000)
        
        required_docs = [doc for doc in documents if doc['status'] == 'required']
        submitted_docs = [doc for doc in documents if doc['status'] == 'submitted']
        pending_docs = [doc for doc in documents if doc['status'] == 'pending']
        
        # Initialize LLM
        llm = LlmChat(
            api_key=os.environ['EMERGENT_LLM_KEY'],
            session_id=f"cheatsheet-{request.client_id}",
            system_message="You are a professional document organizer for a CA firm. Create clean, organized cheatsheets."
        ).with_model("openai", "gpt-4o")
        
        prompt = f"""Create a formatted cheatsheet for the following client's documents:

Client: {client['firm_name']}
Owner: {client['owner_name']}

REQUIRED DOCUMENTS ({len(required_docs)}):
{chr(10).join([f"• {doc['doc_name']}" for doc in required_docs]) if required_docs else "None"}

SUBMITTED DOCUMENTS ({len(submitted_docs)}):
{chr(10).join([f"• {doc['doc_name']} - Location: {doc.get('storage_location', 'N/A')}" for doc in submitted_docs]) if submitted_docs else "None"}

PENDING DOCUMENTS ({len(pending_docs)}):
{chr(10).join([f"• {doc['doc_name']}" for doc in pending_docs]) if pending_docs else "None"}

Create a well-organized, professional cheatsheet in plain text format that can be easily converted to an image. Include:
1. Header with firm name and date
2. Clear sections for each document category
3. Status indicators (✓, ⏳, ❌)
4. Storage locations where applicable
5. Footer with SHREE RAJ & CO

Make it clean and professional."""
        
        user_message = UserMessage(text=prompt)
        
        # Get non-streaming response
        full_response = ""
        async for event in llm.stream_message(user_message):
            if isinstance(event, TextDelta):
                full_response += event.content
            elif isinstance(event, StreamDone):
                break
        
        return {"content": full_response, "client": client['firm_name']}
        
    except Exception as e:
        logger.error(f"Error generating cheatsheet: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ai/daily-summary")
async def generate_daily_summary(request: DailySummaryRequest):
    """Generate AI-powered daily summary"""
    try:
        # Use today's date if not provided
        target_date = request.date if request.date else datetime.utcnow().strftime("%Y-%m-%d")
        
        # Get all data for the day
        all_clients = await db.clients.find().to_list(1000)
        all_tasks = await db.tasks.find().to_list(1000)
        all_documents = await db.documents.find().to_list(1000)
        
        # Filter today's activities
        today_tasks = [t for t in all_tasks if t['created_at'].strftime("%Y-%m-%d") == target_date]
        completed_tasks = [t for t in today_tasks if t['is_completed']]
        pending_tasks = [t for t in all_tasks if not t['is_completed']]
        
        # Documents submitted today
        submitted_today = [d for d in all_documents if d['status'] == 'submitted' and d['created_at'].strftime("%Y-%m-%d") == target_date]
        
        # Initialize LLM
        llm = LlmChat(
            api_key=os.environ['EMERGENT_LLM_KEY'],
            session_id=f"summary-{target_date}",
            system_message="You are a professional CA firm assistant creating daily summary reports."
        ).with_model("openai", "gpt-4o")
        
        prompt = f"""Create a professional daily summary report for SHREE RAJ & CO:

DATE: {target_date}

DOCUMENTS SUBMITTED TODAY ({len(submitted_today)}):
{chr(10).join([f"• {doc['doc_name']} - Client: {next((c['firm_name'] for c in all_clients if c['id'] == doc['client_id']), 'Unknown')}" for doc in submitted_today]) if submitted_today else "None"}

TASKS ASSIGNED TODAY ({len(today_tasks)}):
{chr(10).join([f"• {task['task_name']}" for task in today_tasks]) if today_tasks else "None"}

TASKS COMPLETED TODAY ({len(completed_tasks)}):
{chr(10).join([f"• {task['task_name']}" for task in completed_tasks]) if completed_tasks else "None"}

PENDING TASKS ({len(pending_tasks)}):
{chr(10).join([f"• {task['task_name']}" for task in pending_tasks[:5]]) if pending_tasks else "None"}
{f"... and {len(pending_tasks) - 5} more" if len(pending_tasks) > 5 else ""}

TOTAL CLIENTS: {len(all_clients)}

Create a formatted, professional summary report that can be converted to PDF. Include:
1. Professional header with firm name and date
2. Key metrics and statistics
3. Detailed sections for each category
4. Action items or recommendations
5. Professional footer

Make it executive-ready for the boss."""
        
        user_message = UserMessage(text=prompt)
        
        # Get non-streaming response
        full_response = ""
        async for event in llm.stream_message(user_message):
            if isinstance(event, TextDelta):
                full_response += event.content
            elif isinstance(event, StreamDone):
                break
        
        return {
            "summary": full_response,
            "date": target_date,
            "stats": {
                "total_clients": len(all_clients),
                "documents_submitted_today": len(submitted_today),
                "tasks_assigned_today": len(today_tasks),
                "tasks_completed_today": len(completed_tasks),
                "pending_tasks": len(pending_tasks)
            }
        }
        
    except Exception as e:
        logger.error(f"Error generating daily summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== DASHBOARD STATS ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats():
    """Get dashboard statistics"""
    try:
        total_clients = await db.clients.count_documents({})
        total_tasks = await db.tasks.count_documents({})
        pending_tasks = await db.tasks.count_documents({"is_completed": False})
        completed_tasks = await db.tasks.count_documents({"is_completed": True})
        
        total_documents = await db.documents.count_documents({})
        pending_documents = await db.documents.count_documents({"status": "pending"})
        submitted_documents = await db.documents.count_documents({"status": "submitted"})
        required_documents = await db.documents.count_documents({"status": "required"})
        
        # Get long pending tasks (more than 7 days old)
        seven_days_ago = datetime.utcnow().timestamp() - (7 * 24 * 60 * 60)
        long_pending_tasks = await db.tasks.find({
            "is_completed": False,
            "created_at": {"$lt": datetime.fromtimestamp(seven_days_ago)}
        }).to_list(100)
        
        return {
            "clients": {
                "total": total_clients
            },
            "tasks": {
                "total": total_tasks,
                "pending": pending_tasks,
                "completed": completed_tasks,
                "long_pending": len(long_pending_tasks)
            },
            "documents": {
                "total": total_documents,
                "pending": pending_documents,
                "submitted": submitted_documents,
                "required": required_documents
            }
        }
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
