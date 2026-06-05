from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
import csv
import io
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT config
JWT_SECRET_KEY = os.environ['JWT_SECRET_KEY']
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRE_DAYS = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRE_DAYS', 30))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme for JWT
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

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
    status: str  # submitted, pending
    storage_location: Optional[str] = None  # Physical location
    softcopy_location: Optional[str] = None  # Where softcopy is stored (e.g., "D:/Clients/ABC Ltd/")
    return_status: bool = False  # False=pending(red), True=returned(green)
    last_entry_date: Optional[str] = None  # Last date entered in accounting software
    uploaded_to_accounting: bool = False  # Whether uploaded to accounting software
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DocumentCreate(BaseModel):
    client_id: str
    doc_name: str
    status: str = "pending"
    storage_location: Optional[str] = None
    softcopy_location: Optional[str] = None
    return_status: bool = False
    last_entry_date: Optional[str] = None
    uploaded_to_accounting: bool = False

class DocumentUpdate(BaseModel):
    doc_name: Optional[str] = None
    status: Optional[str] = None
    storage_location: Optional[str] = None
    softcopy_location: Optional[str] = None
    return_status: Optional[bool] = None
    last_entry_date: Optional[str] = None
    uploaded_to_accounting: Optional[bool] = None

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

# ==================== AUTH MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    email: str
    name: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# ==================== BULK IMPORT MODELS ====================

class BulkClientImport(BaseModel):
    csv_data: str  # CSV content as string

class BulkDocumentImport(BaseModel):
    client_id: str
    csv_data: str

# ==================== AUTH UTILS ====================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(user_id: str, email: str) -> str:
    expire = datetime.utcnow() + timedelta(days=JWT_EXPIRE_DAYS)
    payload = {"sub": user_id, "email": email, "exp": expire}
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

async def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> dict:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register", response_model=Token)
async def register(user_in: UserCreate):
    """Register a new user - any user can register and access shared data"""
    existing = await db.users.find_one({"email": user_in.email.lower()})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_in.email.lower(),
        "name": user_in.name or user_in.email.split('@')[0],
        "hashed_password": hash_password(user_in.password),
        "created_at": datetime.utcnow(),
    }
    await db.users.insert_one(user_doc)
    
    access_token = create_access_token(user_id, user_in.email.lower())
    return Token(
        access_token=access_token,
        user=UserOut(id=user_id, email=user_in.email.lower(), name=user_doc["name"])
    )

@api_router.post("/auth/login", response_model=Token)
async def login(user_in: UserLogin):
    """Login with email and password"""
    user = await db.users.find_one({"email": user_in.email.lower()})
    if not user or not verify_password(user_in.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    
    access_token = create_access_token(user["id"], user["email"])
    return Token(
        access_token=access_token,
        user=UserOut(id=user["id"], email=user["email"], name=user.get("name"))
    )

@api_router.get("/auth/me", response_model=UserOut)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get currently logged in user"""
    return UserOut(id=current_user["id"], email=current_user["email"], name=current_user.get("name"))

# ==================== BULK IMPORT ENDPOINTS ====================

@api_router.post("/bulk/clients")
async def bulk_import_clients(data: BulkClientImport, current_user: dict = Depends(get_current_user)):
    """
    Bulk import clients from CSV.
    Expected CSV columns: firm_name, owner_name, mobile, email, address
    First row should be headers.
    """
    try:
        csv_file = io.StringIO(data.csv_data.strip())
        reader = csv.DictReader(csv_file)
        
        created = []
        errors = []
        
        for idx, row in enumerate(reader, start=2):  # start=2 because row 1 is header
            try:
                firm_name = (row.get('firm_name') or row.get('Firm Name') or '').strip()
                owner_name = (row.get('owner_name') or row.get('Owner Name') or '').strip()
                mobile = (row.get('mobile') or row.get('Mobile') or '').strip()
                
                if not firm_name or not owner_name or not mobile:
                    errors.append(f"Row {idx}: Missing required fields (firm_name, owner_name, mobile)")
                    continue
                
                client_doc = {
                    "id": str(uuid.uuid4()),
                    "firm_name": firm_name,
                    "owner_name": owner_name,
                    "mobile": mobile,
                    "email": (row.get('email') or row.get('Email') or '').strip() or None,
                    "address": (row.get('address') or row.get('Address') or '').strip() or None,
                    "created_at": datetime.utcnow(),
                }
                await db.clients.insert_one(client_doc)
                created.append(firm_name)
            except Exception as e:
                errors.append(f"Row {idx}: {str(e)}")
        
        return {
            "success": True,
            "created_count": len(created),
            "created": created,
            "errors": errors
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV parsing error: {str(e)}")

@api_router.post("/bulk/documents")
async def bulk_import_documents(data: BulkDocumentImport, current_user: dict = Depends(get_current_user)):
    """
    Bulk import documents for a specific client from CSV.
    Expected CSV columns: doc_name, status (pending/submitted), storage_location, softcopy_location, last_entry_date, uploaded_to_accounting (true/false)
    Minimum required: doc_name
    """
    try:
        # Verify client exists
        client_doc = await db.clients.find_one({"id": data.client_id})
        if not client_doc:
            raise HTTPException(status_code=404, detail="Client not found")
        
        csv_file = io.StringIO(data.csv_data.strip())
        reader = csv.DictReader(csv_file)
        
        created = []
        errors = []
        
        for idx, row in enumerate(reader, start=2):
            try:
                doc_name = (row.get('doc_name') or row.get('Doc Name') or row.get('document_name') or '').strip()
                
                if not doc_name:
                    errors.append(f"Row {idx}: Missing doc_name")
                    continue
                
                status_val = (row.get('status') or row.get('Status') or 'pending').strip().lower()
                if status_val not in ['pending', 'submitted']:
                    status_val = 'pending'
                
                uploaded_str = (row.get('uploaded_to_accounting') or row.get('uploaded') or 'false').strip().lower()
                uploaded = uploaded_str in ['true', 'yes', '1', 'y']
                
                doc_doc = {
                    "id": str(uuid.uuid4()),
                    "client_id": data.client_id,
                    "doc_name": doc_name,
                    "status": status_val,
                    "storage_location": (row.get('storage_location') or row.get('Storage Location') or '').strip() or None,
                    "softcopy_location": (row.get('softcopy_location') or row.get('Softcopy Location') or '').strip() or None,
                    "return_status": False,
                    "last_entry_date": (row.get('last_entry_date') or row.get('Last Entry Date') or '').strip() or None,
                    "uploaded_to_accounting": uploaded,
                    "created_at": datetime.utcnow(),
                }
                await db.documents.insert_one(doc_doc)
                created.append(doc_name)
            except Exception as e:
                errors.append(f"Row {idx}: {str(e)}")
        
        return {
            "success": True,
            "created_count": len(created),
            "created": created,
            "errors": errors
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV parsing error: {str(e)}")

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
    """Generate personalized message for clients using AI - returns plain text"""
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
            session_id=f"message-{request.client_id}-{datetime.utcnow().timestamp()}",
            system_message="You are a professional CA firm assistant. Generate polite, professional messages to clients regarding their pending documents and tasks. Output PLAIN TEXT only - no markdown, no asterisks, no bold/italic formatting. Use simple text suitable for WhatsApp."
        ).with_model("openai", "gpt-4o")
        
        prompt = f"""Generate a professional, friendly WhatsApp message in PLAIN TEXT format (no markdown, no asterisks, no special formatting) for the following client:

{context}

The message should:
1. Start with a warm greeting addressing the owner by name
2. Politely mention the pending documents that need to be submitted
3. Request prompt submission of these documents
4. Be concise (under 200 words)
5. End with: "Regards, SHREE RAJ & CO"

IMPORTANT: Output PLAIN TEXT only. Do NOT use:
- Markdown formatting (no **, *, _, #, etc.)
- Bullet points with asterisks
- Bold or italic text
- Any special characters for formatting

Use simple text with line breaks. The message should be ready to copy-paste directly into WhatsApp.

Generate ONLY the message text."""
        
        user_message = UserMessage(text=prompt)
        
        # Get full response (non-streaming for easier copy-paste)
        full_message = ""
        async for event in llm.stream_message(user_message):
            if isinstance(event, TextDelta):
                full_message += event.content
            elif isinstance(event, StreamDone):
                break
        
        return {"message": full_message, "client": client['firm_name']}
        
    except Exception as e:
        logger.error(f"Error generating message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ai/generate-cheatsheet")
async def generate_cheatsheet(request: CheatsheetRequest):
    """Generate cheatsheet content for documents - plain text format"""
    try:
        # Get client details
        client = await db.clients.find_one({"id": request.client_id})
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        # Get all documents
        documents = await db.documents.find({"client_id": request.client_id}).to_list(1000)
        
        submitted_docs = [doc for doc in documents if doc['status'] == 'submitted']
        pending_docs = [doc for doc in documents if doc['status'] == 'pending']
        
        # Initialize LLM
        llm = LlmChat(
            api_key=os.environ['EMERGENT_LLM_KEY'],
            session_id=f"cheatsheet-{request.client_id}-{datetime.utcnow().timestamp()}",
            system_message="You are a professional document organizer for a CA firm. Create clean, organized cheatsheets in PLAIN TEXT format only. No markdown, no asterisks, no special formatting."
        ).with_model("openai", "gpt-4o")
        
        prompt = f"""Create a formatted cheatsheet in PLAIN TEXT format (no markdown) for the following client's documents:

Client: {client['firm_name']}
Owner: {client['owner_name']}
Mobile: {client['mobile']}

SUBMITTED DOCUMENTS ({len(submitted_docs)}):
{chr(10).join([f"- {doc['doc_name']} | Storage: {doc.get('storage_location', 'N/A')} | Softcopy: {doc.get('softcopy_location', 'N/A')} | Accounting: {'Uploaded' if doc.get('uploaded_to_accounting') else 'Not Uploaded'}" for doc in submitted_docs]) if submitted_docs else "None"}

PENDING DOCUMENTS ({len(pending_docs)}):
{chr(10).join([f"- {doc['doc_name']}" for doc in pending_docs]) if pending_docs else "None"}

Create a well-organized, professional cheatsheet in PLAIN TEXT format. Include:
1. Header: "SHREE RAJ & CO - DOCUMENT CHEATSHEET" and date
2. Client info section
3. Clear sections for SUBMITTED and PENDING documents
4. Storage locations
5. Status indicators using simple text (no emoji needed, use [DONE], [PENDING] etc.)
6. Footer with firm name

IMPORTANT: Output PLAIN TEXT only:
- NO markdown formatting (no **, *, _, #, etc.)
- NO asterisks for bullets (use dashes - or letters)
- NO bold/italic formatting
- Use line breaks and dashes for separation
- Use simple text dividers like ---- or ====

Make it clean, professional, and ready for sharing as image or copy-paste."""
        
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
    """Generate AI-powered daily summary in plain text format"""
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
            session_id=f"summary-{target_date}-{datetime.utcnow().timestamp()}",
            system_message="You are a professional CA firm assistant creating daily summary reports in PLAIN TEXT format only. No markdown formatting."
        ).with_model("openai", "gpt-4o")
        
        prompt = f"""Create a professional daily summary report in PLAIN TEXT FORMAT for SHREE RAJ & CO:

DATE: {target_date}

DOCUMENTS SUBMITTED TODAY ({len(submitted_today)}):
{chr(10).join([f"- {doc['doc_name']} | Client: {next((c['firm_name'] for c in all_clients if c['id'] == doc['client_id']), 'Unknown')}" for doc in submitted_today]) if submitted_today else "None"}

TASKS ASSIGNED TODAY ({len(today_tasks)}):
{chr(10).join([f"- {task['task_name']}" for task in today_tasks]) if today_tasks else "None"}

TASKS COMPLETED TODAY ({len(completed_tasks)}):
{chr(10).join([f"- {task['task_name']}" for task in completed_tasks]) if completed_tasks else "None"}

PENDING TASKS ({len(pending_tasks)}):
{chr(10).join([f"- {task['task_name']}" for task in pending_tasks[:5]]) if pending_tasks else "None"}
{f"... and {len(pending_tasks) - 5} more" if len(pending_tasks) > 5 else ""}

TOTAL CLIENTS: {len(all_clients)}

Create a formatted, professional summary in PLAIN TEXT for WhatsApp sharing. Include:
1. Header: "SHREE RAJ & CO - DAILY SUMMARY" and date
2. Key metrics section
3. Detailed sections for documents submitted, tasks assigned, tasks completed
4. Pending tasks overview
5. Brief recommendations or action items
6. Professional sign-off

IMPORTANT: Output PLAIN TEXT only:
- NO markdown formatting (no **, *, _, #, etc.)
- NO asterisks for bullets (use dashes - instead)
- NO bold or italic text
- Use simple line breaks and dashes (---) for separation
- Use ALL CAPS for section headers
- Make it suitable for direct copy-paste to WhatsApp

The output should be ready to copy and paste directly into WhatsApp without any formatting issues."""
        
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
                "submitted": submitted_documents
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
