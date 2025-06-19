import yaml
import os
import pandas as pd
import json
import argparse

def load_config(config_path):
    with open(config_path, "r") as f:
        return yaml.safe_load(f)

def generate_llm_responses(df, config):
    import requests
    headers = {
        "Authorization": f"Bearer {config['api_key']}",
        "Content-Type": "application/json"
    }
    results = []
    for prompt in df["prompt"]:
        try:
            response = requests.post(
                config["endpoint"],
                headers=headers,
                json={
                    "model": config["model"],
                    "messages": [{"role": "user", "content": prompt}]
                },
                timeout=30
            )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
        except Exception as e:
            content = f"API_ERROR: {e}"
        results.append(content)
    return results

def run_with_giskard(df, config):
    import giskard
    dataset = giskard.Dataset(
        df,
        column_types={"prompt": "text", "group": "category"},
        target=None
    )
    model = giskard.Model(
        model=lambda df: generate_llm_responses(df, config),
        model_type="text_generation",
        name="LLM Model",
        feature_names=["prompt"]
    )
    print("Running Giskard scan...")
    report = giskard.scan(model, dataset)
    report.to_html("scan_report.html")
    print("✅ Giskard scan complete. Saved to scan_report.html")

def run_with_fairlearn(df, protected_attr):
    from collections import Counter
    from fairlearn.metrics import MetricFrame, selection_rate, demographic_parity_difference

    if "response" not in df.columns:
        raise ValueError("LLM output not found in 'response'. Cannot run Fairlearn.")

    df["binary"] = df["response"].apply(lambda x: 1 if "positive" in x.lower() else 0)
    group = df[protected_attr]
    metric_frame = MetricFrame(metrics=selection_rate, y_pred=df["binary"], sensitive_features=group)
    disparity = demographic_parity_difference(df["binary"], sensitive_features=group)

    result = {
        "selection_rate_per_group": metric_frame.by_group.to_dict(),
        "statistical_parity_gap": disparity,
        "status": "Fairness Violation" if abs(disparity) > 0.1 else "Pass"
    }
    with open("fairlearn_report.json", "w") as f:
        json.dump(result, f, indent=2)
    print("✅ Fairlearn metrics saved to fairlearn_report.json")

def run_with_deepchecks(df, protected_attr):
    from deepchecks.nlp.checks import TextBias
    from deepchecks.nlp import Dataset as DeepDataset

    if "response" not in df.columns:
        raise ValueError("LLM output not found in 'response'. Cannot run Deepchecks.")

    ds = DeepDataset(text=df["response"], label=df[protected_attr], task_type='text_generation')
    bias_check = TextBias()
    result = bias_check.run(ds)
    result.save_as_html("deepchecks_report.html")
    print("✅ Deepchecks bias report saved to deepchecks_report.html")

def perform_fairness_check(df, label_col, protected_attr, fairness_tool="fairlearn", config=None):
    """Run a fairness check on ``df`` using the selected tool."""
    if fairness_tool == "giskard":
        import giskard
        dataset = giskard.Dataset(
            df,
            target=label_col,
            column_types={protected_attr: "category"}
        )
        model = giskard.Model(
            model=lambda d: d[label_col],
            model_type="classification",
            name="Identity Model",
            feature_names=df.columns.tolist()
        )
        report = giskard.scan(model, dataset)
        report_path = "scan_report.html"
        report.to_html(report_path)
        return {"report_path": report_path}
    elif fairness_tool == "fairlearn":
        from fairlearn.metrics import MetricFrame, selection_rate, demographic_parity_difference
        if label_col not in df.columns or protected_attr not in df.columns:
            raise ValueError("Required columns not found in dataset")
        df[label_col] = df[label_col].astype(int)
        metric_frame = MetricFrame(
            metrics=selection_rate,
            y_pred=df[label_col],
            sensitive_features=df[protected_attr]
        )
        disparity = demographic_parity_difference(
            df[label_col], sensitive_features=df[protected_attr]
        )
        return {
            "selection_rate_per_group": metric_frame.by_group.to_dict(),
            "statistical_parity_gap": disparity
        }
    else:
        raise ValueError(f"Unknown fairness tool: {fairness_tool}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True, help="Path to llm_config.yaml")
    args = parser.parse_args()

    config = load_config(args.config)
    prompts = config["prompts"]
    fairness_tool = config.get("fairness_tool", "giskard").lower()

    rows = [{"prompt": p, "group": group} for group, plist in prompts.items() for p in plist]
    df = pd.DataFrame(rows)

    # Run LLM to get responses
    df["response"] = generate_llm_responses(df, config)

    # Dispatch to selected fairness tool
    if fairness_tool == "giskard":
        run_with_giskard(df, config)
    elif fairness_tool == "fairlearn":
        run_with_fairlearn(df, protected_attr="group")
    elif fairness_tool == "deepchecks":
        run_with_deepchecks(df, protected_attr="group")
    else:
        print(f"❌ Unknown fairness tool: {fairness_tool}")
