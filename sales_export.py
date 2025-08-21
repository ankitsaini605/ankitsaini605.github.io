import pandas as pd
from pathlib import Path

SRC = Path("sales.csv")
OUT = Path("data/sales"); OUT.mkdir(parents=True, exist_ok=True)

df = pd.read_csv(SRC, parse_dates=["order_date"])
df = df.dropna(subset=["order_date","customer_id","revenue"])
df["revenue"] = pd.to_numeric(df["revenue"], errors="coerce").fillna(0)

total_revenue = float(df["revenue"].sum())
orders = int(df["order_id"].nunique()) if "order_id" in df.columns else int(len(df))
customers = int(df["customer_id"].nunique())
avg_order_value = total_revenue / max(orders, 1)
df_sorted = df.sort_values("order_date")
rev_by_year = df_sorted.groupby(df_sorted["order_date"].dt.year)["revenue"].sum()
years = sorted(rev_by_year.index.tolist())
yoy_growth = float((rev_by_year.get(years[-1], 0) - rev_by_year.get(years[-2], 1)) / max(rev_by_year.get(years[-2], 1), 1)) if len(years)>=2 else 0.0
repeat_rate = float(1 - (df.groupby("customer_id")["order_date"].min().nunique() / max(customers,1)))

pd.Series({
    "total_revenue": round(total_revenue, 2),
    "orders": orders,
    "customers": customers,
    "avg_order_value": round(avg_order_value, 2),
    "repeat_rate": repeat_rate,
    "yoy_growth": yoy_growth
}).to_json(OUT / "kpis.json")

ts = (df.assign(month=df["order_date"].dt.to_period("M").dt.to_timestamp())
        .groupby("month", as_index=False)["revenue"].sum())
ts["month"] = ts["month"].dt.strftime("%Y-%m")
ts.to_json(OUT / "timeseries.json", orient="records")

snapshot = df["order_date"].max() + pd.Timedelta(days=1)
rfm = (df.groupby("customer_id").agg({
    "order_date": lambda x: (snapshot - x.max()).days,
    "revenue": "sum"
}).rename(columns={"order_date":"recency","revenue":"monetary"}))
rfm["frequency"] = df.groupby("customer_id").size()

r_q = pd.qcut(rfm["recency"], 5, labels=[5,4,3,2,1])
f_q = pd.qcut(rfm["frequency"], 5, labels=[1,2,3,4,5])
m_q = pd.qcut(rfm["monetary"], 5, labels=[1,2,3,4,5])
rfm["R"] = r_q.astype(int); rfm["F"] = f_q.astype(int); rfm["M"] = m_q.astype(int)
rfm["segment"] = rfm["R"].astype(str)+rfm["F"].astype(str)+rfm["M"].astype(str)
seg_counts = rfm["segment"].value_counts().reset_index()
seg_counts.columns = ["segment","count"]
seg_counts.to_json(OUT / "rfm.json", orient="records")

df["order_month"] = df["order_date"].dt.to_period("M").dt.to_timestamp()
first_purchase = df.groupby("customer_id")["order_month"].min()
df = df.join(first_purchase, on="customer_id", rsuffix="_cohort")
df["cohort_month"] = df["order_month_cohort"]
df["period_number"] = ((df["order_month"].dt.year - df["cohort_month"].dt.year)*12 +
                       (df["order_month"].dt.month - df["cohort_month"].dt.month)) + 1
cohort_pivot = (df.groupby(["cohort_month","period_number"])["customer_id"].nunique()
                  .unstack(fill_value=0))
retention = cohort_pivot.divide(cohort_pivot.iloc[:,0], axis=0).round(2) * 100
header = ["Cohort"] + [f"M{i}" for i in range(1, min(7, retention.shape[1]+1))]
rows = []
for idx, row in retention.iloc[:, :6].iterrows():
    rows.append({"cohort": idx.strftime("%Y-%m"), "values": [None if pd.isna(v) else float(v) for v in row.values]})
pd.Series({"header": header, "rows": rows}).to_json(OUT / "cohorts.json")
print("Sales JSON exported to", OUT.resolve())

