import os
import uuid
from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Depends, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from passlib.context import CryptContext
from jose import JWTError, jwt
from sqlalchemy import create_engine, Column, Integer, String, Boolean
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from pydantic import BaseModel

# --- Config ---
SECRET_KEY = os.getenv("ADMIN_SECRET_KEY", "dev-secret-key-change-in-prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
UPLOAD_DIR = "./data/uploads"
DB_DIR = "./data"
DB_PATH = f"{DB_DIR}/portal.db"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(DB_DIR, exist_ok=True)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/admin/login")

# --- DB Setup ---
DATABASE_URL = f"sqlite:///{DB_PATH}"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class EmployeeDB(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True, index=True)
    photo_url = Column(String, nullable=True)
    full_name = Column(String, index=True, nullable=False)
    position = Column(String, nullable=False)
    department = Column(String, index=True, nullable=False)
    email = Column(String, nullable=False)
    phone_personal = Column(String, nullable=False)
    phone_work = Column(String, nullable=False)
    timezone = Column(String, nullable=False)
    birth_date = Column(String, nullable=False)
    location = Column(String, nullable=False)
    is_on_vacation = Column(Boolean, default=False)
    deputy_id = Column(Integer, nullable=True)

class AdminDB(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

Base.metadata.create_all(bind=engine)

# --- Pydantic Models ---
class EmployeeOut(BaseModel):
    id: int
    photo_url: Optional[str] = None
    full_name: str
    position: str
    department: str
    email: str
    phone_personal: str
    phone_work: str
    timezone: str
    birth_date: str
    location: str
    is_on_vacation: bool
    deputy_id: Optional[int] = None
    deputy_name: Optional[str] = None
    model_config = {"from_attributes": True}

class EmployeeCreate(BaseModel):
    full_name: str
    position: str
    department: str
    email: str
    phone_personal: str
    phone_work: str
    timezone: str
    birth_date: str
    location: str
    photo_url: Optional[str] = None
    is_on_vacation: bool = False
    deputy_id: Optional[int] = None

class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    email: Optional[str] = None
    phone_personal: Optional[str] = None
    phone_work: Optional[str] = None
    timezone: Optional[str] = None
    birth_date: Optional[str] = None
    location: Optional[str] = None
    photo_url: Optional[str] = None
    is_on_vacation: Optional[bool] = None
    deputy_id: Optional[int] = None

# --- Auth Helpers ---
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_admin(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
        db = SessionLocal()
        try:
            admin = db.query(AdminDB).filter(AdminDB.username == username).first()
            if not admin:
                raise HTTPException(status_code=401, detail="User not found")
            return admin
        finally:
            db.close()
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# --- App ---
app = FastAPI(title="Корпоративный справочник + Admin")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
def seed_data():
    print("🌱 Проверка и инициализация БД...")
    db = SessionLocal()
    try:
        admin_user = os.getenv("ADMIN_USERNAME", "admin")
        admin_pass = os.getenv("ADMIN_PASSWORD", "admin123")

        if not db.query(AdminDB).first():
            db.add(AdminDB(username=admin_user, hashed_password=get_password_hash(admin_pass)))
            db.commit()
            print(f"✅ Администратор создан: {admin_user} / {admin_pass}")
        else:
            print("ℹ️ Администратор уже существует в БД.")

        if not db.query(EmployeeDB).first():
            db.add_all([
                EmployeeDB(full_name="Иванов Иван Иванович", position="Руководитель IT-отдела",
                    department="Разработка", email="ivanov@corp.ru", phone_personal="+79990001122",
                    phone_work="+74951234500", timezone="Europe/Moscow", birth_date="1988-04-12",
                    location="Москва", is_on_vacation=False, photo_url="https://i.pravatar.cc/150?img=11"),
                EmployeeDB(full_name="Петрова Анна Сергеевна", position="Senior Developer",
                    department="Разработка", email="petrova@corp.ru", phone_personal="+79990003344",
                    phone_work="+74951234501", timezone="Europe/Moscow", birth_date="1995-08-22",
                    location="Москва", is_on_vacation=True, photo_url="https://i.pravatar.cc/150?img=5", deputy_id=1),
                EmployeeDB(full_name="Сидоров Дмитрий Олегович", position="Маркетолог",
                    department="Маркетинг", email="sidorov@corp.ru", phone_personal="+79990005566",
                    phone_work="+74951234510", timezone="Europe/Moscow", birth_date="1990-12-03",
                    location="Санкт-Петербург", is_on_vacation=False, photo_url="https://i.pravatar.cc/150?img=33")
            ])
            db.commit()
            print("👥 Тестовые сотрудники добавлены.")
        print("🚀 Бэкенд успешно запущен.")
    finally:
        db.close()

def _emp_out(emp: EmployeeDB, db: Session) -> EmployeeOut:
    deputy_name = None
    if emp.deputy_id:
        d = db.query(EmployeeDB).filter(EmployeeDB.id == emp.deputy_id).first()
        if d: deputy_name = d.full_name
    return EmployeeOut(**emp.__dict__, deputy_name=deputy_name)

# --- Public Endpoints ---
@app.get("/api/departments", response_model=List[str])
def get_departments(db: Session = Depends(get_db)):
    return sorted({e.department for e in db.query(EmployeeDB).all()})

@app.get("/api/employees", response_model=List[EmployeeOut])
def get_employees(department: Optional[str] = Query(None), search: Optional[str] = Query(None), db: Session = Depends(get_db)):
    all_employees = db.query(EmployeeDB).all()
    if search:
        s_lower = search.lower()
        all_employees = [
            e for e in all_employees
            if s_lower in e.full_name.lower()
            or s_lower in e.position.lower()
            or s_lower in e.department.lower()
        ]
    if department:
        all_employees = [e for e in all_employees if e.department == department]
    all_employees.sort(key=lambda e: e.full_name.lower())
    return [_emp_out(e, db) for e in all_employees]

@app.get("/api/employees/{emp_id}", response_model=EmployeeOut)
def get_employee(emp_id: int, db: Session = Depends(get_db)):
    emp = db.query(EmployeeDB).filter(EmployeeDB.id == emp_id).first()
    if not emp:
        raise HTTPException(404, "Не найден")
    return _emp_out(emp, db)

# --- Admin Endpoints ---
@app.post("/api/admin/login")
def admin_login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    admin = db.query(AdminDB).filter(AdminDB.username == form.username).first()
    if not admin or not verify_password(form.password, admin.hashed_password):
        raise HTTPException(401, "Неверный логин или пароль")
    return {"access_token": create_access_token({"sub": admin.username}), "token_type": "bearer"}

@app.get("/api/admin/employees", response_model=List[EmployeeOut])
def admin_get_employees(db: Session = Depends(get_db), _: AdminDB = Depends(get_current_admin)):
    all_employees = db.query(EmployeeDB).all()
    all_employees.sort(key=lambda e: e.full_name.lower())
    return [_emp_out(e, db) for e in all_employees]

@app.post("/api/admin/employees", status_code=201)
def admin_create_employee(data: EmployeeCreate, db: Session = Depends(get_db), _: AdminDB = Depends(get_current_admin)):
    new = EmployeeDB(**data.model_dump())
    db.add(new)
    db.commit()
    db.refresh(new)
    return {"id": new.id}

@app.put("/api/admin/employees/{emp_id}")
def admin_update_employee(emp_id: int,  EmployeeUpdate, db: Session = Depends(get_db), _: AdminDB = Depends(get_current_admin)):
    emp = db.query(EmployeeDB).filter(EmployeeDB.id == emp_id).first()
    if not emp:
        raise HTTPException(404, "Не найден")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(emp, k, v)
    db.commit()
    db.refresh(emp)
    return {"id": emp.id}

@app.delete("/api/admin/employees/{emp_id}")
def admin_delete_employee(emp_id: int, db: Session = Depends(get_db), _: AdminDB = Depends(get_current_admin)):
    emp = db.query(EmployeeDB).filter(EmployeeDB.id == emp_id).first()
    if not emp:
        raise HTTPException(404, "Не найден")
    db.delete(emp)
    db.commit()
    return {"status": "ok"}

@app.delete("/api/admin/departments/{dept_name}")
def admin_delete_department(dept_name: str, db: Session = Depends(get_db), _: AdminDB = Depends(get_current_admin)):
    emp_count = db.query(EmployeeDB).filter(EmployeeDB.department == dept_name).count()
    if emp_count > 0:
        raise HTTPException(400, "В отделе есть сотрудники. Сначала перенесите их.")
    return {"status": "ok"}

@app.post("/api/admin/upload-photo")
async def upload_photo(file: UploadFile = File(...), _: AdminDB = Depends(get_current_admin)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Разрешены только изображения (jpg, png, webp)")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(400, "Файл слишком большой. Максимум 5 МБ.")
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(content)
    return {"url": f"/uploads/{filename}"}

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
