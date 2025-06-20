from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Union, Optional, List
import pandas as pd
import io
import logging
from main import perform_fairness_check

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("FairnessAPI")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class SuccessResponse(BaseModel):
    status: str = "success"
    result: dict

class ErrorResponse(BaseModel):
    status: str = "error"
    message: str

@app.post("/fairness-check", response_model=Union[SuccessResponse, ErrorResponse])
async def fairness_check(
    file: UploadFile = File(...),
    label_col: str = Form("label"),
    protected_attr: str = Form("group"),
    fairness_dimension: Optional[str] = Form(None),
    fairness_metrics: Optional[str] = Form(None),
    tool: str = Form("fairlearn"),
):
    try:
        logger.info(f"Received file: {file.filename}")
        content = await file.read()
        filename = file.filename.lower()

        # Parse uploaded file
        if filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(content))
        elif filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        else:
            return {"status": "error", "message": "Unsupported file format"}

        # Validate required columns
        required_cols = [label_col, protected_attr]
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            return {"status": "error", "message": f"Missing required columns: {', '.join(missing_cols)}"}

        logger.info(f"Protected Attribute: {protected_attr}")
        logger.info(f"Tool: {tool}, Dimension: {fairness_dimension}, Metrics: {fairness_metrics}")

        # Convert metrics string to list
        parsed_metrics = [m.strip() for m in fairness_metrics.split(",")] if fairness_metrics else None

        # Perform fairness check
        result = perform_fairness_check(
            df,
            label_col=label_col,
            protected_attr=protected_attr,
            fairness_tool=tool,
            fairness_dimension=fairness_dimension,
            fairness_metrics=parsed_metrics,
        )

        return {"status": "success", "result": result}

    except Exception as e:
        logger.exception("Error during fairness check")
        return {"status": "error", "message": f"Unexpected error: {str(e)}"}