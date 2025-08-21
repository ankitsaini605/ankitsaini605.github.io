import json, math
from pathlib import Path
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import roc_auc_score
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import GradientBoostingClassifier

SRC = Path("churn.csv")
OUT = Path("data/churn"); OUT.mkdir(parents=True, exist_ok=True)

# Load
df = pd.read_csv(SRC)
# Normalize common label names
label_col = None
for cand in ["churn", "Churn", "is_churn", "Exited"]:
    if cand in df.columns:
        label_col = cand; break
if label_col is None:
    raise ValueError("No churn label found. Add a 'churn' column (0/1) or 'Churn' (Yes/No).")

y = df[label_col]
if y.dtype == object:
    y = y.astype(str).str.strip().str.lower().map({"yes":1,"y":1,"true":1,"1":1,"no":0,"n":0,"false":0,"0":0}).fillna(0).astype(int)

# Drop ID-like columns
drop_like = [c for c in df.columns if c.lower() in [label_col.lower(), "customer_id","customerid","id"]]
X = df.drop(columns=drop_like)

# Identify numeric/categorical
num_cols = [c for c in X.columns if pd.api.types.is_numeric_dtype(X[c])]
cat_cols = [c for c in X.columns if c not in num_cols]

# Fallback if no numeric columns
if not num_cols:
    # try coercing possible numeric strings
    for c in X.columns:
        z = pd.to_numeric(X[c], errors="coerce")
        if z.notna().sum() > len(z)*0.5:
            X[c] = z
    num_cols = [c for c in X.columns if pd.api.types.is_numeric_dtype(X[c])]
    cat_cols = [c for c in X.columns if c not in num_cols]

X = X.fillna({
    **{c: X[c].median() for c in num_cols},
    **{c: X[c].mode().iloc[0] if not X[c].mode().empty else "unknown" for c in cat_cols}
})

# Train/test
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# Pipelines
num_tf = Pipeline([("scaler", StandardScaler())])
pre = ColumnTransformer(
    transformers=[
        ("num", num_tf, num_cols),
        ("cat", "passthrough", cat_cols)
    ],
    remainder="drop"
)

# Models
lr = Pipeline([("pre", pre), ("clf", LogisticRegression(max_iter=500))])
gb = Pipeline([("pre", pre), ("clf", GradientBoostingClassifier(random_state=42))])

lr.fit(X_train, y_train)
gb.fit(X_train, y_train)

# Metrics
p_lr = lr.predict_proba(X_test)[:,1]
p_gb = gb.predict_proba(X_test)[:,1]
auc_lr = float(roc_auc_score(y_test, p_lr))
auc_gb = float(roc_auc_score(y_test, p_gb))
positive_rate = float(y.mean()*100)

# Feature importances (from GB)
# Build feature names after preprocessing
cat_feature_names = []
for c in cat_cols:
    # passthrough: keep original name (collapsed)
    cat_feature_names.append(c)
feat_names = num_cols + cat_feature_names
importances = getattr(gb.named_steps["clf"], "feature_importances_", None)
imp_list = []
if importances is not None:
    # Map back: GradientBoosting sees transformed numeric + categorical passthrough
    for name, val in zip(feat_names, importances):
      imp_list.append({"feature": name, "importance": round(float(val), 6)})
    imp_list = sorted(imp_list, key=lambda d: d["importance"], reverse=True)[:15]

# Probability distribution hist
def hist_probs(probs, labels, target):
    bins = [i/20 for i in range(21)]  # 0.00 .. 1.00 by 0.05
    counts = [0]*20
    for p, l in zip(probs, labels):
        if l == target:
            idx = min(19, int(p*20))
            counts[idx] += 1
    return counts, [round((i+0.5)/20,2) for i in range(20)]

churned_counts, bins_display = hist_probs(p_gb, y_test.tolist(), 1)
active_counts, _ = hist_probs(p_gb, y_test.tolist(), 0)

# What-if model (only numeric standardized with LR coefficients)
# Take top up-to-4 numeric features by absolute LR coef
lr_clf = lr.named_steps["clf"]
# Get standardized stats for numeric columns
num_means = X_train[num_cols].mean()
num_stds = X_train[num_cols].std().replace(0, 1.0)

# Extract LR coefs for numeric part only
# Order of features in LR: [scaled nums..., passthrough cats...]
coef_arr = lr_clf.coef_[0]
num_coefs = coef_arr[:len(num_cols)]
coef_pairs = sorted([(c, float(abs(coef))) for c, coef in zip(num_cols, num_coefs)], key=lambda t: t[1], reverse=True)[:4]
selected = [c for c,_ in coef_pairs]

whatif = {
    "intercept": float(lr_clf.intercept_[0]),
    "features": [
        {
            "name": c,
            "min": float(X[c].min()),
            "max": float(X[c].max()),
            "mean": float(num_means[c]),
            "std": float(num_stds[c]) if float(num_stds[c])!=0 else 1.0,
            "coef": float(num_coefs[num_cols.index(c)])
        }
        for c in selected
    ]
}

# Save JSONs
(OUT / "metrics.json").write_text(json.dumps({
    "rows": int(len(df)),
    "positive_rate": round(positive_rate, 2),
    "auc_lr": round(auc_lr, 4),
    "auc_gb": round(auc_gb, 4),
    "n_features": int(len(feat_names)),
    "updated_at": pd.Timestamp.utcnow().strftime("%Y-%m-%d %H:%M UTC")
}, ensure_ascii=False))

(OUT / "importance.json").write_text(json.dumps(imp_list, ensure_ascii=False))

(OUT / "distribution.json").write_text(json.dumps({
    "bins": bins_display,
    "active": active_counts,
    "churned": churned_counts
}, ensure_ascii=False))

(OUT / "whatif.json").write_text(json.dumps(whatif, ensure_ascii=False))

print("Churn JSON exported to", OUT.resolve())
