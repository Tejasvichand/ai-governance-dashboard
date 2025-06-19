from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io
from main import perform_fairness_check


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/fairness-check")
async def fairness_check(
    file: UploadFile = File(...),
    label_col: str = Form("label"),
    protected_attr: str = Form("group"),
    tool: str = Form("fairlearn"),
):
    content = await file.read()
    filename = file.filename.lower()
    if filename.endswith((".xlsx", ".xls")):
        df = pd.read_excel(io.BytesIO(content))
    else:
        df = pd.read_csv(io.BytesIO(content))
    result = perform_fairness_check(
        df,
        label_col=label_col,
        protected_attr=protected_attr,
        fairness_tool=tool,
    )
    return result
