import yaml
import pandas as pd
import json
import argparse
import logging
import traceback

logging.basicConfig(level=logging.INFO)

class FairnessCheckError(Exception):
    """Custom exception for clarity in fairness logic."""
    pass


def load_config(config_path):
    try:
        with open(config_path, "r") as f:
            return yaml.safe_load(f)
    except Exception as e:
        raise FairnessCheckError(f"Failed to load config: {e}")


def generate_llm_responses(df, config):
    import requests

    if "api_key" not in config or "endpoint" not in config or "model" not in config:
        raise FairnessCheckError("Missing LLM API config keys")

    headers = {
        "Authorization": f"Bearer {config['api_key']}",
        "Content-Type": "application/json"
    }

    results = []
    for prompt in df["question"]:
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
            logging.error(f"LLM API error for prompt: {prompt}\n{traceback.format_exc()}")
            content = f"API_ERROR: {e}"
        results.append(content)
    return results


def run_with_fairlearn(df, protected_attr):
    from fairlearn.metrics import MetricFrame, selection_rate, demographic_parity_difference

    try:
        if "response" not in df.columns:
            raise FairnessCheckError("Missing 'response' column from LLM output")

        df["binary"] = df["response"].apply(lambda x: 1 if "positive" in str(x).lower() else 0)
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
        logging.info("✅ Fairlearn metrics saved to fairlearn_report.json")
        return result
    except Exception as e:
        raise FairnessCheckError(f"Fairlearn failed: {e}")


def run_with_deepchecks(df, protected_attr):
    from deepchecks.nlp.checks import TextBias
    from deepchecks.nlp import Dataset as DeepDataset

    try:
        if "response" not in df.columns:
            raise FairnessCheckError("Missing 'response' column for Deepchecks")

        ds = DeepDataset(
            text=df["response"],
            label=df[protected_attr],
            task_type="text_generation",
        )
        bias_check = TextBias()
        result = bias_check.run(ds)
        result.save_as_html("deepchecks_report.html")
        logging.info("✅ Deepchecks bias report saved to deepchecks_report.html")
    except Exception as e:
        raise FairnessCheckError(f"Deepchecks failed: {e}")


def perform_fairness_check(df, label_col, protected_attr, fairness_tool="fairlearn", config=None):
    try:
        if fairness_tool == "giskard":
            import giskard

            if config and "prompt" in df.columns and protected_attr in df.columns:
                # Rename column to match Giskard's LLM scan expectations
                df = df.rename(columns={"prompt": "question"})

                def model_predict(df_local: pd.DataFrame):
                    return generate_llm_responses(df_local, config)

                dataset = giskard.Dataset(
                    df,
                    column_types={"question": "text", protected_attr: "category"},
                    target=None
                )

                model = giskard.Model(
                    model=model_predict,
                    model_type="text_generation",
                    name="LLM Bias Checker",
                    feature_names=["question"]
                )

                logging.info("🧪 Running Giskard scan...")
                report = giskard.scan(model, dataset)
                report_path = "scan_report.html"
                report.to_html(report_path)
                logging.info("✅ Giskard scan saved to scan_report.html")
                return {"report_path": report_path}

            else:
                raise FairnessCheckError("Missing required inputs for Giskard LLM scan")

        elif fairness_tool == "fairlearn":
            return run_with_fairlearn(df, protected_attr)

        elif fairness_tool == "deepchecks":
            run_with_deepchecks(df, protected_attr)
            return {"status": "deepchecks_report.html generated"}

        else:
            raise FairnessCheckError(f"Unknown fairness tool selected: '{fairness_tool}'")

    except Exception as e:
        logging.error(traceback.format_exc())
        raise FairnessCheckError(str(e))


if __name__ == "__main__":
    try:
        parser = argparse.ArgumentParser()
        parser.add_argument("--config", required=True, help="Path to llm_config.yaml")
        args = parser.parse_args()

        config = load_config(args.config)
        prompts = config["prompts"]
        fairness_tool = config.get("fairness_tool", "giskard").lower()

        rows = [{"prompt": p, "group": group} for group, plist in prompts.items() for p in plist]
        df = pd.DataFrame(rows)

        logging.info(f"Loaded {len(df)} prompts for fairness tool: {fairness_tool}")

        df = df.rename(columns={"prompt": "question"})
        df["response"] = generate_llm_responses(df, config)

        result = perform_fairness_check(df, label_col="response", protected_attr="group", fairness_tool=fairness_tool, config=config)
        logging.info(f"✅ Fairness check completed. Output: {result}")

    except Exception as e:
        logging.error("🚨 Fatal error occurred.")
        logging.error(traceback.format_exc())
        print(f"❌ ERROR: {e}")
