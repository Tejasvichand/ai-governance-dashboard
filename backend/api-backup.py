from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import Optional
import pandas as pd
import io
import logging
import traceback
import os
import json
import giskard

import litellm 

# ADDED FOR LITELLM DEBUGGING (You can comment out this line or remove it once you've debugged the issue.)
litellm._turn_on_debug() 

from main import perform_fairness_check, load_config, generate_llm_responses

# ✅ Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("FairnessAPI")

# 🚀 Initialize FastAPI app
app = FastAPI()

# 🌐 Enable CORS
app.add_middleware(
    CORSMiddleware, # Corrected from CORSMultiple in earlier snippet
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 📁 Serve static Giskard HTML and JSON
app.mount("/reports", StaticFiles(directory="giskard_results"), name="reports")

# 🧠 In-memory cache for uploaded files (non-persistent)
dataframe_cache = {}

# 🆙 Upload endpoint
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        logger.info(f"📥 Uploading: {file.filename}")
        content = await file.read()
        filename = file.filename.lower()

        if filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(content))
        elif filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        else:
            raise ValueError("Unsupported file format")

        dataframe_cache[file.filename] = df
        logger.info("✅ Upload successful")

        return {
            "status": "success",
            "columns": df.columns.tolist(),
            "filename": file.filename
        }

    except Exception as e:
        logger.error("❌ Upload failed", exc_info=True)
        return {"status": "error", "message": str(e)}


# 🔬 Run Giskard scan using updated logic from Colab example
def run_giskard_scan(df: pd.DataFrame, protected_attr: str, config: dict, fairness_dimension: Optional[str] = None) -> dict: # Added fairness_dimension
    logger.info(f"Received fairness_dimension in run_giskard_scan: {fairness_dimension}") # Debug log

    prompts = config.get("prompts", {})

    rows = []
    group_keys = [k for k in prompts if k.startswith("group_")]
    for group_key in group_keys:
        group_value = group_key.replace("group_", "")
        for q in prompts[group_key]:
            rows.append({"question": q, protected_attr: group_value})

    if not rows:
        raise ValueError(f"No prompts found for protected attribute: {protected_attr}")

    prompt_df = pd.DataFrame(rows)

    def predict_fn(df_local: pd.DataFrame):
        return generate_llm_responses(df_local, config)

    logger.info(f"📦 Preparing Giskard Dataset with protected attribute: {protected_attr}")
    dataset = giskard.Dataset(
        prompt_df,
        name="BiasPromptDataset",
        column_types={
            "question": "text",
            protected_attr: "category"
        }
    )

    model = giskard.Model(
        model=predict_fn,
        model_type="text_generation",
        name="PromptBiasScanner",
        description="LLM fairness test via prompt scanning",
        feature_names=["question"]
    )

    # --- LiteLLM Configuration (Remains the same as previous update) ---
    llm_api_key = config.get("api_key")
    llm_model_for_giskard_internal = config.get("model", "gpt-3.5-turbo")

    if not llm_api_key:
        logger.error("API Key not found in config for Giskard's internal LLM client.")
        raise ValueError("API Key must be provided in llm_config.yaml or via OPENAI_API_KEY env var.")

    try:
        litellm.api_key = llm_api_key
        litellm.model_list = [
            {"model_name": "gpt-4o", "litellm_params": {"model": llm_model_for_giskard_internal, "api_key": llm_api_key}},
            {"model_name": llm_model_for_giskard_internal, "litellm_params": {"model": llm_model_for_giskard_internal, "api_key": llm_api_key}}
        ]
        logger.info(f"LiteLLM configured. Giskard's internal LLM calls will attempt to use {llm_model_for_giskard_internal}.")
    except Exception as e:
        logger.error(f"Failed to configure LiteLLM directly: {e}", exc_info=True)
        raise e
    # --- END LiteLLM Configuration ---

    logger.info("🔍 Running Giskard scan...")

    scan_options = {"raise_exceptions": True}
    
    # Logic to select Giskard detectors based on frontend input
    # 'fairness_dimension' comes from frontend (e.g., "group", "individual", etc.)
    if fairness_dimension and fairness_dimension.lower() == "group": 
        # For "Group Fairness", Giskard's most relevant detector is 'stereotypes'
        scan_options["only"] = "stereotypes"
        logger.info("🎯 Focusing Giskard scan on 'stereotypes' for group fairness.")
    # You could add other `elif` conditions here for other specific fairness dimensions from frontend:
    # elif fairness_dimension and fairness_dimension.lower() == "individual":
    #     # Map to appropriate Giskard detector if one exists (e.g., "consistency" if it's a detector name)
    #     scan_options["only"] = "consistency" 
    # elif fairness_dimension and fairness_dimension.lower() == "subgroup":
    #     scan_options["only"] = "specific_subgroup_detector_name_if_exists"
    # elif fairness_dimension and fairness_dimension.lower() == "causal":
    #     scan_options["only"] = "specific_causal_detector_name_if_exists"
    else: # If no specific fairness dimension is chosen, or it's not mapped, run all by default.
        logger.info("ℹ️ No specific fairness dimension selected or mapped. Running full Giskard scan.")
        # No 'only' parameter here means all available detectors will run by default.


    scan_report = giskard.scan(model, dataset, **scan_options) # Pass options using **kwargs
    
    full_report_dict = json.loads(scan_report.to_json())

    issues_summary = []
    if hasattr(scan_report, 'issues') and isinstance(scan_report.issues, list):
        for issue_obj in scan_report.issues:
            issues_summary.append({
                'name': getattr(issue_obj, 'detector_name', 'UnknownIssue'),
                'severity': getattr(issue_obj, 'level', 'N/A'),
                'description': getattr(issue_obj, 'description', 'No description'),
                'status': getattr(issue_obj, 'status', 'N/A'),
                'test_results_count': len(getattr(issue_obj, 'tests_results', []))
            })
    else:
        logger.warning("Direct scan_report.issues access failed or structure unexpected in api.py. Falling back to JSON parsing for issues summary.")
        if 'issues' in full_report_dict:
            for issue_data in full_report_dict['issues']:
                issues_summary.append({
                    'name': issue_data.get('detector_name', 'UnknownIssue'),
                    'severity': issue_data.get('level'),
                    'description': issue_data.get('description', issue_data.get('name', 'No description')),
                    'status': issue_data.get('status'),
                    'test_results_count': len(issue_data.get('tests_results', []))
                })
        elif 'scandata' in full_report_dict and 'issue_data' in full_report_dict['scandata']:
            for issue_data in full_report_dict['scandata']['issue_data']:
                issues_summary.append({
                    'name': issue_data.get('detector_name', 'UnknownIssue'),
                    'severity': issue_data.get('level'),
                    'description': issue_data.get('description'),
                    'status': issue_data.get('status'),
                    'test_results_count': len(issue_data.get('tests_results', []))
                })

    logger.info(f"🧪 Giskard scan completed with {len(issues_summary)} issue categories detected.")
    for issue in issues_summary:
        logger.info(f"🧠 {issue.get('name')} - Severity: {issue.get('severity', 'N/A')} - Description: {issue.get('description', 'N/A')}")

    return {
        "status": "success",
        "issues_found": len(issues_summary),
        "issues_summary": issues_summary,
        "report": full_report_dict
    }

# 🧪 Fairness check endpoint
@app.post("/fairness-check")
async def fairness_check(
    filename: str = Form(...),
    protected_attr: str = Form(...),
    label_col: str = Form("response"),
    fairness_dimension: Optional[str] = Form(None), # This comes from the frontend
    fairness_metrics: Optional[str] = Form(None), # This would be selected metrics (e.g., demographic_parity)
    tool: str = Form("giskard")
):
    try:
        logger.info(f"📂 Loading data for: {filename}")
        if filename not in dataframe_cache:
            raise ValueError(f"Uploaded file not found: {filename}")

        df = dataframe_cache[filename]
        config = load_config("llm_config.yaml")

        if tool.lower() == "giskard":
            logger.info("⚙️ Executing Giskard scan logic")
            # Pass the fairness_dimension to run_giskard_scan
            result = run_giskard_scan(df, protected_attr, config, fairness_dimension=fairness_dimension) 
        else:
            # Use legacy handler for fairlearn/deepchecks
            # This block remains largely unchanged, as it handles the logic for non-Giskard tools
            # where the 'question' column might be generated from prompts.
            prompts = config.get("prompts", {})

            if "question" not in df.columns:
                logger.info("🔁 No 'question' column found — generating prompts")

                rows = []
                group_keys = [k for k in prompts if k.startswith("group_")]
                logger.info(f"🧩 Found prompt groups: {group_keys}")

                for group_key in group_keys:
                    group_value = group_key.replace("group_", "")
                    for q in prompts[group_key]:
                        rows.append({"question": q, protected_attr: group_value})

                if not rows:
                    raise ValueError(f"No prompts found for protected attribute: {protected_attr}")

                df = pd.DataFrame(rows)
                logger.info(f"🪄 Created {len(df)} synthetic rows")

            df["response"] = generate_llm_responses(df, config)
            logger.info("🤖 LLM responses generated")

            parsed_metrics = [m.strip() for m in fairness_metrics.split(",")] if fairness_metrics else None

            result = perform_fairness_check(
                df=df,
                label_col=label_col,
                protected_attr=protected_attr,
                fairness_tool=tool,
                fairness_dimension=fairness_dimension,
                fairness_metrics=parsed_metrics,
                config=config
            )

        if "giskard_report" in result or "report" in result:
            logger.info("🧾 Giskard report contents:")
            logger.info(json.dumps(result.get("report") or result.get("giskard_report"), indent=2))

        logger.info("✅ Fairness check complete")
        return {"status": "success", "result": result}

    except Exception as e:
        logger.error("❌ Fairness check failed", exc_info=True)
        return {"status": "error", "message": str(e)}